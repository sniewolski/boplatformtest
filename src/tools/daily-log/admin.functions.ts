/**
 * Admin/mentor read-only access to an owner's Daily Log.
 *
 * daily_log_entries RLS is owner-or-admin (has_role(auth.uid(),'admin')), so
 * mentors cannot read owner rows through their own session. Reads go through
 * the admin client after an explicit elevated-role check.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { CurrencyCode } from "@/lib/format-currency";

async function assertElevated(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("is_elevated", { _user_id: userId });
  if (error) throw new Error("Failed to verify role");
  if (!data) throw new Error("Forbidden");
}

export type AdminDailyLogRow = {
  entry_date: string;
  emails_sent: number;
  calls_made: number;
  connects: number;
  meetings_booked: number;
  revenue: number;
  mit_done: boolean;
  mood: string | null;
};

export type AdminDailyLogResult = {
  entries: AdminDailyLogRow[];
  currency: CurrencyCode;
};

export const getDailyLogForOwner = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { ownerId: string }) => data)
  .handler(async ({ data, context }): Promise<AdminDailyLogResult> => {
    await assertElevated(context.supabase, context.userId);

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const from = new Date();
    from.setDate(from.getDate() - 29);
    const fromStr = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, "0")}-${String(from.getDate()).padStart(2, "0")}`;

    const { data: rows, error } = await supabaseAdmin
      .from("daily_log_entries" as any)
      .select(
        "entry_date, emails_sent, calls_made, connects, meetings_booked, revenue, mit_done, mood",
      )
      .eq("owner_id", data.ownerId)
      .gte("entry_date", fromStr)
      .order("entry_date", { ascending: false });
    if (error) throw new Error(error.message);

    // Read the viewed owner's currency (not the session user's) so admins and
    // mentors see revenue labelled in the owner's own currency. Falls back to
    // "USD" when the owner has no owner_settings row, matching useCurrency().
    const { data: settings } = await supabaseAdmin
      .from("owner_settings" as any)
      .select("currency")
      .eq("owner_id", data.ownerId)
      .maybeSingle();
    const currency: CurrencyCode =
      ((settings as any)?.currency as CurrencyCode | null) ?? "USD";

    return {
      entries: (rows ?? []) as unknown as AdminDailyLogRow[],
      currency,
    };
  });
