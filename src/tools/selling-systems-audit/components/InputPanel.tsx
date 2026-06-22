import { CURRENCY, INDUSTRIES, PERIODS, STAGES, type IndustryKey, type PeriodKey } from "../config";
import type { ConversionInputs } from "../lib/types";

export function InputPanel({
  inputs,
  onChange,
}: {
  inputs: ConversionInputs;
  onChange: (next: ConversionInputs) => void;
}) {
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

        <Field label={`Average deal value (${CURRENCY})`}>
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
            className="w-full h-10 px-3 rounded-lg border border-border bg-background text-ink text-sm tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          />
        </Field>
      </div>

      <div className="flex flex-col gap-3">
        <span className="text-ink-muted text-sm">Funnel volumes ({periodLabel(inputs.period)})</span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {STAGES.map((s) => (
            <Field key={s.key} label={s.label} small>
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
                className="w-full h-10 px-3 rounded-lg border border-border bg-background text-ink text-sm tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              />
            </Field>
          ))}
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
}: {
  label: string;
  children: React.ReactNode;
  small?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={`text-ink-muted ${small ? "text-xs" : "text-sm"}`}>{label}</span>
      {children}
    </label>
  );
}
