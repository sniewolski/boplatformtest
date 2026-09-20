import { useCallback } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { ReceivedState } from "../components/ReceivedState";
import { useSession } from "@/core/auth/useSession";
import {
  useProcessIntake,
  useSaveDraft,
  useSubmitIntake,
  type ProcessAnswers,
} from "../data/useProcessReview";
import { ProcessSectionForm } from "../components/ProcessSectionForm";

/**
 * Owner route for the Sales Process section. Owns everything owner-specific:
 * session, audit id from the route, the section's data hooks and navigation.
 * The form itself is presentational (see `components/ProcessSectionForm.tsx`).
 */
export function SalesProcess({ auditId }: { auditId: string }) {
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: intake, isLoading } = useProcessIntake(auditId);
  const save = useSaveDraft(userId, auditId);
  const submit = useSubmitIntake(userId, auditId);

  const saveDraft = useCallback(
    async (draft: ProcessAnswers, hasSubmitted: boolean) => {
      await save.mutateAsync({ draft, hasSubmitted });
    },
    [save.mutateAsync],
  );

  const submitSection = useCallback(
    async (draft: ProcessAnswers) => {
      await submit.mutateAsync({ draft });
    },
    [submit.mutateAsync],
  );

  return (
    <ProcessSectionForm
      title="Sales Process"
      draftAnswers={(intake?.draft_answers ?? null) as ProcessAnswers | null}
      submittedAnswers={(intake?.submitted_answers ?? null) as ProcessAnswers | null}
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
        <ReceivedState auditId={auditId} sectionKey="process" onEdit={onEdit} />
      )}
    />
  );
}
