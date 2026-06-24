import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Check } from "lucide-react";
import { useSession } from "@/core/auth/useSession";
import { Button } from "@/components/ui/button";
import { useCurrency } from "@/core/settings/useCurrency";
import { CurrencySelect } from "@/core/settings/CurrencySelect";
import {
  useConversionIntake,
  useSaveDraft,
  useSubmitIntake,
  type IntakeAnswers,
} from "../data/useConversionReview";
import { validateInputs } from "../lib/validation";
import { InputPanel } from "../components/InputPanel";
import {
  INTAKE_STEPS,
  INDUSTRIES,
  PERIODS,
  STAGES,
  LEAD_SOURCES,
  SOURCE_QUALITY_LEVELS,
  QUALIFICATION_CRITERIA,
  NON_QUALIFY_PATTERNS,
  DISCOVERY_LENGTH_BANDS,
  DISCOVERY_STALL_REASONS,
  DISCOVERY_STRUCTURE_LEVELS,
  RATING_LEVELS,
  CYCLE_LENGTH_UNITS,
  TOUCHPOINT_BANDS,
  CLOSE_TREND_OPTIONS,
} from "../config";
import type {
  ConversionInputs,
  StageVolumes,
} from "../lib/types";
import type { IndustryKey, PeriodKey } from "../config";
import {
  Chips,
  Allocator,
  PerItemChoice,
  MaturitySpectrum,
  Segmented,
  YesNoToggle,
  PercentField,
  NumberWithUnit,
  OptionalText,
  Question,
} from "../components/IntakeFields";
import { ProgressBar, StepNav, StepHeader } from "../components/StepShell";
import {
  labelOf,
  chipsLabels,
  pct,
  money,
  numberWithUnit,
  boolText,
  ReadRow,
  ReadGroup,
  ReadMapRows,
} from "../components/ReadBack";

const DEFAULT_FOUNDATION: ConversionInputs = {
  industry: null,
  period: "month",
  avgDealValue: null,
  volumes: {},
};

const AUTOSAVE_MS = 700;

// ───────── Per-step answer shapes ─────────
// Stored under `draft_answers[stepKey]`. Loose, additive — Pass D can extend
// without a migration. Unknown extra keys are preserved by spread on save.

type LeadGenAnswers = {
  sources?: string[]; // Q2
  sourceOther?: string;
  allocation?: Record<string, number | undefined>; // Q3
  sourceQuality?: Record<string, string>; // Q4
  qualityNotes?: string;
};

type ProspectingAnswers = {
  criteria?: string[]; // Q6
  criteriaOther?: string;
  nonQualifyPatterns?: string[]; // Q7
  nonQualifyOther?: string;
};

type DiscoveryAnswers = {
  discoveryToProposalRate?: number | null; // Q11
  callLengthBand?: string | null; // Q12
  variesByDealSize?: boolean | null;
  stallReasons?: string[]; // Q13
  stallReasonsOther?: string;
  structureLevel?: string | null; // Q14
  confidence?: string | null; // Q15
};

type ProposalAnswers = {
  proposalToCloseRate?: number | null; // Q16
  ghostedRate?: number | null; // Q17
};

type ClosingAnswers = {
  cycleLength?: number | null; // Q22
  cycleUnit?: string | null;
  touchpointsBand?: string | null; // Q23
};

type SummaryAnswers = {
  hasDefinedTargets?: boolean | null; // Q31
  ownTargets?: {
    leadsToQualified?: number | null;
    qualifiedToOpportunities?: number | null;
    opportunitiesToWon?: number | null;
  };
  closeRateTrend?: string | null; // Q32
  closeRateTrendNote?: string;
};

type AllAnswers = {
  foundation?: {
    industry: IndustryKey | null;
    period: PeriodKey;
    avgDealValue: number | null;
    volumes: Partial<StageVolumes>;
  };
  leadGeneration?: LeadGenAnswers;
  prospecting?: ProspectingAnswers;
  discovery?: DiscoveryAnswers;
  proposal?: ProposalAnswers;
  closing?: ClosingAnswers;
  summary?: SummaryAnswers;
};

export function ConversionReview() {
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: intake, isLoading } = useConversionIntake(userId);
  const save = useSaveDraft(userId);
  const submit = useSubmitIntake(userId);
  const { currency, setCurrency, isLoading: currencyLoading } = useCurrency();

  const [stepIdx, setStepIdx] = useState(0);
  const step = INTAKE_STEPS[stepIdx];

  const [foundation, setFoundation] = useState<ConversionInputs>(DEFAULT_FOUNDATION);
  const [leadGen, setLeadGen] = useState<LeadGenAnswers>({});
  const [prospecting, setProspecting] = useState<ProspectingAnswers>({});
  const [discovery, setDiscovery] = useState<DiscoveryAnswers>({});
  const [proposal, setProposal] = useState<ProposalAnswers>({});
  const [closing, setClosing] = useState<ClosingAnswers>({});
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
    if (d.foundation) {
      setFoundation({
        industry: d.foundation.industry ?? null,
        period: d.foundation.period ?? "month",
        avgDealValue: d.foundation.avgDealValue != null ? Number(d.foundation.avgDealValue) : null,
        volumes: (d.foundation.volumes ?? {}) as Partial<StageVolumes>,
      });
    }
    if (d.leadGeneration) setLeadGen(d.leadGeneration);
    if (d.prospecting) setProspecting(d.prospecting);
    if (d.discovery) setDiscovery(d.discovery);
    if (d.proposal) setProposal(d.proposal);
    if (d.closing) setClosing(d.closing);
    if (d.summary) setSummary(d.summary);
    setHydrated(true);
  }, [intake, isLoading, hydrated, userId]);



  // Assemble current draft.
  const currentDraft = useMemo<IntakeAnswers>(() => {
    return {
      foundation: {
        industry: foundation.industry,
        period: foundation.period,
        avgDealValue: foundation.avgDealValue,
        volumes: foundation.volumes,
      },
      leadGeneration: leadGen,
      prospecting,
      discovery,
      proposal,
      closing,
      summary,
    } as unknown as IntakeAnswers;
  }, [foundation, leadGen, prospecting, discovery, proposal, closing, summary]);

  // Refs the flush path reads — must stay current so cleanup doesn't write
  // a stale closure of the form state.
  const lastSavedRef = useRef<string | null>(null);
  const latestDraftRef = useRef<IntakeAnswers>(currentDraft);
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

  // Immediate save from refs. Safe to call from cleanup / event handlers —
  // never closes over stale state. No-op when not dirty.
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

  // Debounced autosave — mid-typing backstop. Commit-point + unmount flushes
  // are the primary mechanisms below.
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

  // Flush on unmount (e.g. "Back to audit") and on tab hide.
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
  const needsCurrency = !currencyLoading && !currency;
  const validation = useMemo(() => validateInputs(foundation), [foundation]);

  // Impossible-funnel guard — only blocks submit if volumes go *up* the funnel.
  // Partial/empty volumes are allowed.
  const funnelImpossibility = useMemo(() => {
    const v = foundation.volumes;
    const l = v.leads,
      q = v.qualified,
      o = v.opportunities,
      w = v.won;
    if (q != null && l != null && q > l) return "More qualified than leads.";
    if (o != null && q != null && o > q) return "More opportunities than qualified.";
    if (w != null && o != null && w > o) return "More closed-won than opportunities.";
    return null;
  }, [foundation.volumes]);

  async function handleSubmit() {
    setSubmitError(null);
    if (funnelImpossibility) {
      setSubmitError(`Your funnel can't move up: ${funnelImpossibility}`);
      return;
    }
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
          Sales Conversion Rates Review
        </h1>
        <p className="text-ink-muted text-base max-w-prose">
          Tell us how your selling motion runs today, stage by stage. We'll go
          through it together on our call — there's nothing to analyse here.
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
          <ProgressBar steps={INTAKE_STEPS} currentIdx={stepIdx} onJump={setStepIdx} />

          <div className="flex flex-col gap-8" onBlurCapture={flushSave}>
            {step.key === "foundation" && (
              <FoundationStep
                inputs={foundation}
                onChange={setFoundation}
                currency={currency}
                onCurrencyChange={(c) => void setCurrency(c)}
                needsCurrency={needsCurrency}
                validation={validation}
                funnelImpossibility={funnelImpossibility}
              />
            )}
            {step.key === "leadGeneration" && (
              <LeadGenStep value={leadGen} onChange={setLeadGen} />
            )}
            {step.key === "prospecting" && (
              <ProspectingStep value={prospecting} onChange={setProspecting} />
            )}
            {step.key === "discovery" && (
              <DiscoveryStep value={discovery} onChange={setDiscovery} />
            )}
            {step.key === "proposal" && (
              <ProposalStep value={proposal} onChange={setProposal} />
            )}
            {step.key === "closing" && (
              <ClosingStep value={closing} onChange={setClosing} />
            )}
            {step.key === "targets" && (
              <TargetsStep value={summary} onChange={setSummary} />
            )}
            {step.key === "review" && (
              <ReviewStep
                foundation={foundation}
                leadGen={leadGen}
                prospecting={prospecting}
                discovery={discovery}
                proposal={proposal}
                closing={closing}
                summary={summary}
                currency={currency}
                hasSubmitted={!!intake?.submitted_at}
                hasUnsubmittedChanges={!!intake?.has_unsubmitted_changes}
                submitting={submit.isPending}
                onSubmit={handleSubmit}
                error={submitError}
                funnelImpossibility={funnelImpossibility}
              />
            )}
          </div>

          <StepNav
            currentIdx={stepIdx}
            total={INTAKE_STEPS.length}
            onPrev={() => {
              flushSave();
              setStepIdx((i) => Math.max(0, i - 1));
            }}
            onNext={() => {
              flushSave();
              setStepIdx((i) => Math.min(INTAKE_STEPS.length - 1, i + 1));
            }}
            saveState={saveState}
          />

        </>
      )}
    </div>
  );
}

// ───────── Shell pieces extracted to ../components/StepShell ─────────


// ───────── Step: Foundation ─────────

function FoundationStep({
  inputs,
  onChange,
  currency,
  onCurrencyChange,
  needsCurrency,
  validation,
  funnelImpossibility,
}: {
  inputs: ConversionInputs;
  onChange: (next: ConversionInputs) => void;
  currency: import("@/lib/format-currency").CurrencyCode | null;
  onCurrencyChange: (next: import("@/lib/format-currency").CurrencyCode) => void;
  needsCurrency: boolean;
  validation: ReturnType<typeof validateInputs>;
  funnelImpossibility: string | null;
}) {
  return (
    <section className="flex flex-col gap-6">
      <StepHeader
        title="Foundation"
        subtitle="The basics about your business and the shape of your funnel."
      />
      {needsCurrency && (
        <div className="flex flex-col gap-3 border border-dashed border-border rounded-xl px-6 py-6">
          <h3 className="text-base font-medium text-ink">Choose your currency</h3>
          <p className="text-ink-muted text-sm max-w-prose">
            Pick once; it applies wherever money shows up.
          </p>
          <div className="max-w-xs">
            <CurrencySelect value={currency} onChange={onCurrencyChange} />
          </div>
        </div>
      )}
      <InputPanel
        inputs={inputs}
        onChange={onChange}
        validation={validation}
        showErrors={false}
        currency={currency}
        onCurrencyChange={onCurrencyChange}
      />
      {funnelImpossibility && (
        <p className="text-[var(--red)] text-sm">
          Heads up: {funnelImpossibility} You can still save a draft, but you
          won't be able to submit until the volumes flow down the funnel.
        </p>
      )}
    </section>
  );
}

// ───────── Step: Lead Generation ─────────

function LeadGenStep({
  value,
  onChange,
}: {
  value: LeadGenAnswers;
  onChange: (next: LeadGenAnswers) => void;
}) {
  const selectedSources = (value.sources ?? []) as string[];
  const selectedOptions = LEAD_SOURCES.filter((o) =>
    selectedSources.includes(o.key),
  );

  return (
    <section className="flex flex-col gap-8">
      <StepHeader
        title="Lead Generation"
        subtitle="Where your leads come from and how those sources stack up."
      />
      <Question label="What are your primary lead sources?" hint="Pick all that apply.">
        <Chips
          options={LEAD_SOURCES}
          value={selectedSources}
          onChange={(next) => onChange({ ...value, sources: next })}
          allowOther
          otherValue={value.sourceOther ?? ""}
          onOtherChange={(v) => onChange({ ...value, sourceOther: v })}
        />
      </Question>
      <Question
        label="Roughly what share comes from each?"
        hint="Doesn't need to hit 100 exactly — a rough split is fine."
      >
        <Allocator
          options={selectedOptions}
          value={value.allocation ?? {}}
          onChange={(next) => onChange({ ...value, allocation: next })}
        />
      </Question>
      <Question label="How does the quality differ by source?">
        <PerItemChoice
          items={selectedOptions}
          choices={SOURCE_QUALITY_LEVELS}
          value={value.sourceQuality ?? {}}
          onChange={(next) => onChange({ ...value, sourceQuality: next })}
        />
        <OptionalText
          value={value.qualityNotes ?? ""}
          onChange={(v) => onChange({ ...value, qualityNotes: v })}
          placeholder="Anything worth noting about source quality (optional)…"
        />
      </Question>
    </section>
  );
}

// ───────── Step: Prospecting ─────────

function ProspectingStep({
  value,
  onChange,
}: {
  value: ProspectingAnswers;
  onChange: (next: ProspectingAnswers) => void;
}) {
  return (
    <section className="flex flex-col gap-8">
      <StepHeader
        title="Prospecting & Qualification"
        subtitle="How you decide who's worth pursuing."
      />
      <Question
        label="What criteria do you use to qualify a lead?"
        hint="Pick all that apply."
      >
        <Chips
          options={QUALIFICATION_CRITERIA}
          value={(value.criteria ?? []) as string[]}
          onChange={(next) => onChange({ ...value, criteria: next })}
          allowOther
          otherValue={value.criteriaOther ?? ""}
          onOtherChange={(v) => onChange({ ...value, criteriaOther: v })}
        />
      </Question>
      <Question label="Patterns you see in leads that don't qualify?">
        <Chips
          options={NON_QUALIFY_PATTERNS}
          value={(value.nonQualifyPatterns ?? []) as string[]}
          onChange={(next) => onChange({ ...value, nonQualifyPatterns: next })}
          allowOther
          otherValue={value.nonQualifyOther ?? ""}
          onOtherChange={(v) => onChange({ ...value, nonQualifyOther: v })}
        />
      </Question>
    </section>
  );
}

// ───────── Step: Discovery ─────────

function DiscoveryStep({
  value,
  onChange,
}: {
  value: DiscoveryAnswers;
  onChange: (next: DiscoveryAnswers) => void;
}) {
  return (
    <section className="flex flex-col gap-8">
      <StepHeader
        title="Discovery & Needs Analysis"
        subtitle="How you uncover what the prospect actually needs."
      />
      <Question
        label="Of your discovery calls, what % move to a proposal?"
        hint="Rough estimate is fine."
      >
        <PercentField
          value={value.discoveryToProposalRate ?? null}
          onChange={(v) => onChange({ ...value, discoveryToProposalRate: v })}
        />
      </Question>
      <Question label="How long is a typical discovery call?">
        <Segmented
          options={DISCOVERY_LENGTH_BANDS}
          value={(value.callLengthBand ?? null) as string | null}
          onChange={(k) => onChange({ ...value, callLengthBand: k })}
        />
      </Question>
      <Question label="Does call length vary by deal size?">
        <YesNoToggle
          value={value.variesByDealSize ?? null}
          onChange={(v) => onChange({ ...value, variesByDealSize: v })}
        />
      </Question>
      <Question
        label="Why do prospects most often stall at discovery?"
        hint="Pick all that apply."
      >
        <Chips
          options={DISCOVERY_STALL_REASONS}
          value={(value.stallReasons ?? []) as string[]}
          onChange={(next) => onChange({ ...value, stallReasons: next })}
          allowOther
          otherValue={value.stallReasonsOther ?? ""}
          onOtherChange={(v) => onChange({ ...value, stallReasonsOther: v })}
        />
      </Question>
      <Question label="How structured is your discovery?">
        <MaturitySpectrum
          steps={DISCOVERY_STRUCTURE_LEVELS}
          value={(value.structureLevel ?? null) as string | null}
          onChange={(k) => onChange({ ...value, structureLevel: k })}
        />
      </Question>
      <Question label="How confident are you that you uncover the real problem?">
        <Segmented
          options={RATING_LEVELS}
          value={(value.confidence ?? null) as string | null}
          onChange={(k) => onChange({ ...value, confidence: k })}
        />
      </Question>
    </section>
  );
}

// ───────── Step: Proposal ─────────

function ProposalStep({
  value,
  onChange,
}: {
  value: ProposalAnswers;
  onChange: (next: ProposalAnswers) => void;
}) {
  return (
    <section className="flex flex-col gap-8">
      <StepHeader
        title="Proposal & Presentation"
        subtitle="What happens after you send the proposal."
      />
      <Question label="Of proposals sent, what % close?">
        <PercentField
          value={value.proposalToCloseRate ?? null}
          onChange={(v) => onChange({ ...value, proposalToCloseRate: v })}
        />
      </Question>
      <Question label="What % of proposals get ghosted (no response)?">
        <PercentField
          value={value.ghostedRate ?? null}
          onChange={(v) => onChange({ ...value, ghostedRate: v })}
        />
      </Question>
    </section>
  );
}

// ───────── Step: Closing ─────────

function ClosingStep({
  value,
  onChange,
}: {
  value: ClosingAnswers;
  onChange: (next: ClosingAnswers) => void;
}) {
  return (
    <section className="flex flex-col gap-8">
      <StepHeader
        title="Closing & Decision"
        subtitle="What it takes to actually get the deal done."
      />
      <Question
        label="What's your average sales cycle length?"
        hint="From first contact to closed-won."
      >
        <NumberWithUnit
          value={value.cycleLength ?? null}
          unit={(value.cycleUnit ?? null) as string | null}
          units={CYCLE_LENGTH_UNITS}
          onValueChange={(v) => onChange({ ...value, cycleLength: v })}
          onUnitChange={(u) => onChange({ ...value, cycleUnit: u })}
        />
      </Question>
      <Question label="How many touchpoints / follow-ups does it usually take to close?">
        <Segmented
          options={TOUCHPOINT_BANDS}
          value={(value.touchpointsBand ?? null) as string | null}
          onChange={(k) => onChange({ ...value, touchpointsBand: k })}
        />
      </Question>
    </section>
  );
}

// ───────── Step: Targets & trend ─────────

function TargetsStep({
  value,
  onChange,
}: {
  value: SummaryAnswers;
  onChange: (next: SummaryAnswers) => void;
}) {
  return (
    <section className="flex flex-col gap-8">
      <StepHeader
        title="Targets & trend"
        subtitle="A couple of last questions, then you'll review everything before sending it through. You can come back any time and update your answers."
      />
      <Question label="Do you have defined KPI targets for your funnel?">
        <YesNoToggle
          value={value.hasDefinedTargets ?? null}
          onChange={(v) => onChange({ ...value, hasDefinedTargets: v })}
        />
      </Question>
      {value.hasDefinedTargets === true && (
        <Question
          label="Your own per-stage targets (optional)"
          hint="Leave blank if you'd rather skip."
        >
          <div className="grid gap-3 sm:grid-cols-3 max-w-xl">
            <OwnTargetField
              label="Leads → Qualified"
              value={value.ownTargets?.leadsToQualified ?? null}
              onChange={(v) =>
                onChange({
                  ...value,
                  ownTargets: { ...value.ownTargets, leadsToQualified: v },
                })
              }
            />
            <OwnTargetField
              label="Qualified → Opportunities"
              value={value.ownTargets?.qualifiedToOpportunities ?? null}
              onChange={(v) =>
                onChange({
                  ...value,
                  ownTargets: {
                    ...value.ownTargets,
                    qualifiedToOpportunities: v,
                  },
                })
              }
            />
            <OwnTargetField
              label="Opportunities → Won"
              value={value.ownTargets?.opportunitiesToWon ?? null}
              onChange={(v) =>
                onChange({
                  ...value,
                  ownTargets: {
                    ...value.ownTargets,
                    opportunitiesToWon: v,
                  },
                })
              }
            />
          </div>
        </Question>
      )}
      <Question label="How has your close rate trended over the last 12 months?">
        <div className="flex flex-col gap-3">
          <Segmented
            options={CLOSE_TREND_OPTIONS}
            value={(value.closeRateTrend ?? null) as string | null}
            onChange={(k) => onChange({ ...value, closeRateTrend: k })}
          />
          <OptionalText
            value={value.closeRateTrendNote ?? ""}
            onChange={(v) => onChange({ ...value, closeRateTrendNote: v })}
            placeholder="By roughly how much? (optional)"
            rows={2}
          />
        </div>
      </Question>
    </section>
  );
}

// ───────── Step: Review & submit ─────────

function ReviewStep({
  foundation,
  leadGen,
  prospecting,
  discovery,
  proposal,
  closing,
  summary,
  currency,
  hasSubmitted,
  hasUnsubmittedChanges,
  submitting,
  onSubmit,
  error,
  funnelImpossibility,
}: {
  foundation: ConversionInputs;
  leadGen: LeadGenAnswers;
  prospecting: ProspectingAnswers;
  discovery: DiscoveryAnswers;
  proposal: ProposalAnswers;
  closing: ClosingAnswers;
  summary: SummaryAnswers;
  currency: import("@/lib/format-currency").CurrencyCode | null;
  hasSubmitted: boolean;
  hasUnsubmittedChanges: boolean;
  submitting: boolean;
  onSubmit: () => void;
  error: string | null;
  funnelImpossibility: string | null;
}) {
  const label = hasSubmitted
    ? hasUnsubmittedChanges
      ? "Re-submit changes"
      : "Already submitted"
    : "Submit intake";
  const blocked = !!funnelImpossibility;

  const intOrDash = (n: number | undefined | null) =>
    n == null ? "—" : String(n);
  const textOrDash = (s: string | undefined | null) =>
    s && s.trim() ? s.trim() : "—";

  const sources = leadGen.sources ?? [];

  return (
    <section className="flex flex-col gap-8">
      <StepHeader
        title="Review & submit"
        subtitle="A quick read-back of what you entered. Use the steps above to edit anything, then submit."
      />

      <div className="flex flex-col gap-8">
        <ReadGroup title="Foundation">
          <ReadRow label="Industry" value={labelOf(INDUSTRIES, foundation.industry)} />
          <ReadRow label="Period" value={labelOf(PERIODS, foundation.period)} />
          <ReadRow
            label="Average deal value"
            value={money(foundation.avgDealValue, currency)}
          />
          {STAGES.map((s) => (
            <ReadRow
              key={s.key}
              label={`${s.label} (volume)`}
              value={intOrDash(foundation.volumes?.[s.key])}
            />
          ))}
        </ReadGroup>

        <ReadGroup title="Lead generation">
          <ReadRow
            label="Sources"
            value={chipsLabels(LEAD_SOURCES, leadGen.sources, leadGen.sourceOther)}
          />
          <ReadMapRows
            sources={sources}
            sourceOptions={LEAD_SOURCES}
            map={leadGen.allocation}
            renderValue={(raw) =>
              typeof raw === "number" ? pct(raw) : "—"
            }
            emptyLabel="Allocation"
          />
          <ReadMapRows
            sources={sources}
            sourceOptions={LEAD_SOURCES}
            map={leadGen.sourceQuality}
            renderValue={(raw) =>
              typeof raw === "string"
                ? labelOf(SOURCE_QUALITY_LEVELS, raw)
                : "—"
            }
            emptyLabel="Source quality"
          />
          <ReadRow label="Quality notes" value={textOrDash(leadGen.qualityNotes)} />
        </ReadGroup>

        <ReadGroup title="Prospecting">
          <ReadRow
            label="Qualification criteria"
            value={chipsLabels(
              QUALIFICATION_CRITERIA,
              prospecting.criteria,
              prospecting.criteriaOther,
            )}
          />
          <ReadRow
            label="Non-qualify patterns"
            value={chipsLabels(
              NON_QUALIFY_PATTERNS,
              prospecting.nonQualifyPatterns,
              prospecting.nonQualifyOther,
            )}
          />
        </ReadGroup>

        <ReadGroup title="Discovery">
          <ReadRow
            label="Discovery → Proposal rate"
            value={pct(discovery.discoveryToProposalRate)}
          />
          <ReadRow
            label="Call length band"
            value={labelOf(DISCOVERY_LENGTH_BANDS, discovery.callLengthBand)}
          />
          <ReadRow
            label="Varies by deal size"
            value={boolText(discovery.variesByDealSize)}
          />
          <ReadRow
            label="Stall reasons"
            value={chipsLabels(
              DISCOVERY_STALL_REASONS,
              discovery.stallReasons,
              discovery.stallReasonsOther,
            )}
          />
          <ReadRow
            label="Structure level"
            value={labelOf(DISCOVERY_STRUCTURE_LEVELS, discovery.structureLevel)}
          />
          <ReadRow
            label="Confidence"
            value={labelOf(RATING_LEVELS, discovery.confidence)}
          />
        </ReadGroup>

        <ReadGroup title="Proposal">
          <ReadRow
            label="Proposal → Close rate"
            value={pct(proposal.proposalToCloseRate)}
          />
          <ReadRow label="Ghosted rate" value={pct(proposal.ghostedRate)} />
        </ReadGroup>

        <ReadGroup title="Closing">
          <ReadRow
            label="Sales cycle"
            value={numberWithUnit(
              closing.cycleLength,
              closing.cycleUnit,
              CYCLE_LENGTH_UNITS,
            )}
          />
          <ReadRow
            label="Touchpoints"
            value={labelOf(TOUCHPOINT_BANDS, closing.touchpointsBand)}
          />
        </ReadGroup>

        <ReadGroup title="Targets & trend">
          <ReadRow
            label="Has defined targets"
            value={boolText(summary.hasDefinedTargets)}
          />
          {summary.hasDefinedTargets === true && (
            <>
              <ReadRow
                label="Leads → Qualified target"
                value={pct(summary.ownTargets?.leadsToQualified)}
              />
              <ReadRow
                label="Qualified → Opportunities target"
                value={pct(summary.ownTargets?.qualifiedToOpportunities)}
              />
              <ReadRow
                label="Opportunities → Won target"
                value={pct(summary.ownTargets?.opportunitiesToWon)}
              />
            </>
          )}
          <ReadRow
            label="Close-rate trend"
            value={labelOf(CLOSE_TREND_OPTIONS, summary.closeRateTrend)}
          />
          <ReadRow label="Trend note" value={textOrDash(summary.closeRateTrendNote)} />
        </ReadGroup>
      </div>

      <div className="flex flex-col gap-3 pt-2">
        {blocked && (
          <p className="text-[var(--red)] text-sm">
            Funnel volumes go up the funnel — fix in Foundation: {funnelImpossibility}
          </p>
        )}
        <div className="flex items-center gap-4">
          <Button
            onClick={onSubmit}
            disabled={
              submitting || blocked || (hasSubmitted && !hasUnsubmittedChanges)
            }
            className="active:scale-[0.97] transition-transform"
          >
            {submitting ? "Submitting…" : label}
          </Button>
          {error && <span className="text-[var(--red)] text-sm">{error}</span>}
        </div>
      </div>
    </section>
  );
}



function OwnTargetField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-ink-muted text-xs">{label}</span>
      <PercentField value={value} onChange={onChange} />
    </label>
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
