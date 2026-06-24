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
import {
  ALIGN_CADENCE,
  ALIGNMENT_STEPS,
  CPA_MEASUREMENT,
  DEAL_TRACING,
  EXPECTATION_GAP,
  FUNNEL_STAGES,
  ICP_ALIGNMENT,
  INSIGHT_FLOWBACK,
  LEAD_MATCH,
  OBJECTION_CONTENT,
  PAIN_MATCH,
  SHARED_GOALS,
} from "../config";
import { ProgressBar, StepNav, StepHeader } from "../components/StepShell";
import {
  Chips,
  MaturitySpectrum,
  OptionalText,
  Question,
  Segmented,
  YesNoToggle,
} from "../components/IntakeFields";
import {
  chipsLabels,
  labelOf,
  ReadGroup,
  ReadRow,
  ReadText,
} from "../components/ReadBack";

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
              <LeadQualityStep value={leadQuality} onChange={setLeadQuality} />
            )}
            {step.key === "consistency" && (
              <ConsistencyStep value={consistency} onChange={setConsistency} />
            )}
            {step.key === "feedback" && (
              <FeedbackStep value={feedback} onChange={setFeedback} />
            )}
            {step.key === "enablement" && (
              <EnablementStep value={enablement} onChange={setEnablement} />
            )}
            {step.key === "attribution" && (
              <AttributionStep value={attribution} onChange={setAttribution} />
            )}
            {step.key === "review" && (
              <ReviewStep
                leadQuality={leadQuality}
                consistency={consistency}
                feedback={feedback}
                enablement={enablement}
                attribution={attribution}
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

// ───────── Step 1: Lead quality & handoff ─────────

function LeadQualityStep({
  value,
  onChange,
}: {
  value: AlignmentLeadQualityAnswers;
  onChange: (next: AlignmentLeadQualityAnswers) => void;
}) {
  return (
    <section className="flex flex-col gap-8">
      <StepHeader
        title="Lead quality & handoff"
        subtitle="Whether marketing and sales mean the same thing by a good lead — and how often the ones that arrive actually fit."
      />
      <Question label="Do marketing and sales share the same picture of the ideal customer?">
        <Segmented
          options={ICP_ALIGNMENT}
          value={value.icpAlignment ?? null}
          onChange={(k) => onChange({ ...value, icpAlignment: k })}
        />
      </Question>
      <Question label="How consistently do the leads marketing generates match a profile you can close?">
        <Segmented
          options={LEAD_MATCH}
          value={value.leadMatch ?? null}
          onChange={(k) => onChange({ ...value, leadMatch: k })}
        />
      </Question>
    </section>
  );
}

// ───────── Step 2: Message consistency ─────────

function ConsistencyStep({
  value,
  onChange,
}: {
  value: AlignmentConsistencyAnswers;
  onChange: (next: AlignmentConsistencyAnswers) => void;
}) {
  const showGap = value.expectationGap === "yes";
  return (
    <section className="flex flex-col gap-8">
      <StepHeader
        title="Message consistency"
        subtitle="Whether what marketing says and what sales says line up — and what prospects actually hear."
      />
      <Question label="Has a prospect ever turned up expecting something different from what marketing implied?">
        <div className="flex flex-col gap-4">
          <Segmented
            options={EXPECTATION_GAP}
            value={value.expectationGap ?? null}
            onChange={(k) => {
              if (k === "yes") {
                onChange({ ...value, expectationGap: k });
              } else {
                // Switching away from "yes" — drop the stale detail so it
                // doesn't ride into the submitted snapshot.
                onChange({ ...value, expectationGap: k, expectationGapDetail: "" });
              }
            }}
          />
          {/* Reserved height — reveal slot below the segmented control. */}
          <div className="min-h-[6.5rem]">
            {showGap && (
              <OptionalText
                value={value.expectationGapDetail ?? ""}
                onChange={(v) => onChange({ ...value, expectationGapDetail: v })}
                placeholder="What was the gap?"
                rows={3}
              />
            )}
          </div>
        </div>
      </Question>
      <Question label="Do the pains marketing leads with match what sales opens discovery with?">
        <Segmented
          options={PAIN_MATCH}
          value={value.painPointMatch ?? null}
          onChange={(k) => onChange({ ...value, painPointMatch: k })}
        />
      </Question>
    </section>
  );
}

// ───────── Step 3: Feedback loops ─────────

function FeedbackStep({
  value,
  onChange,
}: {
  value: AlignmentFeedbackAnswers;
  onChange: (next: AlignmentFeedbackAnswers) => void;
}) {
  const cadenceLabel =
    value.separateTeams === true
      ? "How often do sales & marketing review together?"
      : "How often do you review both functions together?";
  return (
    <section className="flex flex-col gap-8">
      <StepHeader
        title="Feedback loops"
        subtitle="Whether what sales learns gets back to marketing, and how often both sides actually compare notes."
      />
      <Question label="Does sales feed insight back to marketing — what's landing, what's not, who's buying?">
        <MaturitySpectrum
          steps={INSIGHT_FLOWBACK}
          value={value.insightFlowback ?? null}
          onChange={(k) => onChange({ ...value, insightFlowback: k })}
        />
      </Question>
      <Question label="Do separate people run sales vs marketing?">
        <YesNoToggle
          value={value.separateTeams ?? null}
          onChange={(b) => onChange({ ...value, separateTeams: b })}
        />
      </Question>
      <Question label={cadenceLabel}>
        <Segmented
          options={ALIGN_CADENCE}
          value={value.reviewCadence ?? null}
          onChange={(k) => onChange({ ...value, reviewCadence: k })}
        />
      </Question>
    </section>
  );
}

// ───────── Step 4: Content & enablement ─────────

function EnablementStep({
  value,
  onChange,
}: {
  value: AlignmentEnablementAnswers;
  onChange: (next: AlignmentEnablementAnswers) => void;
}) {
  return (
    <section className="flex flex-col gap-8">
      <StepHeader
        title="Content & enablement"
        subtitle="Whether sales has the content it needs at each stage of the buyer's decision."
      />
      <Question
        label="Which funnel stages do you have content for?"
        hint="Select the stages you have content for — leave blank if none."
      >
        <Chips
          options={FUNNEL_STAGES}
          value={value.stageContent ?? []}
          onChange={(next) => onChange({ ...value, stageContent: next })}
        />
      </Question>
      <Question label="Is there content ready for the objections that come up most often?">
        <Segmented
          options={OBJECTION_CONTENT}
          value={value.objectionContent ?? null}
          onChange={(k) => onChange({ ...value, objectionContent: k })}
        />
      </Question>
    </section>
  );
}

// ───────── Step 5: Attribution & measurement ─────────

function AttributionStep({
  value,
  onChange,
}: {
  value: AlignmentAttributionAnswers;
  onChange: (next: AlignmentAttributionAnswers) => void;
}) {
  return (
    <section className="flex flex-col gap-8">
      <StepHeader
        title="Attribution & measurement"
        subtitle="Whether you can connect what marketing spends to what sales closes — and whether the goals on each side point the same way."
      />
      <Question label="Can you trace a closed deal back to the marketing source that started it?">
        <MaturitySpectrum
          steps={DEAL_TRACING}
          value={value.dealTracing ?? null}
          onChange={(k) => onChange({ ...value, dealTracing: k })}
        />
      </Question>
      <Question label="Do you know cost per acquisition by channel — and does it inform where the budget goes?">
        <Segmented
          options={CPA_MEASUREMENT}
          value={value.cpaByChannel ?? null}
          onChange={(k) => onChange({ ...value, cpaByChannel: k })}
        />
      </Question>
      <Question label="Do sales and marketing share revenue goals, or work to disconnected metrics?">
        <Segmented
          options={SHARED_GOALS}
          value={value.sharedGoals ?? null}
          onChange={(k) => onChange({ ...value, sharedGoals: k })}
        />
      </Question>
    </section>
  );
}

// ───────── Step 6: Review & submit ─────────

function ReviewStep({
  leadQuality,
  consistency,
  feedback,
  enablement,
  attribution,
  hasSubmitted,
  hasUnsubmittedChanges,
  submitting,
  onSubmit,
  error,
  submitLabel,
}: {
  leadQuality: AlignmentLeadQualityAnswers;
  consistency: AlignmentConsistencyAnswers;
  feedback: AlignmentFeedbackAnswers;
  enablement: AlignmentEnablementAnswers;
  attribution: AlignmentAttributionAnswers;
  hasSubmitted: boolean;
  hasUnsubmittedChanges: boolean;
  submitting: boolean;
  onSubmit: () => void;
  error: string | null;
  submitLabel: string;
}) {
  const separateTeams =
    feedback.separateTeams == null ? "—" : feedback.separateTeams ? "Yes" : "No";

  return (
    <section className="flex flex-col gap-8">
      <StepHeader
        title="Review & submit"
        subtitle="A quick read-back of your answers. Edit anything by stepping back."
      />

      <ReadGroup title="Lead quality & handoff">
        <ReadRow label="ICP alignment" value={labelOf(ICP_ALIGNMENT, leadQuality.icpAlignment)} />
        <ReadRow label="Leads match closeable profile" value={labelOf(LEAD_MATCH, leadQuality.leadMatch)} />
      </ReadGroup>

      <ReadGroup title="Message consistency">
        <ReadRow label="Prospect expectation gap" value={labelOf(EXPECTATION_GAP, consistency.expectationGap)} />
        {consistency.expectationGap === "yes" && (
          <ReadText label="What was the gap?" value={consistency.expectationGapDetail} />
        )}
        <ReadRow label="Pains match discovery" value={labelOf(PAIN_MATCH, consistency.painPointMatch)} />
      </ReadGroup>

      <ReadGroup title="Feedback loops">
        <ReadRow label="Sales insight back to marketing" value={labelOf(INSIGHT_FLOWBACK, feedback.insightFlowback)} />
        <ReadRow label="Separate sales & marketing teams" value={separateTeams} />
        <ReadRow
          label={
            feedback.separateTeams === true
              ? "Sales & marketing review cadence"
              : "Both-function review cadence"
          }
          value={labelOf(ALIGN_CADENCE, feedback.reviewCadence)}
        />
      </ReadGroup>

      <ReadGroup title="Content & enablement">
        <ReadRow
          label="Funnel stages with content"
          value={chipsLabels(FUNNEL_STAGES, enablement.stageContent as string[] | undefined, undefined)}
        />
        <ReadRow label="Objection-handling content" value={labelOf(OBJECTION_CONTENT, enablement.objectionContent)} />
      </ReadGroup>

      <ReadGroup title="Attribution & measurement">
        <ReadRow label="Deal tracing to source" value={labelOf(DEAL_TRACING, attribution.dealTracing)} />
        <ReadRow label="CPA by channel" value={labelOf(CPA_MEASUREMENT, attribution.cpaByChannel)} />
        <ReadRow label="Shared goals" value={labelOf(SHARED_GOALS, attribution.sharedGoals)} />
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
