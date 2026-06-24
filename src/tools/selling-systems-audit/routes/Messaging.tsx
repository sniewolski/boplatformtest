import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Check } from "lucide-react";
import { useSession } from "@/core/auth/useSession";
import { Button } from "@/components/ui/button";
import {
  useMessagingIntake,
  useSaveDraft,
  useSubmitIntake,
  type MessagingAnswers,
  type MessagingConsistencyAnswers,
  type MessagingIcpAnswers,
  type MessagingProblemAnswers,
  type MessagingProofAnswers,
  type MessagingValueAnswers,
} from "../data/useMessagingReview";
import { MESSAGING_STEPS } from "../config";
import { ProgressBar, StepNav, StepHeader } from "../components/StepShell";

const AUTOSAVE_MS = 700;

/**
 * Messaging & Positioning intake shell. Mirrors SalesActivity verbatim:
 * hydration guard, per-key debounced autosave (700ms) + commit-point
 * flushes (blur capture, step nav, visibilitychange, unmount), Submit →
 * ReceivedState, "edit after submit" note. Phase 2 leaves the 5 content
 * step bodies empty — Phase 3 fills questions + read-back.
 */
export function Messaging() {
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: intake, isLoading } = useMessagingIntake(userId);
  const save = useSaveDraft(userId);
  const submit = useSubmitIntake(userId);

  const [stepIdx, setStepIdx] = useState(0);
  const step = MESSAGING_STEPS[stepIdx];

  const [icp, setIcp] = useState<MessagingIcpAnswers>({});
  const [problem, setProblem] = useState<MessagingProblemAnswers>({});
  const [value, setValue] = useState<MessagingValueAnswers>({});
  const [proof, setProof] = useState<MessagingProofAnswers>({});
  const [consistency, setConsistency] = useState<MessagingConsistencyAnswers>({});

  const [hydrated, setHydrated] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [editingAfterSubmit, setEditingAfterSubmit] = useState(false);

  useEffect(() => {
    if (hydrated || !userId || isLoading) return;
    const d = (intake?.draft_answers ?? {}) as MessagingAnswers;
    if (d.icp) setIcp(d.icp);
    if (d.problem) setProblem(d.problem);
    if (d.value) setValue(d.value);
    if (d.proof) setProof(d.proof);
    if (d.consistency) setConsistency(d.consistency);
    setHydrated(true);
  }, [intake, isLoading, hydrated, userId]);

  const currentDraft = useMemo<MessagingAnswers>(
    () => ({ icp, problem, value, proof, consistency }),
    [icp, problem, value, proof, consistency],
  );

  const lastSavedRef = useRef<string | null>(null);
  const latestDraftRef = useRef<MessagingAnswers>(currentDraft);
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
          Messaging & Positioning
        </h1>
        <p className="text-ink-muted text-base max-w-prose">
          Who you sell to, the problem you solve in their words, your value
          proposition, the proof behind it, and how consistent the message is
          across touchpoints.
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
          <ProgressBar steps={MESSAGING_STEPS} currentIdx={stepIdx} onJump={setStepIdx} />

          <div className="flex flex-col gap-8" onBlurCapture={flushSave}>
            {step.key === "icp" && (
              <section className="flex flex-col gap-8">
                <StepHeader
                  title="Ideal customer clarity"
                  subtitle="Who you're for, in enough detail that a prospect would recognise themselves."
                />
              </section>
            )}
            {step.key === "problem" && (
              <section className="flex flex-col gap-8">
                <StepHeader
                  title="Problem & pain clarity"
                  subtitle="The problem you solve — described in your client's words, not yours."
                />
              </section>
            )}
            {step.key === "value" && (
              <section className="flex flex-col gap-8">
                <StepHeader
                  title="Value proposition"
                  subtitle="What you deliver, for whom, and how you're different from the alternatives."
                />
              </section>
            )}
            {step.key === "proof" && (
              <section className="flex flex-col gap-8">
                <StepHeader
                  title="Proof & credibility"
                  subtitle="The evidence behind your claims, and how well it speaks to your ICP."
                />
              </section>
            )}
            {step.key === "consistency" && (
              <section className="flex flex-col gap-8">
                <StepHeader
                  title="Message consistency"
                  subtitle="How aligned the message is across touchpoints, and how clients describe you back."
                />
              </section>
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
            {/* Suppress unused-warnings until Phase 3 wires the fields. */}
            {false && (
              <span hidden>
                {JSON.stringify({ icp, problem, value, proof, consistency })}
                {String(setIcp)}{String(setProblem)}{String(setValue)}
                {String(setProof)}{String(setConsistency)}
              </span>
            )}
          </div>

          <StepNav
            currentIdx={stepIdx}
            total={MESSAGING_STEPS.length}
            onPrev={() => {
              flushSave();
              setStepIdx((i) => Math.max(0, i - 1));
            }}
            onNext={() => {
              flushSave();
              setStepIdx((i) => Math.min(MESSAGING_STEPS.length - 1, i + 1));
            }}
            saveState={saveState}
          />
        </>
      )}
    </div>
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
        subtitle="A quick read-back of your answers will appear here. Edit anything by stepping back."
      />

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
