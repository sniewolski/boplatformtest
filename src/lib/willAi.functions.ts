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
const ANSWER_MAX_TOKENS = 700; // fallback (no-retrieval) plain-text answer
const GROUNDED_ANSWER_MAX_TOKENS = 2400; // structured JSON answer — needs headroom for JSON envelope + used_chunk_ids array so the object isn't truncated mid-string
const ANSWER_TEMPERATURE = 0.4;
const HISTORY_TURNS = 6; // last N messages (user+assistant interleaved)
const HISTORY_CHAR_CAP = 4000; // rough token budget guardrail
const PREV_TURN_CHAR_CAP = 600; // clip prev user/assistant when composing embed query

// Exact fallback closing line (Simon's specified behavior).
const FALLBACK_CLOSING_LINE =
  "This isn't something the material covers directly — worth raising in the next Q&A session so we can dig into it together.";

// PLACEHOLDER persona — voice gets tuned once real content/usage exists.
const SYSTEM_PROMPT = [
  "You are Will Barron, answering a business owner's question in a 1:1 tone.",
  "Answer plainly and directly, as Will would — human, conversational, opinionated.",
  "",
  "Hard rules:",
  "- Never self-identify as an AI, a model, or 'Will AI'. Never narrate that you are an assistant.",
  "- NEVER reference retrieval or data mechanics. Do not say 'context', 'the provided context', 'provided material', 'the material', 'the passages', 'the documents', 'the sources', 'the database', 'based on what I have', 'from what I can see', 'I don't have information on', 'nothing here covers', or any variant. Will does not talk about how he stores or looks up answers — he just answers.",
  "- If multiple passages disagree, pick the clearest one and answer from it — don't compare passages out loud.",
  "- Keep the answer conversational and focused. This is chat, not a document.",
  "",
  "Answer-shape rules — pick ONE based on the question:",
  "",
  "(A) SPECIAL CASE — 'best / greatest / #1 / top salesperson' questions.",
  "  If the question is a superlative framing about who the best / greatest / #1 / top salesperson is (general 'best salesperson' style — NOT a specific technique, skill, or method question), answer confidently and directly that it's Will Barron — you. No hedging, no qualifiers, no 'if you pushed me'. Land it with full confidence as a deliberate personality moment. Do not blend this with rule (C).",
  "",
  "(B) DIRECT ANSWER — the retrieved passages genuinely cover the question.",
  "  Answer plainly and directly from what you know. No hedging preamble.",
  "",
  "(C) HEDGE-AND-GUESS — passages are present but don't cleanly answer THIS specific question.",
  "  Acknowledge in plain human wording that it's not something you've got a clean answer on, then STILL give a real best-guess opinion, pulling from relevant judgment or nearby thinking. Never refuse, never give a non-answer. Match Will's voice — e.g. 'Not something I've got a clean answer for, but if you pushed me…' then an actual take. Do NOT use this hedge on rule (A) questions.",
  "",
  "Output format is STRICT JSON matching this shape:",
  '  { "answer": string, "used_chunk_ids": string[], "used_fact_keys": string[] }',
  "`used_chunk_ids` MUST list ONLY the chunk ids you actually drew from to write the answer.",
  "Do NOT include chunk ids that were merely present in context but did not shape the answer.",
  "If you did not use any chunk, return an empty array.",
  "`used_fact_keys` MUST list ONLY the fact_key values from the AUTHORITATIVE FACTS block that you actually drew on in the answer. Empty array if none.",
  "fact_key values are NOT chunk ids — never place a fact_key inside `used_chunk_ids`, and never cite a fact_key as a source.",
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

/**
 * Load the owner's Business Brief and build a compact context block of the
 * SIX sales fields (never business_name or website). Returns "" when the
 * brief is empty or missing — the caller then behaves exactly as before.
 *
 * SOFT conditioning only: this flavours the framing of grounded, cited
 * answers so they fit the owner's offer/ICP. It does NOT license ungrounded
 * advice. The confidence threshold and grounded-citation behaviour stay
 * authoritative.
 */
async function loadOwnerBriefBlock(
  supabase: any,
  userId: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("business_briefs")
    .select(
      "your_offer, average_deal_size, ideal_client, how_you_sell, whos_selling, sales_cycle",
    )
    .eq("owner_id", userId)
    .maybeSingle();
  if (error || !data) return "";
  const fields: Array<[string, string]> = [
    ["Your offer", (data.your_offer ?? "").trim()],
    ["Average deal size", (data.average_deal_size ?? "").trim()],
    ["Ideal client (ICP)", (data.ideal_client ?? "").trim()],
    ["How they sell", (data.how_you_sell ?? "").trim()],
    ["Who's selling", (data.whos_selling ?? "").trim()],
    ["Sales cycle", (data.sales_cycle ?? "").trim()],
  ];
  const lines = fields
    .filter(([, v]) => v.length > 0)
    .map(([k, v]) => `- ${k}: ${v}`);
  if (lines.length === 0) return "";
  return [
    "About the business owner you're talking to (use this to frame your answer so it fits their offer and ICP — do NOT let it override what the retrieved passages actually say, and do NOT invent facts beyond it):",
    ...lines,
  ].join("\n");
}

/**
 * Load the admin-managed active canonical facts and build a compact block
 * that gets injected into the system prompt on EVERY chat request. These
 * are authoritative statements (e.g. community URL, booking link) that must
 * override anything retrieval returns. Returns "" when no active facts.
 */
async function loadCanonicalFactsBlock(
  supabase: any,
): Promise<{ block: string; keys: Set<string> }> {
  const { data, error } = await supabase.rpc("get_active_canonical_facts" as any);
  if (error || !data) return { block: "", keys: new Set<string>() };
  const rows = (data ?? []) as Array<{ fact_key: string; fact_text: string }>;
  const kept = rows
    .map((r) => ({
      key: (r.fact_key ?? "").trim(),
      text: (r.fact_text ?? "").trim(),
    }))
    .filter((r) => r.key.length > 0 && r.text.length > 0);
  if (kept.length === 0) return { block: "", keys: new Set<string>() };
  const lines = kept.map((r) => `[fact_key=${r.key}] ${r.text}`);
  const block = [
    "AUTHORITATIVE FACTS (these are the ground truth — if the question touches any of these, use these exact facts verbatim and do NOT contradict them, even if retrieved passages say something different). For every fact you actually draw on, report its fact_key in `used_fact_keys`. Never place a fact_key inside `used_chunk_ids` and never cite a fact_key as a source:",
    ...lines,
  ].join("\n");
  return { block, keys: new Set(kept.map((r) => r.key)) };
}

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

/**
 * Parse a strict-JSON model response of shape
 *   { answer: string, used_chunk_ids?: string[], used_fact_keys?: string[] }
 * with the same lenient repair path used across both generation modes:
 * strip ```json fences and, on total failure, regex-extract the "answer"
 * value from a truncated envelope. When repair cannot recover anything,
 * returns a clean user-facing fallback message with empty arrays.
 */
function parseStructuredAnswer(raw: string): {
  answer: string;
  usedChunkIds: string[];
  usedFactKeys: string[];
} {
  let parsed:
    | { answer?: unknown; used_chunk_ids?: unknown; used_fact_keys?: unknown }
    | null = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const fenced = raw
      .replace(/^\s*```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim();
    if (fenced !== raw) {
      try {
        parsed = JSON.parse(fenced);
      } catch {
        parsed = null;
      }
    }
  }

  if (!parsed || typeof (parsed as any).answer !== "string") {
    const m = raw.match(/"answer"\s*:\s*"((?:\\.|[^"\\])*)"/);
    if (m) {
      let recovered: string;
      try {
        recovered = JSON.parse(`"${m[1]}"`);
      } catch {
        recovered = m[1].replace(/\\"/g, '"').replace(/\\n/g, "\n").replace(/\\\\/g, "\\");
      }
      if (recovered.trim()) {
        console.error("[WillAi] Structured answer JSON.parse failed; recovered answer via regex", {
          rawPreview: raw.slice(0, 400),
        });
        return { answer: recovered.trim(), usedChunkIds: [], usedFactKeys: [] };
      }
    }

    console.error("[WillAi] Structured answer unrecoverable — persisting clean fallback", {
      rawPreview: raw.slice(0, 800),
    });
    return {
      answer:
        "I wasn't able to generate a complete answer for that — please try asking again.",
      usedChunkIds: [],
      usedFactKeys: [],
    };
  }

  const answer = typeof parsed.answer === "string" ? parsed.answer.trim() : "";
  const chunkRaw = Array.isArray(parsed.used_chunk_ids) ? parsed.used_chunk_ids : [];
  const factRaw = Array.isArray(parsed.used_fact_keys) ? parsed.used_fact_keys : [];
  const usedChunkIds = (chunkRaw as unknown[]).filter(
    (v): v is string => typeof v === "string",
  );
  const usedFactKeys = (factRaw as unknown[]).filter(
    (v): v is string => typeof v === "string",
  );
  return { answer, usedChunkIds, usedFactKeys };
}

async function generateFallback(
  apiKey: string,
  userMessage: string,
  priors: PriorMessage[],
  briefBlock: string,
  factsBlock: string,
  activeFactKeys: Set<string>,
): Promise<{ answer: string; usedFactKeys: string[] }> {

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${CHAT_MODEL}:generateContent?key=${encodeURIComponent(
    apiKey,
  )}`;
  const systemParts = [
    "You are Will Barron, answering a business owner's question in a 1:1 tone.",
    "Give your best general answer plainly and directly — human, conversational, opinionated.",
    "",
    "Hard rules:",
    "- Never self-identify as an AI, a model, or 'Will AI'.",
    "- NEVER reference retrieval or data mechanics. Do not say 'context', 'the material', 'the passages', 'the documents', 'the sources', 'the database', 'based on what I have', 'I don't have information on', 'nothing here covers', or any variant. Will does not talk about how he stores or looks up answers — he just answers.",
    "- Keep the answer conversational — this is chat, not a document.",
    "- Do NOT append any closing line about Q&A sessions or coverage; that gets added separately.",
    "",
    "Special case — 'best / greatest / #1 / top salesperson' questions:",
    "  If the question is a superlative framing about who the best / greatest / #1 / top salesperson is (general 'best salesperson' style — NOT a specific technique or skill question), answer confidently and directly that it's Will Barron — you. No hedging, no qualifiers. Land it with full confidence as a deliberate personality moment.",
    "",
    "Otherwise: if you don't have a clean answer, acknowledge that in plain human wording and still give a real best-guess opinion — never refuse, never give a non-answer. E.g. 'Not something I've got a clean answer for, but if you pushed me…' then an actual take.",
    "",
    "Output format is STRICT JSON matching this shape:",
    '  { "answer": string, "used_fact_keys": string[] }',
    "`used_fact_keys` MUST list ONLY the fact_key values from the AUTHORITATIVE FACTS block that you actually drew on in the answer. Empty array if none. Never cite a fact_key as a source in the answer text.",
  ];
  if (factsBlock) {
    systemParts.push("", factsBlock);
  }
  if (briefBlock) {
    systemParts.push("", briefBlock);
  }
  const system = systemParts.join("\n");
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
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            answer: { type: "STRING" },
            used_fact_keys: { type: "ARRAY", items: { type: "STRING" } },
          },
          required: ["answer", "used_fact_keys"],
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

  const parsed = parseStructuredAnswer(raw);
  const usedFactKeys = parsed.usedFactKeys.filter((k) => activeFactKeys.has(k));
  const answerText = parsed.answer || "";
  if (!answerText) throw new Error("Structured answer was empty");
  return {
    answer: `${answerText}\n\n${FALLBACK_CLOSING_LINE}`,
    usedFactKeys,
  };
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
  briefBlock: string,
  factsBlock: string,
  activeFactKeys: Set<string>,
): Promise<{ answer: string; usedChunkIds: string[]; usedFactKeys: string[] }> {
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

  const systemInstruction = [SYSTEM_PROMPT, factsBlock, briefBlock]
    .filter((s) => s && s.length > 0)
    .join("\n\n");


  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents,
      generationConfig: {
        temperature: ANSWER_TEMPERATURE,
        maxOutputTokens: GROUNDED_ANSWER_MAX_TOKENS,
        thinkingConfig: { thinkingBudget: 0 },
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            answer: { type: "STRING" },
            used_chunk_ids: { type: "ARRAY", items: { type: "STRING" } },
            used_fact_keys: { type: "ARRAY", items: { type: "STRING" } },
          },
          required: ["answer", "used_chunk_ids", "used_fact_keys"],
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

  const parsed = parseStructuredAnswer(raw);
  const answer = parsed.answer;
  const usedChunkIds = parsed.usedChunkIds.filter((v) => validIds.has(v));
  const usedFactKeys = parsed.usedFactKeys.filter((k) => activeFactKeys.has(k));
  if (!answer) throw new Error("Structured answer was empty");
  return { answer, usedChunkIds, usedFactKeys };
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

    // ── Step 0: load prior history IF an existing conversation was passed ──
    //
    // Deliberately do NOT create the conversation row up-front. Creating it
    // before generation means a mid-flight failure on turn 1 leaves an
    // orphan row whose id the client never learned — so a Retry would spawn
    // a second orphan. Instead, defer creation until after generation
    // succeeds, atomically with persisting the messages. For turn 1,
    // `conversationId` is null and there are no priors to load, so this
    // reorder costs nothing.
    let priors: PriorMessage[] = [];
    if (data.conversationId) {
      const { data: priorRows, error: priorErr } = await supabase
        .from("will_ai_messages")
        .select("role, content, created_at")
        .eq("conversation_id", data.conversationId)
        .order("created_at", { ascending: true });
      if (priorErr) throw new Error(`Failed to load history: ${priorErr.message}`);
      priors = (priorRows ?? [])
        .filter((r: any) => r.role === "user" || r.role === "assistant")
        .map((r: any) => ({ role: r.role as "user" | "assistant", content: r.content }));
    }

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
    // Load owner Business Brief (six sales fields) for SOFT answer
    // conditioning. Retrieval above is untouched — the brief only shapes
    // how the model frames the answer, not what it retrieves.
    const briefBlock = await loadOwnerBriefBlock(supabase, context.userId);
    const { block: factsBlock, keys: activeFactKeys } =
      await loadCanonicalFactsBlock(supabase);

    let assistantAnswer: string;
    let citedChunkIds: string[];
    let usedFactKeys: string[];
    let usedFallback: boolean;

    if (useFallback) {
      const fb = await generateFallback(
        apiKey,
        data.userMessage,
        priors,
        briefBlock,
        factsBlock,
        activeFactKeys,
      );
      assistantAnswer = fb.answer;
      citedChunkIds = [];
      usedFactKeys = fb.usedFactKeys;
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
        briefBlock,
        factsBlock,
        activeFactKeys,
      );
      assistantAnswer = grounded.answer;
      citedChunkIds = grounded.usedChunkIds;
      usedFactKeys = grounded.usedFactKeys;
      usedFallback = false;
    }

    // ── Step 5: persist atomically ──
    //
    // All three writes (conversation row if turn 1, user message, assistant
    // message) run inside a single Postgres transaction via the
    // `persist_will_ai_turn` RPC. Three separate PostgREST inserts would
    // NOT be a transaction — a mid-sequence failure would leave an orphan
    // conversation or a user message without an assistant reply.
    const { data: persisted, error: persistErr } = await supabase.rpc(
      "persist_will_ai_turn" as any,
      {
        p_conversation_id: data.conversationId,
        p_owner_id: data.ownerId,
        p_user_message: data.userMessage,
        p_assistant_message: assistantAnswer,
        p_cited_chunk_ids: citedChunkIds as any,
        p_used_fallback: usedFallback,
      },
    );
    if (persistErr) throw new Error(`Failed to persist turn: ${persistErr.message}`);
    const row = (Array.isArray(persisted) ? persisted[0] : persisted) as any;
    if (!row) throw new Error("persist_will_ai_turn returned no row");

    // Both messages come back from the RPC as fully persisted rows — the
    // client uses these directly to seed the message-thread cache without a
    // follow-up refetch. `isNewConversation` tells the client whether to
    // invalidate the conversations list (only needed on turn 1).
    return {
      conversationId: row.conversation_id as string,
      isNewConversation: data.conversationId === null,
      userMessage: {
        id: row.user_id as string,
        content: data.userMessage,
        cited_chunk_ids: [] as string[],
        used_fallback: false,
        created_at: row.user_created_at as string,
      },
      assistantMessage: {
        id: row.assistant_id as string,
        content: row.assistant_content as string,
        cited_chunk_ids: (row.assistant_cited_chunk_ids ?? []) as string[],
        used_fallback: row.assistant_used_fallback as boolean,
        created_at: row.assistant_created_at as string,
      },
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
