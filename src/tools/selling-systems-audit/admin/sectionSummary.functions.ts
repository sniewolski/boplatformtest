/**
 * Admin-only AI section-summary server function.
 *
 * Sibling to generateAiDraftNote (content/admin.functions.ts), generic across
 * the six jsonb audit sections. Reads submitted_answers via the admin client,
 * calls Gemini directly for a brief recap + a few "worth exploring" questions,
 * upserts the result into audit_section_summaries, returns the text.
 *
 * The summary is call-prep scaffolding for the coach — never owner-facing,
 * never a diagnosis, never scored.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Single source of truth for the model id used by audit section summaries.
 * Keep it here — if it ever needs to change, change it once.
 */
export const AUDIT_SUMMARY_MODEL = "gemini-2.5-flash" as const;

const SECTION_KEYS = [
  "conversion",
  "pipeline",
  "process",
  "activity",
  "messaging",
  "alignment",
] as const;

type SectionKey = (typeof SECTION_KEYS)[number];

const SECTION_TABLE: Record<SectionKey, string> = {
  conversion: "selling_systems_audit_conversion",
  pipeline: "selling_systems_audit_pipeline",
  process: "selling_systems_audit_process",
  activity: "selling_systems_audit_activity",
  messaging: "selling_systems_audit_messaging",
  alignment: "selling_systems_audit_alignment",
};

const SECTION_LABEL: Record<SectionKey, string> = {
  conversion: "Conversion review",
  pipeline: "Pipeline health",
  process: "Sales process",
  activity: "Sales activity",
  messaging: "Messaging & positioning",
  alignment: "Sales & marketing alignment",
};

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error) throw new Error("Failed to verify admin role");
  if (!data) throw new Error("Forbidden");
}

const SYSTEM_PROMPT = [
  "You are preparing a sales coach for a 1:1 call with a business owner.",
  "The owner has submitted a self-audit. Your job is brief, neutral CALL PREP — never a diagnosis.",
  "",
  "Hard rules:",
  "- Tone: peer-to-peer, professional, concrete. No coaching clichés, no motivational language.",
  "- Never assign scores, ratings, grades, percentages, or maturity levels.",
  "- Never offer prescriptions, recommendations, plans, or advice. The call is where that happens.",
  "- Stay strictly inside what the owner actually submitted. Do not infer beyond it.",
  "- Treat blanks as blanks — do not guess what the owner meant.",
  "",
  "Output exactly two short sections, in this order, using these exact Markdown headings:",
  "",
  "## What they said",
  "3–6 short bullets. Plain recap of the substantive answers, in the owner's own framing.",
  "Skip blanks. No analysis, no judgement words (good/weak/strong/missing/gap).",
  "",
  "## Worth exploring on the call",
  "2–4 bullets, each phrased as an open question the coach could ask.",
  "Anchor each question to something the owner actually wrote.",
  "No leading questions, no assumed answers.",
  "",
  "Keep the whole response under ~180 words.",
].join("\n");

export const generateSectionSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        ownerId: z.string().uuid(),
        sectionKey: z.enum(SECTION_KEYS),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const tableName = SECTION_TABLE[data.sectionKey as SectionKey];
    const { data: row, error: rowErr } = await supabaseAdmin
      .from(tableName as any)
      .select("submitted_answers, submitted_at")
      .eq("owner_id", data.ownerId)
      .maybeSingle();
    if (rowErr) throw new Error(rowErr.message);

    const submitted = (row as any)?.submitted_answers;
    if (!submitted || (typeof submitted === "object" && Object.keys(submitted).length === 0)) {
      throw new Error("This owner hasn't submitted this section yet.");
    }

    const userPrompt = [
      `Section: ${SECTION_LABEL[data.sectionKey as SectionKey]}`,
      "",
      "Owner's submitted answers (raw JSON — keys map to the section's questions):",
      "```json",
      JSON.stringify(submitted, null, 2),
      "```",
    ].join("\n");

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${AUDIT_SUMMARY_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 600,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      if (res.status === 429) throw new Error("Gemini rate limit exceeded. Try again shortly.");
      throw new Error(`AI summary failed (${res.status}): ${text.slice(0, 300)}`);
    }

    const json: any = await res.json();
    const summary: string = (json?.candidates?.[0]?.content?.parts ?? [])
      .map((p: any) => p?.text ?? "")
      .join("")
      .trim();
    if (!summary) throw new Error("AI returned an empty summary.");

    const { error: upErr } = await supabaseAdmin
      .from("audit_section_summaries")
      .upsert(
        {
          owner_id: data.ownerId,
          section_key: data.sectionKey,
          summary_text: summary,
        },
        { onConflict: "owner_id,section_key" },
      );
    if (upErr) throw new Error(upErr.message);

    return { summaryText: summary };
  });
