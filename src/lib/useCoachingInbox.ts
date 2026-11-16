/**
 * Admin Coaching inbox: one row per owner from get_coaching_inbox()
 * (admin-only on the database side). Shared by the sidebar badge and the
 * inbox page so both read the same cache entry. Any new coaching message
 * (admins receive all of them via Realtime) refetches the inbox; it also
 * refetches on window focus and every 2 minutes as a safety net in case the
 * live connection drops.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCoachingRealtime } from "@/tools/coaching/lib/realtime";

export type CoachingInboxRow = {
  owner_id: string;
  full_name: string | null;
  email: string;
  last_message_body: string | null;
  last_message_at: string | null;
  awaiting_reply: boolean;
  awaiting_since: string | null;
  tasks_done: number;
  tasks_total: number;
};

export const coachingInboxKey = ["coaching", "inbox"] as const;

export const COACHING_INBOX_POLL_MS = 120_000;

/** Pass `enabled` only for admins: the inbox and its live feed are admin-only. */
export function useCoachingInbox(enabled: boolean) {
  const queryClient = useQueryClient();
  useCoachingRealtime({
    name: "coaching-inbox",
    table: "coaching_messages",
    listen: [{ event: "INSERT" }],
    enabled,
    onChange: () => {
      queryClient.invalidateQueries({ queryKey: coachingInboxKey });
    },
  });
  return useQuery({
    queryKey: coachingInboxKey,
    enabled,
    refetchInterval: COACHING_INBOX_POLL_MS,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<CoachingInboxRow[]> => {
      const { data, error } = await supabase.rpc("get_coaching_inbox");
      if (error) throw error;
      return (data ?? []) as CoachingInboxRow[];
    },
  });
}

/** Number of threads whose latest message came from the owner. */
export function countAwaitingReply(rows: CoachingInboxRow[] | undefined): number {
  return (rows ?? []).filter((r) => r.awaiting_reply).length;
}

const time = (iso: string | null) => (iso ? new Date(iso).getTime() : 0);

/**
 * Splits the inbox into the two page sections:
 * - awaiting: awaiting_reply rows, oldest awaiting_since first
 * - others: everyone else, most recent activity first; no messages last
 */
export function splitCoachingInbox(rows: CoachingInboxRow[]): {
  awaiting: CoachingInboxRow[];
  others: CoachingInboxRow[];
} {
  const awaiting = rows
    .filter((r) => r.awaiting_reply)
    .sort((a, b) => time(a.awaiting_since ?? a.last_message_at) - time(b.awaiting_since ?? b.last_message_at));
  const others = rows
    .filter((r) => !r.awaiting_reply)
    .sort((a, b) => {
      if (!a.last_message_at && !b.last_message_at) {
        return ownerLabel(a).localeCompare(ownerLabel(b), undefined, { sensitivity: "base" });
      }
      if (!a.last_message_at) return 1;
      if (!b.last_message_at) return -1;
      return time(b.last_message_at) - time(a.last_message_at);
    });
  return { awaiting, others };
}

export function ownerLabel(r: Pick<CoachingInboxRow, "full_name" | "email">): string {
  return r.full_name?.trim() || r.email;
}

/** "just now", "12 min", "3 h", "1 day", "4 days". */
export function formatWaiting(sinceIso: string, now: Date = new Date()): string {
  const mins = Math.max(0, Math.floor((now.getTime() - new Date(sinceIso).getTime()) / 60_000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "1 day" : `${days} days`;
}
