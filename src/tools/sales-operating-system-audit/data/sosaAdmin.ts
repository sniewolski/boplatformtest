/** Read-only elevated views. Never registers the owner's autosave manager. */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CurrencyCode } from "@/lib/format-currency";
import type { Answers } from "../engine/rules";
import { sosaAnswerFromRow } from "../engine/adminReview";

export function useSosaOwnerAnswers(ownerId: string) {
  return useQuery({
    queryKey: ["admin", "sosa-answers", ownerId],
    enabled: !!ownerId,
    queryFn: async (): Promise<Answers> => {
      const { data, error } = await supabase.from("sosa_answers")
        .select("question_id, value, estimates, marker, updated_at").eq("owner_id", ownerId);
      if (error) throw error;
      return Object.fromEntries((data ?? []).map((row) => [row.question_id, sosaAnswerFromRow(row)]));
    },
  });
}

export function useSosaOwnerSubmission(ownerId: string) {
  return useQuery({
    queryKey: ["admin", "sosa-submission", ownerId],
    enabled: !!ownerId,
    queryFn: async () => {
      const { data, error } = await supabase.from("sosa_submissions")
        .select("owner_id, submitted_at, created_at, updated_at").eq("owner_id", ownerId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useSosaOwnerCurrency(ownerId: string) {
  return useQuery({
    queryKey: ["owner-settings", ownerId],
    enabled: !!ownerId,
    queryFn: async (): Promise<CurrencyCode | null> => {
      const { data, error } = await supabase.from("owner_settings")
        .select("currency").eq("owner_id", ownerId).maybeSingle();
      if (error) throw error;
      return data?.currency === "USD" || data?.currency === "GBP" || data?.currency === "EUR" ? data.currency : null;
    },
  });
}