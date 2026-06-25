import { Button } from "@/components/ui/button";

export type StepDef = { key: string; label: string };

export function ProgressBar({
  steps,
  currentIdx,
  onJump,
}: {
  steps: ReadonlyArray<StepDef>;
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

export function StepNav({
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

export function StepHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-lg font-medium" style={{ letterSpacing: "-0.01em" }}>
        {title}
      </h2>
      {subtitle && <p className="text-ink-muted text-sm max-w-prose">{subtitle}</p>}
    </div>
  );
}
