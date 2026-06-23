import { useEffect, useMemo, useRef, useState } from "react";
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
import { INTAKE_STEPS, type IntakeStepKey } from "../config";
import type { ConversionInputs } from "../lib/types";
import type { IndustryKey, PeriodKey } from "../config";
import type { StageVolumes } from "../lib/types";

const DEFAULT_FOUNDATION: ConversionInputs = {
  industry: null,
  period: "month",
  avgDealValue: null,
  volumes: {},
};

const AUTOSAVE_MS = 700;

/**
 * Owner intake — stepped flow. The owner moves through Foundation → five
 * selling-stage steps → Summary. Drafts autosave continuously. No analysis
 * is shown to the owner; submission ends with a plain "Received" state.
 *
 * Pass B scaffolds the shell: progress bar, step navigation, Foundation
 * reuses the existing InputPanel, other stages render placeholder note
 * fields keyed by step. Pass C replaces those with the proper question UIs.
 */
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
  // Generic per-step notes blob — Pass C replaces these with structured answers.
  const [stageNotes, setStageNotes] = useState<Record<string, string>>({});
  const [hydrated, setHydrated] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Hydrate once.
  useEffect(() => {
    if (hydrated || isLoading) return;
    const d = (intake?.draft_answers ?? {}) as IntakeAnswers & {
      foundation?: {
        industry?: IndustryKey | null;
        period?: PeriodKey;
        avgDealValue?: number | null;
        volumes?: Partial<StageVolumes>;
      };
    };
    if (d.foundation) {
      setFoundation({
        industry: d.foundation.industry ?? null,
        period: d.foundation.period ?? "month",
        avgDealValue: d.foundation.avgDealValue != null ? Number(d.foundation.avgDealValue) : null,
        volumes: (d.foundation.volumes ?? {}) as Partial<StageVolumes>,
      });
    }
    const notes: Record<string, string> = {};
    for (const s of INTAKE_STEPS) {
      if (s.key === "foundation" || s.key === "summary") continue;
      const v = (d as Record<string, unknown>)[s.key];
      if (v && typeof v === "object" && "notes" in v && typeof (v as { notes: unknown }).notes === "string") {
        notes[s.key] = (v as { notes: string }).notes;
      }
    }
    setStageNotes(notes);
    setHydrated(true);
  }, [intake, isLoading, hydrated]);

  // Assemble current draft from local state.
  const currentDraft = useMemo<IntakeAnswers>(() => {
    const blob: IntakeAnswers = {
      foundation: {
        industry: foundation.industry,
        period: foundation.period,
        avgDealValue: foundation.avgDealValue,
        volumes: foundation.volumes,
      },
    };
    for (const [k, v] of Object.entries(stageNotes)) {
      if (v && v.trim().length > 0) {
        (blob as Record<string, unknown>)[k] = { notes: v };
      }
    }
    return blob;
  }, [foundation, stageNotes]);

  // Debounced autosave after hydration. Skip the very first effect run
  // (would re-save the just-loaded state for no reason).
  const lastSavedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!hydrated || !userId) return;
    const serialized = JSON.stringify(currentDraft);
    if (lastSavedRef.current === null) {
      lastSavedRef.current = serialized;
      return;
    }
    if (lastSavedRef.current === serialized) return;
    setSaveState("saving");
    const t = setTimeout(() => {
      save
        .mutateAsync({
          draft: currentDraft,
          hasSubmitted: !!intake?.submitted_at,
        })
        .then(() => {
          lastSavedRef.current = serialized;
          setSaveState("saved");
        })
        .catch(() => setSaveState("idle"));
    }, AUTOSAVE_MS);
    return () => clearTimeout(t);
  }, [currentDraft, hydrated, userId, save, intake?.submitted_at]);

  // Final "Received" state: a clean submission with no pending edits.
  const isReceived =
    !!intake?.submitted_at && !intake.has_unsubmitted_changes;

  const needsCurrency = !currencyLoading && !currency;

  const validation = useMemo(() => validateInputs(foundation), [foundation]);

  async function handleSubmit() {
    setSubmitError(null);
    try {
      await submit.mutateAsync({ draft: currentDraft });
      lastSavedRef.current = JSON.stringify(currentDraft);
      setSaveState("saved");
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
        <ReceivedState onEdit={() => setStepIdx(0)} />
      ) : (
        <>
          <ProgressBar
            steps={INTAKE_STEPS}
            currentIdx={stepIdx}
            onJump={(i) => setStepIdx(i)}
          />

          <div className="flex flex-col gap-8">
            {step.key === "foundation" ? (
              <FoundationStep
                inputs={foundation}
                onChange={setFoundation}
                currency={currency}
                onCurrencyChange={(c) => void setCurrency(c)}
                needsCurrency={needsCurrency}
                validation={validation}
              />
            ) : step.key === "summary" ? (
              <SummaryStep
                hasSubmitted={!!intake?.submitted_at}
                hasUnsubmittedChanges={!!intake?.has_unsubmitted_changes}
                submitting={submit.isPending}
                onSubmit={handleSubmit}
                error={submitError}
              />
            ) : (
              <StageNotesStep
                stepKey={step.key}
                label={step.label}
                value={stageNotes[step.key] ?? ""}
                onChange={(v) =>
                  setStageNotes((prev) => ({ ...prev, [step.key]: v }))
                }
              />
            )}
          </div>

          <StepNav
            currentIdx={stepIdx}
            total={INTAKE_STEPS.length}
            onPrev={() => setStepIdx((i) => Math.max(0, i - 1))}
            onNext={() =>
              setStepIdx((i) => Math.min(INTAKE_STEPS.length - 1, i + 1))
            }
            saveState={saveState}
          />
        </>
      )}
    </div>
  );
}

function ProgressBar({
  steps,
  currentIdx,
  onJump,
}: {
  steps: typeof INTAKE_STEPS;
  currentIdx: number;
  onJump: (i: number) => void;
}) {
  return (
    <nav aria-label="Intake steps" className="flex flex-col gap-3">
      <div className="flex items-center justify-between text-xs text-ink-muted tabular-nums">
        <span>
          Step {currentIdx + 1} of {steps.length} — {steps[currentIdx].label}
        </span>
        <span>{Math.round(((currentIdx + 1) / steps.length) * 100)}%</span>
      </div>
      <ol className="flex items-center gap-1.5">
        {steps.map((s, i) => {
          const done = i < currentIdx;
          const active = i === currentIdx;
          return (
            <li key={s.key} className="flex-1">
              <button
                type="button"
                onClick={() => onJump(i)}
                aria-current={active ? "step" : undefined}
                className={`h-1.5 w-full rounded-full transition-colors ${
                  active
                    ? "bg-ink"
                    : done
                      ? "bg-ink/60"
                      : "bg-border hover:bg-ink-muted/40"
                }`}
                title={s.label}
              />
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function StepNav({
  currentIdx,
  total,
  onPrev,
  onNext,
  saveState,
}: {
  currentIdx: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  saveState: "idle" | "saving" | "saved";
}) {
  const atStart = currentIdx === 0;
  const atEnd = currentIdx === total - 1;
  return (
    <div className="flex items-center justify-between gap-4 pt-4 border-t border-border">
      <Button
        variant="outline"
        onClick={onPrev}
        disabled={atStart}
        className="active:scale-[0.97] transition-transform"
      >
        Back
      </Button>
      <span className="text-ink-muted text-xs tabular-nums">
        {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : ""}
      </span>
      <Button
        onClick={onNext}
        disabled={atEnd}
        className="active:scale-[0.97] transition-transform"
      >
        Continue
      </Button>
    </div>
  );
}

function FoundationStep({
  inputs,
  onChange,
  currency,
  onCurrencyChange,
  needsCurrency,
  validation,
}: {
  inputs: ConversionInputs;
  onChange: (next: ConversionInputs) => void;
  currency: import("@/lib/format-currency").CurrencyCode | null;
  onCurrencyChange: (next: import("@/lib/format-currency").CurrencyCode) => void;
  needsCurrency: boolean;
  validation: ReturnType<typeof validateInputs>;
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
    </section>
  );
}

function StageNotesStep({
  stepKey,
  label,
  value,
  onChange,
}: {
  stepKey: IntakeStepKey;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <section className="flex flex-col gap-5">
      <StepHeader
        title={label}
        subtitle="Tell us how this stage actually runs today. Detailed questions land here next."
      />
      <label className="flex flex-col gap-2">
        <span className="text-ink-muted text-sm">Notes</span>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={8}
          placeholder={`What does ${label.toLowerCase()} look like for you?`}
          className="w-full rounded-xl border border-border bg-background text-ink text-sm px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          data-step={stepKey}
        />
      </label>
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
      ? "Re-submit changes"
      : "Already submitted"
    : "Submit intake";
  return (
    <section className="flex flex-col gap-5">
      <StepHeader
        title="Review & submit"
        subtitle="When you submit, we'll have everything we need for our call. You can come back and update anything; just submit again."
      />
      <div className="flex items-center gap-4">
        <Button
          onClick={onSubmit}
          disabled={submitting || (hasSubmitted && !hasUnsubmittedChanges)}
          className="active:scale-[0.97] transition-transform"
        >
          {submitting ? "Submitting…" : label}
        </Button>
        {error && (
          <span className="text-[var(--red)] text-sm">{error}</span>
        )}
      </div>
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
      <Button variant="outline" onClick={onEdit} className="active:scale-[0.97] transition-transform">
        Edit my answers
      </Button>
    </section>
  );
}

function StepHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-lg font-medium" style={{ letterSpacing: "-0.01em" }}>
        {title}
      </h2>
      <p className="text-ink-muted text-sm max-w-prose">{subtitle}</p>
    </div>
  );
}
