/**
 * Will AI ingestion queue processor.
 *
 * Cron-triggered. For each message on `will_ai_ingestion`:
 *   1. Download the uploaded PDF from `will-ai-content`.
 *   2. Open with mupdf; count pages.
 *   3. For every page:
 *        - Extract text (`page.toStructuredText().asText()`).
 *        - Count image/vector blocks via structured JSON.
 *        - Low-res pixel-variance probe (32-wide grayscale pixmap).
 *        - Decide skip / text-only / diagram-only / dual (text+diagram)
 *          per the approved heuristic.
 *        - For text chunks: embed with `gemini-embedding-001`
 *          (outputDimensionality: 768) and insert `chunk_type='text'`.
 *        - For diagram chunks: full-res raster, upload PNG to
 *          `${source_id}/pages/${page}.png`, caption with
 *          `gemini-2.5-flash`, embed caption, insert `chunk_type='diagram'`
 *          with `image_storage_path` set.
 *   4. Update `will_ai_sources.status='completed'` + `total_pages`.
 *
 * Failure handling matches the email processor: retry budget of 2,
 * then move to DLQ + mark source `failed` with `error_message`.
 * Visibility timeout is 60min so a full book fits in one lease.
 */
import { createFileRoute } from "@tanstack/react-router";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const MAX_ATTEMPTS = 2;
const BATCH_SIZE = 1;
const VISIBILITY_TIMEOUT_SECONDS = 60 * 60;
const QUEUE = "will_ai_ingestion";
const DLQ = "will_ai_ingestion_dlq";
const BUCKET = "will-ai-content";

// Heuristic thresholds (approved plan):
const SKIP_TEXT_MAX = 40;
const SKIP_VARIANCE_MAX = 25; // grayscale variance below this ≈ blank/uniform page
const DUAL_TEXT_MIN = 100;
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

async function fetchGeminiEmbedding(
  apiKey: string,
  text: string,
): Promise<number[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${encodeURIComponent(apiKey)}`;
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
    throw new Error(`Embedding failed (${res.status}): ${body.slice(0, 300)}`);
  }
  const json: any = await res.json();
  const values: number[] | undefined = json?.embedding?.values;
  if (!values || values.length === 0) throw new Error("Embedding response missing values");
  return values;
}

async function captionDiagram(
  apiKey: string,
  pngBase64: string,
  pageContext: string,
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${CAPTION_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const system =
    "You are describing a diagram from a sales book so it can be retrieved by semantic search. " +
    "Write 3–6 sentences that state (a) what the diagram shows, (b) the labels/axes/steps, and " +
    "(c) the point the author appears to be making with it. Do not add commentary or headings.";
  const parts: any[] = [
    { text: system },
    { inlineData: { mimeType: "image/png", data: pngBase64 } },
  ];
  if (pageContext.trim()) {
    parts.push({ text: `Adjacent page text (for context, do not repeat verbatim):\n${pageContext.slice(0, 1500)}` });
  }
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ role: "user", parts }] }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Caption failed (${res.status}): ${body.slice(0, 300)}`);
  }
  const json: any = await res.json();
  const caption: string = ((json?.candidates?.[0]?.content?.parts ?? []) as any[])
    .map((p: any) => p?.text ?? "")
    .join("")
    .trim();
  if (!caption) throw new Error("Caption response was empty");
  return caption;
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

/** Variance of a grayscale pixel buffer. Higher = more visual content. */
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

/**
 * Count drawing operations on a page (vector fills, strokes, raster fills).
 *
 * We deliberately do NOT use mupdf's structured-text JSON blocks here —
 * that API surfaces only `text` and (with `preserve-images`) `image`
 * blocks, so it's blind to vector-drawn diagrams. Running a custom
 * Device across the page is the only way to see fillPath/strokePath
 * calls, which is where diagrams live in a typeset book.
 */
function countGraphicsOps(mupdf: any, page: any): number {
  let n = 0;
  const device = new mupdf.Device({
    fillPath: () => { n++; },
    strokePath: () => { n++; },
    fillImage: () => { n++; },
  });
  try {
    page.run(device, mupdf.Matrix.identity);
  } catch {
    // If the device can't run, fall through with whatever count accrued.
  }
  return n;
}

/** Section-divider pages ("02. Influence | SECTION 1 - SKILLS") are
 * skipped even when they carry a big illustration — they add no
 * retrievable content and their captions crowd search results. */
const SECTION_DIVIDER_RE = /\b(section|chapter|part|module)\b/i;

/**
 * Try to detect the running section-footer text on this page (e.g.
 * "SECTION 1 - SKILLS"). Scan text lines in the bottom ~18% of the page
 * for a short, uppercase-ish string that looks like a section marker.
 * Returns null when no plausible candidate is found — the caller carries
 * the last-seen label forward.
 */
function detectSectionLabel(structuredJson: any): string | null {
  const blocks = structuredJson?.blocks ?? [];
  if (!Array.isArray(blocks) || blocks.length === 0) return null;

  // Compute page height from block bboxes (mupdf JSON uses [x0,y0,x1,y1]).
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
    if (/^\d+$/.test(text)) continue; // page number
    const letters = text.replace(/[^A-Za-z]/g, "");
    if (letters.length < 3) continue;
    const isSectionish =
      /\b(section|chapter|part|module)\b/i.test(text) ||
      // Mostly uppercase running header (>=70% of letters uppercase).
      letters.replace(/[a-z]/g, "").length / letters.length >= 0.7;
    if (isSectionish) return text;
  }
  return null;
}

// -------------------- per-source processor --------------------

async function processSource(
  supabase: SupabaseClient<any, any>,
  payload: IngestionPayload,
): Promise<void> {
  const sourceId = typeof payload.source_id === "string" ? payload.source_id : undefined;
  if (!sourceId) throw new Error("Payload missing source_id");
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) throw new Error("GEMINI_API_KEY not configured");

  const { data: src, error: sErr } = await supabase
    .from("will_ai_sources")
    .select("id, storage_path, title, source_type")
    .eq("id", sourceId)
    .maybeSingle();
  if (sErr) throw new Error(`Load source failed: ${sErr.message}`);
  if (!src) throw new Error(`Source ${sourceId} not found`);
  if (!src.storage_path) throw new Error(`Source ${sourceId} has no storage_path`);

  await supabase
    .from("will_ai_sources")
    .update({ status: "processing", error_message: null })
    .eq("id", sourceId);

  // Download PDF from storage.
  const { data: file, error: dlErr } = await supabase.storage
    .from(BUCKET)
    .download(src.storage_path);
  if (dlErr || !file) throw new Error(`Download failed: ${dlErr?.message ?? "no data"}`);
  const pdfBytes = new Uint8Array(await file.arrayBuffer());

  // Dynamic import — mupdf is a big WASM module we don't want at module scope.
  const mupdf: any = await import("mupdf");
  const doc = mupdf.Document.openDocument(pdfBytes, "application/pdf");
  const totalPages: number = doc.countPages();

  await supabase
    .from("will_ai_sources")
    .update({ total_pages: totalPages })
    .eq("id", sourceId);

  const identityMatrix = mupdf.Matrix.identity;
  const csGray = mupdf.ColorSpace.DeviceGray;
  const csRgb = mupdf.ColorSpace.DeviceRGB;

  // Section-footer label carries forward: once we've seen "SECTION 2 - X"
  // it stays attached to every subsequent chunk until we detect a new one.
  let currentSectionLabel: string | null = null;
  // Per-page failures surfaced back to admins on the source row.
  const failedPages: Array<{ page: number; stage: string; error: string }> = [];
  const recordFailure = (page: number, stage: string, err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    failedPages.push({ page, stage, error: msg.slice(0, 500) });
    console.warn(`will-ai-ingest: ${stage} failed`, { sourceId, page, err: msg });
  };

  for (let i = 0; i < totalPages; i++) {
    const pageNumber = i + 1;
    let page: any;
    try {
      page = doc.loadPage(i);
    } catch (err) {
      recordFailure(pageNumber, "load_page", err);
      continue;
    }

    // 1. Extract text.
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
    const graphicsCount = countGraphicsOps(mupdf, page);

    // Update running section label if this page shows a new one.
    if (structured) {
      const detected = detectSectionLabel(structured);
      if (detected) currentSectionLabel = detected;
    }

    // 2. Low-res grayscale variance probe (cheap render).
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

    // 3. Decide.
    // Section-divider pages ("02. Influence | SECTION 1 - SKILLS") always
    // skip, even with a big illustration — they're navigation, not content.
    const isSectionDivider =
      charCount < SKIP_TEXT_MAX && SECTION_DIVIDER_RE.test(cleanText);
    const isBlank =
      charCount < SKIP_TEXT_MAX && graphicsCount === 0 && variance < SKIP_VARIANCE_MAX;
    if (isSectionDivider || isBlank) {
      continue;
    }

    // ≥3 drawing ops distinguishes real diagrams from page furniture
    // (footer rules, page-number underlines each register as 1 stroke).
    const diagramByGraphics = graphicsCount >= 3;
    const diagramByScribble =
      charCount < SKIP_TEXT_MAX && variance >= SKIP_VARIANCE_MAX;
    const isDiagramEligible = diagramByGraphics || diagramByScribble;
    const hasSubstantialText = charCount >= DUAL_TEXT_MIN;

    // 4a. Diagram chunk (full-res raster + caption + embed).
    if (isDiagramEligible) {
      try {
        const rasterMatrix = mupdf.Matrix.scale(2, 2); // ~144dpi
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
        // A single-page failure shouldn't abort the whole book — record and
        // move on. The whole-book attempt is retried by pgmq on hard throws.
        recordFailure(pageNumber, "diagram_chunk", err);
      }
    }

    // 4b. Text chunk (normal path OR the text half of a dual page).
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
  }

  await supabase
    .from("will_ai_sources")
    .update({
      status: "completed",
      error_message: null,
      failed_pages: failedPages as any,
    })
    .eq("id", sourceId);
}

// -------------------- route handler --------------------

export const Route = createFileRoute("/api/public/hooks/will-ai-ingest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!supabaseUrl || !supabaseServiceKey) {
          console.error("will-ai-ingest: missing env vars");
          return Response.json({ error: "Server configuration error" }, { status: 500 });
        }

        const authHeader = request.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        const token = authHeader.slice("Bearer ".length).trim();
        if (token !== supabaseServiceKey) {
          return Response.json({ error: "Forbidden" }, { status: 403 });
        }

        const supabase: SupabaseClient<any, any> = createClient(supabaseUrl, supabaseServiceKey);

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
        for (const msg of messages) {
          const payload = (msg.message ?? {}) as IngestionPayload;
          const sourceId =
            typeof payload.source_id === "string" ? payload.source_id : undefined;
          const attemptNumber = msg.read_ct ?? 1;

          try {
            await processSource(supabase, payload);
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

        return Response.json({ processed });
      },
    },
  },
});
