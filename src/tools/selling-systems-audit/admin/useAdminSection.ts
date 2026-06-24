/**
 * Admin-side React Query hooks for the per-owner audit review surface.
 *
 * Read-only against the six selling_systems_audit_* tables. Read/write against
 * audit_section_summaries and audit_section_notes (admin-only RLS — owners
 * have no access path). The owner's currency comes from owner_settings.
 *
 * All client-side via the regular supabase client. RLS allows admin (via
 * has_role) for every operation we issue here. The AI-summary generation is
 * the only operation that lives in a server function (sectionSummary.functions.ts).
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CurrencyCode } from "@/lib/format-currency";

export type AdminSectionKey =
  | "conversion"
  | "pipeline"
  | "process"
  | "activity"
  | "messaging"
  | "alignment";

const SECTION_TABLE: Record<AdminSectionKey, string> = {
  conversion: "selling_systems_audit_conversion",
  pipeline: "selling_systems_audit_pipeline",
  process: "selling_systems_audit_process",
  activity: "selling_systems_audit_activity",
  messaging: "selling_systems_audit_messaging",
  alignment: "selling_systems_audit_alignment",
};

export type SubmittedRow = {
  submitted_answers: Record<string, unknown> | null;
  submitted_at: string | null;
  updated_at: string;
};

export function useSubmittedAnswers(
  ownerId: string | undefined,
  sectionKey: AdminSectionKey,
) {
  return useQuery({
    queryKey: ["admin-audit", "submitted", ownerId, sectionKey],
    enabled: !!ownerId,
    queryFn: async (): Promise<SubmittedRow | null> => {
      const { data, error } = await supabase
        .from(SECTION_TABLE[sectionKey] as never)
        .select("submitted_answers, submitted_at, updated_at")
        .eq("owner_id", ownerId!)
        .maybeSingle();
      if (error) throw error;
      return (data as SubmittedRow | null) ?? null;
    },
  });
}

export function useOwnerCurrency(ownerId: string | undefined) {
  return useQuery({
    queryKey: ["admin-audit", "currency", ownerId],
    enabled: !!ownerId,
    queryFn: async (): Promise<CurrencyCode | null> => {
      const { data, error } = await supabase
        .from("owner_settings")
        .select("currency")
        .eq("owner_id", ownerId!)
        .maybeSingle();
      if (error) throw error;
      return (data?.currency as CurrencyCode | null) ?? null;
    },
  });
}

export type SectionSummaryRow = {
  summary_text: string;
  updated_at: string;
};

export function useSectionSummary(
  ownerId: string | undefined,
  sectionKey: AdminSectionKey,
) {
  return useQuery({
    queryKey: ["admin-audit", "summary", ownerId, sectionKey],
    enabled: !!ownerId,
    queryFn: async (): Promise<SectionSummaryRow | null> => {
      const { data, error } = await supabase
        .from("audit_section_summaries")
        .select("summary_text, updated_at")
        .eq("owner_id", ownerId!)
        .eq("section_key", sectionKey)
        .maybeSingle();
      if (error) throw error;
      return (data as SectionSummaryRow | null) ?? null;
    },
  });
}

export type SectionNoteRow = {
  body: string;
  updated_at: string;
};

export function useSectionNote(
  ownerId: string | undefined,
  sectionKey: AdminSectionKey,
) {
  return useQuery({
    queryKey: ["admin-audit", "note", ownerId, sectionKey],
    enabled: !!ownerId,
    queryFn: async (): Promise<SectionNoteRow | null> => {
      const { data, error } = await supabase
        .from("audit_section_notes")
        .select("body, updated_at")
        .eq("owner_id", ownerId!)
        .eq("section_key", sectionKey)
        .maybeSingle();
      if (error) throw error;
      return (data as SectionNoteRow | null) ?? null;
    },
  });
}

/**
 * Upsert the single coach note for (owner, section). Empty body → delete row.
 */
export function useSaveSectionNote(
  ownerId: string | undefined,
  sectionKey: AdminSectionKey,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) => {
      if (!ownerId) throw new Error("No owner");
      const trimmed = body.trim();
      if (!trimmed) {
        const { error } = await supabase
          .from("audit_section_notes")
          .delete()
          .eq("owner_id", ownerId)
          .eq("section_key", sectionKey);
        if (error) throw error;
        return null;
      }
      const { error } = await supabase
        .from("audit_section_notes")
        .upsert(
          { owner_id: ownerId, section_key: sectionKey, body: trimmed },
          { onConflict: "owner_id,section_key" },
        );
      if (error) throw error;
      return trimmed;
    },
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: ["admin-audit", "note", ownerId, sectionKey],
      });
    },
  });
}
