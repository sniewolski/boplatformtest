import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { IndustryKey, PeriodKey } from "../config";
import type { StageVolumes } from "../lib/types";

const TABLE = "selling_systems_audit_conversion";

export type SavedConversionReview = {
  owner_id: string;
  industry: IndustryKey | null;
  period: PeriodKey;
  avg_deal_value: number | null;
  stage_volumes: Partial<StageVolumes> | null;
  updated_at: string;
};

export function useConversionReview(ownerId: string | undefined) {
  return useQuery({
    queryKey: ["ssa-conversion", ownerId],
    enabled: !!ownerId,
    queryFn: async (): Promise<SavedConversionReview | null> => {
      const { data, error } = await supabase
        // Table type not yet regenerated; cast through unknown.
        .from(TABLE as never)
        .select("owner_id, industry, period, avg_deal_value, stage_volumes, updated_at")
        .eq("owner_id", ownerId!)
        .maybeSingle();
      if (error) throw error;
      return (data as SavedConversionReview | null) ?? null;
    },
  });
}

export function useSaveConversionReview(ownerId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      industry: IndustryKey | null;
      period: PeriodKey;
      avgDealValue: number | null;
      volumes: Partial<StageVolumes>;
    }) => {
      if (!ownerId) throw new Error("Not signed in");
      const row = {
        owner_id: ownerId,
        industry: payload.industry,
        period: payload.period,
        avg_deal_value: payload.avgDealValue,
        stage_volumes: payload.volumes,
      };
      const { error } = await supabase
        .from(TABLE as never)
        .upsert(row as never, { onConflict: "owner_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["ssa-conversion", ownerId] });
    },
  });
}
