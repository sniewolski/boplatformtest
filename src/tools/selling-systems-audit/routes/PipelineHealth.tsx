import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Check } from "lucide-react";
import { useSession } from "@/core/auth/useSession";
import { Button } from "@/components/ui/button";
import {
  usePipelineIntake,
  useSaveDraft,
  useSubmitIntake,
  type PipelineAnswers,
  type PipelineVolumeAnswers,
  type PipelineVelocityAnswers,
  type PipelineForecastingAnswers,
} from "../data/usePipelineReview";
import { PIPELINE_STEPS } from "../config";
import { ProgressBar, StepNav, StepHeader } from "../components/StepShell";

const AUTOSAVE_MS = 700;

type SummaryAnswers = {
  // Step 4 is a read-back; no fields collected here yet. Kept for future use.
  reviewedAt?: string;
};

type AllAnswers = PipelineAnswers & {
  summary?: SummaryAnswers;
};

export function PipelineHealth() {
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: intake, isLoading } = usePipelineIntake(userId);
  const save = useSaveDraft(userId);
  const submit = useSubmitIntake(userId);

  const [stepIdx, setStepIdx] = useState(0);
  const step = PIPELINE_STEPS[stepIdx];

  const [volume, setVolume] = useState<PipelineVolumeAnswers>({});
  const [velocity, setVelocity] = useState<PipelineVelocityAnswers>({});
  const [forecasting, setForecasting] = useState<PipelineForecastingAnswers>({});
  const [summary, setSummary] = useState<SummaryAnswers>({});

  const [hydrated, setHydrated] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [editingAfterSubmit, setEditingAfterSubmit] = useState(false);

  // Hydrate once from draft. Wait for userId — otherwise the query is
  // disabled (isLoading=false, intake=undefined) and we'd lock hydration
  // against an empty payload before the session resolves.
  useEffect(() => {
    if (hydrated || !userId || isLoading) return;
    const d = (intake?.draft_answers ?? {}) as AllAnswers;
    if (d.volume) setVolume(d.volume);
    if (d.velocity) setVelocity(d.velocity);
    if (d.forecasting) setForecasting(d.forecasting);
    if (d.summary) setSummary(d.summary as SummaryAnswers);
    setHydrated(true);
  }, [intake, isLoading, hydrated, userId]);

  const currentDraft = useMemo<PipelineAnswers>(
    () => ({ volume, velocity, forecasting, summary } as unknown as PipelineAnswers),
    [volume, velocity, forecasting, summary],
  );

  const lastSavedRef = useRef<string | null>(null);
  const latestDraftRef = useRef<PipelineAnswers>(currentDraft);
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
          Pipeline Health
        </h1>
        <p className="text-ink-muted text-base max-w-prose">
          A structured read on whether your pipeline can hit target — volume,
          velocity, and how confidently you can see what's coming.
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
          <ProgressBar steps={PIPELINE_STEPS} currentIdx={stepIdx} onJump={setStepIdx} />

          <div className="flex flex-col gap-8" onBlurCapture={flushSave}>
            {step.key === "volume" && (
              <VolumeStep value={volume} onChange={setVolume} />
            )}
            {step.key === "velocity" && (
              <VelocityStep value={velocity} onChange={setVelocity} />
            )}
            {step.key === "forecasting" && (
              <ForecastingStep value={forecasting} onChange={setForecasting} />
            )}
            {step.key === "summary" && (
              <SummaryStep
                hasSubmitted={!!intake?.submitted_at}
                hasUnsubmittedChanges={!!intake?.has_unsubmitted_changes}
                submitting={submit.isPending}
                onSubmit={handleSubmit}
                error={submitError}
              />
            )}
          </div>

          <StepNav
            currentIdx={stepIdx}
            total={PIPELINE_STEPS.length}
            onPrev={() => {
              flushSave();
              setStepIdx((i) => Math.max(0, i - 1));
            }}
            onNext={() => {
              flushSave();
              setStepIdx((i) => Math.min(PIPELINE_STEPS.length - 1, i + 1));
            }}
            saveState={saveState}
          />
        </>
      )}
    </div>
  );
}

// ───────── Empty step placeholders (Phase 4 fills these) ─────────

function VolumeStep({
  value: _value,
  onChange: _onChange,
}: {
  value: PipelineVolumeAnswers;
  onChange: (next: PipelineVolumeAnswers) => void;
}) {
  return (
    <section className="flex flex-col gap-6">
      <StepHeader
        title="Volume & coverage"
        subtitle="How much pipeline is in play, and how that compares to what you need."
      />
      <p className="text-ink-muted text-sm">Questions arriving in the next phase.</p>
    </section>
  );
}

function VelocityStep({
  value: _value,
  onChange: _onChange,
}: {
  value: PipelineVelocityAnswers;
  onChange: (next: PipelineVelocityAnswers) => void;
}) {
  return (
    <section className="flex flex-col gap-6">
      <StepHeader
        title="Velocity & stalling"
        subtitle="How quickly deals move — and where they get stuck."
      />
      <p className="text-ink-muted text-sm">Questions arriving in the next phase.</p>
    </section>
  );
}

function ForecastingStep({
  value: _value,
  onChange: _onChange,
}: {
  value: PipelineForecastingAnswers;
  onChange: (next: PipelineForecastingAnswers) => void;
}) {
  return (
    <section className="flex flex-col gap-6">
      <StepHeader
        title="Forecasting & visibility"
        subtitle="How you predict what's coming, and how often you review."
      />
      <p className="text-ink-muted text-sm">Questions arriving in the next phase.</p>
    </section>
  );
}

function SummaryStep({
  hasSubmitted,
  hasUnsubmittedChanges,
  submitting,
  onSubmit,
  error,
}: {
  hasSubmitted: boolean;
  hasUnsubmittedChanges: boolean;
  submitting: boolean;
  onSubmit: () => void;
  error: string | null;
}) {
  const label = hasSubmitted
    ? hasUnsubmittedChanges
      ? "Resubmit with changes"
      : "Submitted"
    : "Submit for review";
  return (
    <section className="flex flex-col gap-6">
      <StepHeader
        title="Review & submit"
        subtitle="Send your answers to your coach. You can edit and resubmit any time."
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
        {submitting ? "Submitting…" : label}
      </Button>
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
