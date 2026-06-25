import { useCallback } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useSession } from "@/core/auth/useSession";
import {
  useSalesCodeIntake,
  useSaveDraft,
  useSubmitSalesCode,
} from "../data/useSalesCodeIntake";
import type { AnswerMap } from "../lib/types";
import { SalesCodeQuestionFlow } from "../components/SalesCodeQuestionFlow";

/**
 * Owner-facing SalesCode assessment route. Thin wrapper around
 * SalesCodeQuestionFlow: wires the owner-side Supabase persistence into
 * the shared flow component. Submit overwrites the existing result
 * (no history) and routes to the result page.
 */
export function SalesCodeAssessment() {
  const { session } = useSession();
  const userId = session?.user.id;
  const navigate = useNavigate({ from: "/app/tools/$key/$" });
  const { data: intake, isLoading } = useSalesCodeIntake(userId);
  const save = useSaveDraft(userId);
  const submit = useSubmitSalesCode(userId);

  const hasSubmitted = !!intake?.submitted_at;

  const onSave = useCallback(
    async (draft: AnswerMap) => {
      if (!userId) return;
      await save.mutateAsync({ draft, hasSubmitted });
    },
    [save, userId, hasSubmitted],
  );

  const onSubmit = useCallback(
    async (final: AnswerMap) => {
      await submit.mutateAsync({ draft: final });
      navigate({
        to: "/app/tools/$key/$",
        params: { key: "salescode", _splat: "result" },
      });
    },
    [submit, navigate],
  );

  if (isLoading || !userId) {
    return <div className="app-content py-12 text-ink-muted">Loading…</div>;
  }

  const isSubmitted =
    !!intake?.submitted_at && !intake?.has_unsubmitted_changes;

  // Fallback for someone returning to /assessment after already submitting
  // without using the retake flow.
  if (isSubmitted) {
    return (
      <div className="app-content py-12 flex flex-col gap-4">
        <Link
          to="/app/tools/$key/$"
          params={{ key: "salescode", _splat: "result" }}
          className="text-sm text-ink-muted hover:text-ink inline-flex items-center gap-1"
        >
          <ArrowLeft className="size-3.5" /> View your result
        </Link>
        <h1 className="text-2xl text-ink">Assessment received</h1>
        <p className="text-ink-muted">
          Your SalesCode type is{" "}
          <span className="font-mono text-ink">{intake.type_code ?? "—"}</span>.
          View the full write-up on your result page.
        </p>
      </div>
    );
  }

  const initialAnswers = (intake?.draft_answers ?? {}) as AnswerMap;

  return (
    <div className="app-content py-12">
      <SalesCodeQuestionFlow
        initialAnswers={initialAnswers}
        onSave={onSave}
        onSubmit={onSubmit}
        submitting={submit.isPending}
        submitError={submit.error instanceof Error ? submit.error.message : null}
        backSlot={
          <Link
            to="/app/tools/$key/$"
            params={{ key: "salescode", _splat: "" }}
            className="text-sm text-ink-muted hover:text-ink inline-flex items-center gap-1 w-fit"
          >
            <ArrowLeft className="size-3.5" /> Back to overview
          </Link>
        }
      />
    </div>
  );
}
