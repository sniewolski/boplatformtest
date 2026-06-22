import {
  formatCurrency,
  formatCurrencyCompact,
  type CurrencyCode,
} from "@/lib/format-currency";

/**
 * Money helpers in this tool route through the shared `formatCurrency` util,
 * which is the single way money renders anywhere in the app. The owner's
 * currency is passed in; this tool never hardcodes a symbol or locale.
 */

export function fmtMoney(value: number, currency: CurrencyCode): string {
  return formatCurrencyCompact(value, currency);
}

export function fmtMoneyExact(value: number, currency: CurrencyCode): string {
  return formatCurrency(value, currency);
}

export function fmtPct(rate: number | null | undefined, digits = 0): string {
  if (rate == null || !Number.isFinite(rate)) return "—";
  return `${(rate * 100).toFixed(digits)}%`;
}

export function fmtInt(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return Math.round(value).toLocaleString();
}
