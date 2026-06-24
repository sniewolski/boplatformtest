import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  AlignCadenceKey,
  CpaKey,
  DealTracingKey,
  ExpectationGapKey,
  FunnelStageKey,
  IcpAlignmentKey,
  InsightFlowbackKey,
  LeadMatchKey,
  ObjectionContentKey,
  PainMatchKey,
  SharedGoalsKey,
} from "../config";

const TABLE = "selling_systems_audit_alignment";

/**
 * Marketing & Sales Alignment intake. Two-blob persistence — `draft_answers`
 * autosaves on every change (owner-only); `submitted_answers` snapshot
 * copied from draft on Submit and is the only layer admin reads. Mirrors
 * `useMessagingReview`.
 */

export type AlignmentLeadQualityAnswers = {
  icpAlignment?: IcpAlignmentKey | null;
  leadMatch?: LeadMatchKey | null;
};

export type AlignmentConsistencyAnswers = {
  expectationGap?: ExpectationGapKey | null;
  expectationGapDetail?: string;
  painPointMatch?: PainMatchKey | null;
};

export type AlignmentFeedbackAnswers = {
  insightFlowback?: InsightFlowbackKey | null;
  separateTeams?: boolean | null;
  reviewCadence?: AlignCadenceKey | null;
};

export type AlignmentEnablementAnswers = {
  stageContent?: FunnelStageKey[];
  objectionContent?: ObjectionContentKey | null;
};

export type AlignmentAttributionAnswers = {
  dealTracing?: DealTracingKey | null;
  cpaByChannel?: CpaKey | null;
  sharedGoals?: SharedGoalsKey | null;
};

export type AlignmentAnswers = {
  leadQuality?: AlignmentLeadQualityAnswers;
  consistency?: AlignmentConsistencyAnswers;
  feedback?: AlignmentFeedbackAnswers;
  enablement?: AlignmentEnablementAnswers;
  attribution?: AlignmentAttributionAnswers;
  [k: string]: unknown;
};

export type AlignmentIntakeRow = {
  owner_id: string;
  draft_answers: AlignmentAnswers | null;
  submitted_answers: AlignmentAnswers | null;
  has_unsubmitted_changes: boolean;
  submitted_at: string | null;
  updated_at: string;
};

export function useAlignmentIntake(ownerId: string | undefined) {
  return useQuery({
    queryKey: ["ssa-alignment-intake", ownerId],
    enabled: !!ownerId,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    queryFn: async (): Promise<AlignmentIntakeRow | null> => {
      const { data, error } = await supabase
        .from(TABLE as never)
        .select(
          "owner_id, draft_answers, submitted_answers, has_unsubmitted_changes, submitted_at, updated_at",
        )
        .eq("owner_id", ownerId!)
        .maybeSingle();
      if (error) throw error;
      return (data as AlignmentIntakeRow | null) ?? null;
    },
  });
}

export function useSaveDraft(ownerId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { draft: AlignmentAnswers; hasSubmitted: boolean }) => {
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
      void qc.invalidateQueries({ queryKey: ["ssa-alignment-intake", ownerId] });
    },
  });
}

export function useSubmitIntake(ownerId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { draft: AlignmentAnswers }) => {
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
      void qc.invalidateQueries({ queryKey: ["ssa-alignment-intake", ownerId] });
    },
  });
}
