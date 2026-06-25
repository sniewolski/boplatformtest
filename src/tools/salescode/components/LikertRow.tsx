import type { Likert } from "../lib/types";

/**
 * Single-question Likert row. Five neutral options, no category label —
 * per the locked content spec respondents only see the item text.
 */

const LIKERT_OPTIONS: ReadonlyArray<{ value: Likert; label: string; short: string }> = [
  { value: 1, label: "Strongly disagree", short: "SD" },
  { value: 2, label: "Disagree", short: "D" },
  { value: 3, label: "Neither", short: "N" },
  { value: 4, label: "Agree", short: "A" },
  { value: 5, label: "Strongly agree", short: "SA" },
];

export function LikertRow({
  id,
  text,
  value,
  onChange,
}: {
  id: number;
  text: string;
  value: Likert | undefined;
  onChange: (v: Likert) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-4 py-6 border-b border-border last:border-b-0">
      <legend className="text-ink text-[15px] leading-snug">{text}</legend>
      <div
        role="radiogroup"
        aria-label={text}
        className="grid grid-cols-5 gap-2"
      >
        {LIKERT_OPTIONS.map((opt) => {
          const checked = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={checked}
              aria-label={opt.label}
              onClick={() => onChange(opt.value)}
              className={`flex flex-col items-center gap-1 cursor-pointer rounded-md border px-2 py-2 transition-colors text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-ink ${
                checked
                  ? "border-ink bg-ink/5 text-ink ring-1 ring-ink"
                  : "border-border bg-surface text-ink-muted hover:border-ink/40 hover:text-ink"
              }`}
            >
              <span aria-hidden className="font-medium tabular-nums">
                {opt.value}
              </span>
              <span aria-hidden className="hidden sm:inline text-[11px] leading-tight text-center">
                {opt.label}
              </span>
              <span aria-hidden className="sm:hidden text-[11px]">{opt.short}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
