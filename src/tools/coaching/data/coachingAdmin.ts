/**
 * Admin-only coaching reads/writes. Every call here relies on the
 * admin-only RLS policies on coaching_tasks / profiles; never mount these
 * hooks for owners.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { coachingInboxKey } from "@/lib/useCoachingInbox";
import { coachingKeys } from "./coaching";

/** Staff names for the admin view of a thread (admins can read profiles). */
export function useCoachingStaffNames(ids: string[], enabled: boolean) {
  const sorted = [...new Set(ids)].sort();
  return useQuery({
    queryKey: ["coaching", "staff-names", ...sorted],
    enabled: enabled && sorted.length > 0,
    queryFn: async (): Promise<Record<string, string | null>> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", sorted);
      if (error) throw error;
      return Object.fromEntries((data ?? []).map((r) => [r.id, r.full_name]));
    },
  });
}

export function useCoachingOwnerProfile(ownerId: string) {
  return useQuery({
    queryKey: ["coaching", "owner-profile", ownerId],
    enabled: !!ownerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("id", ownerId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

function useInvalidateTasks(ownerId: string) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: coachingKeys.tasks(ownerId) });
    queryClient.invalidateQueries({ queryKey: coachingInboxKey });
  };
}

export function useAddCoachingTask(ownerId: string, adminId: string | null) {
  const invalidate = useInvalidateTasks(ownerId);
  return useMutation({
    mutationFn: async (title: string) => {
      const { error } = await supabase
        .from("coaching_tasks")
        .insert({ owner_id: ownerId, title, created_by: adminId });
      if (error) throw error;
    },
    onSettled: invalidate,
  });
}

export function useRenameCoachingTask(ownerId: string) {
  const invalidate = useInvalidateTasks(ownerId);
  return useMutation({
    mutationFn: async ({ taskId, title }: { taskId: string; title: string }) => {
      const { error } = await supabase
        .from("coaching_tasks")
        .update({ title })
        .eq("id", taskId)
        .eq("owner_id", ownerId);
      if (error) throw error;
    },
    onSettled: invalidate,
  });
}

export function useDeleteCoachingTask(ownerId: string) {
  const invalidate = useInvalidateTasks(ownerId);
  return useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from("coaching_tasks")
        .delete()
        .eq("id", taskId)
        .eq("owner_id", ownerId);
      if (error) throw error;
    },
    onSettled: invalidate,
  });
}
