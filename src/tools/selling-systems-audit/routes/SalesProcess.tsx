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
import type { SalesStage } from "../config";
import {
  PROCESS_STEPS,
  DOCUMENTATION_LEVELS,
  PROCESS_CONSISTENCY,
  REPLICABILITY,
  ADHERENCE,
  QUALITY_ASSESSMENT,
  SCRIPT_MOMENTS,
  EXPERIENCE_CONSISTENCY,
  CRM_OPTIONS,
  UPDATE_FREQUENCY,
  DOC_TEMPLATES,
  ENABLEMENT,
} from "../config";
import { ProgressBar, StepNav, StepHeader } from "../components/StepShell";
import { StageBuilder, ensureDefaultStages } from "../components/StageBuilder";
import {
  Chips,
  Segmented,
  MaturitySpectrum,
  YesNoToggle,
  Question,
} from "../components/IntakeFields";
import {
  labelOf,
  chipsLabels,
  boolText,
  ReadRow,
  ReadGroup,
  ReadStages,
} from "../components/ReadBack";

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
              <DefinitionStep value={definition} onChange={setDefinition} />
            )}
            {step.key === "stages" && (
              <section className="flex flex-col gap-8">
                <StepHeader
                  title="Stages"
                  subtitle="The stages a deal moves through, from first contact to close. We've pre-filled six common ones — rename, reorder, add or remove to match how you actually sell."
                />
                <StageBuilder
                  value={ensureDefaultStages(stages.items)}
                  onChange={(items) => setStages({ items })}
                />
              </section>
            )}
            {step.key === "adherence" && (
              <AdherenceStep value={adherence} onChange={setAdherence} />
            )}
            {step.key === "tools" && (
              <ToolsStep
                value={tools}
                onChange={setTools}
                stages={stages.items}
              />
            )}
            {step.key === "review" && (
              <ReviewStep
                definition={definition}
                stages={stages}
                adherence={adherence}
                tools={tools}
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

// ───────── Step 1: Process definition ─────────

function DefinitionStep({
  value,
  onChange,
}: {
  value: ProcessDefinitionAnswers;
  onChange: (next: ProcessDefinitionAnswers) => void;
}) {
  return (
    <section className="flex flex-col gap-8">
      <StepHeader
        title="Process definition"
        subtitle="How clearly your sales process is captured and shared."
      />
      <Question label="How well is your sales process documented?">
        <MaturitySpectrum
          steps={DOCUMENTATION_LEVELS}
          value={value.documentationLevel ?? null}
          onChange={(k) => onChange({ ...value, documentationLevel: k })}
        />
      </Question>
      <Question label="How consistently is it followed across deals?">
        <Segmented
          options={PROCESS_CONSISTENCY}
          value={value.consistency ?? null}
          onChange={(k) => onChange({ ...value, consistency: k })}
        />
      </Question>
      <Question label="Could someone new pick it up and run it the way you do?">
        <Segmented
          options={REPLICABILITY}
          value={value.replicability ?? null}
          onChange={(k) => onChange({ ...value, replicability: k })}
        />
      </Question>
    </section>
  );
}

// ───────── Step 3: Adherence & quality ─────────

function AdherenceStep({
  value,
  onChange,
}: {
  value: ProcessAdherenceAnswers;
  onChange: (next: ProcessAdherenceAnswers) => void;
}) {
  const measures = value.measuresAdherence === true;
  return (
    <section className="flex flex-col gap-8">
      <StepHeader
        title="Adherence & quality"
        subtitle="How consistently the process is followed, and how the experience holds together for the buyer."
      />

      <Question label="Do you measure how well people stick to the process?">
        <YesNoToggle
          value={value.measuresAdherence ?? null}
          onChange={(v) =>
            onChange({
              ...value,
              measuresAdherence: v,
              ...(v ? {} : { adherenceLevel: null }),
            })
          }
        />
      </Question>

      {measures && (
        <div className="pl-4 border-l border-border">
          <Question label="How well does the team stick to it?">
            <Segmented
              options={ADHERENCE}
              value={value.adherenceLevel ?? null}
              onChange={(k) => onChange({ ...value, adherenceLevel: k })}
            />
          </Question>
        </div>
      )}

      <Question label="How do you assess sales conversation quality?">
        <MaturitySpectrum
          steps={QUALITY_ASSESSMENT}
          value={value.qualityAssessment ?? null}
          onChange={(k) => onChange({ ...value, qualityAssessment: k })}
        />
      </Question>

      <Question
        label="Which moments do you have scripts or talking points for?"
        hint="Pick all that apply."
      >
        <Chips
          options={SCRIPT_MOMENTS}
          value={(value.scriptMoments ?? []) as string[]}
          onChange={(next) =>
            onChange({
              ...value,
              scriptMoments:
                next as ProcessAdherenceAnswers["scriptMoments"],
            })
          }
          allowOther
          otherValue={value.scriptMomentsOther ?? ""}
          onOtherChange={(v) => onChange({ ...value, scriptMomentsOther: v })}
        />
      </Question>

      <Question label="How consistent is the buyer experience across deals?">
        <Segmented
          options={EXPERIENCE_CONSISTENCY}
          value={value.experienceConsistency ?? null}
          onChange={(k) => onChange({ ...value, experienceConsistency: k })}
        />
      </Question>
    </section>
  );
}

// ───────── Step 4: Tools & enablement ─────────

function ToolsStep({
  value,
  onChange,
  stages,
}: {
  value: ProcessToolsAnswers;
  onChange: (next: ProcessToolsAnswers) => void;
  stages: SalesStage[] | undefined;
}) {
  const crmList = value.crm ?? [];
  // Gate Q17 on CRM being set to something other than just "none".
  const hasRealCrm = crmList.length > 0 && !(crmList.length === 1 && crmList[0] === "none");

  // Q20 derives from Step 2's stages — id → name. Stale ids silently dropped.
  const stageOptions = (stages ?? [])
    .filter((s) => s.name.trim())
    .map((s) => ({ key: s.id, label: s.name.trim() }));
  const selectedStageIds = (value.keyStages ?? []).filter((id) =>
    stageOptions.some((o) => o.key === id),
  );

  return (
    <section className="flex flex-col gap-8">
      <StepHeader
        title="Tools & enablement"
        subtitle="The CRM, templates, and training that support the process."
      />

      <Question
        label="What do you use to track deals?"
        hint="Pick all that apply."
      >
        <Chips
          options={CRM_OPTIONS}
          value={crmList as string[]}
          onChange={(next) =>
            onChange({
              ...value,
              crm: next as ProcessToolsAnswers["crm"],
              // Clear Q17 if the user goes back to nothing/none-only.
              ...(next.length === 0 || (next.length === 1 && next[0] === "none")
                ? { updateFrequency: null }
                : {}),
            })
          }
          allowOther
          otherValue={value.crmOther ?? ""}
          onOtherChange={(v) => onChange({ ...value, crmOther: v })}
        />
      </Question>

      {hasRealCrm && (
        <div className="pl-4 border-l border-border">
          <Question label="How often is it updated?">
            <Segmented
              options={UPDATE_FREQUENCY}
              value={value.updateFrequency ?? null}
              onChange={(k) => onChange({ ...value, updateFrequency: k })}
            />
          </Question>
        </div>
      )}

      <Question
        label="Which sales documents or templates do you have?"
        hint="Pick all that apply."
      >
        <Chips
          options={DOC_TEMPLATES}
          value={(value.docTemplates ?? []) as string[]}
          onChange={(next) =>
            onChange({
              ...value,
              docTemplates: next as ProcessToolsAnswers["docTemplates"],
            })
          }
          allowOther
          otherValue={value.docTemplatesOther ?? ""}
          onOtherChange={(v) => onChange({ ...value, docTemplatesOther: v })}
        />
      </Question>

      <Question
        label="How do you train or enable people on the process?"
        hint="Pick all that apply."
      >
        <Chips
          options={ENABLEMENT}
          value={(value.enablement ?? []) as string[]}
          onChange={(next) =>
            onChange({
              ...value,
              enablement: next as ProcessToolsAnswers["enablement"],
            })
          }
          allowOther
          otherValue={value.enablementOther ?? ""}
          onOtherChange={(v) => onChange({ ...value, enablementOther: v })}
        />
      </Question>

      <Question
        label="Which stages most need investment or attention?"
        hint="Pick from your stages above."
      >
        {stageOptions.length === 0 ? (
          <p className="text-ink-muted text-sm">
            Add at least one stage on the Stages step to pick from here.
          </p>
        ) : (
          <Chips
            options={stageOptions}
            value={selectedStageIds}
            onChange={(next) => onChange({ ...value, keyStages: next })}
          />
        )}
      </Question>
    </section>
  );
}

// ───────── Step 5: Review & submit ─────────

function ReviewStep({
  definition,
  stages,
  adherence,
  tools,
  hasSubmitted,
  hasUnsubmittedChanges,
  submitting,
  onSubmit,
  error,
  submitLabel,
}: {
  definition: ProcessDefinitionAnswers;
  stages: ProcessStagesAnswers;
  adherence: ProcessAdherenceAnswers;
  tools: ProcessToolsAnswers;
  hasSubmitted: boolean;
  hasUnsubmittedChanges: boolean;
  submitting: boolean;
  onSubmit: () => void;
  error: string | null;
  submitLabel: string;
}) {
  // Resolve Q20 ids back to names from the owner's current stages. Stale ids
  // are silently dropped — read-back never references a stage the owner
  // no longer has.
  const stageById = new Map(
    (stages.items ?? []).map((s) => [s.id, s.name.trim()] as const),
  );
  const keyStageLabels =
    (tools.keyStages ?? [])
      .map((id) => stageById.get(id))
      .filter((n): n is string => !!n && n.length > 0)
      .join(", ") || "—";

  return (
    <section className="flex flex-col gap-8">
      <StepHeader
        title="Review & submit"
        subtitle="A quick read-back of your answers. Edit anything by stepping back."
      />

      <ReadGroup title="Process definition">
        <ReadRow
          label="Documentation"
          value={labelOf(DOCUMENTATION_LEVELS, definition.documentationLevel)}
        />
        <ReadRow
          label="Consistency"
          value={labelOf(PROCESS_CONSISTENCY, definition.consistency)}
        />
        <ReadRow
          label="Replicable"
          value={labelOf(REPLICABILITY, definition.replicability)}
        />
      </ReadGroup>

      <ReadGroup title="Stages">
        <ReadStages items={stages.items} />
      </ReadGroup>

      <ReadGroup title="Adherence & quality">
        <ReadRow
          label="Measures adherence"
          value={boolText(adherence.measuresAdherence)}
        />
        {adherence.measuresAdherence && (
          <ReadRow
            label="Adherence level"
            value={labelOf(ADHERENCE, adherence.adherenceLevel)}
          />
        )}
        <ReadRow
          label="Quality assessment"
          value={labelOf(QUALITY_ASSESSMENT, adherence.qualityAssessment)}
        />
        <ReadRow
          label="Scripted moments"
          value={chipsLabels(
            SCRIPT_MOMENTS,
            adherence.scriptMoments as string[] | undefined,
            adherence.scriptMomentsOther,
          )}
        />
        <ReadRow
          label="Buyer experience consistency"
          value={labelOf(EXPERIENCE_CONSISTENCY, adherence.experienceConsistency)}
        />
      </ReadGroup>

      <ReadGroup title="Tools & enablement">
        <ReadRow
          label="Deal tracking"
          value={chipsLabels(
            CRM_OPTIONS,
            tools.crm as string[] | undefined,
            tools.crmOther,
          )}
        />
        {tools.crm && tools.crm.length > 0 && !(tools.crm.length === 1 && tools.crm[0] === "none") && (
          <ReadRow
            label="Update frequency"
            value={labelOf(UPDATE_FREQUENCY, tools.updateFrequency)}
          />
        )}
        <ReadRow
          label="Documents & templates"
          value={chipsLabels(
            DOC_TEMPLATES,
            tools.docTemplates as string[] | undefined,
            tools.docTemplatesOther,
          )}
        />
        <ReadRow
          label="Enablement"
          value={chipsLabels(
            ENABLEMENT,
            tools.enablement as string[] | undefined,
            tools.enablementOther,
          )}
        />
        <ReadRow label="Priority stages" value={keyStageLabels} />
      </ReadGroup>

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

