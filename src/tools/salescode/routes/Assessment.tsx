import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useSession } from "@/core/auth/useSession";
import { Button } from "@/components/ui/button";
import {
  ProgressBar,
  StepHeader,
  StepNav,
  type StepDef,
} from "@/tools/selling-systems-audit/components/StepShell";
import {
  useSalesCodeIntake,
  useSaveDraft,
  useSubmitSalesCode,
} from "../data/useSalesCodeIntake";
import { PRESENTATION_ORDER, QUESTIONS_BY_ID, TOTAL_QUESTIONS } from "../lib/questions";
import type { AnswerMap, Likert } from "../lib/types";
import { LikertRow } from "../components/LikertRow";

const AUTOSAVE_MS = 700;
const PER_STEP = 20;

/**
 * Build fixed-size step chunks from PRESENTATION_ORDER. Last step holds
 * the remainder so the total stays exactly TOTAL_QUESTIONS.
 */
const STEP_CHUNKS: ReadonlyArray<ReadonlyArray<number>> = (() => {
  const out: number[][] = [];
  for (let i = 0; i < PRESENTATION_ORDER.length; i += PER_STEP) {
    out.push([...PRESENTATION_ORDER.slice(i, i + PER_STEP)]);
  }
  return out;
})();

const STEPS: ReadonlyArray<StepDef> = STEP_CHUNKS.map((_, i) => ({
  key: `step-${i + 1}`,
  label: `Part ${i + 1}`,
}));

/**
 * Owner-facing SalesCode assessment.
 *
 * Hydrates `draft_answers`, autosaves on a 700ms debounce, and flushes at
 * commitment points (step nav, page hide, unmount). Submit is gated on
 * all 155 items being answered; on submit we score deterministically and
 * persist `type_code` + `traits` server-side.
 */
export function SalesCodeAssessment() {
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: intake, isLoading } = useSalesCodeIntake(userId);
  const save = useSaveDraft(userId);
  const submit = useSubmitSalesCode(userId);

  const [answers, setAnswers] = useState<AnswerMap>({});
  const [hydrated, setHydrated] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Hydrate once from draft_answers.
  useEffect(() => {
    if (hydrated || !userId || isLoading) return;
    const d = (intake?.draft_answers ?? {}) as AnswerMap;
    setAnswers(d);
    setHydrated(true);
  }, [intake, isLoading, hydrated, userId]);

  // Refs used by debounce + commit-point flushes.
  const lastSavedRef = useRef<string | null>(null);
  const latestRef = useRef<AnswerMap>(answers);
  const dirtyRef = useRef(false);
  const hasSubmittedRef = useRef(!!intake?.submitted_at);
  const saveMutateRef = useRef(save.mutate);

  useEffect(() => {
    latestRef.current = answers;
  }, [answers]);
  useEffect(() => {
    saveMutateRef.current = save.mutate;
  }, [save.mutate]);
  useEffect(() => {
    hasSubmittedRef.current = !!intake?.submitted_at;
  }, [intake?.submitted_at]);

  const flushSave = useCallback(() => {
    if (!dirtyRef.current || !userId) return;
    const draft = latestRef.current;
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

  // Debounced autosave on every answer change.
  useEffect(() => {
    if (!hydrated || !userId) return;
    const serialized = JSON.stringify(answers);
    if (serialized === lastSavedRef.current) return;
    dirtyRef.current = true;
    const t = window.setTimeout(flushSave, AUTOSAVE_MS);
    return () => window.clearTimeout(t);
  }, [answers, hydrated, userId, flushSave]);

  // Flush on tab hide / unmount.
  useEffect(() => {
    const onHide = () => flushSave();
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onHide);
      flushSave();
    };
  }, [flushSave]);

  const setAnswer = useCallback((id: number, v: Likert) => {
    setAnswers((prev) => (prev[id] === v ? prev : { ...prev, [id]: v }));
  }, []);

  const answeredCount = useMemo(
    () => PRESENTATION_ORDER.reduce((n, id) => n + (answers[id] ? 1 : 0), 0),
    [answers],
  );
  const allAnswered = answeredCount === TOTAL_QUESTIONS;

  const goStep = (i: number) => {
    flushSave();
    setStepIdx(Math.max(0, Math.min(STEPS.length - 1, i)));
    // Scroll to top of step.
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  };

  const onSubmit = async () => {
    if (!allAnswered) {
      setSubmitError(`Please answer all ${TOTAL_QUESTIONS} items before submitting (${answeredCount}/${TOTAL_QUESTIONS} done).`);
      return;
    }
    setSubmitError(null);
    flushSave();
    try {
      await submit.mutateAsync({ draft: latestRef.current });
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Submit failed.");
    }
  };

  if (isLoading || !hydrated) {
    return (
      <div className="app-content py-12 text-ink-muted">Loading…</div>
    );
  }

  const isSubmitted = !!intake?.submitted_at && !intake?.has_unsubmitted_changes;

  // Received state: brief confirmation + link back to overview. The full
  // result renderer arrives in the next phase.
  if (isSubmitted) {
    return (
      <div className="app-content py-12 flex flex-col gap-4">
        <Link
          to="/app/tools/$key/$"
          params={{ key: "salescode", _splat: "" }}
          className="text-sm text-ink-muted hover:text-ink inline-flex items-center gap-1"
        >
          <ArrowLeft className="size-3.5" /> Back to overview
        </Link>
        <h1 className="text-2xl text-ink">Assessment received</h1>
        <p className="text-ink-muted">
          Your SalesCode type is{" "}
          <span className="font-mono text-ink">{intake.type_code ?? "—"}</span>.
          The full result write-up appears on the overview.
        </p>
      </div>
    );
  }

  const chunk = STEP_CHUNKS[stepIdx];
  const stepAnswered = chunk.reduce((n, id) => n + (answers[id] ? 1 : 0), 0);
  const atLastStep = stepIdx === STEPS.length - 1;

  return (
    <div className="app-content py-8">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <Link
          to="/app/tools/$key/$"
          params={{ key: "salescode", _splat: "" }}
          className="text-sm text-ink-muted hover:text-ink inline-flex items-center gap-1 w-fit"
        >
          <ArrowLeft className="size-3.5" /> Back to overview
        </Link>

        <header className="flex flex-col gap-2">
          <h1 className="text-2xl text-ink" style={{ letterSpacing: "-0.01em" }}>
            SalesCode assessment
          </h1>
          <p className="text-ink-muted text-sm">
            Answer each statement honestly — there are no right answers. Your
            progress saves automatically; you can leave and come back at any
            time.
          </p>
        </header>

        <ProgressBar steps={STEPS} currentIdx={stepIdx} onJump={goStep} />

        <StepHeader
          title={`Part ${stepIdx + 1} of ${STEPS.length}`}
          subtitle={`Answered ${stepAnswered} of ${chunk.length} in this part • ${answeredCount} of ${TOTAL_QUESTIONS} overall.`}
        />

        <div className="flex flex-col">
          {chunk.map((id) => {
            const q = QUESTIONS_BY_ID.get(id);
            if (!q) return null;
            return (
              <LikertRow
                key={id}
                id={id}
                text={q.text}
                value={answers[id]}
                onChange={(v) => setAnswer(id, v)}
              />
            );
          })}
        </div>

        {atLastStep ? (
          <div className="flex flex-col gap-3 pt-4 border-t border-border">
            <div className="flex items-center justify-between gap-4">
              <Button
                variant="outline"
                onClick={() => goStep(stepIdx - 1)}
                className="active:scale-[0.97] transition-transform"
              >
                Back
              </Button>
              <span className="text-ink-muted text-xs tabular-nums">
                {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : ""}
              </span>
              <Button
                onClick={onSubmit}
                disabled={!allAnswered || submit.isPending}
                className="active:scale-[0.97] transition-transform"
              >
                {submit.isPending ? "Submitting…" : "Submit"}
              </Button>
            </div>
            {!allAnswered ? (
              <p className="text-xs text-ink-muted">
                {TOTAL_QUESTIONS - answeredCount} item
                {TOTAL_QUESTIONS - answeredCount === 1 ? "" : "s"} still need an answer.
              </p>
            ) : null}
            {submitError ? (
              <p className="text-xs text-red">{submitError}</p>
            ) : null}
          </div>
        ) : (
          <StepNav
            currentIdx={stepIdx}
            total={STEPS.length}
            onPrev={() => goStep(stepIdx - 1)}
            onNext={() => goStep(stepIdx + 1)}
            saveState={saveState}
          />
        )}
      </div>
    </div>
  );
}
