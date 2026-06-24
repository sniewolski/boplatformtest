import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  ActivityConfidenceKey,
  ActivityConsistencyKey,
  ActivityMetricKey,
  ActivityTrendKey,
  CallsBandKey,
  DataTrustKey,
  EmailsBandKey,
  GoalsSetKey,
  MeetingsBandKey,
  StrongestMetricKey,
  TrackingMethodKey,
} from "../config";

const TABLE = "selling_systems_audit_activity";

/**
 * Sales Activity Metrics intake. Two-blob persistence — `draft_answers`
 * autosaves on every change (owner-only); `submitted_answers` snapshot
 * copied from draft on Submit and is the only layer admin reads. Mirrors
 * `useProcessReview`.
 */

export type ActivityTrackingAnswers = {
  metrics?: ActivityMetricKey[];
  trackingMethod?: TrackingMethodKey | null;
};

export type ActivityVolumeAnswers = {
  callsBand?: CallsBandKey | null;
  emailsBand?: EmailsBandKey | null;
  meetingsBand?: MeetingsBandKey | null;
  trend?: ActivityTrendKey | null;
};

export type ActivityQualityAnswers = {
  confidence?: ActivityConfidenceKey | null;
  consistency?: ActivityConsistencyKey | null;
  strongestMetric?: StrongestMetricKey | null;
  strongestMetricOther?: string;
  goalsSet?: GoalsSetKey | null;
  goalsWhy?: string;
  dataTrust?: DataTrustKey | null;
};

export type ActivityAnswers = {
  tracking?: ActivityTrackingAnswers;
  volume?: ActivityVolumeAnswers;
  quality?: ActivityQualityAnswers;
  [k: string]: unknown;
};

export type ActivityIntakeRow = {
  owner_id: string;
  draft_answers: ActivityAnswers | null;
  submitted_answers: ActivityAnswers | null;
  has_unsubmitted_changes: boolean;
  submitted_at: string | null;
  updated_at: string;
};

export function useActivityIntake(ownerId: string | undefined) {
  return useQuery({
    queryKey: ["ssa-activity-intake", ownerId],
    enabled: !!ownerId,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    queryFn: async (): Promise<ActivityIntakeRow | null> => {
      const { data, error } = await supabase
        .from(TABLE as never)
        .select(
          "owner_id, draft_answers, submitted_answers, has_unsubmitted_changes, submitted_at, updated_at",
        )
        .eq("owner_id", ownerId!)
        .maybeSingle();
      if (error) throw error;
      return (data as ActivityIntakeRow | null) ?? null;
    },
  });
}

export function useSaveDraft(ownerId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { draft: ActivityAnswers; hasSubmitted: boolean }) => {
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
      void qc.invalidateQueries({ queryKey: ["ssa-activity-intake", ownerId] });
    },
  });
}

export function useSubmitIntake(ownerId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { draft: ActivityAnswers }) => {
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
      void qc.invalidateQueries({ queryKey: ["ssa-activity-intake", ownerId] });
    },
  });
}
