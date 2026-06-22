import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/core/auth/useSession";
import type { CurrencyCode } from "@/lib/format-currency";

/**
 * Owner-level currency setting. Lives in `owner_settings`, not `profiles`
 * (profiles holds admin-controlled fields). Currency starts unset — there
 * is no default; the UI must prompt a choice before money can format.
 */
export function useCurrency() {
  const { session } = useSession();
  const ownerId = session?.user.id;
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["owner-settings", ownerId],
    enabled: !!ownerId,
    queryFn: async (): Promise<CurrencyCode | null> => {
      const { data, error } = await supabase
        .from("owner_settings")
        .select("currency")
        .eq("owner_id", ownerId!)
        .maybeSingle();
      if (error) throw error;
      return (data?.currency as CurrencyCode | null) ?? null;
    },
  });

  const mutation = useMutation({
    mutationFn: async (next: CurrencyCode) => {
      if (!ownerId) throw new Error("Not signed in");
      const { error } = await supabase
        .from("owner_settings")
        .upsert(
          { owner_id: ownerId, currency: next },
          { onConflict: "owner_id" },
        );
      if (error) throw error;
      return next;
    },
    onSuccess: (next) => {
      qc.setQueryData(["owner-settings", ownerId], next);
    },
  });

  return {
    currency: query.data ?? null,
    isLoading: query.isLoading,
    setCurrency: (next: CurrencyCode) => mutation.mutateAsync(next),
    isSaving: mutation.isPending,
  };
}
