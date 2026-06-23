import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { IndustryKey, PeriodKey } from "../config";
import type { StageVolumes } from "../lib/types";

const TABLE = "selling_systems_audit_conversion";

/**
 * Owner intake is stored as two JSONB blobs keyed by config field keys:
 *
 *  - `draft_answers`     — autosaved on every change; owner-only.
 *  - `submitted_answers` — snapshot copied from draft on Submit; the only
 *                          layer the admin reads.
 *
 * After the first submission, any edit flips `has_unsubmitted_changes = true`
 * until the owner re-submits.
 *
 * The Foundation step (industry / period / volumes / avgDealValue) lives under
 * `answers.foundation`. Other stages add their own keys as Pass B/C lands.
 * Keep answer shapes config-keyed so the question set can evolve without a
 * schema migration.
 */

export type FoundationAnswers = {
  industry: IndustryKey | null;
  period: PeriodKey;
  avgDealValue: number | null;
  volumes: Partial<StageVolumes>;
};

export type IntakeAnswers = {
  foundation?: FoundationAnswers;
  // Future stage keys: leadGeneration, prospecting, discovery, proposal,
  // closing, summary — added by Pass C.
  [k: string]: unknown;
};

export type ConversionIntakeRow = {
  owner_id: string;
  draft_answers: IntakeAnswers | null;
  submitted_answers: IntakeAnswers | null;
  has_unsubmitted_changes: boolean;
  submitted_at: string | null;
  updated_at: string;
};

export function useConversionIntake(ownerId: string | undefined) {
  return useQuery({
    queryKey: ["ssa-conversion-intake", ownerId],
    enabled: !!ownerId,
    queryFn: async (): Promise<ConversionIntakeRow | null> => {
      const { data, error } = await supabase
        // Table types regenerate after the migration; cast through unknown
        // until then so the rest of the app keeps compiling.
        .from(TABLE as never)
        .select(
          "owner_id, draft_answers, submitted_answers, has_unsubmitted_changes, submitted_at, updated_at",
        )
        .eq("owner_id", ownerId!)
        .maybeSingle();
      if (error) throw error;
      return (data as ConversionIntakeRow | null) ?? null;
    },
  });
}

/**
 * Autosave the draft. Whole-blob upsert — caller assembles the next draft and
 * passes it in. Debounce at the call site (~500–800ms).
 *
 * `has_unsubmitted_changes` only flips to true once a submission exists.
 * Before the first submit there's nothing to be "dirty" against.
 */
export function useSaveDraft(ownerId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { draft: IntakeAnswers; hasSubmitted: boolean }) => {
      if (!ownerId) throw new Error("Not signed in");
      const row = {
        owner_id: ownerId,
        draft_answers: payload.draft,
        // Only mark dirty after a first submission has been made.
        ...(payload.hasSubmitted ? { has_unsubmitted_changes: true } : {}),
      };
      const { error } = await supabase
        .from(TABLE as never)
        .upsert(row as never, { onConflict: "owner_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["ssa-conversion-intake", ownerId] });
    },
  });
}

/**
 * Copy the current draft into `submitted_answers`, stamp `submitted_at`,
 * clear the dirty flag. Caller passes the draft to snapshot so we don't
 * race a pending autosave.
 */
export function useSubmitIntake(ownerId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { draft: IntakeAnswers }) => {
      if (!ownerId) throw new Error("Not signed in");
      const row = {
        owner_id: ownerId,
        draft_answers: payload.draft,
        submitted_answers: payload.draft,
        has_unsubmitted_changes: false,
        submitted_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from(TABLE as never)
        .upsert(row as never, { onConflict: "owner_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["ssa-conversion-intake", ownerId] });
    },
  });
}
