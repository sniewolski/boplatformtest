import { useCallback } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { ReceivedState } from "../components/ReceivedState";
import { useSession } from "@/core/auth/useSession";
import {
  useActivityIntake,
  useSaveDraft,
  useSubmitIntake,
  type ActivityAnswers,
} from "../data/useActivityReview";
import { ActivitySectionForm } from "../components/ActivitySectionForm";

/**
 * Owner route for the Sales Activity Metrics section. Owns everything
 * owner-specific: session, audit id from the route, the section's data hooks
 * and navigation. The form itself is presentational
 * (see `components/ActivitySectionForm.tsx`).
 */
export function SalesActivity({ auditId }: { auditId: string }) {
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: intake, isLoading } = useActivityIntake(auditId);
  const save = useSaveDraft(userId, auditId);
  const submit = useSubmitIntake(userId, auditId);

  const saveDraft = useCallback(
    async (draft: ActivityAnswers, hasSubmitted: boolean) => {
      await save.mutateAsync({ draft, hasSubmitted });
    },
    [save.mutateAsync],
  );

  const submitSection = useCallback(
    async (draft: ActivityAnswers) => {
      await submit.mutateAsync({ draft });
    },
    [submit.mutateAsync],
  );

  return (
    <ActivitySectionForm
      title="Sales Activity Metrics"
      draftAnswers={(intake?.draft_answers ?? null) as ActivityAnswers | null}
      submittedAnswers={(intake?.submitted_answers ?? null) as ActivityAnswers | null}
      hasUnsubmittedChanges={!!intake?.has_unsubmitted_changes}
      submittedAt={intake?.submitted_at ?? null}
      isLoading={isLoading}
      canPersist={!!userId}
      saveDraft={saveDraft}
      submitSection={submitSection}
      isSubmitting={submit.isPending}
      // This section has no money questions; currency is unused by the form.
      currency={null}
      currencyLoading={false}
      onCurrencyChange={() => {}}
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
        <ReceivedState auditId={auditId} sectionKey="activity" onEdit={onEdit} />
      )}
    />
  );
}
