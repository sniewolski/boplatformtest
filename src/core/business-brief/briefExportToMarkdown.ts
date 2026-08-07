/**
 * Pure formatter — Business Brief export data → Markdown string.
 * No side effects, no fetches. Mirrors the audit's exportToMarkdown.
 */
import type { BriefExportData } from "./briefExport.functions";
import { formatCurrency } from "@/lib/format-currency";

const FIELDS: Array<{ key: keyof BriefExportData["brief"]; label: string }> = [
  { key: "business_name", label: "Business name" },
  { key: "website", label: "Website" },
  { key: "your_offer", label: "Your offer" },
  { key: "average_deal_size", label: "Average deal size" },
  { key: "ideal_client", label: "Ideal client" },
  { key: "how_you_sell", label: "How you sell" },
  { key: "whos_selling", label: "Who's selling" },
  { key: "sales_cycle", label: "Sales cycle" },
];

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function monthYear(isoDate: string | null): string {
  if (!isoDate) return "";
  const m = Number(isoDate.slice(5, 7));
  const y = isoDate.slice(0, 4);
  if (!(m >= 1 && m <= 12)) return "";
  return `${MONTHS[m - 1]} ${y}`;
}

/** Goal line, omitting whatever is missing. No amount → no line at all. */
function goalLine(data: BriefExportData): string | null {
  const { goal_amount, goal_period, goal_by } = data.brief;
  if (goal_amount === null || !Number.isFinite(goal_amount)) return null;
  const amount = data.currency
    ? formatCurrency(goal_amount, data.currency)
    : goal_amount.toLocaleString("en-GB");
  const period =
    goal_period === "per_month"
      ? " per month"
      : goal_period === "per_year"
        ? " per year"
        : "";
  const by = monthYear(goal_by);
  return `Revenue goal: ${amount}${period}${by ? ` by ${by}` : ""}`;
}

export function hasAnyBriefContent(data: BriefExportData): boolean {
  const b = data.brief;
  const anyText = FIELDS.some(
    (f) => String(b[f.key] ?? "").trim().length > 0,
  );
  const anyGoal =
    (b.goal_amount !== null && Number.isFinite(b.goal_amount)) ||
    !!b.goal_period ||
    !!b.goal_by ||
    b.goal_notes.trim().length > 0;
  return anyText || anyGoal;
}

export function briefExportToMarkdown(data: BriefExportData): string {
  const name = data.owner.fullName?.trim() || data.owner.email;
  const today = new Date().toISOString().slice(0, 10);

  const parts: string[] = [
    `# Business Brief — ${name}`,
    "",
    `${data.owner.email} · Exported ${today}`,
    "",
  ];

  for (const f of FIELDS) {
    const value = String(data.brief[f.key] ?? "").trim();
    if (!value) continue;
    parts.push(`## ${f.label}`, "", value, "");
  }

  const goal = goalLine(data);
  const notes = data.brief.goal_notes.trim();
  if (goal || notes) {
    parts.push("## Goals", "");
    if (goal) parts.push(goal, "");
    if (notes) parts.push(`Notes: ${notes}`, "");
  }

  if (data.brief.updated_at) {
    parts.push(
      `*Last saved ${new Date(data.brief.updated_at).toISOString().slice(0, 10)}*`,
      "",
    );
  }

  return parts.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}
