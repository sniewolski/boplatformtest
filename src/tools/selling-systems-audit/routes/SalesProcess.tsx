import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Check } from "lucide-react";
import { useSession } from "@/core/auth/useSession";
import { Button } from "@/components/ui/button";
import {
  useProcessIntake,
  useSaveDraft,
  useSubmitIntake,
  type ProcessAnswers,
  type ProcessAdherenceAnswers,
  type ProcessDefinitionAnswers,
  type ProcessStagesAnswers,
  type ProcessToolsAnswers,
} from "../data/useProcessReview";
import { PROCESS_STEPS } from "../config";
import { ProgressBar, StepNav, StepHeader } from "../components/StepShell";

const AUTOSAVE_MS = 700;

/**
 * Sales Process intake shell. Mirrors PipelineHealth verbatim: hydration
 * guard, per-key debounced autosave (700ms) + commit-point flushes (blur
 * capture, step nav, visibilitychange, unmount), Submit → ReceivedState,
 * "edit after submit" note. Phase 2 leaves the five steps empty — Phase 3
 * fills Stages with the StageBuilder, Phase 4 fills the other UIs + read-back.
 */
export function SalesProcess() {
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: intake, isLoading } = useProcessIntake(userId);
  const save = useSaveDraft(userId);
  const submit = useSubmitIntake(userId);

  const [stepIdx, setStepIdx] = useState(0);
  const step = PROCESS_STEPS[stepIdx];

  const [definition, setDefinition] = useState<ProcessDefinitionAnswers>({});
  const [stages, setStages] = useState<ProcessStagesAnswers>({});
  const [adherence, setAdherence] = useState<ProcessAdherenceAnswers>({});
  const [tools, setTools] = useState<ProcessToolsAnswers>({});

  const [hydrated, setHydrated] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [editingAfterSubmit, setEditingAfterSubmit] = useState(false);

  useEffect(() => {
    if (hydrated || !userId || isLoading) return;
    const d = (intake?.draft_answers ?? {}) as ProcessAnswers;
    if (d.definition) setDefinition(d.definition);
    if (d.stages) setStages(d.stages);
    if (d.adherence) setAdherence(d.adherence);
    if (d.tools) setTools(d.tools);
    setHydrated(true);
  }, [intake, isLoading, hydrated, userId]);

  const currentDraft = useMemo<ProcessAnswers>(
    () => ({ definition, stages, adherence, tools }),
    [definition, stages, adherence, tools],
  );

  const lastSavedRef = useRef<string | null>(null);
  const latestDraftRef = useRef<ProcessAnswers>(currentDraft);
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
          Sales Process
        </h1>
        <p className="text-ink-muted text-base max-w-prose">
          How your sales process is defined, where each stage starts and ends,
          how consistently it's followed, and the tools supporting it.
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
          <ProgressBar steps={PROCESS_STEPS} currentIdx={stepIdx} onJump={setStepIdx} />

          <div className="flex flex-col gap-8" onBlurCapture={flushSave}>
            {step.key === "definition" && (
              <section className="flex flex-col gap-8">
                <StepHeader
                  title="Process definition"
                  subtitle="How clearly your sales process is captured and shared."
                />
                <p className="text-ink-muted text-sm">Questions coming next.</p>
              </section>
            )}
            {step.key === "stages" && (
              <section className="flex flex-col gap-8">
                <StepHeader
                  title="Stages"
                  subtitle="The stages a deal moves through, from first contact to close."
                />
                <p className="text-ink-muted text-sm">
                  Stage builder coming next.
                </p>
              </section>
            )}
            {step.key === "adherence" && (
              <section className="flex flex-col gap-8">
                <StepHeader
                  title="Adherence & quality"
                  subtitle="How consistently the process is followed, and how that experience holds together for the buyer."
                />
                <p className="text-ink-muted text-sm">Questions coming next.</p>
              </section>
            )}
            {step.key === "tools" && (
              <section className="flex flex-col gap-8">
                <StepHeader
                  title="Tools & enablement"
                  subtitle="The CRM, templates, and training that support the process."
                />
                <p className="text-ink-muted text-sm">Questions coming next.</p>
              </section>
            )}
            {step.key === "review" && (
              <section className="flex flex-col gap-6">
                <StepHeader
                  title="Review & submit"
                  subtitle="Read-back of every answer arrives in the next pass. Submit works now."
                />
                {hasSubmitted && hasUnsubmittedChanges && (
                  <p className="text-ink-muted text-sm">
                    You've changed your answers since last submission.
                  </p>
                )}
                {submitError && (
                  <p className="text-sm text-destructive" role="alert">
                    {submitError}
                  </p>
                )}
                <Button
                  onClick={handleSubmit}
                  disabled={
                    submit.isPending || (hasSubmitted && !hasUnsubmittedChanges)
                  }
                  className="w-fit active:scale-[0.97] transition-transform"
                >
                  {submit.isPending ? "Submitting…" : submitLabel}
                </Button>
              </section>
            )}
          </div>

          <StepNav
            currentIdx={stepIdx}
            total={PROCESS_STEPS.length}
            onPrev={() => {
              flushSave();
              setStepIdx((i) => Math.max(0, i - 1));
            }}
            onNext={() => {
              flushSave();
              setStepIdx((i) => Math.min(PROCESS_STEPS.length - 1, i + 1));
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
