import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AccountStatus = "active" | "suspended";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  account_status: AccountStatus;
};

/**
 * Reads the signed-in user's own profile row. RLS allows self-read only.
 * Returns `null` if the row doesn't exist yet — the gate treats that as
 * "not provisioned" and surfaces the same paused state.
 */
export function useMyProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId,
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, account_status")
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw error;
      return (data as Profile | null) ?? null;
    },
  });
}
