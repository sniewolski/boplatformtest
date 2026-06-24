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

/** Sections of the audit. Order is the order shown in the overview. */
export const AUDIT_SECTIONS = [
  {
    key: "conversion",
    label: "Sales Conversion Rates Review",
    description:
      "Where your funnel leaks, ranked by money lost, against the standard high performers hit.",
    status: "available" as const,
  },
  {
    key: "pipeline",
    label: "Pipeline Health",
    description:
      "A structured read on whether your pipeline can hit target — volume, coverage, deal velocity, and how you forecast.",
    status: "available" as const,
  },
  {
    key: "content",
    label: "Sales Content Review",
    description: "Audit of the messages, scripts and assets your sales motion runs on.",
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

// ───────── Intake option lists ─────────
// All editable here; never hardcode in components. Reword/extend freely
// without touching UI code or migrations (answers store raw keys).

export const LEAD_SOURCES = [
  { key: "referrals", label: "Referrals" },
  { key: "outbound", label: "Outbound (cold outreach)" },
  { key: "inbound", label: "Inbound (website / SEO)" },
  { key: "paid_ads", label: "Paid ads" },
  { key: "events", label: "Events" },
  { key: "partnerships", label: "Partnerships" },
  { key: "social", label: "Social media" },
  { key: "repeat", label: "Repeat customers" },
] as const;

export const SOURCE_QUALITY_LEVELS = [
  { key: "low", label: "Low" },
  { key: "mixed", label: "Mixed" },
  { key: "high", label: "High" },
] as const;

export const QUALIFICATION_CRITERIA = [
  { key: "budget", label: "Budget" },
  { key: "authority", label: "Authority (decision-maker)" },
  { key: "need", label: "Need" },
  { key: "timing", label: "Timing" },
  { key: "industry_fit", label: "Industry fit" },
  { key: "company_size", label: "Company size" },
  { key: "geography", label: "Geography" },
] as const;

export const NON_QUALIFY_PATTERNS = [
  { key: "industry", label: "Industry" },
  { key: "company_size", label: "Company size" },
  { key: "source", label: "Lead source" },
  { key: "budget", label: "Budget" },
  { key: "geography", label: "Geography" },
] as const;

export const DISCOVERY_LENGTH_BANDS = [
  { key: "lt_15", label: "Under 15 min" },
  { key: "15_30", label: "15–30 min" },
  { key: "30_60", label: "30–60 min" },
  { key: "gt_60", label: "60+ min" },
] as const;

export const DISCOVERY_STALL_REASONS = [
  { key: "no_pain", label: "No real pain" },
  { key: "no_budget", label: "No budget" },
  { key: "no_authority", label: "No authority" },
  { key: "bad_timing", label: "Bad timing" },
  { key: "lost_competitor", label: "Lost to competitor" },
  { key: "went_silent", label: "Went silent" },
] as const;

export const DISCOVERY_STRUCTURE_LEVELS = [
  { key: "freeform", label: "Freeform" },
  { key: "some_structure", label: "Some structure" },
  { key: "documented", label: "Documented framework" },
] as const;

export const RATING_LEVELS = [
  { key: "low", label: "Low" },
  { key: "medium", label: "Medium" },
  { key: "high", label: "High" },
] as const;

export const CYCLE_LENGTH_UNITS = [
  { key: "days", label: "days" },
  { key: "weeks", label: "weeks" },
  { key: "months", label: "months" },
] as const;

export const TOUCHPOINT_BANDS = [
  { key: "1_2", label: "1–2" },
  { key: "3_5", label: "3–5" },
  { key: "6_10", label: "6–10" },
  { key: "gt_10", label: "10+" },
] as const;

export const CLOSE_TREND_OPTIONS = [
  { key: "improved", label: "Improved" },
  { key: "flat", label: "Flat" },
  { key: "declined", label: "Declined" },
] as const;

// ═══════════════════════════════════════════════════════════════════════
// Pipeline Health (Section 2) — stepped intake, owner answers only.
// Same shape rules as Conversion: jsonb blob keyed by config keys; reword
// labels here without touching components or migrations.
// ═══════════════════════════════════════════════════════════════════════

export const PIPELINE_STEPS = [
  { key: "volume",      label: "Volume & coverage",        short: "Volume" },
  { key: "velocity",    label: "Velocity & stalling",      short: "Velocity" },
  { key: "forecasting", label: "Forecasting & visibility", short: "Forecasting" },
  { key: "summary",     label: "Review & submit",          short: "Review" },
] as const;

export type PipelineStepKey = (typeof PIPELINE_STEPS)[number]["key"];

export const TREND_OPTIONS = [
  { key: "grown",  label: "Grown" },
  { key: "flat",   label: "Flat" },
  { key: "shrunk", label: "Shrunk" },
] as const;
export type TrendKey = (typeof TREND_OPTIONS)[number]["key"];

export const AGE_BANDS = [
  { key: "lt1",    label: "<1 month" },
  { key: "m1to3",  label: "1–3 months" },
  { key: "m3to6",  label: "3–6 months" },
  { key: "m6to12", label: "6–12 months" },
  { key: "gt12",   label: "12 months+" },
] as const;
export type AgeBandKey = (typeof AGE_BANDS)[number]["key"];

export const PROPORTION_BANDS = [
  { key: "none",    label: "None" },
  { key: "few",     label: "A few" },
  { key: "quarter", label: "~25%" },
  { key: "half",    label: "~50%" },
  { key: "most",    label: "Most" },
] as const;
export type ProportionKey = (typeof PROPORTION_BANDS)[number]["key"];

export const STAGES_CANONICAL = [
  { key: "lead",        label: "Lead" },
  { key: "qualified",   label: "Qualified" },
  { key: "discovery",   label: "Discovery" },
  { key: "proposal",    label: "Proposal" },
  { key: "negotiation", label: "Negotiation" },
  { key: "other",       label: "Other" },
] as const;
export type StageCanonicalKey = (typeof STAGES_CANONICAL)[number]["key"];

export const DURATION_BANDS = [
  { key: "lt2w",   label: "<2 weeks" },
  { key: "w2to4",  label: "2–4 weeks" },
  { key: "m1to3",  label: "1–3 months" },
  { key: "gt3m",   label: "3 months+" },
] as const;
export type DurationBandKey = (typeof DURATION_BANDS)[number]["key"];

// Maturity order — render in this order in MaturitySpectrum.
export const FORECAST_METHODS = [
  { key: "none",  label: "Don't forecast" },
  { key: "gut",   label: "Gut feel" },
  { key: "stage", label: "Stage-weighted" },
  { key: "model", label: "Formal model" },
] as const;
export type ForecastMethodKey = (typeof FORECAST_METHODS)[number]["key"];

export const FORECAST_HORIZONS = [
  { key: "cant",    label: "Can't" },
  { key: "d30",     label: "30 days" },
  { key: "d60",     label: "60 days" },
  { key: "d90",     label: "90 days" },
  { key: "d90plus", label: "90 days+" },
] as const;
export type HorizonKey = (typeof FORECAST_HORIZONS)[number]["key"];

export const REVIEW_CADENCES = [
  { key: "never",       label: "Never" },
  { key: "adhoc",       label: "Ad hoc" },
  { key: "monthly",     label: "Monthly" },
  { key: "fortnightly", label: "Fortnightly" },
  { key: "weekly",      label: "Weekly+" },
] as const;
export type CadenceKey = (typeof REVIEW_CADENCES)[number]["key"];

export const TEAM_REVIEW_METHODS = [
  { key: "oneToOne",   label: "1:1 pipeline review" },
  { key: "crm",        label: "CRM walkthrough" },
  { key: "dealByDeal", label: "Deal-by-deal" },
  { key: "numbers",    label: "Numbers check-in" },
  { key: "other",      label: "Other" },
] as const;
export type TeamMethodKey = (typeof TEAM_REVIEW_METHODS)[number]["key"];

export const REVIEW_DATA_POINTS = [
  { key: "stage",        label: "Deal stage" },
  { key: "value",        label: "Deal value" },
  { key: "closeDate",    label: "Expected close date" },
  { key: "daysInStage",  label: "Days in stage" },
  { key: "probability",  label: "Win probability" },
  { key: "nextAction",   label: "Next action" },
  { key: "coverage",     label: "Coverage vs target" },
  { key: "other",        label: "Other" },
] as const;
export type ReviewDataKey = (typeof REVIEW_DATA_POINTS)[number]["key"];

