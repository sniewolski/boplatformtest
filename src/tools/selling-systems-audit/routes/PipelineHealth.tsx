import { useCallback, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { ReceivedState } from "../components/ReceivedState";
import { useSession } from "@/core/auth/useSession";
import { useCurrency } from "@/core/settings/useCurrency";
import type { CurrencyCode } from "@/lib/format-currency";
import {
  usePipelineIntake,
  useSaveDraft,
  useSubmitIntake,
  type PipelineAnswers,
} from "../data/usePipelineReview";
import { useConversionIntake } from "../data/useConversionReview";
import { PipelineSectionForm } from "../components/PipelineSectionForm";

/**
 * Owner route for the Pipeline Health section. Owns everything
 * owner-specific: session, audit id from the route, the section's data
 * hooks, currency and navigation. The form itself is presentational
 * (see `components/PipelineSectionForm.tsx`).
 */
export function PipelineHealth({ auditId }: { auditId: string }) {
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: intake, isLoading } = usePipelineIntake(auditId);
  const { data: conversionIntake } = useConversionIntake(auditId);
  const save = useSaveDraft(userId, auditId);
  const submit = useSubmitIntake(userId, auditId);
  const { currency, setCurrency, isLoading: currencyLoading } = useCurrency();

  const saveDraft = useCallback(
    async (draft: PipelineAnswers, hasSubmitted: boolean) => {
      await save.mutateAsync({ draft, hasSubmitted });
    },
    [save.mutateAsync],
  );

  const submitSection = useCallback(
    async (draft: PipelineAnswers) => {
      await submit.mutateAsync({ draft });
    },
    [submit.mutateAsync],
  );

  // Cycle-length echo for B3 — read from Conversion intake's Closing step.
  const cycleEcho = useMemo(() => {
    const closing = (conversionIntake?.draft_answers as
      | { closing?: { cycleLength?: number | null; cycleUnit?: string | null } }
      | undefined)?.closing;
    if (!closing?.cycleLength || !closing.cycleUnit) return null;
    return `${closing.cycleLength} ${closing.cycleUnit}`;
  }, [conversionIntake]);

  return (
    <PipelineSectionForm
      title="Pipeline Health"
      draftAnswers={(intake?.draft_answers ?? null) as PipelineAnswers | null}
      submittedAnswers={(intake?.submitted_answers ?? null) as PipelineAnswers | null}
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
      cycleEcho={cycleEcho}
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
        <ReceivedState auditId={auditId} sectionKey="pipeline" onEdit={onEdit} />
      )}
    />
  );
}
