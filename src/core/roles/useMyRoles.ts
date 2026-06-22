import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "owner" | "admin";

/**
 * Reads the signed-in user's roles. RLS allows self-read on user_roles.
 * Used by shell nav and RequireRole — never trust this for server-side
 * authorization; server functions re-check via has_role().
 */
export function useMyRoles(userId: string | undefined) {
  return useQuery({
    queryKey: ["my-roles", userId],
    enabled: !!userId,
    queryFn: async (): Promise<AppRole[]> => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId!);
      if (error) throw error;
      return (data ?? []).map((r) => r.role as AppRole);
    },
  });
}
