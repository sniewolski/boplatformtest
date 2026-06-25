import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Check } from "lucide-react";
import { useSession } from "@/core/auth/useSession";
import { Button } from "@/components/ui/button";
import { useCurrency } from "@/core/settings/useCurrency";
import { CurrencySelect } from "@/core/settings/CurrencySelect";
import { currencySymbol, type CurrencyCode } from "@/lib/format-currency";
import {
  usePipelineIntake,
  useSaveDraft,
  useSubmitIntake,
  type PipelineAnswers,
  type PipelineVolumeAnswers,
  type PipelineVelocityAnswers,
  type PipelineForecastingAnswers,
} from "../data/usePipelineReview";
import { useConversionIntake } from "../data/useConversionReview";
import {
  PIPELINE_STEPS,
  TREND_OPTIONS,
  AGE_BANDS,
  PROPORTION_BANDS,
  STAGES_CANONICAL,
  DURATION_BANDS,
  FORECAST_METHODS,
  FORECAST_HORIZONS,
  REVIEW_CADENCES,
  TEAM_REVIEW_METHODS,
  REVIEW_DATA_POINTS,
} from "../config";
import { ProgressBar, StepNav, StepHeader } from "../components/StepShell";
import {
  Chips,
  Segmented,
  MaturitySpectrum,
  YesNoToggle,
  OptionalText,
  Question,
} from "../components/IntakeFields";

const AUTOSAVE_MS = 700;

type AllAnswers = PipelineAnswers;

export function PipelineHealth() {
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: intake, isLoading } = usePipelineIntake(userId);
  const { data: conversionIntake } = useConversionIntake(userId);
  const save = useSaveDraft(userId);
  const submit = useSubmitIntake(userId);
  const { currency, setCurrency, isLoading: currencyLoading } = useCurrency();

  const [stepIdx, setStepIdx] = useState(0);
  const step = PIPELINE_STEPS[stepIdx];

  const [volume, setVolume] = useState<PipelineVolumeAnswers>({});
  const [velocity, setVelocity] = useState<PipelineVelocityAnswers>({});
  const [forecasting, setForecasting] = useState<PipelineForecastingAnswers>({});

  const [hydrated, setHydrated] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [editingAfterSubmit, setEditingAfterSubmit] = useState(false);

  // Hydrate once. Wait for userId/isLoading like Conversion does.
  useEffect(() => {
    if (hydrated || !userId || isLoading) return;
    const d = (intake?.draft_answers ?? {}) as AllAnswers;
    if (d.volume) setVolume(d.volume);
    if (d.velocity) setVelocity(d.velocity);
    if (d.forecasting) setForecasting(d.forecasting);
    setHydrated(true);
  }, [intake, isLoading, hydrated, userId]);

  const currentDraft = useMemo<PipelineAnswers>(
    () => ({ volume, velocity, forecasting } as PipelineAnswers),
    [volume, velocity, forecasting],
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
  const needsCurrency = !currencyLoading && !currency;

  // Cycle-length echo for B3 — read from Conversion intake's Closing step.
  const cycleEcho = useMemo(() => {
    const closing = (conversionIntake?.draft_answers as
      | { closing?: { cycleLength?: number | null; cycleUnit?: string | null } }
      | undefined)?.closing;
    if (!closing?.cycleLength || !closing.cycleUnit) return null;
    return `${closing.cycleLength} ${closing.cycleUnit}`;
  }, [conversionIntake]);

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
              <VolumeStep
                value={volume}
                onChange={setVolume}
                currency={currency}
                onCurrencyChange={(c) => void setCurrency(c)}
                needsCurrency={needsCurrency}
              />
            )}
            {step.key === "velocity" && (
              <VelocityStep value={velocity} onChange={setVelocity} cycleEcho={cycleEcho} />
            )}
            {step.key === "forecasting" && (
              <ForecastingStep value={forecasting} onChange={setForecasting} />
            )}
            {step.key === "summary" && (
              <SummaryStep
                volume={volume}
                velocity={velocity}
                forecasting={forecasting}
                currency={currency}
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

// ───────── Local primitives ─────────

function MoneyInput({
  value,
  onChange,
  currency,
  placeholder = "0",
}: {
  value: number | null | undefined;
  onChange: (v: number | null) => void;
  currency: CurrencyCode;
  placeholder?: string;
}) {
  return (
    <div className="relative w-48">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted text-sm pointer-events-none">
        {currencySymbol(currency)}
      </span>
      <input
        type="number"
        inputMode="decimal"
        min={0}
        step="1"
        value={value ?? ""}
        onChange={(e) =>
          onChange(e.target.value === "" ? null : Number(e.target.value))
        }
        placeholder={placeholder}
        className="w-full h-10 pl-7 pr-3 rounded-xl border border-border bg-background text-ink text-sm tabular-nums text-right focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      />
    </div>
  );
}

function IntegerInput({
  value,
  onChange,
  placeholder = "0",
}: {
  value: number | null | undefined;
  onChange: (v: number | null) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="number"
      inputMode="numeric"
      min={0}
      step="1"
      value={value ?? ""}
      onChange={(e) =>
        onChange(e.target.value === "" ? null : Math.floor(Number(e.target.value)))
      }
      placeholder={placeholder}
      className="w-32 h-10 px-3 rounded-xl border border-border bg-background text-ink text-sm tabular-nums text-right focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    />
  );
}

// ───────── Step 1: Volume & coverage ─────────

function VolumeStep({
  value,
  onChange,
  currency,
  onCurrencyChange,
  needsCurrency,
}: {
  value: PipelineVolumeAnswers;
  onChange: (next: PipelineVolumeAnswers) => void;
  currency: CurrencyCode | null;
  onCurrencyChange: (c: CurrencyCode) => void;
  needsCurrency: boolean;
}) {
  const pipelineValue = value.pipelineValue ?? null;
  const target = value.quarterlyTarget ?? null;
  const bothPresent = pipelineValue != null && target != null && target > 0;
  const coverage = bothPresent ? (pipelineValue as number) / (target as number) : null;

  return (
    <section className="flex flex-col gap-8">
      <StepHeader
        title="Volume & coverage"
        subtitle="How much pipeline is in play, and how that compares to what you need."
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

      <Question
        label="Total value of open pipeline right now"
        hint="Sum of every live opportunity, regardless of stage."
      >
        {currency ? (
          <MoneyInput
            value={pipelineValue}
            onChange={(v) => onChange({ ...value, pipelineValue: v })}
            currency={currency}
          />
        ) : (
          <p className="text-ink-muted text-sm">Pick a currency above first.</p>
        )}
      </Question>

      <Question
        label="Quarterly revenue target"
        hint="What you need to close this quarter."
      >
        {currency ? (
          <MoneyInput
            value={target}
            onChange={(v) => onChange({ ...value, quarterlyTarget: v })}
            currency={currency}
          />
        ) : (
          <p className="text-ink-muted text-sm">Pick a currency above first.</p>
        )}
      </Question>

      {/* Coverage mirror — gated on both inputs + target > 0. Neutral, no colour. */}
      {coverage != null && (
        <p className="text-ink-muted text-sm tabular-nums">
          Coverage:{" "}
          <span className="text-ink">{coverage.toFixed(1)}×</span> pipeline-to-target.
        </p>
      )}

      <Question label="Open opportunities right now">
        <IntegerInput
          value={value.activeOppCount}
          onChange={(v) => onChange({ ...value, activeOppCount: v })}
        />
      </Question>

      <Question label="Pipeline value over the last 90 days has…">
        <Segmented
          options={TREND_OPTIONS}
          value={value.trend90d ?? null}
          onChange={(k) => onChange({ ...value, trend90d: k })}
        />
      </Question>
    </section>
  );
}

// ───────── Step 2: Velocity & stalling ─────────

function VelocityStep({
  value,
  onChange,
  cycleEcho,
}: {
  value: PipelineVelocityAnswers;
  onChange: (next: PipelineVelocityAnswers) => void;
  cycleEcho: string | null;
}) {
  const isOtherStage = value.stallStage === "other";
  return (
    <section className="flex flex-col gap-8">
      <StepHeader
        title="Velocity & stalling"
        subtitle="How quickly deals move — and where they get stuck."
      />

      <Question label="Average age of an open opportunity">
        <Segmented
          options={AGE_BANDS}
          value={value.avgOppAge ?? null}
          onChange={(k) => onChange({ ...value, avgOppAge: k })}
        />
      </Question>

      <Question label="Proportion of deals with no activity in the last 30 days">
        <Segmented
          options={PROPORTION_BANDS}
          value={value.noActivity30d ?? null}
          onChange={(k) => onChange({ ...value, noActivity30d: k })}
        />
      </Question>

      <Question
        label="Proportion of deals open longer than your typical sales cycle"
        hint={cycleEcho ? `Your typical cycle: ${cycleEcho}.` : undefined}
      >
        <Segmented
          options={PROPORTION_BANDS}
          value={value.stuckPastCycle ?? null}
          onChange={(k) => onChange({ ...value, stuckPastCycle: k })}
        />
      </Question>

      <Question label="Where do deals most often stall, and for how long?">
        <div className="flex flex-col gap-3">
          <Segmented
            options={STAGES_CANONICAL}
            value={value.stallStage ?? null}
            onChange={(k) => onChange({ ...value, stallStage: k })}
          />
          {isOtherStage && (
            <input
              type="text"
              value={value.stallStageOther ?? ""}
              onChange={(e) =>
                onChange({ ...value, stallStageOther: e.target.value })
              }
              placeholder="Which stage?"
              className="w-full max-w-md h-10 px-3 rounded-xl border border-border bg-background text-ink text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            />
          )}
          <Segmented
            options={DURATION_BANDS}
            value={value.stallDuration ?? null}
            onChange={(k) => onChange({ ...value, stallDuration: k })}
          />
        </div>
      </Question>
    </section>
  );
}

// ───────── Step 3: Forecasting & visibility ─────────

function ForecastingStep({
  value,
  onChange,
}: {
  value: PipelineForecastingAnswers;
  onChange: (next: PipelineForecastingAnswers) => void;
}) {
  const hasTeam = value.hasSalespeople === true;
  const reviewsAtAll =
    value.reviewCadence != null && value.reviewCadence !== "never";

  return (
    <section className="flex flex-col gap-8">
      <StepHeader
        title="Forecasting & visibility"
        subtitle="How you predict what's coming, and how often you review."
      />

      <Question label="How do you forecast?">
        <MaturitySpectrum
          steps={FORECAST_METHODS}
          value={value.forecastMethod ?? null}
          onChange={(k) => onChange({ ...value, forecastMethod: k })}
        />
      </Question>

      <Question label="How far out can you forecast with reasonable confidence?">
        <Segmented
          options={FORECAST_HORIZONS}
          value={value.forecastHorizon ?? null}
          onChange={(k) => onChange({ ...value, forecastHorizon: k })}
        />
      </Question>

      <Question label="How often do you review your pipeline?">
        <Segmented
          options={REVIEW_CADENCES}
          value={value.reviewCadence ?? null}
          onChange={(k) => onChange({ ...value, reviewCadence: k })}
        />
      </Question>

      <Question label="Do you have salespeople you review pipeline with?">
        <YesNoToggle
          value={value.hasSalespeople ?? null}
          onChange={(v) => onChange({ ...value, hasSalespeople: v })}
        />
      </Question>

      {hasTeam && (
        <div className="flex flex-col gap-6 pl-4 border-l border-border">
          <Question label="How often do you review with the team?">
            <Segmented
              options={REVIEW_CADENCES}
              value={value.teamReviewCadence ?? null}
              onChange={(k) => onChange({ ...value, teamReviewCadence: k })}
            />
          </Question>
          <Question
            label="How do those team reviews run?"
            hint="Pick all that apply."
          >
            <Chips
              options={TEAM_REVIEW_METHODS}
              value={(value.teamReviewMethods ?? []) as string[]}
              onChange={(next) =>
                onChange({
                  ...value,
                  teamReviewMethods:
                    next as PipelineForecastingAnswers["teamReviewMethods"],
                })
              }
              allowOther
              otherValue={value.teamReviewMethodsOther ?? ""}
              onOtherChange={(v) =>
                onChange({ ...value, teamReviewMethodsOther: v })
              }
            />
          </Question>
        </div>
      )}

      {reviewsAtAll && (
        <>
          <Question
            label="What do you actually look at in a review?"
            hint="Pick all that apply."
          >
            <Chips
              options={REVIEW_DATA_POINTS}
              value={(value.reviewDataPoints ?? []) as string[]}
              onChange={(next) =>
                onChange({
                  ...value,
                  reviewDataPoints:
                    next as PipelineForecastingAnswers["reviewDataPoints"],
                })
              }
              allowOther
              otherValue={value.reviewDataOther ?? ""}
              onOtherChange={(v) => onChange({ ...value, reviewDataOther: v })}
            />
          </Question>
          <Question label="What decisions typically come out of a review? (optional)">
            <OptionalText
              value={value.reviewDecisions ?? ""}
              onChange={(v) => onChange({ ...value, reviewDecisions: v })}
              placeholder="Reprioritise, kill stalled deals, change next actions…"
            />
          </Question>
        </>
      )}
    </section>
  );
}

// ───────── Step 4: Review & submit ─────────

import {
  labelOf,
  chipsLabels,
  money as moneyText,
  ReadRow,
  ReadGroup,
} from "../components/ReadBack";


function SummaryStep({
  volume,
  velocity,
  forecasting,
  currency,
  hasSubmitted,
  hasUnsubmittedChanges,
  submitting,
  onSubmit,
  error,
}: {
  volume: PipelineVolumeAnswers;
  velocity: PipelineVelocityAnswers;
  forecasting: PipelineForecastingAnswers;
  currency: CurrencyCode | null;
  hasSubmitted: boolean;
  hasUnsubmittedChanges: boolean;
  submitting: boolean;
  onSubmit: () => void;
  error: string | null;
}) {
  const money = (v: number | null | undefined) => moneyText(v, currency);

  const label = hasSubmitted
    ? hasUnsubmittedChanges
      ? "Resubmit with changes"
      : "Submitted"
    : "Submit for review";

  const stallStageLabel =
    velocity.stallStage === "other"
      ? velocity.stallStageOther?.trim() || "Other"
      : labelOf(STAGES_CANONICAL, velocity.stallStage);

  return (
    <section className="flex flex-col gap-8">
      <StepHeader
        title="Review & submit"
        subtitle="A quick read-back of your answers. Edit anything by stepping back."
      />

      <ReadGroup title="Volume & coverage">
        <ReadRow label="Open pipeline value" value={money(volume.pipelineValue)} />
        <ReadRow label="Quarterly target" value={money(volume.quarterlyTarget)} />
        <ReadRow
          label="Open opportunities"
          value={volume.activeOppCount == null ? "—" : String(volume.activeOppCount)}
        />
        <ReadRow label="90-day trend" value={labelOf(TREND_OPTIONS, volume.trend90d)} />
      </ReadGroup>

      <ReadGroup title="Velocity & stalling">
        <ReadRow label="Average opportunity age" value={labelOf(AGE_BANDS, velocity.avgOppAge)} />
        <ReadRow
          label="No activity in 30 days"
          value={labelOf(PROPORTION_BANDS, velocity.noActivity30d)}
        />
        <ReadRow
          label="Past typical cycle"
          value={labelOf(PROPORTION_BANDS, velocity.stuckPastCycle)}
        />
        <ReadRow label="Most common stall stage" value={stallStageLabel} />
        <ReadRow
          label="Typical stall length"
          value={labelOf(DURATION_BANDS, velocity.stallDuration)}
        />
      </ReadGroup>

      <ReadGroup title="Forecasting & visibility">
        <ReadRow
          label="Forecast method"
          value={labelOf(FORECAST_METHODS, forecasting.forecastMethod)}
        />
        <ReadRow
          label="Forecast horizon"
          value={labelOf(FORECAST_HORIZONS, forecasting.forecastHorizon)}
        />
        <ReadRow
          label="Pipeline review cadence"
          value={labelOf(REVIEW_CADENCES, forecasting.reviewCadence)}
        />
        <ReadRow
          label="Has salespeople"
          value={
            forecasting.hasSalespeople == null
              ? "—"
              : forecasting.hasSalespeople
                ? "Yes"
                : "No"
          }
        />
        {forecasting.hasSalespeople && (
          <>
            <ReadRow
              label="Team review cadence"
              value={labelOf(REVIEW_CADENCES, forecasting.teamReviewCadence)}
            />
            <ReadRow
              label="Team review methods"
              value={chipsLabels(
                TEAM_REVIEW_METHODS,
                forecasting.teamReviewMethods as string[] | undefined,
                forecasting.teamReviewMethodsOther,
              )}
            />
          </>
        )}
        {forecasting.reviewCadence && forecasting.reviewCadence !== "never" && (
          <>
            <ReadRow
              label="Data reviewed"
              value={chipsLabels(
                REVIEW_DATA_POINTS,
                forecasting.reviewDataPoints as string[] | undefined,
                forecasting.reviewDataOther,
              )}
            />
            <ReadRow
              label="Decisions from reviews"
              value={forecasting.reviewDecisions?.trim() || "—"}
            />
          </>
        )}
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
