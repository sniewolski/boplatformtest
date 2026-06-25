import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AUDIT_SECTIONS } from "@/tools/selling-systems-audit/config";

/**
 * Reads `submitted_at` from the six stepped audit-section tables plus
 * `salescode_results` for the current owner. "Done" = submitted_at != null;
 * `has_unsubmitted_changes` is intentionally ignored — once submitted, the
 * section counts as complete.
 *
 * Mirrors the direct-Supabase, owner-scoped pattern used by each section's
 * intake hook. Content Review is excluded (no submission concept).
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

const auditRoute = (key: AuditGateKey): string =>
  `/app/tools/selling-systems-audit/${key}`;

async function readSubmittedAt(table: string, ownerId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from(table as never)
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
      const [auditResults, salescodeAt] = await Promise.all([
        Promise.all(
          auditKeys.map((key) => readSubmittedAt(AUDIT_TABLES[key], ownerId!)),
        ),
        readSubmittedAt("salescode_results", ownerId!),
      ]);

      const incomplete: IncompleteItem[] = [];
      auditKeys.forEach((key, i) => {
        if (!auditResults[i]) {
          incomplete.push({
            key,
            label: auditLabel(key),
            route: auditRoute(key),
          });
        }
      });
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
