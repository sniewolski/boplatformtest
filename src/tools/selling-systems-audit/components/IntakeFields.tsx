import { useId } from "react";

/**
 * Reusable intake primitives for the Conversion Review stepped flow.
 * Visual-only. Each control is controlled; parent owns the answer blob.
 */

type Option<K extends string = string> = { key: K; label: string };

// ───────── Chips (multi-select with optional "other" text) ─────────

export function Chips<K extends string>({
  options,
  value,
  onChange,
  allowOther,
  otherValue,
  onOtherChange,
  otherPlaceholder = "Other (please specify)",
}: {
  options: readonly Option<K>[];
  value: K[];
  onChange: (next: K[]) => void;
  allowOther?: boolean;
  otherValue?: string;
  onOtherChange?: (v: string) => void;
  otherPlaceholder?: string;
}) {
  function toggle(k: K) {
    onChange(value.includes(k) ? value.filter((x) => x !== k) : [...value, k]);
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = value.includes(o.key);
          return (
            <button
              key={o.key}
              type="button"
              onClick={() => toggle(o.key)}
              aria-pressed={on}
              className={`px-3.5 h-9 rounded-full border text-sm transition-colors active:scale-[0.98] ${
                on
                  ? "bg-ink text-background border-ink"
                  : "bg-background text-ink border-border hover:border-ink-muted"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      {allowOther && (
        <input
          type="text"
          value={otherValue ?? ""}
          onChange={(e) => onOtherChange?.(e.target.value)}
          placeholder={otherPlaceholder}
          className="w-full max-w-md h-10 px-3 rounded-xl border border-border bg-background text-ink text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        />
      )}
    </div>
  );
}

// ───────── Allocator (percentages per selected key, soft-warn ≠ 100) ─────────

export function Allocator<K extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly Option<K>[];
  value: Partial<Record<K, number>>;
  onChange: (next: Partial<Record<K, number>>) => void;
}) {
  if (options.length === 0) {
    return (
      <p className="text-ink-muted text-sm">
        Pick at least one source above to allocate percentages.
      </p>
    );
  }
  const total = options.reduce((acc, o) => acc + (Number(value[o.key]) || 0), 0);
  const off = Math.abs(total - 100) > 1;
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {options.map((o) => (
          <label key={o.key} className="flex items-center gap-3">
            <span className="text-ink text-sm flex-1 truncate">{o.label}</span>
            <div className="relative w-24">
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={100}
                step="1"
                value={value[o.key] ?? ""}
                onChange={(e) => {
                  const v = e.target.value === "" ? undefined : Number(e.target.value);
                  onChange({ ...value, [o.key]: v });
                }}
                placeholder="0"
                className="w-full h-10 pl-3 pr-7 rounded-xl border border-border bg-background text-ink text-sm tabular-nums text-right focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted text-xs pointer-events-none">
                %
              </span>
            </div>
          </label>
        ))}
      </div>
      <p
        className={`text-xs tabular-nums ${
          off ? "text-[var(--red)]" : "text-ink-muted"
        }`}
      >
        Total: {total}% — rough is fine, doesn't need to hit 100 exactly.
      </p>
    </div>
  );
}

// ───────── Per-item single-choice tags (used for source quality) ─────────

export function PerItemChoice<K extends string, V extends string>({
  items,
  choices,
  value,
  onChange,
}: {
  items: readonly Option<K>[];
  choices: readonly Option<V>[];
  value: Partial<Record<K, V>>;
  onChange: (next: Partial<Record<K, V>>) => void;
}) {
  if (items.length === 0) {
    return (
      <p className="text-ink-muted text-sm">
        Pick at least one source above to rate quality.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {items.map((it) => (
        <div
          key={it.key}
          className="flex items-center justify-between gap-4 py-2 border-b border-border last:border-b-0"
        >
          <span className="text-ink text-sm">{it.label}</span>
          <div className="flex gap-1.5">
            {choices.map((c) => {
              const on = value[it.key] === c.key;
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => onChange({ ...value, [it.key]: c.key })}
                  aria-pressed={on}
                  className={`h-8 px-3 rounded-full text-xs border transition-colors ${
                    on
                      ? "bg-ink text-background border-ink"
                      : "bg-background text-ink-muted border-border hover:border-ink-muted hover:text-ink"
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ───────── Maturity spectrum (linear N-step) ─────────

export function MaturitySpectrum<K extends string>({
  steps,
  value,
  onChange,
}: {
  steps: readonly Option<K>[];
  value: K | null;
  onChange: (k: K) => void;
}) {
  return (
    <div className="w-fit inline-flex items-center rounded-xl border border-border overflow-hidden">
      {steps.map((s) => {
        const on = value === s.key;
        return (
          <button
            key={s.key}
            type="button"
            onClick={() => onChange(s.key)}
            aria-pressed={on}
            className={`flex-none h-11 px-4 text-sm whitespace-nowrap transition-colors border-r border-border last:border-r-0 ${
              on
                ? "bg-ink text-background"
                : "bg-background text-ink hover:bg-[var(--surface-raised)]"
            }`}
          >
            {s.label}
          </button>
        );
      })}
    </div>
  );
}


// ───────── Segmented (single choice, hugs content) ─────────

export function Segmented<K extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly Option<K>[];
  value: K | null;
  onChange: (k: K) => void;
}) {
  return (
    <div className="w-fit inline-flex items-center rounded-xl border border-border overflow-hidden">
      {options.map((o) => {
        const on = value === o.key;
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => onChange(o.key)}
            aria-pressed={on}
            className={`flex-none h-10 px-4 text-sm whitespace-nowrap transition-colors border-r border-border last:border-r-0 ${
              on
                ? "bg-ink text-background"
                : "bg-background text-ink hover:bg-[var(--surface-raised)]"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}


// ───────── Yes/No toggle ─────────

export function YesNoToggle({
  value,
  onChange,
}: {
  value: boolean | null;
  onChange: (v: boolean) => void;
}) {
  return (
    <Segmented
      options={[
        { key: "yes", label: "Yes" },
        { key: "no", label: "No" },
      ]}
      value={value === null ? null : value ? "yes" : "no"}
      onChange={(k) => onChange(k === "yes")}
    />
  );
}

// ───────── Percent input (0–100) ─────────

export function PercentField({
  value,
  onChange,
  placeholder = "0",
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative w-32">
      <input
        type="number"
        inputMode="numeric"
        min={0}
        max={100}
        step="1"
        value={value ?? ""}
        onChange={(e) =>
          onChange(e.target.value === "" ? null : Number(e.target.value))
        }
        placeholder={placeholder}
        className="w-full h-10 pl-3 pr-7 rounded-xl border border-border bg-background text-ink text-sm tabular-nums text-right focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted text-xs pointer-events-none">
        %
      </span>
    </div>
  );
}

// ───────── Number + unit (sales cycle length) ─────────

export function NumberWithUnit<U extends string>({
  value,
  unit,
  units,
  onValueChange,
  onUnitChange,
}: {
  value: number | null;
  unit: U | null;
  units: readonly Option<U>[];
  onValueChange: (v: number | null) => void;
  onUnitChange: (u: U) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        inputMode="numeric"
        min={0}
        step="1"
        value={value ?? ""}
        onChange={(e) =>
          onValueChange(e.target.value === "" ? null : Number(e.target.value))
        }
        placeholder="0"
        className="w-24 h-10 px-3 rounded-xl border border-border bg-background text-ink text-sm tabular-nums text-right focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      />
      <select
        value={unit ?? ""}
        onChange={(e) => onUnitChange(e.target.value as U)}
        className="h-10 px-3 rounded-xl border border-border bg-background text-ink text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <option value="" disabled>
          unit
        </option>
        {units.map((u) => (
          <option key={u.key} value={u.key}>
            {u.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ───────── Optional text ─────────

export function OptionalText({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  const id = useId();
  return (
    <textarea
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder ?? "Add anything else (optional)…"}
      rows={rows}
      className="w-full rounded-xl border border-border bg-background text-ink text-sm px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    />
  );
}

// ───────── Question wrapper ─────────

export function Question({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-col gap-1">
        <span className="text-ink text-sm font-medium">{label}</span>
        {hint && <span className="text-ink-muted text-xs">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
