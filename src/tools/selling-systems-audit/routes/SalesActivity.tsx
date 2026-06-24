import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Check } from "lucide-react";
import { useSession } from "@/core/auth/useSession";
import { Button } from "@/components/ui/button";
import {
  useActivityIntake,
  useSaveDraft,
  useSubmitIntake,
  type ActivityAnswers,
  type ActivityQualityAnswers,
  type ActivityTrackingAnswers,
  type ActivityVolumeAnswers,
} from "../data/useActivityReview";
import {
  ACTIVITY_STEPS,
  ACTIVITY_METRICS,
  TRACKING_METHOD,
  CALLS_BAND,
  EMAILS_BAND,
  MEETINGS_BAND,
  ACTIVITY_TREND,
  ACTIVITY_CONFIDENCE,
  ACTIVITY_CONSISTENCY,
  STRONGEST_METRIC,
  GOALS_SET,
  DATA_TRUST,
} from "../config";
import { ProgressBar, StepNav, StepHeader } from "../components/StepShell";
import {
  Chips,
  Segmented,
  MaturitySpectrum,
  OptionalText,
  Question,
} from "../components/IntakeFields";
import {
  labelOf,
  chipsLabels,
  ReadRow,
  ReadGroup,
} from "../components/ReadBack";

const AUTOSAVE_MS = 700;

/**
 * Sales Activity Metrics intake shell. Mirrors SalesProcess verbatim:
 * hydration guard, per-key debounced autosave (700ms) + commit-point
 * flushes (blur capture, step nav, visibilitychange, unmount), Submit →
 * ReceivedState, "edit after submit" note. Phase 2 leaves the 4 step
 * bodies empty — Phase 3 fills questions + read-back.
 */
export function SalesActivity() {
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: intake, isLoading } = useActivityIntake(userId);
  const save = useSaveDraft(userId);
  const submit = useSubmitIntake(userId);

  const [stepIdx, setStepIdx] = useState(0);
  const step = ACTIVITY_STEPS[stepIdx];

  const [tracking, setTracking] = useState<ActivityTrackingAnswers>({});
  const [volume, setVolume] = useState<ActivityVolumeAnswers>({});
  const [quality, setQuality] = useState<ActivityQualityAnswers>({});

  const [hydrated, setHydrated] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [editingAfterSubmit, setEditingAfterSubmit] = useState(false);

  useEffect(() => {
    if (hydrated || !userId || isLoading) return;
    const d = (intake?.draft_answers ?? {}) as ActivityAnswers;
    if (d.tracking) setTracking(d.tracking);
    if (d.volume) setVolume(d.volume);
    if (d.quality) setQuality(d.quality);
    setHydrated(true);
  }, [intake, isLoading, hydrated, userId]);

  const currentDraft = useMemo<ActivityAnswers>(
    () => ({ tracking, volume, quality }),
    [tracking, volume, quality],
  );

  const lastSavedRef = useRef<string | null>(null);
  const latestDraftRef = useRef<ActivityAnswers>(currentDraft);
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
          Sales Activity Metrics
        </h1>
        <p className="text-ink-muted text-base max-w-prose">
          What sales activity you measure, how healthy the numbers look, and
          how confidently you read them.
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
          <ProgressBar steps={ACTIVITY_STEPS} currentIdx={stepIdx} onJump={setStepIdx} />

          <div className="flex flex-col gap-8" onBlurCapture={flushSave}>
            {step.key === "tracking" && (
              <TrackingStep value={tracking} onChange={setTracking} />
            )}
            {step.key === "volume" && (
              <VolumeStep value={volume} onChange={setVolume} />
            )}
            {step.key === "quality" && (
              <QualityStep value={quality} onChange={setQuality} />
            )}
            {step.key === "review" && (
              <ReviewStep
                tracking={tracking}
                volume={volume}
                quality={quality}
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
            total={ACTIVITY_STEPS.length}
            onPrev={() => {
              flushSave();
              setStepIdx((i) => Math.max(0, i - 1));
            }}
            onNext={() => {
              flushSave();
              setStepIdx((i) => Math.min(ACTIVITY_STEPS.length - 1, i + 1));
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
        subtitle="A quick read-back of your answers. Edit anything by stepping back."
      />

      <p className="text-ink-muted text-sm">
        Read-back fills in next pass.
      </p>

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
