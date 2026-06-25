import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ProgressBar,
  StepHeader,
  StepNav,
  type StepDef,
} from "@/tools/selling-systems-audit/components/StepShell";
import {
  PRESENTATION_ORDER,
  QUESTIONS_BY_ID,
  TOTAL_QUESTIONS,
} from "../lib/questions";
import type { AnswerMap, Likert } from "../lib/types";
import { LikertRow } from "./LikertRow";

const AUTOSAVE_MS = 700;
const PER_STEP = 8;

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

export type SaveState = "idle" | "saving" | "saved";

/**
 * Shared SalesCode question flow. Owns the 8-per-step chunking, Likert
 * rows, autosave debounce, and submit gating. Persistence is delegated to
 * the parent via `onSave` (called on a 700ms debounce + commitment points)
 * and `onSubmit` (called once on Submit with the full answer map).
 *
 * Used by both the owner self-assessment route and the tokenized
 * respondent route.
 */
export function SalesCodeQuestionFlow({
  initialAnswers,
  onSave,
  onSubmit,
  submitting = false,
  submitError = null,
  intro,
  backSlot,
}: {
  initialAnswers: AnswerMap;
  onSave: (draft: AnswerMap) => Promise<void> | void;
  onSubmit: (final: AnswerMap) => Promise<void> | void;
  submitting?: boolean;
  submitError?: string | null;
  /** Optional header block (title/subtitle). Defaults to the owner copy. */
  intro?: React.ReactNode;
  /** Optional back-link / breadcrumb rendered above the header. */
  backSlot?: React.ReactNode;
}) {
  const [answers, setAnswers] = useState<AnswerMap>(initialAnswers);
  const [stepIdx, setStepIdx] = useState(() => {
    const firstIncomplete = STEP_CHUNKS.findIndex((ids) =>
      ids.some((id) => !initialAnswers[id]),
    );
    return firstIncomplete === -1 ? STEPS.length - 1 : firstIncomplete;
  });
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [localSubmitError, setLocalSubmitError] = useState<string | null>(null);

  const lastSavedRef = useRef<string>(JSON.stringify(initialAnswers));
  const latestRef = useRef<AnswerMap>(answers);
  const dirtyRef = useRef(false);
  const onSaveRef = useRef(onSave);

  useEffect(() => {
    latestRef.current = answers;
  }, [answers]);
  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  const flushSave = useCallback(() => {
    if (!dirtyRef.current) return;
    const draft = latestRef.current;
    const serialized = JSON.stringify(draft);
    dirtyRef.current = false;
    lastSavedRef.current = serialized;
    setSaveState("saving");
    Promise.resolve(onSaveRef.current(draft))
      .then(() => setSaveState("saved"))
      .catch(() => {
        dirtyRef.current = true;
        setSaveState("idle");
      });
  }, []);

  // Debounced autosave on every answer change.
  useEffect(() => {
    const serialized = JSON.stringify(answers);
    if (serialized === lastSavedRef.current) return;
    dirtyRef.current = true;
    const t = window.setTimeout(flushSave, AUTOSAVE_MS);
    return () => window.clearTimeout(t);
  }, [answers, flushSave]);

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
    if (typeof window !== "undefined")
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  };

  const handleSubmit = async () => {
    if (!allAnswered) {
      setLocalSubmitError(
        `Please answer all ${TOTAL_QUESTIONS} items before submitting (${answeredCount}/${TOTAL_QUESTIONS} done).`,
      );
      return;
    }
    setLocalSubmitError(null);
    flushSave();
    await onSubmit(latestRef.current);
  };

  const chunk = STEP_CHUNKS[stepIdx];
  const stepAnswered = chunk.reduce((n, id) => n + (answers[id] ? 1 : 0), 0);
  const atLastStep = stepIdx === STEPS.length - 1;
  const errorMessage = submitError ?? localSubmitError;

  return (
    <div className="flex flex-col gap-6">
      {backSlot}
      {intro ?? (
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
      )}

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
              {saveState === "saving"
                ? "Saving…"
                : saveState === "saved"
                  ? "Saved"
                  : ""}
            </span>
            <Button
              onClick={handleSubmit}
              disabled={!allAnswered || submitting}
              className="active:scale-[0.97] transition-transform"
            >
              {submitting ? "Submitting…" : "Submit"}
            </Button>
          </div>
          {!allAnswered ? (
            <p className="text-xs text-ink-muted">
              {TOTAL_QUESTIONS - answeredCount} item
              {TOTAL_QUESTIONS - answeredCount === 1 ? "" : "s"} still need an
              answer.
            </p>
          ) : null}
          {errorMessage ? (
            <p className="text-xs text-red">{errorMessage}</p>
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
  );
}
