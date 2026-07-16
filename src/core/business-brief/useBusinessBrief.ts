import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getMyBusinessBrief,
  saveMyBusinessBrief,
  isBriefComplete,
  type BusinessBrief,
} from "./businessBrief.functions";

export const MY_BUSINESS_BRIEF_KEY = ["business-brief", "me"] as const;

export function useBusinessBrief() {
  const fetchBrief = useServerFn(getMyBusinessBrief);
  return useQuery({
    queryKey: MY_BUSINESS_BRIEF_KEY,
    queryFn: () => fetchBrief(),
  });
}

export function useSaveBusinessBrief() {
  const qc = useQueryClient();
  const save = useServerFn(saveMyBusinessBrief);
  return useMutation({
    mutationFn: (data: Omit<BusinessBrief, "updated_at">) => save({ data }),
    onSuccess: (row) => {
      qc.setQueryData(MY_BUSINESS_BRIEF_KEY, row);
    },
  });
}

/**
 * Nav-status helper: true when the brief needs attention (any of the eight
 * fields is empty/whitespace-only). Reads the same `isBriefComplete`
 * predicate that the admin roster marker uses.
 */
export function useBusinessBriefNeedsAttention(): boolean {
  const { data, isLoading } = useBusinessBrief();
  if (isLoading) return false;
  return !isBriefComplete(data);
}
