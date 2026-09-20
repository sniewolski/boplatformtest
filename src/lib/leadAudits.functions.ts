/**
 * Admin-only server functions for the "Lead audits" area.
 *
 * Lead audits are ordinary `audits` + six `selling_systems_audit_*` rows
 * owned by the internal holding account (see src/lib/auditLead.server.ts),
 * paired with a `respondent_sessions` row where tool_key = 'audit-lead'.
 *
 * The client only ever passes a sessionId. `audit_id` and the holding
 * owner id are resolved server-side — audit_id strictly from the stored
 * session payload, owner id from getLeadHoldingUserId().
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const LEAD_TOOL_KEY = "audit-lead";

const SECTION_TABLES = [
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

export type LeadAuditRow = {
  sessionId: string;
  name: string | null;
  email: string | null;
  status: string;
  createdAt: string;
  completedAt: string | null;
  auditId: string | null;
  completedSections: number;
};

export type LeadAuditDetail = LeadAuditRow & {
  /** Holding-account id; only used to satisfy the owner_id column on the
   * admin-only summary/note upserts. Resolved server-side. */
  holdingOwnerId: string;
  currency: string | null;
};

/** Count non-null submitted_at across the six tables for a set of audit ids. */
async function countSubmittedByAudit(
  supabaseAdmin: any,
  auditIds: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (auditIds.length === 0) return counts;
  for (const table of SECTION_TABLES) {
    const { data, error } = await supabaseAdmin
      .from(table as any)
      .select("audit_id, submitted_at")
      .in("audit_id", auditIds)
      .not("submitted_at", "is", null);
    if (error) throw new Error(error.message);
    for (const row of (data ?? []) as any[]) {
      if (!row.audit_id) continue;
      counts.set(row.audit_id, (counts.get(row.audit_id) ?? 0) + 1);
    }
  }
  return counts;
}

function auditIdOf(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const value = (payload as Record<string, unknown>).audit_id;
  return typeof value === "string" && value ? value : null;
}

function currencyOf(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const value = (payload as Record<string, unknown>).currency;
  return typeof value === "string" && value ? value : null;
}

export const listLeadAudits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<LeadAuditRow[]> => {
    await assertAdmin(context.supabase, context.userId);

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const { data, error } = await supabaseAdmin
      .from("respondent_sessions")
      .select(
        "id, respondent_name, respondent_email, status, created_at, completed_at, payload",
      )
      .eq("tool_key", LEAD_TOOL_KEY)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as any[];
    const auditIds = rows
      .map((r) => auditIdOf(r.payload))
      .filter((v): v is string => !!v);
    const counts = await countSubmittedByAudit(supabaseAdmin, auditIds);

    return rows.map((r) => {
      const auditId = auditIdOf(r.payload);
      return {
        sessionId: r.id as string,
        name: (r.respondent_name as string | null) ?? null,
        email: (r.respondent_email as string | null) ?? null,
        status: r.status as string,
        createdAt: r.created_at as string,
        completedAt: (r.completed_at as string | null) ?? null,
        auditId,
        completedSections: auditId ? (counts.get(auditId) ?? 0) : 0,
      };
    });
  });

export const getLeadAudit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ sessionId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<LeadAuditDetail> => {
    await assertAdmin(context.supabase, context.userId);

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { getLeadHoldingUserId } = await import("@/lib/auditLead.server");

    const { data: row, error } = await supabaseAdmin
      .from("respondent_sessions")
      .select(
        "id, respondent_name, respondent_email, status, created_at, completed_at, payload",
      )
      .eq("id", data.sessionId)
      .eq("tool_key", LEAD_TOOL_KEY)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Lead audit not found");

    const auditId = auditIdOf((row as any).payload);
    const counts = auditId
      ? await countSubmittedByAudit(supabaseAdmin, [auditId])
      : new Map<string, number>();

    return {
      sessionId: (row as any).id as string,
      name: ((row as any).respondent_name as string | null) ?? null,
      email: ((row as any).respondent_email as string | null) ?? null,
      status: (row as any).status as string,
      createdAt: (row as any).created_at as string,
      completedAt: ((row as any).completed_at as string | null) ?? null,
      auditId,
      completedSections: auditId ? (counts.get(auditId) ?? 0) : 0,
      holdingOwnerId: await getLeadHoldingUserId(),
      currency: currencyOf((row as any).payload),
    };
  });
