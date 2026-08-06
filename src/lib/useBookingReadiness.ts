import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AUDIT_SECTIONS } from "@/tools/selling-systems-audit/config";

/**
 * Reads `submitted_at` from the six stepped audit-section tables plus
 * `salescode_results` for the current owner. "Done" = submitted_at != null;
 * `has_unsubmitted_changes` is intentionally ignored — once submitted, the
 * section counts as complete.
 *
 * Multi-audit: an owner can have several audits (one per service). Readiness
 * is judged against the owner's BEST audit — the one with the most submitted
 * sections. "All complete" therefore means at least one audit has all six
 * sections submitted. Content Review is excluded (no submission concept).
 */

type IncompleteItem = { key: string; label: string; route: string };

const AUDIT_TABLES = {
  conversion: "selling_systems_audit_conversion",
  pipeline: "selling_systems_audit_pipeline",
  process: "selling_systems_audit_process",
  activity: "selling_systems_audit_activity",
  messaging: "selling_systems_audit_messaging",
  alignment: "selling_systems_audit_alignment",
} as const;

type AuditGateKey = keyof typeof AUDIT_TABLES;

const auditLabel = (key: AuditGateKey): string =>
  AUDIT_SECTIONS.find((s) => s.key === key)?.label ?? key;

const auditRoute = (auditId: string | null, key: AuditGateKey): string =>
  auditId
    ? `/app/tools/selling-systems-audit/${auditId}/${key}`
    : `/app/tools/selling-systems-audit`;

async function readSectionRows(
  table: string,
  ownerId: string,
): Promise<{ audit_id: string; submitted_at: string | null }[]> {
  const { data, error } = await supabase
    .from(table as never)
    .select("audit_id, submitted_at")
    .eq("owner_id", ownerId);
  if (error) throw error;
  return (data ?? []) as unknown as { audit_id: string; submitted_at: string | null }[];
}

async function readSalescodeSubmittedAt(ownerId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("salescode_results" as never)
    .select("submitted_at")
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (error) throw error;
  return (data as { submitted_at: string | null } | null)?.submitted_at ?? null;
}

export function useBookingReadiness(ownerId: string | undefined) {
  const query = useQuery({
    queryKey: ["booking-readiness", ownerId],
    enabled: !!ownerId,
    staleTime: 60_000,
    queryFn: async () => {
      const auditKeys = Object.keys(AUDIT_TABLES) as AuditGateKey[];
      const [auditRows, salescodeAt, auditList] = await Promise.all([
        Promise.all(auditKeys.map((key) => readSectionRows(AUDIT_TABLES[key], ownerId!))),
        readSalescodeSubmittedAt(ownerId!),
        supabase
          .from("audits")
          .select("id")
          .eq("owner_id", ownerId!)
          .order("created_at", { ascending: true })
          .then(({ data, error }) => {
            if (error) throw error;
            return (data ?? []) as { id: string }[];
          }),
      ]);

      // Per-audit set of submitted section keys.
      const byAudit = new Map<string, Set<AuditGateKey>>();
      for (const audit of auditList) byAudit.set(audit.id, new Set());
      auditKeys.forEach((key, i) => {
        for (const row of auditRows[i]) {
          if (!row.audit_id || !row.submitted_at) continue;
          if (!byAudit.has(row.audit_id)) byAudit.set(row.audit_id, new Set());
          byAudit.get(row.audit_id)!.add(key);
        }
      });

      // Best audit = most submitted sections; ties resolve to the earliest.
      let bestId: string | null = null;
      let bestDone: Set<AuditGateKey> = new Set();
      for (const [id, done] of byAudit) {
        if (bestId === null || done.size > bestDone.size) {
          bestId = id;
          bestDone = done;
        }
      }

      const incomplete: IncompleteItem[] = [];
      for (const key of auditKeys) {
        if (!bestDone.has(key)) {
          incomplete.push({
            key,
            label: auditLabel(key),
            route: auditRoute(bestId, key),
          });
        }
      }
      if (!salescodeAt) {
        incomplete.push({
          key: "salescode",
          label: "SalesCode assessment",
          route: "/app/tools/salescode",
        });
      }
      return { incomplete, allComplete: incomplete.length === 0 };
    },
  });

  return {
    isLoading: query.isLoading,
    allComplete: query.data?.allComplete ?? false,
    incomplete: query.data?.incomplete ?? [],
  };
}
