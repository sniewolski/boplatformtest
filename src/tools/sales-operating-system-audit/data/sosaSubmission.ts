/** The ONLY module that talks to `sosa_submissions`. */
import { useQuery, type QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/core/auth/useSession";
import { flushAllSosaSavesAndWait } from "./sosaAnswers";

export const sosaSubmissionKey = (ownerId: string | undefined) => ["sosa-submission", ownerId] as const;

export function useSosaSubmission() {
  const { session } = useSession();
  const ownerId = session?.user.id;
  const query = useQuery({
    queryKey: sosaSubmissionKey(ownerId),
    enabled: !!ownerId,
    queryFn: async (): Promise<{ submittedAt: string | null }> => {
      const { data, error } = await supabase
        .from("sosa_submissions")
        .select("submitted_at")
        .eq("owner_id", ownerId!)
        .maybeSingle();
      if (error) throw error;
      return { submittedAt: data?.submitted_at ?? null };
    },
  });
  return { ...query, submittedAt: query.data?.submittedAt ?? null };
}

export class SosaSubmitError extends Error {}

/** Flush + await answer saves, create the submission row (server sets submitted_at), refresh. */
export async function submitSosaAudit(qc: QueryClient, ownerId: string): Promise<void> {
  const ok = await flushAllSosaSavesAndWait();
  if (!ok) throw new SosaSubmitError("Some answers haven't saved yet. Retry, then submit.");
  const { error } = await supabase.from("sosa_submissions").insert({ owner_id: ownerId } as never);
  if (error) throw new SosaSubmitError("Couldn't submit your audit. Try again.");
  await qc.invalidateQueries({ queryKey: sosaSubmissionKey(ownerId) });
}

/** "20 Oct 2026" */
export function formatSosaDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
