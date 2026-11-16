/**
 * The ONLY module that talks to the coaching tables for the owner's page.
 *
 * - Messages: this owner's thread, oldest first. Refetched on window focus
 *   and after each send (no live updates yet).
 * - Sender names: via get_coaching_sender_names() because owners cannot
 *   read admin profiles directly.
 * - Tasks: read-only list; ticking goes through set_coaching_task_done().
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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

export function useCoachingSenderNames(ownerId: string | null) {
  return useQuery({
    queryKey: coachingKeys.senders(ownerId),
    enabled: !!ownerId,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<Record<string, string | null>> => {
      const { data, error } = await supabase.rpc("get_coaching_sender_names");
      if (error) throw error;
      return Object.fromEntries((data ?? []).map((r) => [r.id, r.full_name]));
    },
  });
}

/** Inserts one message in the owner's own thread and returns the stored row. */
export async function insertCoachingMessage(
  ownerId: string,
  body: string,
): Promise<CoachingMessage> {
  const { data, error } = await supabase
    .from("coaching_messages")
    .insert({ owner_id: ownerId, sender_id: ownerId, body })
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
