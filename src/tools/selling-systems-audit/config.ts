/**
 * Editable data spine for the Selling Systems Audit tool.
 * Every number/label/lesson the UI shows lives here.
 * No magic numbers in components. No content edits require touching code.
 *
 * Currency is NOT defined here. It's an owner-level platform setting consumed
 * via `useCurrency()` and rendered via `@/lib/format-currency`.
 */

export const STAGES = [
  { key: "leads", label: "Leads" },
  { key: "qualified", label: "Qualified" },
  { key: "opportunities", label: "Opportunities" },
  { key: "won", label: "Closed Won" },
] as const;

export type StageKey = (typeof STAGES)[number]["key"];

export const INDUSTRIES = [
  { key: "trades", label: "Trades (plumber, electrician, builder)" },
  { key: "home_services", label: "Home services (cleaning, landscaping, HVAC)" },
  { key: "clinic_practice", label: "Clinic / practice (dental, aesthetics, physio)" },
  { key: "agency", label: "Agency (marketing, creative, digital)" },
  { key: "consultant_coach", label: "Consultant / coach" },
  { key: "financial_services", label: "Financial services" },
  { key: "lifestyle", label: "Lifestyle" },
  { key: "health_fitness", label: "Health & fitness" },
  { key: "business_services", label: "Business services" },
  { key: "other", label: "Other service business" },
] as const;

export type IndustryKey = (typeof INDUSTRIES)[number]["key"];

/**
 * PLACEHOLDER targets — [Lead→Qualified, Qualified→Opportunity, Opportunity→Won]
 * as decimals. Replace with researched figures later. Do not present as authoritative.
 */
export const KPI_TARGETS: Record<IndustryKey, [number, number, number]> = {
  trades: [0.6, 0.55, 0.5],
  home_services: [0.55, 0.5, 0.45],
  clinic_practice: [0.5, 0.45, 0.4],
  agency: [0.4, 0.35, 0.3],
  consultant_coach: [0.45, 0.4, 0.35],
  financial_services: [0.35, 0.3, 0.28],
  lifestyle: [0.45, 0.4, 0.35],
  health_fitness: [0.45, 0.5, 0.45],
  business_services: [0.45, 0.4, 0.35],
  other: [0.45, 0.4, 0.35],
};

export const PERIODS = [
  { key: "month", label: "per month", annualMultiplier: 12 },
  { key: "quarter", label: "per quarter", annualMultiplier: 4 },
  { key: "year", label: "per year", annualMultiplier: 1 },
] as const;

export type PeriodKey = (typeof PERIODS)[number]["key"];

export type LessonKey =
  | "leads->qualified"
  | "qualified->opportunities"
  | "opportunities->won";

export type Lesson = {
  title: string;
  summary: string;
  videoUrl: string;
  pdfUrl: string;
};

export const LESSONS: Record<LessonKey, Lesson> = {
  "leads->qualified": {
    title: "Improving lead quality & qualification",
    summary: "",
    videoUrl: "",
    pdfUrl: "",
  },
  "qualified->opportunities": {
    title: "Turning qualified leads into real opportunities",
    summary: "",
    videoUrl: "",
    pdfUrl: "",
  },
  "opportunities->won": {
    title: "Closing more of your opportunities",
    summary: "",
    videoUrl: "",
    pdfUrl: "",
  },
};

/** Sections of the audit. Only "conversion" is built; the others are visible-but-locked. */
export const AUDIT_SECTIONS = [
  {
    key: "conversion",
    label: "Sales Conversion Rates Review",
    description:
      "Where your funnel leaks, ranked by money lost, against the standard high performers hit.",
    status: "available" as const,
  },
  {
    key: "content",
    label: "Sales Content Review",
    description: "Audit of the messages, scripts and assets your sales motion runs on.",
    status: "available" as const,
  },
  {
    key: "infrastructure",
    label: "Sales Infrastructure Review",
    description: "The systems and tools your team uses to move deals from first touch to won.",
    status: "locked" as const,
  },
  {
    key: "marketing",
    label: "Marketing Review",
    description: "How leads reach you in the first place, and what that costs.",
    status: "locked" as const,
  },
] as const;

export type AuditSectionKey = (typeof AUDIT_SECTIONS)[number]["key"];

/**
 * Conversion intake is a stepped flow: Foundation → five selling-stage steps
 * → Summary. Each step has its own answers blob under `draft_answers[key]`.
 * Pass B scaffolds the shell; Pass C fills the per-step question UIs.
 */
export const INTAKE_STEPS = [
  { key: "foundation", label: "Foundation", short: "Foundation" },
  { key: "leadGeneration", label: "Lead Generation", short: "Leads" },
  { key: "prospecting", label: "Prospecting", short: "Prospecting" },
  { key: "discovery", label: "Discovery", short: "Discovery" },
  { key: "proposal", label: "Proposal", short: "Proposal" },
  { key: "closing", label: "Closing", short: "Closing" },
  { key: "summary", label: "Review & submit", short: "Submit" },
] as const;

export type IntakeStepKey = (typeof INTAKE_STEPS)[number]["key"];
