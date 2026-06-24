import type { ReactNode } from "react";
import { formatCurrency, type CurrencyCode } from "@/lib/format-currency";
import type { SalesStage } from "../config";

/**
 * Shared read-back primitives for the audit's "Review & submit" steps.
 *
 * Neutral mirrors of what the owner entered — no diagnostic colour, no
 * scoring, no analysis. Null-safe; blanks render as "—".
 */

type KeyedOption = { key: string; label: string };

export function labelOf<T extends KeyedOption>(
  options: readonly T[],
  key: string | null | undefined,
): string {
  if (!key) return "—";
  return options.find((o) => o.key === key)?.label ?? "—";
}

export function chipsLabels<T extends KeyedOption>(
  options: readonly T[],
  keys: string[] | undefined,
  other: string | undefined,
): string {
  const picked = (keys ?? []).map((k) => labelOf(options, k)).filter((l) => l !== "—");
  if (other && other.trim()) picked.push(other.trim());
  return picked.length ? picked.join(", ") : "—";
}

export function pct(v: number | null | undefined): string {
  return v == null ? "—" : `${v}%`;
}

export function money(
  v: number | null | undefined,
  currency: CurrencyCode | null,
): string {
  if (v == null) return "—";
  return currency ? formatCurrency(v, currency) : String(v);
}

export function numberWithUnit<T extends KeyedOption>(
  v: number | null | undefined,
  unitKey: string | null | undefined,
  unitOptions: readonly T[],
): string {
  if (v == null) return "—";
  const unit = labelOf(unitOptions, unitKey);
  return unit === "—" ? String(v) : `${v} ${unit}`;
}

export function boolText(v: boolean | null | undefined): string {
  return v == null ? "—" : v ? "Yes" : "No";
}

export function ReadRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-6 py-2.5 border-b border-border last:border-b-0">
      <span className="text-ink-muted text-sm">{label}</span>
      <span className="text-ink text-sm text-right tabular-nums max-w-[60%]">{value}</span>
    </div>
  );
}

export function ReadGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-medium text-ink">{title}</h3>
      <div className="flex flex-col">{children}</div>
    </div>
  );
}

/**
 * Renders one ReadRow per selected source key, using the source's display
 * label and a value resolved from a per-source map. If `sources` is empty,
 * renders a single ReadRow with "—" as the value.
 */
export function ReadMapRows<T extends KeyedOption>({
  sources,
  sourceOptions,
  map,
  renderValue,
  emptyLabel = "Selected sources",
}: {
  sources: string[] | undefined;
  sourceOptions: readonly T[];
  map: Record<string, unknown> | undefined;
  renderValue: (raw: unknown, sourceKey: string) => string;
  emptyLabel?: string;
}) {
  const list = sources ?? [];
  if (list.length === 0) {
    return <ReadRow label={emptyLabel} value="—" />;
  }
  return (
    <>
      {list.map((k) => (
        <ReadRow
          key={k}
          label={labelOf(sourceOptions, k)}
          value={renderValue(map?.[k], k)}
        />
      ))}
    </>
  );
}

/**
 * Renders one row per defined sales stage with its purpose + exit criteria.
 * Empty stage list → single "—" line. Blank fields render as "—".
 */
export function ReadStages({ items }: { items: SalesStage[] | undefined }) {
  const rows = items ?? [];
  if (rows.length === 0) {
    return <ReadRow label="Stages" value="—" />;
  }
  return (
    <div className="flex flex-col">
      {rows.map((s, i) => (
        <div
          key={s.id}
          className="flex flex-col gap-1 py-3 border-b border-border last:border-b-0"
        >
          <div className="flex items-baseline gap-2">
            <span className="text-ink-muted text-xs tabular-nums">{i + 1}.</span>
            <span className="text-ink text-sm font-medium">
              {s.name.trim() || "—"}
            </span>
          </div>
          <div className="pl-5 flex flex-col gap-0.5">
            <span className="text-ink-muted text-xs">
              Purpose:{" "}
              <span className="text-ink">{s.purpose?.trim() || "—"}</span>
            </span>
            <span className="text-ink-muted text-xs">
              Exit:{" "}
              <span className="text-ink">{s.exitCriteria?.trim() || "—"}</span>
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
