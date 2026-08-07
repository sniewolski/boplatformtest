/**
 * Admin-only Business Brief export.
 *
 * Deliberately admin-only (mentors excluded) to match the Selling Systems
 * Audit export's authorisation, even though the brief's normal SELECT policy
 * admits mentors. Reads through service-role so the payload is assembled in
 * one round-trip, exactly like getAuditExportData.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { CurrencyCode } from "@/lib/format-currency";

export type BriefExportGoalPeriod = "per_month" | "per_year";

export type BriefExportData = {
  owner: {
    id: string;
    email: string;
    fullName: string | null;
  };
  currency: CurrencyCode | null;
  brief: {
    business_name: string;
    website: string;
    your_offer: string;
    average_deal_size: string;
    ideal_client: string;
    how_you_sell: string;
    whos_selling: string;
    sales_cycle: string;
    goal_amount: number | null;
    goal_period: BriefExportGoalPeriod | null;
    goal_by: string | null;
    goal_notes: string;
    updated_at: string | null;
  };
};

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error) throw new Error("Failed to verify admin role");
  if (!data) throw new Error("Forbidden");
}

export const getBusinessBriefExportData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ ownerId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<BriefExportData> => {
    await assertAdmin(context.supabase, context.userId);

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name")
      .eq("id", data.ownerId)
      .maybeSingle();
    if (profileErr) throw new Error(profileErr.message);
    if (!profile) throw new Error("Owner not found");

    const { data: settings } = await supabaseAdmin
      .from("owner_settings")
      .select("currency")
      .eq("owner_id", data.ownerId)
      .maybeSingle();

    const { data: row, error: briefErr } = await (supabaseAdmin as any)
      .from("business_briefs")
      .select(
        "business_name, website, your_offer, average_deal_size, ideal_client, how_you_sell, whos_selling, sales_cycle, goal_amount, goal_period, goal_by, goal_notes, updated_at",
      )
      .eq("owner_id", data.ownerId)
      .maybeSingle();
    if (briefErr) throw new Error(briefErr.message);

    const b = (row ?? {}) as Record<string, unknown>;
    const text = (k: string) => ((b[k] as string | null) ?? "") as string;
    const rawAmount = b["goal_amount"];
    const amount =
      rawAmount === null || rawAmount === undefined
        ? null
        : Number(rawAmount);

    return {
      owner: {
        id: profile.id as string,
        email: profile.email as string,
        fullName: (profile.full_name as string | null) ?? null,
      },
      currency: ((settings as any)?.currency as CurrencyCode | null) ?? null,
      brief: {
        business_name: text("business_name"),
        website: text("website"),
        your_offer: text("your_offer"),
        average_deal_size: text("average_deal_size"),
        ideal_client: text("ideal_client"),
        how_you_sell: text("how_you_sell"),
        whos_selling: text("whos_selling"),
        sales_cycle: text("sales_cycle"),
        goal_amount:
          amount !== null && Number.isFinite(amount) ? amount : null,
        goal_period:
          (b["goal_period"] as BriefExportGoalPeriod | null) ?? null,
        goal_by: (b["goal_by"] as string | null) ?? null,
        goal_notes: text("goal_notes"),
        updated_at: (b["updated_at"] as string | null) ?? null,
      },
    };
  });
