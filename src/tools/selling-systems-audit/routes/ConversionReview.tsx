import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useSession } from "@/core/auth/useSession";
import { Button } from "@/components/ui/button";
import { useConversionReview, useSaveConversionReview } from "../data/useConversionReview";
import { computeFunnel } from "../lib/computeFunnel";
import { InputPanel } from "../components/InputPanel";
import { FunnelDiagram } from "../components/FunnelDiagram";
import { BottleneckList } from "../components/BottleneckList";
import { WhatIfSlider } from "../components/WhatIfSlider";
import { CoachingDrawer } from "../components/CoachingDrawer";
import { EmptyState } from "../components/EmptyState";
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

  const [inputs, setInputs] = useState<ConversionInputs>(DEFAULT_INPUTS);
  const [hydrated, setHydrated] = useState(false);
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

  const result = useMemo(() => computeFunnel(inputs), [inputs]);

  // When result becomes valid (or worst bottleneck changes), default the
  // selected bottleneck to the worst leak.
  useEffect(() => {
    if (!result.valid) return;
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
    result.valid && selectedKey
      ? result.transitions.find((t) => t.key === selectedKey) ?? null
      : null;

  function openLesson(key: StageTransition["key"]) {
    setDrawerKey(key as LessonKey);
    setDrawerOpen(true);
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
    result.valid && result.rankedBottlenecks.length > 0
      ? result.rankedBottlenecks[0].recoverableAnnualRevenue
      : 0;

  return (
    <div className="app-canvas py-12 flex flex-col gap-10">
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

      <InputPanel inputs={inputs} onChange={setInputs} />

      {result.notes.length > 0 && (
        <div className="flex flex-col gap-1.5 text-sm text-ink-muted">
          {result.notes.map((n, i) => (
            <p key={i}>· {n}</p>
          ))}
        </div>
      )}

      {!result.valid ? (
        <EmptyState reason={result.reason} />
      ) : (
        <>
          <section className="flex flex-col gap-6">
            <div className="flex items-baseline justify-between gap-6 flex-wrap">
              <h2 className="text-lg font-medium" style={{ letterSpacing: "-0.01em" }}>
                Your funnel
              </h2>
              {headlineRecoverable > 0 && (
                <p className="text-ink-muted text-sm tabular-nums">
                  Biggest leak —{" "}
                  <span className="text-[var(--red)] font-semibold">
                    {fmtMoneyExact(headlineRecoverable)}/yr
                  </span>{" "}
                  recoverable
                </p>
              )}
            </div>
            <FunnelDiagram
              result={result}
              animationKey={`${inputs.industry ?? ""}-${result.valid}`}
            />
          </section>

          <BottleneckList
            result={result}
            selectedKey={selectedKey}
            onSelect={(k) => setSelectedKey(k)}
            onOpenLesson={(k) => openLesson(k)}
          />

          {selectedTransition && selectedTransition.isBottleneck && inputs.avgDealValue && (
            <WhatIfSlider
              result={result}
              transition={selectedTransition}
              avgDealValue={inputs.avgDealValue}
              period={inputs.period}
            />
          )}
        </>
      )}

      <div className="flex items-center gap-4 pt-4 border-t border-border">
        <Button onClick={handleSave} disabled={save.isPending}>
          {save.isPending ? "Saving…" : "Save review"}
        </Button>
        {savedNotice && (
          <span className="text-ink-muted text-sm">{savedNotice}</span>
        )}
      </div>

      <CoachingDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        lessonKey={drawerKey}
      />
    </div>
  );
}
