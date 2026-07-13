/**
 * Pure formatter — SalesCode result → Markdown string.
 * No side effects, no fetches. Mirrors what SalesCodeResultView renders,
 * picking the owner or respondent copy variant.
 */
import type { SalesCodeResult, TraitOutcome } from "@/tools/salescode/lib/types";
import {
  TRAIT_AREA_LABELS,
  TRAIT_AREA_OF,
  TRAIT_COPY,
  type TraitArea,
} from "@/tools/salescode/lib/copy";
import { TRAIT_COPY_RESPONDENT } from "@/tools/salescode/lib/copy.respondent";
import { TYPE_PROFILES } from "@/tools/salescode/lib/typeProfiles";
import { TYPE_PROFILES_RESPONDENT } from "@/tools/salescode/lib/typeProfiles.respondent";

export type SalesCodeExportInput =
  | {
      kind: "owner";
      ownerName: string | null;
      ownerEmail: string;
      submittedAt: string | null;
      result: SalesCodeResult;
    }
  | {
      kind: "respondent";
      ownerName: string | null;
      ownerEmail: string;
      respondentName: string | null;
      respondentEmail: string | null;
      completedAt: string | null;
      result: SalesCodeResult;
    };

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toISOString().slice(0, 10);
}

function slugify(input: string, fallback: string): string {
  const slug = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || fallback;
}

export function salesCodeExportFilename(input: SalesCodeExportInput): string {
  const today = new Date().toISOString().slice(0, 10);
  if (input.kind === "owner") {
    const source = input.ownerName?.trim() || input.ownerEmail.split("@")[0];
    return `salescode-${slugify(source, "owner")}-${today}.md`;
  }
  const source =
    input.respondentName?.trim() ||
    input.respondentEmail?.split("@")[0] ||
    "respondent";
  return `salescode-${slugify(source, "respondent")}-${today}.md`;
}

export function formatSalesCodeMarkdown(input: SalesCodeExportInput): string {
  const variant = input.kind === "owner" ? "owner" : "respondent";
  const profiles =
    variant === "owner" ? TYPE_PROFILES : TYPE_PROFILES_RESPONDENT;
  const traitCopy = variant === "owner" ? TRAIT_COPY : TRAIT_COPY_RESPONDENT;

  const profile = profiles[input.result.type];
  const out: string[] = [];

  // Header
  if (input.kind === "owner") {
    const owner = input.ownerName?.trim() || input.ownerEmail;
    out.push(`# SalesCode — ${owner}`);
    out.push("");
    out.push(`- **Owner:** ${owner}`);
    if (input.ownerName?.trim()) out.push(`- **Email:** ${input.ownerEmail}`);
    out.push(`- **Submitted:** ${formatDate(input.submittedAt)}`);
    out.push(`- **Type:** ${input.result.type}`);
    out.push("");
  } else {
    const respondent =
      input.respondentName?.trim() ||
      input.respondentEmail ||
      "Unnamed respondent";
    const owner = input.ownerName?.trim() || input.ownerEmail;
    out.push(`# SalesCode — ${respondent}`);
    out.push("");
    out.push(`- **Respondent:** ${respondent}`);
    if (input.respondentEmail && input.respondentName?.trim()) {
      out.push(`- **Email:** ${input.respondentEmail}`);
    }
    out.push(`- **Sent by:** ${owner}`);
    out.push(`- **Completed:** ${formatDate(input.completedAt)}`);
    out.push(`- **Type:** ${input.result.type}`);
    out.push("");
  }

  // Archetype profile
  if (profile) {
    out.push(`## ${profile.name}`);
    if (variant === "owner" && profile.tagline) {
      out.push("");
      out.push(`_${profile.tagline}_`);
    }
    out.push("");

    for (const p of profile.intro) {
      out.push(p);
      out.push("");
    }

    if (profile.pullQuote) {
      out.push(`> ${profile.pullQuote}`);
      out.push("");
    }

    if (profile.peopleLikeYou.length) {
      out.push("### People like you");
      out.push("");
      out.push(profile.peopleLikeYou.map((p) => `- ${p}`).join("\n"));
      out.push("");
    }

    if (profile.strengths.length) {
      out.push("### Strengths");
      out.push("");
      for (const s of profile.strengths) {
        out.push(`- **${s.lead}**${s.body ? ` — ${s.body}` : ""}`);
      }
      out.push("");
    }

    if (profile.weaknesses.length) {
      out.push("### Weaknesses");
      out.push("");
      for (const w of profile.weaknesses) {
        out.push(`- **${w.lead}**${w.body ? ` — ${w.body}` : ""}`);
      }
      out.push("");
    }

    if (profile.businessAndSales.length) {
      out.push("### Business & sales");
      out.push("");
      for (const p of profile.businessAndSales) {
        out.push(p);
        out.push("");
      }
    }

    if (profile.closingQuote) {
      out.push(`> ${profile.closingQuote}`);
      out.push("");
    }
  } else {
    out.push(
      "_Archetype profile not available for this type — trait breakdown below._",
    );
    out.push("");
  }

  // Traits grouped by area
  const grouped: Record<TraitArea, TraitOutcome[]> = {
    "sales-skills": [],
    "inner-game": [],
    "habits-and-drive": [],
  };
  for (const t of input.result.traits) grouped[TRAIT_AREA_OF[t.key]].push(t);

  for (const area of Object.keys(grouped) as TraitArea[]) {
    const items = grouped[area];
    if (!items.length) continue;
    out.push(`## ${TRAIT_AREA_LABELS[area]}`);
    out.push("");
    for (const t of items) {
      const meta = traitCopy[t.key];
      const isStrength = t.kind === "strength";
      const marker = isStrength ? "✓" : "○";
      const body = isStrength ? meta.strengthLine : meta.growthLine;
      out.push(`- ${marker} **${meta.name}** — ${t.label}`);
      if (body) out.push(`  - ${body}`);
    }
    out.push("");
  }

  return out.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}
