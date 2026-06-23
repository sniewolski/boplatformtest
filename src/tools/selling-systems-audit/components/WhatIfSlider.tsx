import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { fmtInt, fmtMoneyExact, fmtPct } from "../lib/format";
import { projectWhatIf } from "../lib/computeFunnel";
import type { FunnelResult, StageTransition } from "../lib/types";
import type { CurrencyCode } from "@/lib/format-currency";

export function WhatIfSlider({
  result,
  transition,
  avgDealValue,
  period,
  currency,
  onOpenLesson,
}: {
  result: FunnelResult;
  transition: StageTransition;
  avgDealValue: number;
  period: PeriodKey;
  currency: CurrencyCode;
  onOpenLesson: () => void;
}) {
  const current = transition.currentRate ?? 0;
  const target = transition.targetRate;
  const min = Math.min(current, target);
  const max = Math.max(current, target);

  const [value, setValue] = useState<number>(target);

  // Reset value when the selected transition changes.
  useEffect(() => {
    setValue(target);
  }, [transition.key, target]);

  const proj = projectWhatIf(result, transition.key, value, avgDealValue, period);

  // Brief tween on the displayed revenue number.
  const displayed = useTweenedNumber(proj.annualUplift);

  const range = max - min;
  if (range <= 0) {
    return (
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium" style={{ letterSpacing: "-0.01em" }}>
          What if you closed the gap?
        </h2>
        <p className="text-ink-muted text-sm">You're already at or above the target here.</p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-medium" style={{ letterSpacing: "-0.01em" }}>
          What if you closed the gap?
        </h2>
        <p className="text-ink-muted text-sm max-w-prose">
          {transition.fromLabel} → {transition.toLabel}. Drag to see what lifting this
          rate from your current{" "}
          <span className="tabular-nums">{fmtPct(current, 0)}</span> to the coach's target{" "}
          <span className="tabular-nums">{fmtPct(target, 0)}</span> would unlock.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <span className="text-ink-muted text-xs tabular-nums">{fmtPct(current, 0)} (now)</span>
          <span className="text-ink-muted text-xs tabular-nums">
            {fmtPct(target, 0)} (coach's target)
          </span>
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={(range) / 100 || 0.005}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          className="ssa-slider w-full"
          aria-label={`Lift ${transition.fromLabel} to ${transition.toLabel} conversion`}
        />
        <div className="flex items-baseline justify-between">
          <span className="text-ink text-sm tabular-nums">
            At {fmtPct(value, 0)}:
          </span>
          <span className="text-ink-muted text-xs tabular-nums">
            +{fmtInt(proj.uplift)} won deals
          </span>
        </div>
      </div>

      <p className="text-ink text-base">
        Lift {transition.fromLabel} → {transition.toLabel} from{" "}
        <span className="tabular-nums">{fmtPct(current, 0)}</span> to{" "}
        <span className="tabular-nums">{fmtPct(value, 0)}</span> →{" "}
        <span className="text-[var(--red)] font-semibold tabular-nums">
          +{fmtMoneyExact(displayed, currency)}
        </span>{" "}
        <span className="text-ink-muted">a year</span>
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <p className="text-ink-muted text-sm">
          This is how you close the gap —&nbsp;
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={onOpenLesson}
          className="shrink-0 w-fit active:scale-[0.97] transition-transform"
        >
          {LESSONS[transition.key as LessonKey]?.videoUrl ? (
            <PlayCircle className="size-4 mr-2" aria-hidden />
          ) : (
            <GraduationCap className="size-4 mr-2" aria-hidden />
          )}
          Watch the training
        </Button>
      </div>

      <style>{`
        .ssa-slider {
          -webkit-appearance: none;
          appearance: none;
          height: 4px;
          background: var(--border-token);
          border-radius: 999px;
          outline: none;
        }
        .ssa-slider:focus-visible { outline: 2px solid var(--ring); outline-offset: 4px; }
        .ssa-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px; height: 18px;
          border-radius: 999px;
          background: var(--red);
          border: 2px solid var(--white);
          box-shadow: 0 0 0 1px var(--border-token);
          cursor: pointer;
          transition: transform 120ms var(--ease-out);
        }
        .ssa-slider::-webkit-slider-thumb:active { transform: scale(0.97); }
        .ssa-slider::-moz-range-thumb {
          width: 18px; height: 18px;
          border-radius: 999px;
          background: var(--red);
          border: 2px solid var(--white);
          box-shadow: 0 0 0 1px var(--border-token);
          cursor: pointer;
        }
      `}</style>
    </section>
  );
}

function useTweenedNumber(target: number, duration = 240): number {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setValue(target);
      return;
    }
    fromRef.current = value;
    startRef.current = null;
    const step = (ts: number) => {
      if (startRef.current == null) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const t = Math.min(1, elapsed / duration);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      const next = fromRef.current + (target - fromRef.current) * eased;
      setValue(next);
      if (t < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return value;
}
