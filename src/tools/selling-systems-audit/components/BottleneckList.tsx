import { fmtMoneyExact, fmtPct } from "../lib/format";
import type { FunnelResult, StageTransition } from "../lib/types";

export function BottleneckList({
  result,
  selectedKey,
  onSelect,
  onOpenLesson,
}: {
  result: FunnelResult;
  selectedKey: StageTransition["key"] | null;
  onSelect: (key: StageTransition["key"]) => void;
  onOpenLesson: (key: StageTransition["key"]) => void;
}) {
  if (!result.valid) return null;

  if (result.rankedBottlenecks.length === 0) {
    return (
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium" style={{ letterSpacing: "-0.01em" }}>
          No leaks found
        </h2>
        <p className="text-ink-muted text-sm max-w-prose">
          You're at or above the standard at every stage. Keep watching the
          numbers — small slips here are what most owners miss.
        </p>
      </section>
    );
  }

  const [worst, ...rest] = result.rankedBottlenecks;

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-medium" style={{ letterSpacing: "-0.01em" }}>
        Where the money is leaking
      </h2>

      <ul className="flex flex-col">
        <BottleneckRow
          t={worst}
          isWorst
          isSelected={selectedKey === worst.key}
          onSelect={() => onSelect(worst.key)}
          onOpenLesson={() => onOpenLesson(worst.key)}
        />
        {rest.map((t) => (
          <BottleneckRow
            key={t.key}
            t={t}
            isSelected={selectedKey === t.key}
            onSelect={() => onSelect(t.key)}
            onOpenLesson={() => onOpenLesson(t.key)}
          />
        ))}
      </ul>
    </section>
  );
}

function BottleneckRow({
  t,
  isWorst,
  isSelected,
  onSelect,
  onOpenLesson,
}: {
  t: StageTransition;
  isWorst?: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onOpenLesson: () => void;
}) {
  return (
    <li
      className={`flex items-center justify-between gap-6 py-4 border-b border-border last:border-b-0 ${
        isSelected ? "bg-[var(--surface-raised)] -mx-3 px-3 rounded-md" : ""
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex flex-col gap-1.5 text-left flex-1 min-w-0 cursor-pointer active:scale-[0.99] transition-transform duration-[120ms]"
      >
        <span
          className={`${isWorst ? "text-[var(--red)] font-semibold" : "text-ink font-medium"} text-base`}
        >
          {t.fromLabel} → {t.toLabel}
        </span>
        <span className="text-ink-muted text-sm tabular-nums">
          You convert{" "}
          <span className="text-[var(--red)] font-medium">{fmtPct(t.currentRate, 0)}</span>
          {" · target "}
          <span className="text-ink">{fmtPct(t.targetRate, 0)}</span>
        </span>
      </button>

      <div className="flex flex-col items-end gap-1 shrink-0">
        <span
          className={`tabular-nums ${
            isWorst ? "text-[var(--red)] font-semibold text-lg" : "text-ink font-medium text-base"
          }`}
        >
          {fmtMoneyExact(t.recoverableAnnualRevenue)}
        </span>
        <span className="text-ink-muted text-xs">recoverable / yr</span>
        <button
          type="button"
          onClick={onOpenLesson}
          className="text-ink-muted text-xs underline-offset-4 hover:underline hover:text-ink transition-colors mt-1 cursor-pointer"
        >
          Learn how to fix this
        </button>
      </div>
    </li>
  );
}
