import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Admin-managed authoritative statements injected verbatim into every Will AI
 * chat request. Reads are open (RLS SELECT true); writes are admin-only,
 * mirroring `will_ai_sources`.
 */

export type WillAiCanonicalFact = {
  id: string;
  fact_key: string;
  label: string;
  fact_text: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

const QUERY_KEY = ["will-ai-canonical-facts"] as const;

export function useWillAiCanonicalFacts() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<WillAiCanonicalFact[]> => {
      const { data, error } = await supabase
        .from("will_ai_canonical_facts")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("fact_key", { ascending: true });
      if (error) throw error;
      return (data ?? []) as WillAiCanonicalFact[];
    },
  });
}

export function useCreateWillAiCanonicalFact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      fact_key: string;
      label: string;
      fact_text: string;
      is_active?: boolean;
      sort_order?: number;
    }) => {
      const { data, error } = await supabase
        .from("will_ai_canonical_facts")
        .insert({
          fact_key: input.fact_key,
          label: input.label,
          fact_text: input.fact_text,
          is_active: input.is_active ?? true,
          sort_order: input.sort_order ?? 0,
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as WillAiCanonicalFact;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useUpdateWillAiCanonicalFact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      patch: Partial<
        Pick<
          WillAiCanonicalFact,
          "fact_key" | "label" | "fact_text" | "is_active" | "sort_order"
        >
      >;
    }) => {
      const { error } = await supabase
        .from("will_ai_canonical_facts")
        .update(input.patch)
        .eq("id", input.id);
      if (error) throw error;
      return input.id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useDeleteWillAiCanonicalFact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("will_ai_canonical_facts")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}
