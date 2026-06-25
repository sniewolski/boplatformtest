import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AnswerMap, SalesCodeResult } from "../lib/types";
import { scoreSalesCode } from "../lib/scoring";

const TABLE = "salescode_results";

/**
 * SalesCode intake — two-blob persistence mirroring the audit sections.
 *   - `draft_answers` autosaves while the respondent works.
 *   - `submitted_answers` is a frozen snapshot copied from draft on Submit.
 * On submit we also persist the deterministic `type_code` and `traits` so
 * admin reads don't have to re-score, and the result is stable even if
 * scoring logic later evolves.
 */

export type SalesCodeIntakeRow = {
  owner_id: string;
  draft_answers: AnswerMap;
  submitted_answers: AnswerMap | null;
  has_unsubmitted_changes: boolean;
  submitted_at: string | null;
  updated_at: string;
  type_code: string | null;
  traits: SalesCodeResult["traits"] | null;
};

export function useSalesCodeIntake(ownerId: string | undefined) {
  return useQuery({
    queryKey: ["salescode-intake", ownerId],
    enabled: !!ownerId,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    queryFn: async (): Promise<SalesCodeIntakeRow | null> => {
      const { data, error } = await supabase
        .from(TABLE as never)
        .select(
          "owner_id, draft_answers, submitted_answers, has_unsubmitted_changes, submitted_at, updated_at, type_code, traits",
        )
        .eq("owner_id", ownerId!)
        .maybeSingle();
      if (error) throw error;
      return (data as SalesCodeIntakeRow | null) ?? null;
    },
  });
}

export function useSaveDraft(ownerId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { draft: AnswerMap; hasSubmitted: boolean }) => {
      if (!ownerId) throw new Error("Not signed in");
      const row = {
        owner_id: ownerId,
        draft_answers: payload.draft,
        ...(payload.hasSubmitted ? { has_unsubmitted_changes: true } : {}),
      };
      const { error } = await supabase
        .from(TABLE as never)
        .upsert(row as never, { onConflict: "owner_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["salescode-intake", ownerId] });
    },
  });
}

export function useSubmitSalesCode(ownerId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { draft: AnswerMap }) => {
      if (!ownerId) throw new Error("Not signed in");
      const result = scoreSalesCode(payload.draft);
      const row = {
        owner_id: ownerId,
        draft_answers: payload.draft,
        submitted_answers: payload.draft,
        has_unsubmitted_changes: false,
        submitted_at: new Date().toISOString(),
        type_code: result.type,
        traits: result.traits,
      };
      const { error } = await supabase
        .from(TABLE as never)
        .upsert(row as never, { onConflict: "owner_id" });
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["salescode-intake", ownerId] });
    },
  });
}

/**
 * Reopen a submitted assessment for retake. Flips `has_unsubmitted_changes`
 * on the existing row; draft_answers already mirrors the last submission
 * (Assessment.tsx upserts draft = submitted on submit) so the form
 * pre-fills with the previous answers. Submitting again overwrites the
 * stored result — no history is kept.
 */
export function useRetakeSalesCode(ownerId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!ownerId) throw new Error("Not signed in");
      const { error } = await supabase
        .from(TABLE as never)
        .update({ has_unsubmitted_changes: true } as never)
        .eq("owner_id", ownerId);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["salescode-intake", ownerId] });
    },
  });
}
