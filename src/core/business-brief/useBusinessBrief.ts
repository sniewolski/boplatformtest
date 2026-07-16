import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getMyBusinessBrief,
  saveMyBusinessBrief,
  isBriefEmpty,
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

/** Nav-status helper: true when brief needs attention (empty). */
export function useBusinessBriefNeedsAttention(): boolean {
  const { data, isLoading } = useBusinessBrief();
  if (isLoading) return false;
  return isBriefEmpty(data);
}
