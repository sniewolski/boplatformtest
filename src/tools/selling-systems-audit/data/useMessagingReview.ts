import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  CanTellKey,
  CompeteBasisKey,
  ConsistencyKey,
  EvidenceKey,
  IcpBasisKey,
  IcpWrittenKey,
  MatchKey,
  MessageLevelKey,
  ProofSpecificityKey,
  ProofTargetingKey,
  RecognitionKey,
  YesSomewhatNoKey,
} from "../config";

const TABLE = "selling_systems_audit_messaging";

/**
 * Messaging & Positioning intake. Two-blob persistence — `draft_answers`
 * autosaves on every change (owner-only); `submitted_answers` snapshot
 * copied from draft on Submit and is the only layer admin reads. Mirrors
 * `useActivityReview`.
 */

export type MessagingIcpAnswers = {
  industry?: string;
  companySize?: string;
  role?: string;
  situation?: string;
  mindset?: string;
  written?: IcpWrittenKey | null;
  basis?: IcpBasisKey | null;
};

export type MessagingProblemAnswers = {
  painfulProblem?: string;
  clientLanguage?: YesSomewhatNoKey | null;
  selfRecognition?: RecognitionKey | null;
  messageLevel?: MessageLevelKey | null;
};

export type MessagingValueAnswers = {
  outcome?: string;
  forWhom?: string;
  timeframe?: string;
  oneSentence?: string;
  differentiation?: string;
  prospectsCanTell?: CanTellKey | null;
  competeBasis?: CompeteBasisKey | null;
  bestClientReason?: string;
};

export type MessagingProofAnswers = {
  evidenceTypes?: EvidenceKey[];
  evidenceOther?: string;
  proofSpecificity?: ProofSpecificityKey | null;
  proofTargeting?: ProofTargetingKey | null;
  skepticProof?: string;
};

export type MessagingConsistencyAnswers = {
  crossChannel?: ConsistencyKey | null;
  clientDescriptionMatch?: MatchKey | null;
};

export type MessagingAnswers = {
  icp?: MessagingIcpAnswers;
  problem?: MessagingProblemAnswers;
  value?: MessagingValueAnswers;
  proof?: MessagingProofAnswers;
  consistency?: MessagingConsistencyAnswers;
  [k: string]: unknown;
};

export type MessagingIntakeRow = {
  owner_id: string;
  draft_answers: MessagingAnswers | null;
  submitted_answers: MessagingAnswers | null;
  has_unsubmitted_changes: boolean;
  submitted_at: string | null;
  updated_at: string;
};

export function useMessagingIntake(ownerId: string | undefined) {
  return useQuery({
    queryKey: ["ssa-messaging-intake", ownerId],
    enabled: !!ownerId,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    queryFn: async (): Promise<MessagingIntakeRow | null> => {
      const { data, error } = await supabase
        .from(TABLE as never)
        .select(
          "owner_id, draft_answers, submitted_answers, has_unsubmitted_changes, submitted_at, updated_at",
        )
        .eq("owner_id", ownerId!)
        .maybeSingle();
      if (error) throw error;
      return (data as MessagingIntakeRow | null) ?? null;
    },
  });
}

export function useSaveDraft(ownerId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { draft: MessagingAnswers; hasSubmitted: boolean }) => {
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
      void qc.invalidateQueries({ queryKey: ["ssa-messaging-intake", ownerId] });
    },
  });
}

export function useSubmitIntake(ownerId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { draft: MessagingAnswers }) => {
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
      void qc.invalidateQueries({ queryKey: ["ssa-messaging-intake", ownerId] });
    },
  });
}
