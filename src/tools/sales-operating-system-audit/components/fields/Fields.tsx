/**
 * Tool-local field controls. Classes mirror the Selling Systems Audit's
 * IntakeFields so the two tools look the same; that shared file is untouched.
 */
import { useEffect, useId, useState } from "react";
import type { SosaOption, SosaUnit } from "../../config/questionBank";
import { useCurrency } from "@/core/settings/useCurrency";
import { currencySymbol } from "@/lib/format-currency";

const inputCls =
  "h-10 px-3 rounded-xl border border-border bg-background text-ink text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const textareaCls =
  "w-full px-3 py-2.5 rounded-xl border border-border bg-background text-ink text-sm leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

function chipCls(on: boolean) {
  return `px-3.5 h-9 rounded-full border text-sm transition-colors active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
    on ? "bg-ink text-background border-ink" : "bg-background text-ink border-border hover:border-ink-muted"
  }`;
}

function OtherInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Other (please specify)"
      aria-label="Other (please specify)"
      className={`w-full max-w-md ${inputCls}`}
    />
  );
}

// ───────── Choice ─────────

export type ChoiceValue = { key: string; other?: string } | undefined;

export function ChoiceField({
  options,
  allowOther,
  value,
  onChange,
}: {
  options: readonly SosaOption[];
  allowOther?: boolean;
  value: ChoiceValue;
  onChange: (v: ChoiceValue) => void;
}) {
  const all = allowOther ? [...options, { key: "other", label: "Other" }] : options;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2" role="radiogroup">
        {all.map((o) => {
          const on = value?.key === o.key;
          return (
            <button
              key={o.key}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() =>
                onChange(on ? undefined : o.key === "other" ? { key: "other", other: value?.other ?? "" } : { key: o.key })
              }
              className={chipCls(on)}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      {value?.key === "other" && (
        <OtherInput value={value.other ?? ""} onChange={(t) => onChange({ key: "other", other: t })} />
      )}
    </div>
  );
}

// ───────── Multi ─────────

export type MultiValue = { keys: string[]; other?: string } | undefined;

export function MultiField({
  options,
  allowOther,
  value,
  onChange,
}: {
  options: readonly SosaOption[];
  allowOther?: boolean;
  value: MultiValue;
  onChange: (v: MultiValue) => void;
}) {
  const keys = value?.keys ?? [];
  const exclusive = new Set(options.filter((o) => o.exclusive).map((o) => o.key));
  const all = allowOther ? [...options, { key: "other", label: "Other" }] : options;

  function toggle(k: string) {
    let next: string[];
    let other = value?.other;
    if (keys.includes(k)) {
      next = keys.filter((x) => x !== k);
    } else if (exclusive.has(k)) {
      next = [k];
      other = undefined;
    } else {
      next = [...keys.filter((x) => !exclusive.has(x)), k];
    }
    if (!next.includes("other")) other = undefined;
    if (next.length === 0) return onChange(undefined);
    onChange(other !== undefined ? { keys: next, other } : { keys: next });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {all.map((o) => {
          const on = keys.includes(o.key);
          return (
            <button key={o.key} type="button" aria-pressed={on} onClick={() => toggle(o.key)} className={chipCls(on)}>
              {o.label}
            </button>
          );
        })}
      </div>
      {keys.includes("other") && (
        <OtherInput value={value?.other ?? ""} onChange={(t) => onChange({ keys, other: t })} />
      )}
    </div>
  );
}

// ───────── Yes / No ─────────

export function YesNoField({
  value,
  onChange,
}: {
  value: "yes" | "no" | undefined;
  onChange: (v: "yes" | "no" | undefined) => void;
}) {
  return (
    <div className="flex gap-2" role="radiogroup">
      {(["yes", "no"] as const).map((k) => {
        const on = value === k;
        return (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(on ? undefined : k)}
            className={`min-w-20 ${chipCls(on)}`}
          >
            {k === "yes" ? "Yes" : "No"}
          </button>
        );
      })}
    </div>
  );
}

// ───────── Number ─────────

const UNIT_SUFFIX: Partial<Record<SosaUnit, string>> = {
  percent: "%",
  count: "",
  days: "days",
  months: "months",
  years: "years",
  hours: "hours",
};

export function NumberField({
  unit,
  value,
  onChange,
  estimate,
  onEstimateChange,
  label,
}: {
  unit?: SosaUnit;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  estimate: boolean;
  onEstimateChange: (on: boolean) => void;
  label?: string;
}) {
  const id = useId();
  const { currency } = useCurrency();
  const [text, setText] = useState(value === undefined ? "" : String(value));

  // Follow external changes (e.g. the same answer edited elsewhere).
  useEffect(() => {
    const parsed = text.trim() === "" ? undefined : Number(text);
    if (parsed !== value) setText(value === undefined ? "" : String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const prefix = unit === "money" && currency ? currencySymbol(currency) : "";
  const suffix = unit && unit !== "money" ? (UNIT_SUFFIX[unit] ?? "") : "";

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-2">
        {prefix && <span className="text-ink-muted text-sm">{prefix}</span>}
        <input
          id={id}
          type="text"
          inputMode="decimal"
          aria-label={label}
          value={text}
          onChange={(e) => {
            const raw = e.target.value.replace(/,/g, "");
            if (raw !== "" && !/^-?\d*\.?\d*$/.test(raw)) return;
            setText(raw);
            if (raw.trim() === "" || raw === "-" || raw === ".") return onChange(undefined);
            const n = Number(raw);
            onChange(Number.isFinite(n) ? n : undefined);
          }}
          className={`w-36 tabular-nums ${inputCls}`}
        />
        {suffix && <span className="text-ink-muted text-sm">{suffix}</span>}
      </div>
      <label className="flex items-center gap-2 text-sm text-ink-muted cursor-pointer select-none">
        <input
          type="checkbox"
          checked={estimate}
          onChange={(e) => onEstimateChange(e.target.checked)}
          className="size-4 rounded border-border accent-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        Estimate
      </label>
    </div>
  );
}

// ───────── Text / Script ─────────

export function TextField({
  value,
  onChange,
  label,
}: {
  value: string | undefined;
  onChange: (v: string | undefined) => void;
  label?: string;
}) {
  return (
    <textarea
      rows={3}
      aria-label={label}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? undefined : e.target.value)}
      className={`max-w-2xl ${textareaCls}`}
    />
  );
}

export function ScriptField({
  value,
  onChange,
  label,
}: {
  value: string | undefined;
  onChange: (v: string | undefined) => void;
  label?: string;
}) {
  return (
    <textarea
      rows={8}
      aria-label={label}
      placeholder="Paste the exact wording"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? undefined : e.target.value)}
      className={`max-w-3xl ${textareaCls}`}
    />
  );
}
