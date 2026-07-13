/**
 * Admin-only: fetch the entire dataset needed to export a single owner's
 * Selling Systems Audit as a Markdown file. One round-trip so the UI can
 * export everything the tabs render lazily.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { CurrencyCode } from "@/lib/format-currency";

const SECTION_KEYS = [
  "conversion",
  "pipeline",
  "process",
  "activity",
  "messaging",
  "alignment",
] as const;

export type AuditExportSectionKey = (typeof SECTION_KEYS)[number];

const SECTION_TABLE: Record<AuditExportSectionKey, string> = {
  conversion: "selling_systems_audit_conversion",
  pipeline: "selling_systems_audit_pipeline",
  process: "selling_systems_audit_process",
  activity: "selling_systems_audit_activity",
  messaging: "selling_systems_audit_messaging",
  alignment: "selling_systems_audit_alignment",
};

export type AuditExportSection = {
  key: AuditExportSectionKey;
  submittedAnswers: Record<string, unknown> | null;
  submittedAt: string | null;
  summaryText: string | null;
  noteBody: string | null;
};

export type AuditExportContentAsset = {
  id: string;
  category: string;
  title: string;
  input_type: "text" | "image" | "pdf" | "md";
  body_text: string | null;
  storage_path: string | null;
  created_at: string;
};

export type AuditExportData = {
  owner: {
    id: string;
    email: string;
    fullName: string | null;
  };
  currency: CurrencyCode | null;
  sections: AuditExportSection[];
  contentAssets: AuditExportContentAsset[];
};

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error) throw new Error("Failed to verify admin role");
  if (!data) throw new Error("Forbidden");
}

export const getAuditExportData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ ownerId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<AuditExportData> => {
    await assertAdmin(context.supabase, context.userId);

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name")
      .eq("id", data.ownerId)
      .maybeSingle();
    if (profileErr) throw new Error(profileErr.message);
    if (!profile) throw new Error("Owner not found");

    const { data: settings } = await supabaseAdmin
      .from("owner_settings")
      .select("currency")
      .eq("owner_id", data.ownerId)
      .maybeSingle();

    const { data: summaries, error: sumErr } = await supabaseAdmin
      .from("audit_section_summaries")
      .select("section_key, summary_text")
      .eq("owner_id", data.ownerId);
    if (sumErr) throw new Error(sumErr.message);

    const { data: notes, error: notesErr } = await supabaseAdmin
      .from("audit_section_notes")
      .select("section_key, body")
      .eq("owner_id", data.ownerId);
    if (notesErr) throw new Error(notesErr.message);

    const summaryBy = new Map<string, string>();
    for (const r of summaries ?? []) {
      summaryBy.set((r as any).section_key, (r as any).summary_text ?? "");
    }
    const noteBy = new Map<string, string>();
    for (const r of notes ?? []) {
      noteBy.set((r as any).section_key, (r as any).body ?? "");
    }

    const sections: AuditExportSection[] = [];
    for (const key of SECTION_KEYS) {
      const { data: row, error } = await supabaseAdmin
        .from(SECTION_TABLE[key] as any)
        .select("submitted_answers, submitted_at")
        .eq("owner_id", data.ownerId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      sections.push({
        key,
        submittedAnswers:
          ((row as any)?.submitted_answers as Record<string, unknown> | null) ??
          null,
        submittedAt: ((row as any)?.submitted_at as string | null) ?? null,
        summaryText: summaryBy.get(key) || null,
        noteBody: noteBy.get(key) || null,
      });
    }

    const { data: assets, error: assetsErr } = await supabaseAdmin
      .from("content_review_assets")
      .select(
        "id, category, title, input_type, body_text, storage_path, created_at",
      )
      .eq("owner_id", data.ownerId)
      .order("created_at", { ascending: true });
    if (assetsErr) throw new Error(assetsErr.message);

    return {
      owner: {
        id: profile.id as string,
        email: profile.email as string,
        fullName: (profile.full_name as string | null) ?? null,
      },
      currency: ((settings as any)?.currency as CurrencyCode | null) ?? null,
      sections,
      contentAssets: (assets ?? []) as AuditExportContentAsset[],
    };
  });
