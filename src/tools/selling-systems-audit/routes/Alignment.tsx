import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Check } from "lucide-react";
import { useSession } from "@/core/auth/useSession";
import { Button } from "@/components/ui/button";
import {
  useAlignmentIntake,
  useSaveDraft,
  useSubmitIntake,
  type AlignmentAnswers,
  type AlignmentAttributionAnswers,
  type AlignmentConsistencyAnswers,
  type AlignmentEnablementAnswers,
  type AlignmentFeedbackAnswers,
  type AlignmentLeadQualityAnswers,
} from "../data/useAlignmentReview";
import { ALIGNMENT_STEPS } from "../config";
import { ProgressBar, StepNav, StepHeader } from "../components/StepShell";

const AUTOSAVE_MS = 700;

export function Alignment() {
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: intake, isLoading } = useAlignmentIntake(userId);
  const save = useSaveDraft(userId);
  const submit = useSubmitIntake(userId);

  const [stepIdx, setStepIdx] = useState(0);
  const step = ALIGNMENT_STEPS[stepIdx];

  const [leadQuality, setLeadQuality] = useState<AlignmentLeadQualityAnswers>({});
  const [consistency, setConsistency] = useState<AlignmentConsistencyAnswers>({});
  const [feedback, setFeedback] = useState<AlignmentFeedbackAnswers>({});
  const [enablement, setEnablement] = useState<AlignmentEnablementAnswers>({});
  const [attribution, setAttribution] = useState<AlignmentAttributionAnswers>({});

  const [hydrated, setHydrated] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [editingAfterSubmit, setEditingAfterSubmit] = useState(false);

  useEffect(() => {
    if (hydrated || !userId || isLoading) return;
    const d = (intake?.draft_answers ?? {}) as AlignmentAnswers;
    if (d.leadQuality) setLeadQuality(d.leadQuality);
    if (d.consistency) setConsistency(d.consistency);
    if (d.feedback) setFeedback(d.feedback);
    if (d.enablement) setEnablement(d.enablement);
    if (d.attribution) setAttribution(d.attribution);
    setHydrated(true);
  }, [intake, isLoading, hydrated, userId]);

  const currentDraft = useMemo<AlignmentAnswers>(
    () => ({ leadQuality, consistency, feedback, enablement, attribution }),
    [leadQuality, consistency, feedback, enablement, attribution],
  );

  const lastSavedRef = useRef<string | null>(null);
  const latestDraftRef = useRef<AlignmentAnswers>(currentDraft);
  const dirtyRef = useRef(false);
  const hasSubmittedRef = useRef(!!intake?.submitted_at);
  const saveMutateRef = useRef(save.mutate);

  useEffect(() => {
    latestDraftRef.current = currentDraft;
  }, [currentDraft]);
  useEffect(() => {
    saveMutateRef.current = save.mutate;
  }, [save.mutate]);
  useEffect(() => {
    hasSubmittedRef.current = !!intake?.submitted_at;
  }, [intake?.submitted_at]);

  const flushSave = useCallback(() => {
    if (!dirtyRef.current || !userId) return;
    const draft = latestDraftRef.current;
    const serialized = JSON.stringify(draft);
    dirtyRef.current = false;
    lastSavedRef.current = serialized;
    setSaveState("saving");
    saveMutateRef.current(
      { draft, hasSubmitted: hasSubmittedRef.current },
      {
        onSuccess: () => setSaveState("saved"),
        onError: () => {
          dirtyRef.current = true;
          setSaveState("idle");
        },
      },
    );
  }, [userId]);

  useEffect(() => {
    if (!hydrated || !userId) return;
    const serialized = JSON.stringify(currentDraft);
    if (lastSavedRef.current === null) {
      lastSavedRef.current = serialized;
      return;
    }
    if (lastSavedRef.current === serialized) return;
    dirtyRef.current = true;
    setSaveState("saving");
    const t = setTimeout(() => flushSave(), AUTOSAVE_MS);
    return () => clearTimeout(t);
  }, [currentDraft, hydrated, userId, flushSave]);

  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === "hidden") flushSave();
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      flushSave();
    };
  }, [flushSave]);

  const isReceived =
    !!intake?.submitted_at && !intake.has_unsubmitted_changes && !editingAfterSubmit;

  async function handleSubmit() {
    setSubmitError(null);
    try {
      await submit.mutateAsync({ draft: currentDraft });
      lastSavedRef.current = JSON.stringify(currentDraft);
      setSaveState("saved");
      setEditingAfterSubmit(false);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Could not submit.");
    }
  }

  const hasSubmitted = !!intake?.submitted_at;
  const hasUnsubmittedChanges = !!intake?.has_unsubmitted_changes;
  const submitLabel = !hasSubmitted
    ? "Submit"
    : hasUnsubmittedChanges
      ? "Resubmit"
      : "Submitted";

  // Keep setters referenced until Phase 3 wires the field UIs.
  if (false) {
    setLeadQuality({});
    setConsistency({});
    setFeedback({});
    setEnablement({});
    setAttribution({});
  }

  return (
    <div className="app-content py-12 flex flex-col gap-10">
      <Link
        to="/app/tools/$key/$"
        params={{ key: "selling-systems-audit", _splat: "" }}
        className="inline-flex items-center gap-2 text-ink-muted text-sm hover:text-ink transition-colors w-fit"
      >
        <ArrowLeft className="size-4" />
        Back to audit
      </Link>

      <header className="flex flex-col gap-3">
        <h1 className="text-3xl" style={{ letterSpacing: "-0.02em" }}>
          Marketing & Sales Alignment
        </h1>
        <p className="text-ink-muted text-base max-w-prose">
          Whether marketing and sales agree on a good lead, present a coherent
          message, share intelligence both ways, and measure against connected
          goals.
        </p>
      </header>

      {isReceived ? (
        <ReceivedState
          onEdit={() => {
            setEditingAfterSubmit(true);
            setStepIdx(0);
          }}
        />
      ) : (
        <>
          <ProgressBar steps={ALIGNMENT_STEPS} currentIdx={stepIdx} onJump={setStepIdx} />

          <div className="flex flex-col gap-8" onBlurCapture={flushSave}>
            {step.key === "leadQuality" && (
              <PlaceholderStep title="Lead quality & handoff" />
            )}
            {step.key === "consistency" && (
              <PlaceholderStep title="Message consistency" />
            )}
            {step.key === "feedback" && (
              <PlaceholderStep title="Feedback loops" />
            )}
            {step.key === "enablement" && (
              <PlaceholderStep title="Content & enablement" />
            )}
            {step.key === "attribution" && (
              <PlaceholderStep title="Attribution & measurement" />
            )}
            {step.key === "review" && (
              <ReviewStep
                hasSubmitted={hasSubmitted}
                hasUnsubmittedChanges={hasUnsubmittedChanges}
                submitting={submit.isPending}
                onSubmit={handleSubmit}
                error={submitError}
                submitLabel={submitLabel}
              />
            )}
          </div>

          <StepNav
            currentIdx={stepIdx}
            total={ALIGNMENT_STEPS.length}
            onPrev={() => {
              flushSave();
              setStepIdx((i) => Math.max(0, i - 1));
            }}
            onNext={() => {
              flushSave();
              setStepIdx((i) => Math.min(ALIGNMENT_STEPS.length - 1, i + 1));
            }}
            saveState={saveState}
          />
        </>
      )}
    </div>
  );
}

function PlaceholderStep({ title }: { title: string }) {
  return (
    <section className="flex flex-col gap-6">
      <StepHeader title={title} subtitle="Questions for this step arrive next." />
    </section>
  );
}

function ReceivedState({ onEdit }: { onEdit: () => void }) {
  return (
    <section className="flex flex-col gap-5 border border-border rounded-xl px-8 py-10 items-start">
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center justify-center size-9 rounded-full bg-[var(--surface-raised)] text-ink">
          <Check className="size-5" aria-hidden />
        </span>
        <h2 className="text-xl" style={{ letterSpacing: "-0.01em" }}>
          Received
        </h2>
      </div>
      <p className="text-ink-muted text-sm max-w-prose">
        Thanks — we've got everything we need for our call. If anything changes
        before then, jump back in and update your answers; submit again and the
        new version replaces the old.
      </p>
      <Button
        variant="outline"
        onClick={onEdit}
        className="active:scale-[0.97] transition-transform"
      >
        Edit my answers
      </Button>
    </section>
  );
}

function ReviewStep({
  hasSubmitted,
  hasUnsubmittedChanges,
  submitting,
  onSubmit,
  error,
  submitLabel,
}: {
  hasSubmitted: boolean;
  hasUnsubmittedChanges: boolean;
  submitting: boolean;
  onSubmit: () => void;
  error: string | null;
  submitLabel: string;
}) {
  return (
    <section className="flex flex-col gap-8">
      <StepHeader
        title="Review & submit"
        subtitle="A quick read-back of your answers. Edit anything by stepping back."
      />
      <p className="text-ink-muted text-sm">Read-back arrives in the next phase.</p>
      {hasSubmitted && hasUnsubmittedChanges && (
        <p className="text-ink-muted text-sm">
          You've changed your answers since last submission.
        </p>
      )}
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <Button
        onClick={onSubmit}
        disabled={submitting || (hasSubmitted && !hasUnsubmittedChanges)}
        className="w-fit active:scale-[0.97] transition-transform"
      >
        {submitting ? "Submitting…" : submitLabel}
      </Button>
    </section>
  );
}
