import { useCallback } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { ReceivedState } from "../components/ReceivedState";
import { useSession } from "@/core/auth/useSession";
import {
  useMessagingIntake,
  useSaveDraft,
  useSubmitIntake,
  type MessagingAnswers,
} from "../data/useMessagingReview";
import { MessagingSectionForm } from "../components/MessagingSectionForm";

/**
 * Owner route for the Messaging & Positioning section. Owns everything
 * owner-specific: session, audit id from the route, the section's data hooks
 * and navigation. The form itself is presentational
 * (see `components/MessagingSectionForm.tsx`).
 */
export function Messaging({ auditId }: { auditId: string }) {
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: intake, isLoading } = useMessagingIntake(auditId);
  const save = useSaveDraft(userId, auditId);
  const submit = useSubmitIntake(userId, auditId);

  const saveDraft = useCallback(
    async (draft: MessagingAnswers, hasSubmitted: boolean) => {
      await save.mutateAsync({ draft, hasSubmitted });
    },
    [save.mutateAsync],
  );

  const submitSection = useCallback(
    async (draft: MessagingAnswers) => {
      await submit.mutateAsync({ draft });
    },
    [submit.mutateAsync],
  );

  return (
    <MessagingSectionForm
      title="Messaging & Positioning"
      draftAnswers={(intake?.draft_answers ?? null) as MessagingAnswers | null}
      submittedAnswers={(intake?.submitted_answers ?? null) as MessagingAnswers | null}
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
        <ReceivedState auditId={auditId} sectionKey="messaging" onEdit={onEdit} />
      )}
    />
  );
}
