import { ArrowRight } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
            <Select
              value={inputs.industry ?? ""}
              onValueChange={(v) =>
                onChange({
                  ...inputs,
                  industry: (v || null) as IndustryKey | null,
                })
              }
            >
              <SelectTrigger className="h-10 w-full rounded-xl border-border bg-background text-ink text-sm pr-3 focus:ring-2 focus:ring-ring motion-safe:transition-colors motion-safe:duration-150">
                <SelectValue placeholder="Select industry…" />
              </SelectTrigger>
              <SelectContent
                className="rounded-2xl border-border bg-popover text-popover-foreground shadow-md p-1"
                style={{ animationDuration: "150ms", animationTimingFunction: "var(--ease-out)" }}
              >
                <SelectItem
                  value=""
                  className="rounded-lg pl-2 pr-8 py-1.5 text-sm text-ink data-[highlighted]:bg-[var(--red-tint)] data-[highlighted]:text-[var(--red)] data-[state=checked]:text-[var(--red)] focus:bg-[var(--red-tint)] focus:text-[var(--red)] motion-reduce:![animation-duration:0ms]"
                >
                  Select industry…
                </SelectItem>
                {INDUSTRIES.map((i) => (
                  <SelectItem
                    key={i.key}
                    value={i.key}
                    className="rounded-lg pl-2 pr-8 py-1.5 text-sm text-ink data-[highlighted]:bg-[var(--red-tint)] data-[highlighted]:text-[var(--red)] data-[state=checked]:text-[var(--red)] focus:bg-[var(--red-tint)] focus:text-[var(--red)] motion-reduce:![animation-duration:0ms]"
                  >
                    {i.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Reporting period" className="min-w-[160px]" style={{ flex: 1 }}>
            <Select
              value={inputs.period}
              onValueChange={(v) => onChange({ ...inputs, period: v as PeriodKey })}
            >
              <SelectTrigger className="h-10 w-full rounded-xl border-border bg-background text-ink text-sm pr-3 focus:ring-2 focus:ring-ring motion-safe:transition-colors motion-safe:duration-150">
                <SelectValue />
              </SelectTrigger>
              <SelectContent
                className="rounded-2xl border-border bg-popover text-popover-foreground shadow-md p-1"
                style={{ animationDuration: "150ms", animationTimingFunction: "var(--ease-out)" }}
              >
                {PERIODS.map((p) => (
                  <SelectItem
                    key={p.key}
                    value={p.key}
                    className="rounded-lg pl-2 pr-8 py-1.5 text-sm text-ink data-[highlighted]:bg-[var(--red-tint)] data-[highlighted]:text-[var(--red)] data-[state=checked]:text-[var(--red)] focus:bg-[var(--red-tint)] focus:text-[var(--red)] motion-reduce:![animation-duration:0ms]"
                  >
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      </Group>

      {/* Group 2 — Your funnel */}
      <Group label="Your funnel">
        <div className="flex flex-wrap items-start gap-x-3 gap-y-4">
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
                    className="hidden sm:flex items-center justify-center h-10 mt-6 shrink-0 text-ink-muted/60"
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
      <span className="min-h-[20px] text-[var(--red)] text-xs leading-snug">
        {error ?? ""}
      </span>
    </label>
  );
}
