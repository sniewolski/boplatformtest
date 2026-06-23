import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { useSession } from "@/core/auth/useSession";
import { Button } from "@/components/ui/button";
import { useCurrency } from "@/core/settings/useCurrency";
import { CurrencySelect } from "@/core/settings/CurrencySelect";
import { useConversionIntake, useSaveDraft } from "../data/useConversionReview";
import { computeFunnel } from "../lib/computeFunnel";
import { validateInputs } from "../lib/validation";
import { InputPanel } from "../components/InputPanel";
import { FunnelDiagram } from "../components/FunnelDiagram";
import { BottleneckList } from "../components/BottleneckList";
import { WhatIfSlider } from "../components/WhatIfSlider";
import { CoachingDrawer } from "../components/CoachingDrawer";
import type { ConversionInputs, StageTransition } from "../lib/types";
import type { IndustryKey, LessonKey, PeriodKey } from "../config";
import type { StageVolumes } from "../lib/types";
import { fmtMoneyExact } from "../lib/format";

const DEFAULT_INPUTS: ConversionInputs = {
  industry: null,
  period: "month",
  avgDealValue: null,
  volumes: {},
};

export function ConversionReview() {
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: saved, isLoading } = useConversionReview(userId);
  const save = useSaveConversionReview(userId);
  const { currency, setCurrency, isLoading: currencyLoading } = useCurrency();

  const [inputs, setInputs] = useState<ConversionInputs>(DEFAULT_INPUTS);
  const [hydrated, setHydrated] = useState(false);
  // Inputs snapshot of the last successful Analyse press — the only source
  // the funnel computes from. Until the owner presses Analyse, this is null
  // and no results render.
  const [analysed, setAnalysed] = useState<ConversionInputs | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);
  const [selectedKey, setSelectedKey] = useState<StageTransition["key"] | null>(null);
  const [drawerKey, setDrawerKey] = useState<LessonKey | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  // Hydrate from saved row once.
  useEffect(() => {
    if (hydrated) return;
    if (isLoading) return;
    if (saved) {
      setInputs({
        industry: (saved.industry as IndustryKey | null) ?? null,
        period: (saved.period as PeriodKey) ?? "month",
        avgDealValue: saved.avg_deal_value != null ? Number(saved.avg_deal_value) : null,
        volumes: (saved.stage_volumes ?? {}) as Partial<StageVolumes>,
      });
    }
    setHydrated(true);
  }, [saved, isLoading, hydrated]);

  const validation = useMemo(() => validateInputs(inputs), [inputs]);

  // Compute strictly from the analysed snapshot. Editing fields does not
  // recompute on its own — the owner must press Analyse again.
  const result = useMemo(
    () => (analysed ? computeFunnel(analysed) : null),
    [analysed],
  );

  useEffect(() => {
    if (!result?.valid) return;
    if (result.rankedBottlenecks.length === 0) {
      setSelectedKey(null);
      return;
    }
    if (
      !selectedKey ||
      !result.rankedBottlenecks.some((b) => b.key === selectedKey)
    ) {
      setSelectedKey(result.rankedBottlenecks[0].key);
    }
  }, [result, selectedKey]);

  const selectedTransition =
    result?.valid && selectedKey
      ? result.transitions.find((t) => t.key === selectedKey) ?? null
      : null;

  function openLesson(key: StageTransition["key"]) {
    setDrawerKey(key as LessonKey);
    setDrawerOpen(true);
  }

  function handleAnalyse() {
    setAttempted(true);
    if (validation.hasErrors || !validation.valid) {
      // Hide stale results until inputs are consistent and complete.
      setAnalysed(null);
      return;
    }
    setAnalysed(inputs);
    setAnimationKey((k) => k + 1);
  }

  async function handleSave() {
    setSavedNotice(null);
    try {
      await save.mutateAsync({
        industry: inputs.industry,
        period: inputs.period,
        avgDealValue: inputs.avgDealValue,
        volumes: inputs.volumes,
      });
      setSavedNotice("Saved.");
      setTimeout(() => setSavedNotice(null), 2000);
    } catch (e) {
      setSavedNotice(e instanceof Error ? e.message : "Could not save.");
    }
  }

  const headlineRecoverable =
    result?.valid && result.rankedBottlenecks.length > 0
      ? result.rankedBottlenecks[0].recoverableAnnualRevenue
      : 0;

  const needsCurrency = !currencyLoading && !currency;
  // Show errors only after the first Analyse press; then live as the owner
  // corrects them.
  const showErrors = attempted && validation.hasErrors;
  const showIncompleteNotice =
    attempted && !validation.hasErrors && !validation.valid;

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
          Where your funnel leaks, ranked by the money lost, measured against the
          standard high performers hit in your industry.
        </p>
      </header>

      <InputPanel
        inputs={inputs}
        onChange={setInputs}
        validation={validation}
        showErrors={attempted}
        currency={currency}
        onCurrencyChange={(next) => void setCurrency(next)}
      />

      <div className="flex flex-wrap items-center gap-4">
        <Button
          onClick={handleAnalyse}
          className="active:scale-[0.97] transition-transform"
        >
          Analyse funnel
        </Button>
        {showErrors && (
          <span className="inline-flex items-center gap-2 text-[var(--red)] text-sm">
            <AlertCircle className="size-4" aria-hidden />
            Resolve the highlighted {validation.errorCount === 1 ? "field" : "fields"} to analyse.
          </span>
        )}
        {showIncompleteNotice && (
          <span className="text-ink-muted text-sm">
            Fill in industry, deal value and all four stage volumes to analyse.
          </span>
        )}
      </div>

      {needsCurrency && (
        <CurrencyGate
          currency={currency}
          onChange={(next) => void setCurrency(next)}
        />
      )}

      {result?.valid && !needsCurrency && (
        <>
          {result.notes && result.notes.length > 0 && (
            <div className="flex flex-col gap-1.5 text-sm text-ink-muted">
              {result.notes.map((n, i) => (
                <p key={i}>· {n}</p>
              ))}
            </div>
          )}

          <section className="flex flex-col gap-6">
            <div className="flex items-baseline justify-between gap-6 flex-wrap">
              <h2 className="text-lg font-medium" style={{ letterSpacing: "-0.01em" }}>
                Your funnel
              </h2>
              {headlineRecoverable > 0 && currency && (
                <p className="text-ink-muted text-sm tabular-nums">
                  Biggest leak —{" "}
                  <span className="text-[var(--red)] font-semibold">
                    {fmtMoneyExact(headlineRecoverable, currency)}/yr
                  </span>{" "}
                  recoverable
                </p>
              )}
            </div>
            <FunnelDiagram
              result={result}
              animationKey={`analyse-${animationKey}`}
            />
          </section>

          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-12 lg:items-start">
            <BottleneckList
              result={result}
              selectedKey={selectedKey}
              onSelect={(k) => setSelectedKey(k)}
              onOpenLesson={(k) => openLesson(k)}
              currency={currency!}
            />

            {selectedTransition && selectedTransition.isBottleneck && analysed?.avgDealValue ? (
              <WhatIfSlider
                result={result}
                transition={selectedTransition}
                avgDealValue={analysed.avgDealValue}
                period={analysed.period}
                currency={currency!}
              />
            ) : (
              <div aria-hidden />
            )}

            <div className="lg:col-span-2 flex items-center gap-4 pt-4 border-t border-border">
              <Button
                variant="outline"
                onClick={handleSave}
                disabled={save.isPending}
                className="active:scale-[0.97] transition-transform"
              >
                {save.isPending ? "Saving…" : "Save review"}
              </Button>
              {savedNotice && (
                <span className="text-ink-muted text-sm">{savedNotice}</span>
              )}
            </div>
          </div>
        </>
      )}

      <CoachingDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        lessonKey={drawerKey}
      />
    </div>
  );
}

function CurrencyGate({
  currency,
  onChange,
}: {
  currency: import("@/lib/format-currency").CurrencyCode | null;
  onChange: (next: import("@/lib/format-currency").CurrencyCode) => void;
}) {
  return (
    <section className="flex flex-col gap-3 border border-dashed border-border rounded-xl px-6 py-8">
      <h2 className="text-base font-medium text-ink">
        Choose your currency to see figures
      </h2>
      <p className="text-ink-muted text-sm max-w-prose">
        Your funnel results — leaks, recoverable revenue, the what-if projection
        — render in your chosen currency. Pick one once; it applies everywhere.
      </p>
      <div className="max-w-xs">
        <CurrencySelect value={currency} onChange={onChange} />
      </div>
    </section>
  );
}
