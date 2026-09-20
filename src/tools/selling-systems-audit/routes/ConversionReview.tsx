import { useCallback } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { ReceivedState } from "../components/ReceivedState";
import { useSession } from "@/core/auth/useSession";
import { useCurrency } from "@/core/settings/useCurrency";
import type { CurrencyCode } from "@/lib/format-currency";
import {
  useConversionIntake,
  useSaveDraft,
  useSubmitIntake,
  type IntakeAnswers,
} from "../data/useConversionReview";
import { ConversionSectionForm } from "../components/ConversionSectionForm";

/**
 * Owner route for the Sales Conversion Rates section. Owns everything
 * owner-specific: session, audit id from the route, the section's data
 * hooks, currency and navigation. The form itself is presentational
 * (see `components/ConversionSectionForm.tsx`).
 */
export function ConversionReview({ auditId }: { auditId: string }) {
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: intake, isLoading } = useConversionIntake(auditId);
  const save = useSaveDraft(userId, auditId);
  const submit = useSubmitIntake(userId, auditId);
  const { currency, setCurrency, isLoading: currencyLoading } = useCurrency();

  const saveDraft = useCallback(
    async (draft: IntakeAnswers, hasSubmitted: boolean) => {
      await save.mutateAsync({ draft, hasSubmitted });
    },
    [save.mutateAsync],
  );

  const submitSection = useCallback(
    async (draft: IntakeAnswers) => {
      await submit.mutateAsync({ draft });
    },
    [submit.mutateAsync],
  );

  return (
    <ConversionSectionForm
      title="Sales Conversion Rates Review"
      draftAnswers={(intake?.draft_answers ?? null) as IntakeAnswers | null}
      submittedAnswers={(intake?.submitted_answers ?? null) as IntakeAnswers | null}
      hasUnsubmittedChanges={!!intake?.has_unsubmitted_changes}
      submittedAt={intake?.submitted_at ?? null}
      isLoading={isLoading}
      canPersist={!!userId}
      saveDraft={saveDraft}
      submitSection={submitSection}
      isSubmitting={submit.isPending}
      currency={currency}
      currencyLoading={currencyLoading}
      onCurrencyChange={(c: CurrencyCode) => void setCurrency(c)}
      backSlot={
        <Link
          to="/app/tools/$key/$"
          params={{ key: "selling-systems-audit", _splat: auditId }}
          className="inline-flex items-center gap-2 text-ink-muted text-sm hover:text-ink transition-colors w-fit"
        >
          <ArrowLeft className="size-4" />
          Back to audit
        </Link>
      }
      renderReceived={({ onEdit }) => (
        <ReceivedState auditId={auditId} sectionKey="conversion" onEdit={onEdit} />
      )}
    />
  );
}
