/**
 * The ONLY module that talks to the coaching tables for the owner's page.
 *
 * - Messages: this owner's thread, oldest first. Refetched on window focus
 *   and after each send; new rows also arrive live (useCoachingMessagesLive).
 * - Sender names: via get_coaching_sender_names() because owners cannot
 *   read admin profiles directly.
 * - Tasks: read-only list; ticking goes through set_coaching_task_done().
 *   Any task change for the thread refetches the list (useCoachingTasksLive).
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCoachingRealtime } from "../lib/realtime";

export type CoachingMessage = {
  id: string;
  owner_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export type CoachingTask = {
  id: string;
  owner_id: string;
  title: string;
  done: boolean;
  done_at: string | null;
  created_at: string;
};

export const coachingKeys = {
  messages: (ownerId: string | null) => ["coaching", "messages", ownerId] as const,
  senders: (ownerId: string | null) => ["coaching", "senders", ownerId] as const,
  tasks: (ownerId: string | null) => ["coaching", "tasks", ownerId] as const,
};

export function useCoachingMessages(ownerId: string | null) {
  return useQuery({
    queryKey: coachingKeys.messages(ownerId),
    enabled: !!ownerId,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<CoachingMessage[]> => {
      const { data, error } = await supabase
        .from("coaching_messages")
        .select("id, owner_id, sender_id, body, created_at")
        .eq("owner_id", ownerId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Owner view only: the RPC resolves names for the caller's own thread. */
export function useCoachingSenderNames(ownerId: string | null, enabled = true) {
  return useQuery({
    queryKey: coachingKeys.senders(ownerId),
    enabled: enabled && !!ownerId,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<Record<string, string | null>> => {
      const { data, error } = await supabase.rpc("get_coaching_sender_names");
      if (error) throw error;
      return Object.fromEntries((data ?? []).map((r) => [r.id, r.full_name]));
    },
  });
}

/**
 * Inserts one message in an owner's thread and returns the stored row.
 * Owners send with senderId = ownerId; admins send with their own id.
 */
export async function insertCoachingMessage(
  ownerId: string,
  senderId: string,
  body: string,
): Promise<CoachingMessage> {
  const { data, error } = await supabase
    .from("coaching_messages")
    .insert({ owner_id: ownerId, sender_id: senderId, body })
    .select("id, owner_id, sender_id, body, created_at")
    .single();
  if (error) throw error;
  return data;
}

export function useCoachingTasks(ownerId: string | null) {
  return useQuery({
    queryKey: coachingKeys.tasks(ownerId),
    enabled: !!ownerId,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<CoachingTask[]> => {
      const { data, error } = await supabase
        .from("coaching_tasks")
        .select("id, owner_id, title, done, done_at, created_at")
        .eq("owner_id", ownerId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Optimistic tick/untick through the owner-only security-definer function. */
export function useSetCoachingTaskDone(ownerId: string | null) {
  const queryClient = useQueryClient();
  const key = coachingKeys.tasks(ownerId);
  return useMutation({
    mutationFn: async ({ taskId, done }: { taskId: string; done: boolean }) => {
      const { error } = await supabase.rpc("set_coaching_task_done", {
        _task_id: taskId,
        _done: done,
      });
      if (error) throw error;
    },
    onMutate: async ({ taskId, done }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<CoachingTask[]>(key);
      queryClient.setQueryData<CoachingTask[]>(key, (rows) =>
        (rows ?? []).map((t) =>
          t.id === taskId
            ? { ...t, done, done_at: done ? new Date().toISOString() : null }
            : t,
        ),
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(key, ctx.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key });
    },
  });
}

/** Adds a stored message to the cached thread once, keeping oldest-first order. */
export function mergeCoachingMessage(
  list: CoachingMessage[] | undefined,
  row: CoachingMessage,
): CoachingMessage[] {
  const current = list ?? [];
  if (current.some((m) => m.id === row.id)) return current;
  return [...current, row].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
}

/**
 * Live new messages for one thread (owner page and admin thread page).
 * Each new row is merged into the cached thread; `onInsert` lets the chat
 * reconcile its own optimistic message with the stored one.
 */
export function useCoachingMessagesLive(
  ownerId: string | null,
  onInsert?: (row: CoachingMessage) => void,
) {
  const queryClient = useQueryClient();
  useCoachingRealtime({
    name: `coaching-messages-${ownerId ?? "none"}`,
    table: "coaching_messages",
    listen: [{ event: "INSERT", filter: `owner_id=eq.${ownerId}` }],
    enabled: !!ownerId,
    onChange: (payload) => {
      const row = payload.new as CoachingMessage;
      if (!row?.id || row.owner_id !== ownerId) return;
      queryClient.setQueryData<CoachingMessage[]>(coachingKeys.messages(ownerId), (list) =>
        mergeCoachingMessage(list, row),
      );
      // Owner page: a staff member who hasn't written before needs a name lookup.
      const names = queryClient.getQueryData<Record<string, string | null>>(
        coachingKeys.senders(ownerId),
      );
      if (names && row.sender_id !== ownerId && !(row.sender_id in names)) {
        queryClient.invalidateQueries({ queryKey: coachingKeys.senders(ownerId) });
      }
      onInsert?.(row);
    },
  });
}

/**
 * Live task changes for one thread: any insert, update or delete refetches
 * that owner's task list. Realtime cannot filter deletes (and with RLS only
 * the id is sent), so a delete refetches when the id is in this list.
 */
export function useCoachingTasksLive(ownerId: string | null) {
  const queryClient = useQueryClient();
  const key = coachingKeys.tasks(ownerId);
  useCoachingRealtime({
    name: `coaching-tasks-${ownerId ?? "none"}`,
    table: "coaching_tasks",
    listen: [
      { event: "INSERT", filter: `owner_id=eq.${ownerId}` },
      { event: "UPDATE", filter: `owner_id=eq.${ownerId}` },
      { event: "DELETE" },
    ],
    enabled: !!ownerId,
    onChange: (payload) => {
      if (payload.eventType === "DELETE") {
        const old = payload.old as Partial<CoachingTask>;
        const cached = queryClient.getQueryData<CoachingTask[]>(key);
        const ours =
          old.owner_id === ownerId || (!!old.id && !!cached?.some((t) => t.id === old.id));
        if (!ours) return;
      }
      queryClient.invalidateQueries({ queryKey: key });
    },
  });
}
