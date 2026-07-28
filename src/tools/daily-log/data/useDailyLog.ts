import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { endOfMonth, format, startOfMonth } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/core/auth/useSession";

/**
 * Owner-scoped Daily Log rows for one visible month. Reads/writes go straight
 * through the browser Supabase client — RLS already scopes to auth.uid(),
 * matching the other owner-facing tools (see src/lib/useBookingReadiness.ts).
 *
 * All dates are plain 'YYYY-MM-DD' strings built from local dates via
 * date-fns `format`. Never toISOString().
 */

export type Mood = "bad" | "neutral" | "good";

export type DailyLogEntry = {
  id: string;
  owner_id: string;
  entry_date: string;
  emails_sent: number;
  calls_made: number;
  connects: number;
  meetings_booked: number;
  revenue: number;
  mit_done: boolean;
  mood: Mood | null;
};

export type DailyLogDraft = {
  emails_sent: number;
  calls_made: number;
  connects: number;
  meetings_booked: number;
  revenue: number;
  mit_done: boolean;
  mood: Mood | null;
};

export const monthKey = (d: Date) => format(d, "yyyy-MM");

export function useDailyLogMonth(cursor: Date) {
  const { session } = useSession();
  const ownerId = session?.user.id;
  const qc = useQueryClient();
  const mk = monthKey(cursor);

  const query = useQuery({
    queryKey: ["daily-log", ownerId, mk],
    enabled: !!ownerId,
    queryFn: async (): Promise<DailyLogEntry[]> => {
      const from = format(startOfMonth(cursor), "yyyy-MM-dd");
      const to = format(endOfMonth(cursor), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("daily_log_entries")
        .select("*")
        .eq("owner_id", ownerId!)
        .gte("entry_date", from)
        .lte("entry_date", to);
      if (error) throw error;
      return (data ?? []) as unknown as DailyLogEntry[];
    },
  });

  const save = useMutation({
    mutationFn: async ({ date, draft }: { date: string; draft: DailyLogDraft }) => {
      if (!ownerId) throw new Error("Not signed in");
      const { error } = await supabase
        .from("daily_log_entries")
        .upsert(
          { owner_id: ownerId, entry_date: date, ...draft },
          { onConflict: "owner_id,entry_date" },
        );
      if (error) throw error;
    },
    onSuccess: (_r, vars) => {
      const key = vars.date.slice(0, 7);
      qc.invalidateQueries({ queryKey: ["daily-log", ownerId, key] });
    },
  });

  const byDate = new Map<string, DailyLogEntry>();
  for (const row of query.data ?? []) byDate.set(row.entry_date, row);

  return {
    entries: query.data ?? [],
    byDate,
    isLoading: query.isLoading,
    save: (date: string, draft: DailyLogDraft) => save.mutateAsync({ date, draft }),
    isSaving: save.isPending,
  };
}
