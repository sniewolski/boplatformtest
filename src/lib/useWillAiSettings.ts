import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Single-row control table `will_ai_settings` (id=1). Currently exposes one
 * flag — `owner_access_enabled` — used by AppShell nav, the dashboard tile,
 * and the /app/tools/will-ai route guard to temporarily pause owner access
 * to the tool without touching any code path in the ingestion pipeline,
 * admin surface, or chat itself.
 *
 * Admin surface (`/app/admin/will-ai`) is NEVER gated by this flag.
 */

export type WillAiSettings = {
  owner_access_enabled: boolean;
};

const QUERY_KEY = ["will-ai-settings"] as const;

export function useWillAiSettings() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<WillAiSettings> => {
      const { data, error } = await supabase
        .from("will_ai_settings")
        .select("owner_access_enabled")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      // Safe default: if the row is missing for any reason, treat access as
      // enabled so the tool is never silently hidden by a read failure.
      return { owner_access_enabled: data?.owner_access_enabled ?? true };
    },
    staleTime: 30_000,
  });
}

export function useSetWillAiOwnerAccess() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (enabled: boolean) => {
      const { error } = await supabase
        .from("will_ai_settings")
        .update({ owner_access_enabled: enabled })
        .eq("id", 1);
      if (error) throw error;
      return enabled;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
