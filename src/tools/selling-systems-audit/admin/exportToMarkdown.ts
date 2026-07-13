/**
 * Pure formatter — audit export data → Markdown string.
 * No side effects, no fetches. Renders sections in fixed order.
 */
import type {
  AuditExportData,
  AuditExportSection,
  AuditExportSectionKey,
  AuditExportContentAsset,
} from "./auditExport.functions";
import { CONTENT_CATEGORIES } from "../content/config";
import { formatCurrency, type CurrencyCode } from "@/lib/format-currency";

const SECTION_LABEL: Record<AuditExportSectionKey, string> = {
  conversion: "Conversion",
  pipeline: "Pipeline",
  process: "Process",
  activity: "Activity",
  messaging: "Messaging",
  alignment: "Alignment",
};

const SECTION_ORDER: AuditExportSectionKey[] = [
  "conversion",
  "pipeline",
  "process",
  "activity",
  "messaging",
  "alignment",
];

const MONEY_KEY_RE = /(^avgDealValue$|value|amount|revenue)/i;

function humanizeKey(key: string): string {
  const spaced = key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .trim();
  if (!spaced) return key;
  return spaced
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function isMoneyKey(key: string): boolean {
  return MONEY_KEY_RE.test(key);
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString().slice(0, 10);
}

function formatPrimitive(
  key: string,
  value: unknown,
  currency: CurrencyCode | null,
): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "number") {
    if (currency && isMoneyKey(key)) return formatCurrency(value, currency);
    return String(value);
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function renderValueLines(
  key: string,
  value: unknown,
  currency: CurrencyCode | null,
  depth: number,
): string[] {
  const indent = "  ".repeat(depth);
  const label = humanizeKey(key);

  if (value === null || value === undefined || value === "") {
    return [`${indent}- **${label}:** —`];
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return [`${indent}- **${label}:** —`];
    const allPrimitive = value.every(
      (v) => v === null || ["string", "number", "boolean"].includes(typeof v),
    );
    if (allPrimitive) {
      const joined = value
        .map((v) => formatPrimitive(key, v, currency))
        .join(", ");
      return [`${indent}- **${label}:** ${joined}`];
    }
    const lines = [`${indent}- **${label}:**`];
    value.forEach((item, i) => {
      if (item && typeof item === "object") {
        lines.push(`${indent}  - Item ${i + 1}`);
        for (const [k, v] of Object.entries(item as Record<string, unknown>)) {
          lines.push(...renderValueLines(k, v, currency, depth + 2));
        }
      } else {
        lines.push(`${indent}  - ${formatPrimitive(key, item, currency)}`);
      }
    });
    return lines;
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return [`${indent}- **${label}:** —`];
    const lines = [`${indent}- **${label}:**`];
    for (const [k, v] of entries) {
      lines.push(...renderValueLines(k, v, currency, depth + 1));
    }
    return lines;
  }

  return [`${indent}- **${label}:** ${formatPrimitive(key, value, currency)}`];
}

function renderAnswers(
  answers: any | null,
  currency: CurrencyCode | null,
): string {
  if (!answers || typeof answers !== "object") return "_No answers._";
  const entries = Object.entries(answers as Record<string, unknown>);
  if (entries.length === 0) return "_No answers._";
  const lines: string[] = [];
  for (const [k, v] of entries) {
    lines.push(...renderValueLines(k, v, currency, 0));
  }
  return lines.join("\n");
}

function renderSection(
  section: AuditExportSection,
  currency: CurrencyCode | null,
): string {
  const label = SECTION_LABEL[section.key];
  const parts: string[] = [`## ${label}`, ""];
  if (section.submittedAt) {
    parts.push(`*Submitted ${formatDate(section.submittedAt)}*`);
  } else {
    parts.push(`*No submission yet*`);
  }
  parts.push("");
  parts.push("### Owner Answers");
  parts.push("");
  parts.push(renderAnswers(section.submittedAnswers, currency));
  parts.push("");
  parts.push("### Section Summary");
  parts.push("");
  parts.push(section.summaryText ? section.summaryText : "*No summary generated*");
  parts.push("");
  parts.push("### Coach Notes");
  parts.push("");
  parts.push(section.noteBody ? section.noteBody : "*No notes*");
  parts.push("");
  return parts.join("\n");
}

function renderContentAsset(asset: AuditExportContentAsset): string {
  if (asset.input_type === "text" || asset.input_type === "md") {
    const body = asset.body_text?.trim() || "*Empty*";
    return `### ${asset.title}\n\n${body}\n`;
  }
  return `- 📎 [${asset.input_type.toUpperCase()}] ${asset.title}`;
}

function renderContent(assets: AuditExportContentAsset[]): string {
  if (assets.length === 0) {
    return "## Content Review\n\n*No content submitted*\n";
  }
  const parts: string[] = ["## Content Review", ""];
  const knownCategories = CONTENT_CATEGORIES.map((c) => c.key);
  const byCat = new Map<string, AuditExportContentAsset[]>();
  for (const a of assets) {
    const arr = byCat.get(a.category) ?? [];
    arr.push(a);
    byCat.set(a.category, arr);
  }
  const ordered = [
    ...knownCategories.filter((k) => byCat.has(k)),
    ...Array.from(byCat.keys()).filter((k) => !knownCategories.includes(k)),
  ];
  for (const catKey of ordered) {
    const items = byCat.get(catKey) ?? [];
    if (items.length === 0) continue;
    const label =
      CONTENT_CATEGORIES.find((c) => c.key === catKey)?.label ?? catKey;
    parts.push(`### ${label}`, "");
    const lineItems: string[] = [];
    const bodyItems: string[] = [];
    for (const a of items) {
      const rendered = renderContentAsset(a);
      if (rendered.startsWith("- ")) lineItems.push(rendered);
      else bodyItems.push(rendered);
    }
    if (lineItems.length) {
      parts.push(lineItems.join("\n"), "");
    }
    for (const b of bodyItems) {
      parts.push(b, "");
    }
  }
  return parts.join("\n");
}

export function exportToMarkdown(data: AuditExportData): string {
  const name = data.owner.fullName?.trim() || data.owner.email;
  const today = new Date().toISOString().slice(0, 10);
  const parts: string[] = [
    `# Selling Systems Audit — ${name}`,
    "",
    `${data.owner.email} · Exported ${today}`,
    "",
  ];
  const orderedSections = SECTION_ORDER.map(
    (k) => data.sections.find((s) => s.key === k),
  ).filter((s): s is AuditExportSection => !!s);
  for (const s of orderedSections) {
    parts.push(renderSection(s, data.currency));
  }
  parts.push(renderContent(data.contentAssets));
  return parts.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}

export function hasAnySubmission(data: AuditExportData): boolean {
  const anySection = data.sections.some((s) => !!s.submittedAt);
  const anyContent = data.contentAssets.length > 0;
  return anySection || anyContent;
}
