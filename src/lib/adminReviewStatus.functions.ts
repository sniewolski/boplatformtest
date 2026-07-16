/**
 * Admin-only: per-owner review status summary for the review roster.
 * Returns whether each owner has submitted the audit (any section) and
 * whether they've taken SalesCode.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const AUDIT_TABLES = [
  "selling_systems_audit_conversion",
  "selling_systems_audit_pipeline",
  "selling_systems_audit_process",
  "selling_systems_audit_activity",
  "selling_systems_audit_messaging",
  "selling_systems_audit_alignment",
] as const;

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error) throw new Error("Failed to verify admin role");
  if (!data) throw new Error("Forbidden");
}

export type OwnerReviewStatus = {
  ownerId: string;
  auditSubmitted: boolean;
  salescodeTaken: boolean;
};

export const listOwnerReviewStatuses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<OwnerReviewStatus[]> => {
    await assertAdmin(context.supabase, context.userId);

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const auditOwners = new Set<string>();
    for (const table of AUDIT_TABLES) {
      const { data, error } = await supabaseAdmin
        .from(table as any)
        .select("owner_id, submitted_at")
        .not("submitted_at", "is", null);
      if (error) throw new Error(error.message);
      for (const row of (data ?? []) as any[]) {
        if (row.owner_id) auditOwners.add(row.owner_id as string);
      }
    }

    const { data: salescodeRows, error: scErr } = await supabaseAdmin
      .from("salescode_results" as any)
      .select("owner_id, submitted_at")
      .not("submitted_at", "is", null);
    if (scErr) throw new Error(scErr.message);
    const salescodeOwners = new Set<string>(
      ((salescodeRows ?? []) as any[])
        .map((r) => r.owner_id as string)
        .filter(Boolean),
    );

    const owners = new Set<string>([
      ...auditOwners,
      ...salescodeOwners,
    ]);
    return Array.from(owners).map((ownerId) => ({
      ownerId,
      auditSubmitted: auditOwners.has(ownerId),
      salescodeTaken: salescodeOwners.has(ownerId),
    }));
  });
