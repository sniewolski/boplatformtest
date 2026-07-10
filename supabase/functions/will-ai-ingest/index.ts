/**
 * Will AI ingestion queue processor (Supabase Edge Function port).
 *
 * Runtime swap from the Cloudflare Worker route (mupdf's WASM cannot run in
 * the Worker). Logic, heuristic, dual-chunk emission, retry budget, DLQ,
 * and failed_pages semantics are unchanged from
 * `src/routes/api/public/hooks/will-ai-ingest.ts` — this file is the Deno
 * port, not a redesign.
 *
 * Cron-triggered by `will_ai_ingestion_wake` / `will_ai_ingestion_dispatch`
 * via `pg_net`, which POSTs a service-role bearer.
 */
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

const MAX_ATTEMPTS = 2;
const BATCH_SIZE = 1;
const VISIBILITY_TIMEOUT_SECONDS = 60 * 60;
const QUEUE = "will_ai_ingestion";
const DLQ = "will_ai_ingestion_dlq";
const BUCKET = "will-ai-content";

// Narrow "genuinely blank page" gate — the ONLY reason we skip rasterize+caption.
// Not a diagram heuristic: all three conditions must hold together for a page
// to be considered truly empty (e.g. intentional spacer). Conservative on
// purpose so borderline pages still get captioned.
const BLANK_TEXT_MAX = 20;         // near-zero text
const BLANK_GRAPHICS_MAX = 0;      // zero graphics ops
const BLANK_VARIANCE_MAX = 15;     // near-flat pixels
// Minimum text length to bother emitting a text chunk for a page.
const TEXT_CHUNK_MIN = 40;
const EMBEDDING_MODEL = "gemini-embedding-001";
const CAPTION_MODEL = "gemini-3.5-flash";
const EMBEDDING_DIMS = 768;

type IngestionPayload = { source_id?: string; [k: string]: unknown };

async function markSourceFailed(
  supabase: SupabaseClient<any, any>,
  sourceId: string | undefined,
  reason: string,
): Promise<void> {
  if (!sourceId) return;
  await supabase
    .from("will_ai_sources")
    .update({ status: "failed", error_message: reason.slice(0, 2000) })
    .eq("id", sourceId);
}

// -------------------- helpers --------------------

// Transient Gemini errors (503 UNAVAILABLE, 429 rate-limit) get a short
// bounded retry. Non-transient failures (other 4xx, malformed JSON, empty
// payload) throw on the first attempt so the caller records them in
// failed_pages immediately — same behavior as before.
const GEMINI_RETRY_DELAYS_MS = [1000, 3000];

class TransientGeminiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "TransientGeminiError";
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withGeminiRetry<T>(label: string, fn: () => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= GEMINI_RETRY_DELAYS_MS.length; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!(err instanceof TransientGeminiError) || attempt === GEMINI_RETRY_DELAYS_MS.length) {
        throw err;
      }
      const delay = GEMINI_RETRY_DELAYS_MS[attempt];
      console.warn(`will-ai-ingest: ${label} transient ${err.status}, retrying in ${delay}ms`, {
        attempt: attempt + 1,
        message: err.message.slice(0, 200),
      });
      await sleep(delay);
    }
  }
  throw lastErr;
}

async function fetchGeminiEmbedding(apiKey: string, text: string): Promise<number[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${encodeURIComponent(apiKey)}`;
  return withGeminiRetry("embedding", async () => {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: { parts: [{ text }] },
        outputDimensionality: EMBEDDING_DIMS,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      const msg = `Embedding failed (${res.status}): ${body.slice(0, 300)}`;
      if (res.status === 503 || res.status === 429) throw new TransientGeminiError(res.status, msg);
      throw new Error(msg);
    }
    const json: any = await res.json();
    const values: number[] | undefined = json?.embedding?.values;
    if (!values || values.length === 0) throw new Error("Embedding response missing values");
    return values;
  });
}

/**
 * Sentinel returned by the model when a page has no meaningful visual content
 * beyond the plain text we already extracted. Chosen to be short, unambiguous,
 * and vanishingly unlikely to appear in an honest caption.
 */
const NO_VISUAL_SENTINEL = "NO_VISUAL_CONTENT";

async function captionPage(
  apiKey: string,
  pngBase64: string,
  pageText: string,
): Promise<string | null> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${CAPTION_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const system =
    "You are describing a page from a sales book so its VISUAL content can be retrieved by semantic search. " +
    "The plain text of the page has already been extracted separately, so DO NOT describe or paraphrase the running text. " +
    "Only describe visual elements: diagrams, illustrations, charts, tables, figures, callout boxes, or other non-text visuals. " +
    `If the page has no meaningful visual content beyond the plain text (e.g. a normal prose page, a chapter opener, a blank spacer, a page number only), reply with EXACTLY this token and nothing else: ${NO_VISUAL_SENTINEL}. ` +
    "Otherwise, write 3–6 sentences that state (a) what the visual shows, (b) the labels/axes/steps/rows-columns, and " +
    "(c) the point the author appears to be making with it. Do not add commentary or headings.";
  const parts: any[] = [
    { text: system },
    { inlineData: { mimeType: "image/png", data: pngBase64 } },
  ];
  if (pageText.trim()) {
    parts.push({ text: `Extracted page text (already indexed separately — do not repeat verbatim, use only to interpret the visuals):\n${pageText.slice(0, 1500)}` });
  }
  return withGeminiRetry("caption", async () => {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ role: "user", parts }] }),
    });
    if (!res.ok) {
      const body = await res.text();
      const msg = `Caption failed (${res.status}): ${body.slice(0, 300)}`;
      if (res.status === 503 || res.status === 429) throw new TransientGeminiError(res.status, msg);
      throw new Error(msg);
    }
    const json: any = await res.json();
    const caption: string = ((json?.candidates?.[0]?.content?.parts ?? []) as any[])
      .map((p: any) => p?.text ?? "")
      .join("")
      .trim();
    if (!caption) throw new Error("Caption response was empty");
    const normalized = caption.replace(/[`"'.\s]/g, "").toUpperCase();
    if (normalized === NO_VISUAL_SENTINEL) return null;
    return caption;
  });
}


function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

function grayscaleVariance(pixels: Uint8Array | Uint8ClampedArray): number {
  if (pixels.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < pixels.length; i++) sum += pixels[i];
  const mean = sum / pixels.length;
  let acc = 0;
  for (let i = 0; i < pixels.length; i++) {
    const d = pixels[i] - mean;
    acc += d * d;
  }
  return acc / pixels.length;
}

// NOTE: exceptions here are NOT swallowed. If page.run throws, we surface it
// to the caller (which records it in failed_pages and logs) so the actual
// mupdf error message and stack are visible — a bare catch previously hid
// this and defaulted graphicsCount to 0, which silently disabled diagram
// detection for every page.
function countGraphicsOps(mupdf: any, page: any): number {
  let n = 0;
  const device = new mupdf.Device({
    fillPath: () => { n++; },
    strokePath: () => { n++; },
    fillImage: () => { n++; },
  });
  page.run(device, mupdf.Matrix.identity);
  return n;
}

const SECTION_DIVIDER_RE = /\b(section|chapter|part|module)\b/i;

function detectSectionLabel(structuredJson: any): string | null {
  const blocks = structuredJson?.blocks ?? [];
  if (!Array.isArray(blocks) || blocks.length === 0) return null;

  let pageBottom = 0;
  for (const b of blocks) {
    const bbox = b?.bbox;
    if (Array.isArray(bbox) && typeof bbox[3] === "number" && bbox[3] > pageBottom) {
      pageBottom = bbox[3];
    }
  }
  if (pageBottom <= 0) return null;
  const footerCutoff = pageBottom * 0.82;

  const candidates: string[] = [];
  for (const b of blocks) {
    if (b?.type !== "text") continue;
    const lines = b?.lines ?? [];
    for (const line of lines) {
      const bbox = line?.bbox;
      if (!Array.isArray(bbox) || typeof bbox[1] !== "number") continue;
      if (bbox[1] < footerCutoff) continue;
      const raw = (line?.spans ?? [])
        .map((s: any) => s?.text ?? "")
        .join("")
        .replace(/\s+/g, " ")
        .trim();
      if (!raw) continue;
      candidates.push(raw);
    }
  }

  for (const text of candidates) {
    if (text.length > 80 || text.length < 3) continue;
    if (/^\d+$/.test(text)) continue;
    const letters = text.replace(/[^A-Za-z]/g, "");
    if (letters.length < 3) continue;
    const isSectionish =
      /\b(section|chapter|part|module)\b/i.test(text) ||
      letters.replace(/[a-z]/g, "").length / letters.length >= 0.7;
    if (isSectionish) return text;
  }
  return null;
}

// -------------------- per-source processor --------------------

/**
 * Soft internal deadline: 75% of Supabase's paid-plan 400s wall-clock cap.
 * At this point we stop mid-book, re-enqueue the same source, and let the
 * next cron tick pick up the continuation from last_completed_page + 1.
 * This is NOT an error path — retry budget and failed_pages are untouched.
 */
const SOFT_DEADLINE_MS = 300_000;

type ProcessResult = { kind: "done" } | { kind: "defer" };

async function processSource(
  supabase: SupabaseClient<any, any>,
  payload: IngestionPayload,
): Promise<ProcessResult> {
  const startedAt = Date.now();
  const sourceId = typeof payload.source_id === "string" ? payload.source_id : undefined;
  if (!sourceId) throw new Error("Payload missing source_id");
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (!geminiKey) throw new Error("GEMINI_API_KEY not configured");

  const { data: src, error: sErr } = await supabase
    .from("will_ai_sources")
    .select("id, storage_path, title, source_type, total_pages, last_completed_page, failed_pages")
    .eq("id", sourceId)
    .maybeSingle();
  if (sErr) throw new Error(`Load source failed: ${sErr.message}`);
  if (!src) throw new Error(`Source ${sourceId} not found`);
  if (!src.storage_path) throw new Error(`Source ${sourceId} has no storage_path`);

  await supabase
    .from("will_ai_sources")
    .update({ status: "processing", error_message: null })
    .eq("id", sourceId);

  const { data: file, error: dlErr } = await supabase.storage
    .from(BUCKET)
    .download(src.storage_path);
  if (dlErr || !file) throw new Error(`Download failed: ${dlErr?.message ?? "no data"}`);
  const pdfBytes = new Uint8Array(await file.arrayBuffer());

  const mupdf: any = await import("npm:mupdf@1.28.0");
  const doc = mupdf.Document.openDocument(pdfBytes, "application/pdf");
  const totalPages: number = doc.countPages();

  if (src.total_pages !== totalPages) {
    await supabase
      .from("will_ai_sources")
      .update({ total_pages: totalPages })
      .eq("id", sourceId);
  }

  const csGray = mupdf.ColorSpace.DeviceGray;
  const csRgb = mupdf.ColorSpace.DeviceRGB;

  let currentSectionLabel: string | null = null;

  // Load prior failed_pages so multi-invocation runs don't lose earlier entries.
  const failedPages: Array<{ page: number; stage: string; error: string }> =
    Array.isArray(src.failed_pages)
      ? (src.failed_pages as Array<{ page: number; stage: string; error: string }>)
      : [];
  const recordFailure = (page: number, stage: string, err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    failedPages.push({ page, stage, error: msg.slice(0, 500) });
    console.warn(`will-ai-ingest: ${stage} failed`, { sourceId, page, err: msg, stack });
  };

  const lastCompleted: number = typeof src.last_completed_page === "number" ? src.last_completed_page : 0;
  const startIndex = Math.max(0, lastCompleted); // resume at (lastCompleted+1) → 0-indexed = lastCompleted

  for (let i = startIndex; i < totalPages; i++) {
    // Check soft deadline BEFORE starting a new page. If we're over budget and
    // there is still work left, persist state and hand off to the next tick.
    if (Date.now() - startedAt > SOFT_DEADLINE_MS) {
      await supabase
        .from("will_ai_sources")
        .update({ failed_pages: failedPages as any })
        .eq("id", sourceId);
      console.log("will-ai-ingest: soft deadline reached, deferring", {
        sourceId,
        lastCompletedPage: i, // pages before i are done
        totalPages,
        elapsedMs: Date.now() - startedAt,
      });
      return { kind: "defer" };
    }

    const pageNumber = i + 1;
    let page: any;
    try {
      page = doc.loadPage(i);
    } catch (err) {
      recordFailure(pageNumber, "load_page", err);
      await bumpLastCompleted(supabase, sourceId, pageNumber, failedPages);
      continue;
    }

    let text = "";
    let structured: any = null;
    try {
      const st = page.toStructuredText("preserve-whitespace");
      text = st.asText();
      structured = JSON.parse(st.asJSON());
    } catch (err) {
      recordFailure(pageNumber, "structured_text", err);
    }
    const cleanText = text.replace(/\s+/g, " ").trim();
    const charCount = cleanText.length;

    let graphicsCount = 0;
    try {
      graphicsCount = countGraphicsOps(mupdf, page);
    } catch (err) {
      // Surface the real mupdf error (message + stack) instead of silently
      // defaulting to 0. Page still falls through as text-only.
      recordFailure(pageNumber, "graphics_probe", err);
    }

    if (structured) {
      const detected = detectSectionLabel(structured);
      if (detected) currentSectionLabel = detected;
    }

    let variance = 0;
    try {
      const bounds = page.getBounds();
      const w = bounds[2] - bounds[0];
      const targetWidth = 32;
      const scale = w > 0 ? targetWidth / w : 0.1;
      const probeMatrix = mupdf.Matrix.scale(scale, scale);
      const probePix = page.toPixmap(probeMatrix, csGray, false, true);
      variance = grayscaleVariance(probePix.getPixels());
      probePix.destroy();
    } catch (err) {
      recordFailure(pageNumber, "variance_probe", err);
    }

    const isSectionDivider =
      charCount < SKIP_TEXT_MAX
      && SECTION_DIVIDER_RE.test(cleanText)
      && graphicsCount < 8;
    const isBlank =
      charCount < SKIP_TEXT_MAX && graphicsCount === 0 && variance < SKIP_VARIANCE_MAX;
    if (isSectionDivider || isBlank) {
      await bumpLastCompleted(supabase, sourceId, pageNumber, failedPages);
      continue;
    }

    const diagramByGraphics = graphicsCount >= 3;
    const diagramByScribble =
      charCount < SKIP_TEXT_MAX && variance >= SKIP_VARIANCE_MAX;
    const isDiagramEligible = diagramByGraphics || diagramByScribble;
    const hasSubstantialText = charCount >= DUAL_TEXT_MIN;

    if (isDiagramEligible) {
      try {
        const rasterMatrix = mupdf.Matrix.scale(2, 2);
        const pix = page.toPixmap(rasterMatrix, csRgb, false, true);
        const pngBytes: Uint8Array = pix.asPNG();
        pix.destroy();

        const imagePath = `${sourceId}/pages/${pageNumber}.png`;
        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(imagePath, pngBytes, {
            contentType: "image/png",
            upsert: true,
          });
        if (upErr) throw new Error(`Upload page image failed: ${upErr.message}`);

        const caption = await captionDiagram(
          geminiKey,
          bytesToBase64(pngBytes),
          hasSubstantialText ? cleanText : "",
        );
        const embedding = await fetchGeminiEmbedding(geminiKey, caption);

        const { error: insErr } = await supabase.from("will_ai_chunks").insert({
          source_id: sourceId,
          chunk_type: "diagram",
          content: caption,
          page_number: pageNumber,
          image_storage_path: imagePath,
          section_label: currentSectionLabel,
          embedding: embedding as any,
        });
        if (insErr) throw new Error(`Insert diagram chunk failed: ${insErr.message}`);
      } catch (err) {
        recordFailure(pageNumber, "diagram_chunk", err);
      }
    }

    const shouldEmitText = isDiagramEligible ? hasSubstantialText : charCount >= SKIP_TEXT_MAX;
    if (shouldEmitText) {
      try {
        const embedding = await fetchGeminiEmbedding(geminiKey, cleanText);
        const { error: insErr } = await supabase.from("will_ai_chunks").insert({
          source_id: sourceId,
          chunk_type: "text",
          content: cleanText,
          page_number: pageNumber,
          section_label: currentSectionLabel,
          embedding: embedding as any,
        });
        if (insErr) throw new Error(`Insert text chunk failed: ${insErr.message}`);
      } catch (err) {
        recordFailure(pageNumber, "text_chunk", err);
      }
    }

    // Persist per-page progress so a hard kill loses at most one page.
    await bumpLastCompleted(supabase, sourceId, pageNumber, failedPages);
  }

  await supabase
    .from("will_ai_sources")
    .update({
      status: "completed",
      error_message: null,
      failed_pages: failedPages as any,
      last_completed_page: totalPages,
    })
    .eq("id", sourceId);
  return { kind: "done" };
}

async function bumpLastCompleted(
  supabase: SupabaseClient<any, any>,
  sourceId: string,
  pageNumber: number,
  failedPages: Array<{ page: number; stage: string; error: string }>,
): Promise<void> {
  const { error } = await supabase
    .from("will_ai_sources")
    .update({
      last_completed_page: pageNumber,
      failed_pages: failedPages as any,
    })
    .eq("id", sourceId);
  if (error) {
    console.warn("will-ai-ingest: bumpLastCompleted failed", {
      sourceId,
      pageNumber,
      err: error.message,
    });
  }
}

// -------------------- request handler --------------------

Deno.serve(async (request) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("will-ai-ingest: missing env vars");
    return Response.json({ error: "Server configuration error" }, { status: 500 });
  }

  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const token = authHeader.slice("Bearer ".length).trim();

  const supabase: SupabaseClient<any, any> = createClient(supabaseUrl, supabaseServiceKey);

  // Accept either (a) the edge-runtime service-role key, or (b) the vault-stored
  // cron token that pg_net uses. Both grant service-role authority; they differ
  // only in issuance format (legacy JWT vs sb_secret_*). The vault key is fetched
  // through a service-role-only SECURITY DEFINER RPC.
  let accepted = token === supabaseServiceKey;
  if (!accepted) {
    const { data: cronToken, error: tokenErr } = await supabase.rpc("get_ingest_cron_token");
    if (tokenErr) {
      console.error("will-ai-ingest: cron token lookup failed", tokenErr);
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    accepted = typeof cronToken === "string" && cronToken.length > 0 && token === cronToken;
  }
  if (!accepted) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: messages, error: readError } = await supabase.rpc(
    "read_email_batch",
    {
      queue_name: QUEUE,
      batch_size: BATCH_SIZE,
      vt: VISIBILITY_TIMEOUT_SECONDS,
    },
  );
  if (readError) {
    console.error("will-ai-ingest: read queue failed", readError);
    return Response.json({ error: "Failed to read queue" }, { status: 500 });
  }
  if (!messages?.length) return Response.json({ processed: 0 });

  let processed = 0;
  let deferred = 0;
  for (const msg of messages) {
    const payload = (msg.message ?? {}) as IngestionPayload;
    const sourceId =
      typeof payload.source_id === "string" ? payload.source_id : undefined;
    const attemptNumber = msg.read_ct ?? 1;

    try {
      const result = await processSource(supabase, payload);
      if (result.kind === "defer") {
        // Time-budget stop, NOT a failure. Atomically delete the current
        // message and enqueue a fresh continuation in ONE SECURITY DEFINER
        // transaction, so a mid-way crash can't lose the message — the
        // original then falls back to its VT-based retry. status stays
        // 'processing'; retry budget is not consumed.
        const { error: requeueErr } = await supabase.rpc("requeue_will_ai_ingestion", {
          old_msg_id: msg.msg_id,
          queue_name: QUEUE,
          source_id: sourceId,
        });
        if (requeueErr) {
          console.error("will-ai-ingest: atomic requeue failed", {
            msg_id: msg.msg_id,
            source_id: sourceId,
            error: requeueErr,
          });
          // Do NOT delete the original message on failure — VT retry will pick it up.
        }
        deferred++;
        continue;
      }
      const { error: delError } = await supabase.rpc("delete_email", {
        queue_name: QUEUE,
        message_id: msg.msg_id,
      });
      if (delError) {
        console.error("will-ai-ingest: delete completed msg failed", {
          msg_id: msg.msg_id,
          error: delError,
        });
      }
      processed++;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error("will-ai-ingest: processing failed", {
        msg_id: msg.msg_id,
        attempt: attemptNumber,
        source_id: sourceId,
        error: errorMsg,
      });

      if (attemptNumber >= MAX_ATTEMPTS) {
        const reason = `Max retries (${MAX_ATTEMPTS}) exceeded: ${errorMsg}`;
        await markSourceFailed(supabase, sourceId, reason);
        const { error: dlqError } = await supabase.rpc("move_to_dlq", {
          source_queue: QUEUE,
          dlq_name: DLQ,
          message_id: msg.msg_id,
          payload,
        });
        if (dlqError) {
          console.error("will-ai-ingest: move to DLQ failed", {
            msg_id: msg.msg_id,
            error: dlqError,
          });
        }
      }
    }
  }

  return Response.json({ processed, deferred });
});
