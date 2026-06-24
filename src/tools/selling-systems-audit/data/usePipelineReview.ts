import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  AgeBandKey,
  CadenceKey,
  DurationBandKey,
  ForecastMethodKey,
  HorizonKey,
  ProportionKey,
  ReviewDataKey,
  StageCanonicalKey,
  TeamMethodKey,
  TrendKey,
} from "../config";

const TABLE = "selling_systems_audit_pipeline";

/**
 * Pipeline Health intake. Two-blob persistence — `draft_answers` autosaves on
 * every change (owner-only); `submitted_answers` snapshot copied from draft on
 * Submit and is the only layer admin reads. Mirrors `useConversionReview`.
 *
 * Answers are nested by step key so the question set can evolve without a
 * schema migration. The `summary` step captures nothing — it's read-back only.
 */

export type PipelineVolumeAnswers = {
  pipelineValue?: number | null;
  quarterlyTarget?: number | null;
  activeOppCount?: number | null;
  trend90d?: TrendKey | null;
};

export type PipelineVelocityAnswers = {
  avgOppAge?: AgeBandKey | null;
  noActivity30d?: ProportionKey | null;
  stuckPastCycle?: ProportionKey | null;
  stallStage?: StageCanonicalKey | null;
  stallStageOther?: string;
  stallDuration?: DurationBandKey | null;
};

export type PipelineForecastingAnswers = {
  forecastMethod?: ForecastMethodKey | null;
  forecastHorizon?: HorizonKey | null;
  reviewCadence?: CadenceKey | null;
  hasSalespeople?: boolean | null;
  teamReviewCadence?: CadenceKey | null;
  teamReviewMethods?: TeamMethodKey[];
  teamReviewMethodsOther?: string;
  reviewDataPoints?: ReviewDataKey[];
  reviewDataOther?: string;
  reviewDecisions?: string;
};

export type PipelineAnswers = {
  volume?: PipelineVolumeAnswers;
  velocity?: PipelineVelocityAnswers;
  forecasting?: PipelineForecastingAnswers;
  [k: string]: unknown;
};

export type PipelineIntakeRow = {
  owner_id: string;
  draft_answers: PipelineAnswers | null;
  submitted_answers: PipelineAnswers | null;
  has_unsubmitted_changes: boolean;
  submitted_at: string | null;
  updated_at: string;
};

export function usePipelineIntake(ownerId: string | undefined) {
  return useQuery({
    queryKey: ["ssa-pipeline-intake", ownerId],
    enabled: !!ownerId,
    // Warm cache across in-app navigation so returning hydrates instantly
    // instead of flashing defaults during refetch.
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    queryFn: async (): Promise<PipelineIntakeRow | null> => {
      const { data, error } = await supabase
        // Table types regenerate later; cast through unknown until then.
        .from(TABLE as never)
        .select(
          "owner_id, draft_answers, submitted_answers, has_unsubmitted_changes, submitted_at, updated_at",
        )
        .eq("owner_id", ownerId!)
        .maybeSingle();
      if (error) throw error;
      return (data as PipelineIntakeRow | null) ?? null;
    },
  });
}

/**
 * Autosave the draft. Whole-blob upsert — caller assembles the next draft.
 * `has_unsubmitted_changes` only flips to true once a submission exists.
 */
export function useSaveDraft(ownerId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { draft: PipelineAnswers; hasSubmitted: boolean }) => {
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
      void qc.invalidateQueries({ queryKey: ["ssa-pipeline-intake", ownerId] });
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
    mutationFn: async (payload: { draft: PipelineAnswers }) => {
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
      void qc.invalidateQueries({ queryKey: ["ssa-pipeline-intake", ownerId] });
    },
  });
}
