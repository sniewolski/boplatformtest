import { CURRENCY_OPTIONS, type CurrencyCode } from "@/lib/format-currency";

/**
 * Three-option currency primitive — USD / EUR / GBP, no pre-selection.
 * Owner-level setting; consumed via `useCurrency()` upstream.
 */
export function CurrencySelect({
  value,
  onChange,
  id,
  disabled,
  className,
}: {
  value: CurrencyCode | null;
  onChange: (next: CurrencyCode) => void;
  id?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <select
      id={id}
      disabled={disabled}
      value={value ?? ""}
      onChange={(e) => {
        const v = e.target.value;
        if (v === "USD" || v === "EUR" || v === "GBP") onChange(v);
      }}
      className={
        "w-full h-10 px-3 rounded-lg border border-border bg-background text-ink text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-60 disabled:cursor-not-allowed " +
        (className ?? "")
      }
    >
      <option value="" disabled>
        Select currency
      </option>
      {CURRENCY_OPTIONS.map((c) => (
        <option key={c.code} value={c.code}>
          {c.label}
        </option>
      ))}
    </select>
  );
}
