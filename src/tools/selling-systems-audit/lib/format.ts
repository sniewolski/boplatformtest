import { CURRENCY } from "../config";

export function fmtMoney(value: number): string {
  if (!Number.isFinite(value)) return `${CURRENCY}0`;
  const abs = Math.abs(value);
  let body: string;
  if (abs >= 1_000_000) {
    body = `${(value / 1_000_000).toFixed(1)}m`;
  } else if (abs >= 10_000) {
    body = `${(value / 1_000).toFixed(0)}k`;
  } else if (abs >= 1_000) {
    body = `${(value / 1_000).toFixed(1)}k`;
  } else {
    body = `${Math.round(value)}`;
  }
  return `${CURRENCY}${body}`;
}

export function fmtMoneyExact(value: number): string {
  if (!Number.isFinite(value)) return `${CURRENCY}0`;
  return `${CURRENCY}${Math.round(value).toLocaleString("en-GB")}`;
}

export function fmtPct(rate: number | null | undefined, digits = 0): string {
  if (rate == null || !Number.isFinite(rate)) return "—";
  return `${(rate * 100).toFixed(digits)}%`;
}

export function fmtInt(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return Math.round(value).toLocaleString("en-GB");
}
