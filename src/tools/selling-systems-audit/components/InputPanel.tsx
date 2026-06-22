import {
  INDUSTRIES,
  PERIODS,
  STAGES,
  type IndustryKey,
  type PeriodKey,
  type StageKey,
} from "../config";
import type { ConversionInputs } from "../lib/types";
import type { ValidationResult } from "../lib/validation";
import { CurrencySelect } from "@/core/settings/CurrencySelect";
import { currencySymbol, type CurrencyCode } from "@/lib/format-currency";

export function InputPanel({
  inputs,
  onChange,
  validation,
  currency,
  onCurrencyChange,
}: {
  inputs: ConversionInputs;
  onChange: (next: ConversionInputs) => void;
  validation: ValidationResult;
  currency: CurrencyCode | null;
  onCurrencyChange: (next: CurrencyCode) => void;
}) {
  const dealSymbol = currency ? currencySymbol(currency) : null;
  const dealError = validation.dealValueError;

  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-lg font-medium" style={{ letterSpacing: "-0.01em" }}>
        Your numbers
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label="Industry">
          <select
            value={inputs.industry ?? ""}
            onChange={(e) =>
              onChange({ ...inputs, industry: (e.target.value || null) as IndustryKey | null })
            }
            className="w-full h-10 px-3 rounded-lg border border-border bg-background text-ink text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <option value="">Select industry…</option>
            {INDUSTRIES.map((i) => (
              <option key={i.key} value={i.key}>
                {i.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Reporting period">
          <select
            value={inputs.period}
            onChange={(e) => onChange({ ...inputs, period: e.target.value as PeriodKey })}
            className="w-full h-10 px-3 rounded-lg border border-border bg-background text-ink text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {PERIODS.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Currency">
          <CurrencySelect value={currency} onChange={onCurrencyChange} />
        </Field>

        <Field
          label="Average deal value"
          error={dealError}
        >
          <div className="relative">
            {dealSymbol && (
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted text-sm pointer-events-none tabular-nums">
                {dealSymbol}
              </span>
            )}
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={inputs.avgDealValue ?? ""}
              onChange={(e) =>
                onChange({
                  ...inputs,
                  avgDealValue: e.target.value === "" ? null : Number(e.target.value),
                })
              }
              placeholder="0"
              aria-invalid={!!dealError}
              className={
                "w-full h-10 rounded-lg border bg-background text-ink text-sm tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background " +
                (dealSymbol ? "pl-7 pr-3 " : "px-3 ") +
                (dealError
                  ? "border-[var(--red)] focus-visible:ring-[var(--red)]"
                  : "border-border focus-visible:ring-ring")
              }
            />
          </div>
        </Field>
      </div>

      <div className="flex flex-col gap-3">
        <span className="text-ink-muted text-sm">
          Funnel volumes ({periodLabel(inputs.period)})
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {STAGES.map((s) => {
            const err = validation.volumeErrors[s.key as StageKey];
            return (
              <Field key={s.key} label={s.label} small error={err?.message}>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step="1"
                  value={inputs.volumes[s.key] ?? ""}
                  onChange={(e) => {
                    const v = e.target.value === "" ? undefined : Number(e.target.value);
                    onChange({
                      ...inputs,
                      volumes: { ...inputs.volumes, [s.key]: v },
                    });
                  }}
                  placeholder="0"
                  aria-invalid={!!err}
                  className={
                    "w-full h-10 px-3 rounded-lg border bg-background text-ink text-sm tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background " +
                    (err
                      ? "border-[var(--red)] focus-visible:ring-[var(--red)]"
                      : "border-border focus-visible:ring-ring")
                  }
                />
              </Field>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function periodLabel(period: PeriodKey): string {
  return PERIODS.find((p) => p.key === period)?.label ?? "";
}

function Field({
  label,
  children,
  small,
  error,
}: {
  label: string;
  children: React.ReactNode;
  small?: boolean;
  error?: string | null;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={`text-ink-muted ${small ? "text-xs" : "text-sm"}`}>{label}</span>
      {children}
      {error && (
        <span className="text-[var(--red)] text-xs leading-snug">{error}</span>
      )}
    </label>
  );
}
