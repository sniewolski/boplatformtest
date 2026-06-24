import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  AdherenceKey,
  CrmKey,
  DocTemplateKey,
  DocumentationLevelKey,
  EnablementKey,
  ExperienceConsistencyKey,
  ProcessConsistencyKey,
  QualityAssessmentKey,
  ReplicabilityKey,
  SalesStage,
  ScriptMomentKey,
  UpdateFrequencyKey,
} from "../config";

const TABLE = "selling_systems_audit_process";

/**
 * Sales Process intake. Two-blob persistence — `draft_answers` autosaves on
 * every change (owner-only); `submitted_answers` snapshot copied from draft
 * on Submit and is the only layer admin reads. Mirrors `usePipelineReview`.
 *
 * Answers are nested by step key so the question set can evolve without a
 * schema migration. The `review` step captures nothing — it's read-back only.
 */

export type ProcessDefinitionAnswers = {
  documentationLevel?: DocumentationLevelKey | null;
  consistency?: ProcessConsistencyKey | null;
  replicability?: ReplicabilityKey | null;
};

export type ProcessStagesAnswers = {
  items?: SalesStage[];
};

export type ProcessAdherenceAnswers = {
  measuresAdherence?: boolean | null;
  adherenceLevel?: AdherenceKey | null;
  qualityAssessment?: QualityAssessmentKey | null;
  scriptMoments?: ScriptMomentKey[];
  scriptMomentsOther?: string;
  experienceConsistency?: ExperienceConsistencyKey | null;
};

export type ProcessToolsAnswers = {
  crm?: CrmKey[];
  crmOther?: string;
  updateFrequency?: UpdateFrequencyKey | null;
  docTemplates?: DocTemplateKey[];
  docTemplatesOther?: string;
  enablement?: EnablementKey[];
  enablementOther?: string;
  keyStages?: string[];
};

export type ProcessAnswers = {
  definition?: ProcessDefinitionAnswers;
  stages?: ProcessStagesAnswers;
  adherence?: ProcessAdherenceAnswers;
  tools?: ProcessToolsAnswers;
  [k: string]: unknown;
};

export type ProcessIntakeRow = {
  owner_id: string;
  draft_answers: ProcessAnswers | null;
  submitted_answers: ProcessAnswers | null;
  has_unsubmitted_changes: boolean;
  submitted_at: string | null;
  updated_at: string;
};

export function useProcessIntake(ownerId: string | undefined) {
  return useQuery({
    queryKey: ["ssa-process-intake", ownerId],
    enabled: !!ownerId,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    queryFn: async (): Promise<ProcessIntakeRow | null> => {
      const { data, error } = await supabase
        .from(TABLE as never)
        .select(
          "owner_id, draft_answers, submitted_answers, has_unsubmitted_changes, submitted_at, updated_at",
        )
        .eq("owner_id", ownerId!)
        .maybeSingle();
      if (error) throw error;
      return (data as ProcessIntakeRow | null) ?? null;
    },
  });
}

export function useSaveDraft(ownerId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { draft: ProcessAnswers; hasSubmitted: boolean }) => {
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
      void qc.invalidateQueries({ queryKey: ["ssa-process-intake", ownerId] });
    },
  });
}

export function useSubmitIntake(ownerId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { draft: ProcessAnswers }) => {
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
      void qc.invalidateQueries({ queryKey: ["ssa-process-intake", ownerId] });
    },
  });
}
