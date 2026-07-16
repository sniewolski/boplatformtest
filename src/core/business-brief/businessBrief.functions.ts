/**
 * Business Brief — owner-authored profile data.
 *
 * Owner reads/writes their OWN brief through RLS. Admins read any brief via
 * the canonical `owner_id = auth.uid() OR has_role(auth.uid(),'admin')`
 * policies — no admin edit UI is exposed. Will AI's generation path also
 * imports getBusinessBriefForOwner to soft-condition answers.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type BusinessBrief = {
  business_name: string;
  website: string;
  your_offer: string;
  average_deal_size: string;
  ideal_client: string;
  how_you_sell: string;
  whos_selling: string;
  sales_cycle: string;
  updated_at: string | null;
};

const EMPTY: BusinessBrief = {
  business_name: "",
  website: "",
  your_offer: "",
  average_deal_size: "",
  ideal_client: "",
  how_you_sell: "",
  whos_selling: "",
  sales_cycle: "",
  updated_at: null,
};

// Generous soft cap; enforced server-side. UI trims to the same limit.
const FIELD_MAX = 600;

const briefFields = {
  business_name: z.string().max(FIELD_MAX),
  website: z.string().max(FIELD_MAX),
  your_offer: z.string().max(FIELD_MAX),
  average_deal_size: z.string().max(FIELD_MAX),
  ideal_client: z.string().max(FIELD_MAX),
  how_you_sell: z.string().max(FIELD_MAX),
  whos_selling: z.string().max(FIELD_MAX),
  sales_cycle: z.string().max(FIELD_MAX),
} as const;

const BriefInput = z.object(briefFields);

/** Own brief (current signed-in owner). Returns empty shape if no row yet. */
export const getMyBusinessBrief = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<BusinessBrief> => {
    const { data, error } = await context.supabase
      .from("business_briefs" as never)
      .select(
        "business_name, website, your_offer, average_deal_size, ideal_client, how_you_sell, whos_selling, sales_cycle, updated_at",
      )
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return EMPTY;
    return data as unknown as BusinessBrief;
  });

export const saveMyBusinessBrief = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => BriefInput.parse(input))
  .handler(async ({ data, context }): Promise<BusinessBrief> => {
    const { data: row, error } = await (context.supabase as any)
      .from("business_briefs")
      .upsert(
        { owner_id: context.userId, ...data },
        { onConflict: "owner_id" },
      )
      .select(
        "business_name, website, your_offer, average_deal_size, ideal_client, how_you_sell, whos_selling, sales_cycle, updated_at",
      )
      .single();
    if (error) throw new Error(error.message);
    return row as unknown as BusinessBrief;
  });

/**
 * Admin/server helper — fetch a specific owner's brief. Used by admin
 * read-only view and Will AI personalisation. RLS admits admins.
 */
export const getBusinessBriefForOwner = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ ownerId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<BusinessBrief> => {
    const { data: row, error } = await context.supabase
      .from("business_briefs" as never)
      .select(
        "business_name, website, your_offer, average_deal_size, ideal_client, how_you_sell, whos_selling, sales_cycle, updated_at",
      )
      .eq("owner_id", data.ownerId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return EMPTY;
    return row as unknown as BusinessBrief;
  });

/**
 * Single source of truth for "brief complete". True only when ALL EIGHT
 * fields are non-empty after trimming whitespace. Consumed by the nav
 * "needs attention" dot and (Phase 3) the admin roster filled/not-filled
 * marker so both surfaces read the identical definition.
 */
export function isBriefComplete(
  brief: BusinessBrief | null | undefined,
): boolean {
  if (!brief) return false;
  return (
    brief.business_name.trim().length > 0 &&
    brief.website.trim().length > 0 &&
    brief.your_offer.trim().length > 0 &&
    brief.average_deal_size.trim().length > 0 &&
    brief.ideal_client.trim().length > 0 &&
    brief.how_you_sell.trim().length > 0 &&
    brief.whos_selling.trim().length > 0 &&
    brief.sales_cycle.trim().length > 0
  );
}

export const BUSINESS_BRIEF_FIELD_MAX = FIELD_MAX;
export const EMPTY_BUSINESS_BRIEF = EMPTY;
