import { ArrowRight } from "lucide-react";
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

/**
 * Three labelled groups: Your business / Your funnel / Average deal value.
 * Errors are shown only after the owner has pressed "Analyse" at least once
 * (controlled upstream via `showErrors`).
 */
export function InputPanel({
  inputs,
  onChange,
  validation,
  showErrors,
  currency,
  onCurrencyChange,
}: {
  inputs: ConversionInputs;
  onChange: (next: ConversionInputs) => void;
  validation: ValidationResult;
  showErrors: boolean;
  currency: CurrencyCode | null;
  onCurrencyChange: (next: CurrencyCode) => void;
}) {
  const dealSymbol = currency ? currencySymbol(currency) : null;
  const dealError = showErrors ? validation.dealValueError : null;

  return (
    <section className="flex flex-col gap-8">
      {/* Group 1 — Your business */}
      <Group label="Your business">
        <div className="flex flex-wrap gap-5 items-end">
          <Field label="Industry" className="min-w-[260px]" style={{ flex: 2 }}>
            <select
              value={inputs.industry ?? ""}
              onChange={(e) =>
                onChange({
                  ...inputs,
                  industry: (e.target.value || null) as IndustryKey | null,
                })
              }
              className="w-full h-10 px-3 rounded-xl border border-border bg-background text-ink text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <option value="">Select industry…</option>
              {INDUSTRIES.map((i) => (
                <option key={i.key} value={i.key}>
                  {i.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Reporting period" className="min-w-[160px]" style={{ flex: 1 }}>
            <select
              value={inputs.period}
              onChange={(e) =>
                onChange({ ...inputs, period: e.target.value as PeriodKey })
              }
              className="w-full h-10 px-3 rounded-xl border border-border bg-background text-ink text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {PERIODS.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Group>

      {/* Group 2 — Your funnel */}
      <Group
        label="Your funnel"
        hint={`Volumes ${periodLabel(inputs.period)}`}
      >
        <div className="flex flex-wrap items-end gap-x-3 gap-y-4">
          {STAGES.map((s, i) => {
            const err = showErrors
              ? validation.volumeErrors[s.key as StageKey]
              : undefined;
            return (
              <div key={s.key} className="contents">
                <Field
                  label={s.label}
                  small
                  error={err?.message}
                  className="min-w-[120px]"
                  style={{ flex: 1 }}
                >
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step="1"
                    value={inputs.volumes[s.key] ?? ""}
                    onChange={(e) => {
                      const v =
                        e.target.value === "" ? undefined : Number(e.target.value);
                      onChange({
                        ...inputs,
                        volumes: { ...inputs.volumes, [s.key]: v },
                      });
                    }}
                    placeholder="0"
                    aria-invalid={!!err}
                    className={
                      "w-full h-10 px-3 rounded-xl border bg-background text-ink text-sm tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background " +
                      (err
                        ? "border-[var(--red)] focus-visible:ring-[var(--red)]"
                        : "border-border focus-visible:ring-ring")
                    }
                  />
                </Field>
                {i < STAGES.length - 1 && (
                  <div
                    aria-hidden
                    className="hidden sm:flex items-center justify-center h-10 shrink-0 text-ink-muted/60"
                    style={{ marginBottom: err ? "1.25rem" : 0 }}
                  >
                    <ArrowRight className="size-4" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Group>

      {/* Group 3 — Average deal value */}
      <Group label="Average deal value">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Currency" small className="w-[120px]">
            <CurrencySelect value={currency} onChange={onCurrencyChange} />
          </Field>
          <Field
            label="Deal value"
            small
            error={dealError}
            className="w-[200px]"
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
                    avgDealValue:
                      e.target.value === "" ? null : Number(e.target.value),
                  })
                }
                placeholder="0"
                aria-invalid={!!dealError}
                className={
                  "w-full h-10 rounded-xl border bg-background text-ink text-sm tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background " +
                  (dealSymbol ? "pl-7 pr-3 " : "px-3 ") +
                  (dealError
                    ? "border-[var(--red)] focus-visible:ring-[var(--red)]"
                    : "border-border focus-visible:ring-ring")
                }
              />
            </div>
          </Field>
        </div>
      </Group>
    </section>
  );
}

function periodLabel(period: PeriodKey): string {
  return PERIODS.find((p) => p.key === period)?.label ?? "";
}

function Group({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-4">
        <h3
          className="text-ink-muted"
          style={{ fontSize: "13px", fontWeight: 500, letterSpacing: "0.01em" }}
        >
          {label}
        </h3>
        {hint && (
          <span className="text-ink-muted text-xs tabular-nums">{hint}</span>
        )}
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  children,
  small,
  error,
  className,
  style,
}: {
  label: string;
  children: React.ReactNode;
  small?: boolean;
  error?: string | null;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <label className={"flex flex-col gap-1.5 " + (className ?? "")} style={style}>
      <span className={`text-ink-muted ${small ? "text-xs" : "text-sm"}`}>
        {label}
      </span>
      {children}
      {error && (
        <span className="text-[var(--red)] text-xs leading-snug">{error}</span>
      )}
    </label>
  );
}
