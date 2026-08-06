import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Owner-facing `audits` layer. Each audit is scoped to one service the owner
 * offers; every section row hangs off `audit_id`.
 */

export type AuditRow = {
  id: string;
  owner_id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

const SECTION_TABLES = [
  "selling_systems_audit_conversion",
  "selling_systems_audit_pipeline",
  "selling_systems_audit_process",
  "selling_systems_audit_activity",
  "selling_systems_audit_messaging",
  "selling_systems_audit_alignment",
] as const;

export function useAudits(ownerId: string | undefined) {
  return useQuery({
    queryKey: ["ssa-audits", ownerId],
    enabled: !!ownerId,
    staleTime: 60_000,
    queryFn: async (): Promise<AuditRow[]> => {
      const { data, error } = await supabase
        .from("audits")
        .select("id, owner_id, name, created_at, updated_at")
        .eq("owner_id", ownerId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as AuditRow[];
    },
  });
}

/** audit_id → number of the six sections with a non-null submitted_at. */
export function useAuditProgress(ownerId: string | undefined) {
  return useQuery({
    queryKey: ["ssa-audit-progress", ownerId],
    enabled: !!ownerId,
    staleTime: 30_000,
    queryFn: async (): Promise<Record<string, number>> => {
      const results = await Promise.all(
        SECTION_TABLES.map(async (table) => {
          const { data, error } = await supabase
            .from(table as never)
            .select("audit_id, submitted_at")
            .eq("owner_id", ownerId!);
          if (error) throw error;
          return (data ?? []) as unknown as {
            audit_id: string;
            submitted_at: string | null;
          }[];
        }),
      );
      const counts: Record<string, number> = {};
      for (const rows of results) {
        for (const row of rows) {
          if (!row.audit_id) continue;
          counts[row.audit_id] = counts[row.audit_id] ?? 0;
          if (row.submitted_at) counts[row.audit_id] += 1;
        }
      }
      return counts;
    },
  });
}

export function useCreateAudit(ownerId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string): Promise<AuditRow> => {
      if (!ownerId) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("audits")
        .insert({ owner_id: ownerId, name })
        .select("id, owner_id, name, created_at, updated_at")
        .single();
      if (error) throw error;
      return data as AuditRow;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["ssa-audits", ownerId] });
    },
  });
}

export function useRenameAudit(ownerId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: string; name: string }) => {
      const { error } = await supabase
        .from("audits")
        .update({ name: payload.name })
        .eq("id", payload.id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["ssa-audits", ownerId] });
    },
  });
}
