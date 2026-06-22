import { useEffect, useRef } from "react";
import { fmtInt, fmtPct } from "../lib/format";
import type { FunnelResult } from "../lib/types";

/**
 * Custom horizontal funnel diagram. Renders four bars whose widths are
 * proportional to stage volumes; between bars, current rate vs target rate.
 * Where current < target, the gap reads in red — the one accent's one meaning.
 *
 * Motion: bars visible by default; on first valid compute (and industry change)
 * enhance with a staggered scaleX(0→1) settle. Subsequent edits update
 * instantly. prefers-reduced-motion → no animation.
 */
export function FunnelDiagram({
  result,
  animationKey,
}: {
  result: FunnelResult;
  /** Bumping this value re-triggers the settle animation (e.g. on industry change). */
  animationKey: string | number;
}) {
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const firstRunRef = useRef(true);
  const lastAnimationKey = useRef(animationKey);

  useEffect(() => {
    if (!result.valid) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const shouldAnimate = firstRunRef.current || lastAnimationKey.current !== animationKey;
    if (!shouldAnimate) return;
    firstRunRef.current = false;
    lastAnimationKey.current = animationKey;

    rowRefs.current.forEach((el, i) => {
      if (!el) return;
      el.style.transformOrigin = "left";
      el.style.transition = "none";
      el.style.transform = "scaleX(0)";
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      el.offsetHeight; // reflow
      el.style.transition = `transform 280ms var(--ease-out) ${i * 50}ms`;
      el.style.transform = "scaleX(1)";
    });
  }, [result.valid, animationKey]);

  if (!result.valid) return null;

  const stages = [
    { label: "Leads", value: result.volumes.leads },
    { label: "Qualified", value: result.volumes.qualified },
    { label: "Opportunities", value: result.volumes.opportunities },
    { label: "Closed Won", value: result.volumes.won },
  ];

  const max = Math.max(...stages.map((s) => s.value), 1);

  return (
    <div className="flex flex-col">
      {stages.map((stage, i) => {
        const widthPct = Math.max(8, (stage.value / max) * 100);
        const transition = result.transitions[i]; // undefined for the last row
        return (
          <div key={stage.label} className="flex flex-col">
            <div className="flex items-center gap-4 py-2">
              <div className="w-32 shrink-0 text-sm text-ink-muted">{stage.label}</div>
              <div className="flex-1 relative h-10">
                <div
                  ref={(el) => {
                    rowRefs.current[i] = el;
                  }}
                  className="absolute inset-y-0 left-0 rounded-md bg-[var(--surface-raised)] border border-border"
                  style={{ width: `${widthPct}%` }}
                />
                <div
                  className="absolute inset-y-0 left-0 flex items-center px-3 text-ink font-medium text-sm tabular-nums"
                  style={{ width: `${widthPct}%` }}
                >
                  {fmtInt(stage.value)}
                </div>
              </div>
            </div>

            {transition && (
              <div className="flex items-center gap-4 py-1.5 pl-32">
                <TransitionRate
                  current={transition.currentRate}
                  target={transition.targetRate}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TransitionRate({
  current,
  target,
}: {
  current: number | null;
  target: number;
}) {
  const isLeak = current != null && current < target;
  return (
    <div className="flex items-center gap-3 text-xs tabular-nums">
      <span className="text-ink-muted">converts</span>
      <span
        className={isLeak ? "text-[var(--red)] font-medium" : "text-ink font-medium"}
        style={isLeak ? {} : {}}
      >
        {fmtPct(current, 0)}
      </span>
      <span className="text-ink-muted">vs target</span>
      <span className="text-ink-muted">{fmtPct(target, 0)}</span>
      {!isLeak && current != null && (
        <span className="text-ink-muted">· on target</span>
      )}
    </div>
  );
}
