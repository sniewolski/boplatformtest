/**
 * Will AI chat entry point.
 *
 * One server function, `sendWillAiMessage`, owns the full lifecycle of a turn:
 *
 *   1. Ensure a conversation row (create if `conversationId` is null).
 *   2. Build the retrieval query text (turn 1 = user message as-is; turn 2+
 *      = prev-user + prev-assistant + current, plain concatenation, so
 *      pronouns/references resolve without a separate rewrite LLM call).
 *   3. Embed with `gemini-embedding-001` @ 768 dims (matching Phase 2).
 *   4. `match_will_ai_chunks(query_embedding, 8)` — nearest-first via <=>.
 *   5. Threshold gate on top1.distance → fallback (Step 4a) or grounded
 *      generation (Step 4b) with structured JSON output for citation
 *      accuracy.
 *   6. Persist user + assistant messages (assistant carries
 *      `cited_chunk_ids` and `used_fallback`).
 *
 * Discipline mirrors the audit-summary function: same model
 * (`gemini-3.5-flash`), temperature/maxOutputTokens/thinkingConfig style.
 *
 * Deliberately out of scope for Phase 5:
 *   - No rate limiting / per-user throttling.
 *   - No dedup between text + diagram chunks from the same page.
 *   - Persona/voice is a functional placeholder — see SYSTEM_PROMPT.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// -------------------- constants --------------------

const CHAT_MODEL = "gemini-3.5-flash" as const;
const EMBEDDING_MODEL = "gemini-embedding-001" as const;
const EMBEDDING_DIMS = 768;

// Retrieval budget.
const RETRIEVE_COUNT = 8;

/**
 * PLACEHOLDER threshold — needs real adjustment once Phase 6 (the chat UI)
 * is live and we can test against actual questions with actual content.
 * Values in cosine-distance space where 0 = identical, 2 = opposite.
 * 0.4 is a soft first guess; expect to move this after real usage.
 */
const RETRIEVAL_DISTANCE_THRESHOLD = 0.4;

// Answer discipline.
const ANSWER_MAX_TOKENS = 700; // conversational answer, not a long-form doc
const ANSWER_TEMPERATURE = 0.4;
const HISTORY_TURNS = 6; // last N messages (user+assistant interleaved)
const HISTORY_CHAR_CAP = 4000; // rough token budget guardrail
const PREV_TURN_CHAR_CAP = 600; // clip prev user/assistant when composing embed query

// Exact fallback closing line (Simon's specified behavior).
const FALLBACK_CLOSING_LINE =
  "This isn't something the material covers directly — worth raising in the next Q&A session so we can dig into it together.";

// PLACEHOLDER persona — voice gets tuned once real content/usage exists.
const SYSTEM_PROMPT = [
  "You are Will, answering a business owner's question in a 1:1 tone.",
  "Answer plainly and directly, as Will would.",
  "",
  "Hard rules:",
  "- Answer ONLY from the provided context passages. Do not invent facts.",
  "- Never self-identify as an AI, a model, or 'Will AI'. Never narrate that you are an assistant.",
  "- Never say things like 'based on the provided context', 'the passages show', 'according to the material'. Just answer.",
  "- If multiple passages disagree, pick the clearest one and answer from it — don't compare passages out loud.",
  "- Keep the answer conversational and focused. This is chat, not a document.",
  "",
  "Output format is STRICT JSON matching this shape:",
  '  { "answer": string, "used_chunk_ids": string[] }',
  "`used_chunk_ids` MUST list ONLY the chunk ids you actually drew from to write the answer.",
  "Do NOT include chunk ids that were merely present in context but did not shape the answer.",
  "If you did not use any chunk, return an empty array.",
].join("\n");

// -------------------- types --------------------

type MatchedChunk = {
  id: string;
  source_id: string;
  chunk_type: string;
  content: string;
  section_label: string | null;
  page_number: number | null;
  image_storage_path: string | null;
  distance: number;
};

type PriorMessage = { role: "user" | "assistant"; content: string };

// -------------------- helpers --------------------

async function embedQuery(apiKey: string, text: string): Promise<number[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${encodeURIComponent(
    apiKey,
  )}`;
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

/**
 * Turn 1: embed the user message as-is.
 * Turn 2+: prepend the immediately prior user Q + assistant A (clipped) so
 * pronouns like "that" / "tell me more" resolve. Plain string concat — NOT
 * a separate LLM rewrite call.
 */
function buildRetrievalQuery(userMessage: string, priors: PriorMessage[]): string {
  const lastAssistant = [...priors].reverse().find((m) => m.role === "assistant");
  const lastUser = [...priors].reverse().find((m) => m.role === "user");
  if (!lastAssistant && !lastUser) return userMessage;
  const parts: string[] = [];
  if (lastUser) parts.push(`Previous question: ${lastUser.content.slice(0, PREV_TURN_CHAR_CAP)}`);
  if (lastAssistant)
    parts.push(`Previous answer: ${lastAssistant.content.slice(0, PREV_TURN_CHAR_CAP)}`);
  parts.push(`Current question: ${userMessage}`);
  return parts.join("\n\n");
}

function buildContextBlock(
  chunks: MatchedChunk[],
  sourceTitles: Map<string, string>,
): string {
  return chunks
    .map((c, i) => {
      const meta: string[] = [];
      const title = sourceTitles.get(c.source_id);
      if (title) meta.push(title);
      if (c.section_label) meta.push(c.section_label);
      if (c.page_number != null) meta.push(`p.${c.page_number}`);
      if (c.chunk_type === "diagram") meta.push("diagram caption");
      const header = `[chunk_id=${c.id}] ${meta.join(" · ")}`.trim();
      return `${header}\n${c.content}`;
    })
    .join("\n\n---\n\n");
}

/**
 * Convert prior messages into a compact contents[] history for Gemini, capped
 * to the last HISTORY_TURNS entries and HISTORY_CHAR_CAP total characters
 * (rough token budget — we're not doing precise tokenisation).
 */
function buildHistoryContents(priors: PriorMessage[]): any[] {
  const tail = priors.slice(-HISTORY_TURNS);
  let budget = HISTORY_CHAR_CAP;
  const out: any[] = [];
  for (const m of tail) {
    if (budget <= 0) break;
    const content = m.content.slice(0, budget);
    budget -= content.length;
    out.push({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: content }],
    });
  }
  return out;
}

async function generateFallback(apiKey: string, userMessage: string, priors: PriorMessage[]): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${CHAT_MODEL}:generateContent?key=${encodeURIComponent(
    apiKey,
  )}`;
  const system = [
    "You are Will, answering a business owner's question in a 1:1 tone.",
    "You do NOT have specific source material for this question. Give your best general answer plainly and directly.",
    "Never self-identify as an AI. Never say 'based on the material' or similar meta phrases.",
    "Keep the answer conversational — this is chat, not a document.",
    "Do NOT append any closing line about Q&A sessions or coverage; that gets added separately.",
  ].join("\n");
  const contents = [
    ...buildHistoryContents(priors),
    { role: "user", parts: [{ text: userMessage }] },
  ];
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents,
      generationConfig: {
        temperature: ANSWER_TEMPERATURE,
        maxOutputTokens: ANSWER_MAX_TOKENS,
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    if (res.status === 429) throw new Error("Rate limit — try again shortly.");
    throw new Error(`Generation failed (${res.status}): ${body.slice(0, 300)}`);
  }
  const json: any = await res.json();
  const text: string = (json?.candidates?.[0]?.content?.parts ?? [])
    .map((p: any) => p?.text ?? "")
    .join("")
    .trim();
  if (!text) throw new Error("Empty answer from model");
  return `${text}\n\n${FALLBACK_CLOSING_LINE}`;
}

/**
 * Grounded generation with structured JSON output. The schema forces the
 * model to declare exactly which chunk ids it drew from, which is what gets
 * persisted as cited_chunk_ids (NOT the full retrieved set).
 */
async function generateGrounded(
  apiKey: string,
  userMessage: string,
  priors: PriorMessage[],
  chunks: MatchedChunk[],
  sourceTitles: Map<string, string>,
): Promise<{ answer: string; usedChunkIds: string[] }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${CHAT_MODEL}:generateContent?key=${encodeURIComponent(
    apiKey,
  )}`;
  const contextBlock = buildContextBlock(chunks, sourceTitles);
  const validIds = new Set(chunks.map((c) => c.id));
  const userPrompt = [
    "Context passages (use ONLY these to answer):",
    "",
    contextBlock,
    "",
    "---",
    "",
    `Question: ${userMessage}`,
  ].join("\n");
  const contents = [
    ...buildHistoryContents(priors),
    { role: "user", parts: [{ text: userPrompt }] },
  ];

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents,
      generationConfig: {
        temperature: ANSWER_TEMPERATURE,
        maxOutputTokens: ANSWER_MAX_TOKENS,
        thinkingConfig: { thinkingBudget: 0 },
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            answer: { type: "STRING" },
            used_chunk_ids: { type: "ARRAY", items: { type: "STRING" } },
          },
          required: ["answer", "used_chunk_ids"],
        },
      },
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    if (res.status === 429) throw new Error("Rate limit — try again shortly.");
    throw new Error(`Generation failed (${res.status}): ${body.slice(0, 300)}`);
  }
  const json: any = await res.json();
  const raw: string = (json?.candidates?.[0]?.content?.parts ?? [])
    .map((p: any) => p?.text ?? "")
    .join("")
    .trim();
  if (!raw) throw new Error("Empty answer from model");

  let parsed: { answer?: unknown; used_chunk_ids?: unknown };
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Structured mode should never emit non-JSON, but if it does, treat the
    // whole body as the answer and record no citations rather than crashing.
    return { answer: raw, usedChunkIds: [] };
  }
  const answer = typeof parsed.answer === "string" ? parsed.answer.trim() : "";
  const usedRaw = Array.isArray(parsed.used_chunk_ids) ? parsed.used_chunk_ids : [];
  // Only keep ids that were actually in the retrieved set (guards against
  // model hallucinating an id).
  const usedChunkIds = (usedRaw as unknown[])
    .filter((v): v is string => typeof v === "string" && validIds.has(v));
  if (!answer) throw new Error("Structured answer was empty");
  return { answer, usedChunkIds };
}

// -------------------- server function --------------------

export const sendWillAiMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        ownerId: z.string().uuid(),
        conversationId: z.string().uuid().nullable(),
        userMessage: z.string().trim().min(1).max(4000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    // Ownership check: the caller can only send as themselves. (Admin-as-user
    // impersonation is not part of this phase.)
    if (data.ownerId !== context.userId) {
      throw new Error("Forbidden");
    }
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

    const supabase = context.supabase;

    // ── Step 0: ensure conversation ──
    let conversationId = data.conversationId;
    if (!conversationId) {
      const { data: conv, error: convErr } = await supabase
        .from("will_ai_conversations")
        .insert({ owner_id: data.ownerId })
        .select("id")
        .single();
      if (convErr) throw new Error(`Failed to create conversation: ${convErr.message}`);
      conversationId = conv.id;
    }

    // ── Step 1: load prior history for query construction + LLM context ──
    const { data: priorRows, error: priorErr } = await supabase
      .from("will_ai_messages")
      .select("role, content, created_at")
      .eq("conversation_id", conversationId!)
      .order("created_at", { ascending: true });
    if (priorErr) throw new Error(`Failed to load history: ${priorErr.message}`);
    const priors: PriorMessage[] = (priorRows ?? [])
      .filter((r: any) => r.role === "user" || r.role === "assistant")
      .map((r: any) => ({ role: r.role as "user" | "assistant", content: r.content }));

    // ── Step 2: retrieval ──
    const retrievalQuery = buildRetrievalQuery(data.userMessage, priors);
    const queryEmbedding = await embedQuery(apiKey, retrievalQuery);

    const { data: matched, error: matchErr } = await supabase.rpc(
      "match_will_ai_chunks" as any,
      {
        query_embedding: queryEmbedding as any,
        match_count: RETRIEVE_COUNT,
      },
    );
    if (matchErr) throw new Error(`Retrieval failed: ${matchErr.message}`);
    const allMatches = (matched ?? []) as MatchedChunk[];

    // ── Step 3: confidence gate ──
    const top1 = allMatches[0];
    const useFallback = !top1 || top1.distance > RETRIEVAL_DISTANCE_THRESHOLD;

    // ── Step 4: generation ──
    let assistantAnswer: string;
    let citedChunkIds: string[];
    let usedFallback: boolean;

    if (useFallback) {
      assistantAnswer = await generateFallback(apiKey, data.userMessage, priors);
      citedChunkIds = [];
      usedFallback = true;
    } else {
      // Filter to only chunks that also clear the threshold — don't force
      // weak matches into context just to fill the quota.
      const contextChunks = allMatches
        .filter((c) => c.distance <= RETRIEVAL_DISTANCE_THRESHOLD)
        .slice(0, RETRIEVE_COUNT);

      // Fetch source titles for the chunks we're actually showing.
      const sourceIds = Array.from(new Set(contextChunks.map((c) => c.source_id)));
      const { data: srcRows } = await supabase
        .from("will_ai_sources")
        .select("id, title")
        .in("id", sourceIds);
      const sourceTitles = new Map<string, string>(
        (srcRows ?? []).map((r: any) => [r.id as string, r.title as string]),
      );

      const grounded = await generateGrounded(
        apiKey,
        data.userMessage,
        priors,
        contextChunks,
        sourceTitles,
      );
      assistantAnswer = grounded.answer;
      citedChunkIds = grounded.usedChunkIds;
      usedFallback = false;
    }

    // ── Step 5: persist ──
    const { error: userInsErr } = await supabase.from("will_ai_messages").insert({
      conversation_id: conversationId!,
      owner_id: data.ownerId,
      role: "user",
      content: data.userMessage,
      cited_chunk_ids: [],
      used_fallback: false,
    });
    if (userInsErr) throw new Error(`Failed to save user message: ${userInsErr.message}`);

    const { data: assistantRow, error: asstInsErr } = await supabase
      .from("will_ai_messages")
      .insert({
        conversation_id: conversationId!,
        owner_id: data.ownerId,
        role: "assistant",
        content: assistantAnswer,
        cited_chunk_ids: citedChunkIds as any,
        used_fallback: usedFallback,
      })
      .select("id, content, cited_chunk_ids, used_fallback, created_at")
      .single();
    if (asstInsErr) throw new Error(`Failed to save assistant message: ${asstInsErr.message}`);

    return {
      conversationId: conversationId!,
      assistantMessage: assistantRow,
      // Debug/observability — Phase 6 can decide whether to surface any of it.
      debug: {
        topDistance: top1?.distance ?? null,
        retrievedCount: allMatches.length,
        contextCount: usedFallback
          ? 0
          : allMatches.filter((c) => c.distance <= RETRIEVAL_DISTANCE_THRESHOLD).length,
        usedFallback,
      },
    };
  });
