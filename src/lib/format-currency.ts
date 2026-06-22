/**
 * Shared money formatter — the single way money renders anywhere in the app.
 *
 * Never string-concatenate a hardcoded symbol; call this. Revenue figures use
 * whole units (no pennies on annual totals); pass `digits` only for narrow
 * cases that need fractional output.
 */

export type CurrencyCode = "USD" | "EUR" | "GBP";

export const CURRENCY_OPTIONS: Array<{ code: CurrencyCode; symbol: string; label: string }> = [
  { code: "USD", symbol: "$", label: "USD ($)" },
  { code: "EUR", symbol: "€", label: "EUR (€)" },
  { code: "GBP", symbol: "£", label: "GBP (£)" },
];

export function currencySymbol(code: CurrencyCode): string {
  return CURRENCY_OPTIONS.find((c) => c.code === code)?.symbol ?? "";
}

export function formatCurrency(
  amount: number,
  currency: CurrencyCode,
  opts: { digits?: number } = {},
): string {
  if (!Number.isFinite(amount)) amount = 0;
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: opts.digits ?? 0,
    minimumFractionDigits: 0,
  }).format(amount);
}

/**
 * Compact money — used for dense surfaces where a full string would crowd
 * the row (dashboard widgets, overview headlines). Falls back to the precise
 * formatter for sub-1k values so the symbol still comes from Intl.
 */
export function formatCurrencyCompact(amount: number, currency: CurrencyCode): string {
  if (!Number.isFinite(amount)) amount = 0;
  const abs = Math.abs(amount);
  if (abs < 1_000) return formatCurrency(amount, currency);

  // Intl with compact notation handles the symbol + suffix in one pass.
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: abs >= 10_000 ? 0 : 1,
  }).format(amount);
}
