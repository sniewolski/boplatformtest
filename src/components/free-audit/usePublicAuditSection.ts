import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { CurrencyCode } from "@/lib/format-currency";
import {
  fetchLeadAuditState,
  type LeadAuditSectionKey,
  type LeadAuditSectionState,
} from "@/lib/auditLeadPublic";

/**
 * Public counterpart to the owner data hooks. Talks to the public
 * /api/public/audit-lead routes by fetch and supplies everything the shared
 * presentational section forms need. No session, no supabase client, no owner
 * hook is involved.
 */

const EMPTY_SECTION: LeadAuditSectionState = {
  draft_answers: null,
  submitted_answers: null,
  has_unsubmitted_changes: false,
  submitted_at: null,
};

async function postPublic(path: string, body: unknown): Promise<unknown> {
  const response = await fetch(`/api/public/audit-lead/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  if (!response.ok) throw new Error("request_failed");
  if (payload && typeof payload === "object" && (payload as { ok?: boolean }).ok === false) {
    throw new Error("request_failed");
  }
  return payload;
}

type PendingSave = { draft: unknown; hasSubmitted: boolean };

export function usePublicAuditSection(
  token: string,
  sectionKey: LeadAuditSectionKey,
  onSubmitted: () => void,
) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["public-lead-audit", token],
    queryFn: () => fetchLeadAuditState(token),
    retry: false,
  });

  const state = query.data?.ok ? query.data : null;
  const section = state?.sections?.[sectionKey] ?? EMPTY_SECTION;

  const [currency, setCurrencyLocal] = useState<CurrencyCode | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const pendingRef = useRef<PendingSave | null>(null);

  useEffect(() => {
    if (state?.currency) setCurrencyLocal(state.currency as CurrencyCode);
  }, [state?.currency]);

  const saveDraft = useCallback(
    async (draft: unknown, hasSubmitted: boolean) => {
      try {
        await postPublic("save-draft", {
          token,
          section_key: sectionKey,
          draft,
          has_submitted: hasSubmitted,
        });
        pendingRef.current = null;
        setSaveError(null);
      } catch (error) {
        pendingRef.current = { draft, hasSubmitted };
        setSaveError("We couldn't save your latest answers.");
        throw error;
      }
    },
    [sectionKey, token],
  );

  const retrySave = useCallback(async () => {
    const pending = pendingRef.current;
    if (!pending) {
      setSaveError(null);
      return;
    }
    try {
      await saveDraft(pending.draft, pending.hasSubmitted);
    } catch {
      // saveDraft already surfaced the inline error; keep the retry available.
    }
  }, [saveDraft]);

  const submitSection = useCallback(
    async (draft: unknown) => {
      setIsSubmitting(true);
      try {
        await postPublic("submit-section", {
          token,
          section_key: sectionKey,
          answers: draft,
        });
        pendingRef.current = null;
        setSaveError(null);
        await queryClient.invalidateQueries({ queryKey: ["public-lead-audit", token] });
        onSubmitted();
      } catch {
        throw new Error("Could not submit. Check your connection and try again.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [onSubmitted, queryClient, sectionKey, token],
  );

  const onCurrencyChange = useCallback(
    (next: CurrencyCode) => {
      setCurrencyLocal(next);
      void postPublic("set-currency", { token, currency: next }).catch(() => {
        setSaveError("We couldn't save your currency choice.");
      });
    },
    [token],
  );

  return {
    isLoading: query.isLoading,
    isInvalid: !query.isLoading && !query.data?.ok,
    isCompleted: state?.status === "completed",
    allSections: state?.sections ?? null,
    section,
    currency,
    currencyLoading: query.isLoading,
    onCurrencyChange,
    saveDraft,
    submitSection,
    isSubmitting,
    saveError,
    retrySave,
  };
}

/**
 * Same derivation the owner Pipeline route uses: the cycle-length echo comes
 * from the Conversion section's Closing step draft.
 */
export function deriveCycleEcho(conversionDraft: unknown): string | null {
  const closing = (
    conversionDraft as
      | { closing?: { cycleLength?: number | null; cycleUnit?: string | null } }
      | null
      | undefined
  )?.closing;
  if (!closing?.cycleLength || !closing.cycleUnit) return null;
  return `${closing.cycleLength} ${closing.cycleUnit}`;
}
