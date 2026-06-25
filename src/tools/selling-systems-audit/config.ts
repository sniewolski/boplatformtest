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

// Industry is owner-typed free text (string | null) — no enum, no benchmarks.

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
const section = <K extends string>(
  s: { key: K; label: string; status: "available" | "locked" },
) => s;

export const AUDIT_SECTIONS = [
  section({
    key: "conversion",
    label: "Sales Conversion Rates Review",
    status: "available",
  }),
  section({
    key: "pipeline",
    label: "Pipeline Health",
    status: "available",
  }),
  section({
    key: "process",
    label: "Sales Process",
    status: "available",
  }),
  section({
    key: "activity",
    label: "Sales Activity Metrics",
    status: "available",
  }),
  section({
    key: "messaging",
    label: "Messaging & Positioning",
    status: "available",
  }),
  section({
    key: "alignment",
    label: "Marketing & Sales Alignment",
    status: "available",
  }),
  section({
    key: "content",
    label: "Sales Content Review",
    status: "available",
  }),
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
  { key: "targets", label: "Targets & trend", short: "Targets" },
  { key: "review", label: "Review & submit", short: "Review" },
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

// ═══════════════════════════════════════════════════════════════════════
// Sales Process (Section 3) — stepped intake, owner answers only.
// Same shape rules as Conversion + Pipeline: jsonb blob keyed by config
// keys; reword labels here without touching components or migrations.
// ═══════════════════════════════════════════════════════════════════════

export const PROCESS_STEPS = [
  { key: "definition", label: "Process definition",    short: "Definition" },
  { key: "stages",     label: "Stages",                short: "Stages" },
  { key: "adherence",  label: "Adherence & quality",   short: "Adherence" },
  { key: "tools",      label: "Tools & enablement",    short: "Tools" },
  { key: "review",     label: "Review & submit",       short: "Review" },
] as const;
export type ProcessStepKey = (typeof PROCESS_STEPS)[number]["key"];

// Maturity order — render in this order in MaturitySpectrum.
export const DOCUMENTATION_LEVELS = [
  { key: "none",       label: "Not documented" },
  { key: "informal",   label: "Informal / in my head" },
  { key: "partial",    label: "Partially documented" },
  { key: "documented", label: "Fully documented" },
] as const;
export type DocumentationLevelKey = (typeof DOCUMENTATION_LEVELS)[number]["key"];

export const PROCESS_CONSISTENCY = [
  { key: "low",    label: "Varies a lot" },
  { key: "medium", label: "Mostly consistent" },
  { key: "high",   label: "Highly consistent" },
] as const;
export type ProcessConsistencyKey = (typeof PROCESS_CONSISTENCY)[number]["key"];

export const REPLICABILITY = [
  { key: "no",      label: "No" },
  { key: "partial", label: "Partially" },
  { key: "yes",     label: "Yes" },
] as const;
export type ReplicabilityKey = (typeof REPLICABILITY)[number]["key"];

export const ADHERENCE = [
  { key: "low",    label: "Low" },
  { key: "medium", label: "Medium" },
  { key: "high",   label: "High" },
] as const;
export type AdherenceKey = (typeof ADHERENCE)[number]["key"];

export const QUALITY_ASSESSMENT = [
  { key: "none",     label: "Don't assess" },
  { key: "adhoc",    label: "Ad hoc" },
  { key: "regular",  label: "Regular review" },
  { key: "scored",   label: "Scored / rubric-based" },
] as const;
export type QualityAssessmentKey = (typeof QUALITY_ASSESSMENT)[number]["key"];

export const SCRIPT_MOMENTS = [
  { key: "openings",     label: "Openings" },
  { key: "discovery",    label: "Discovery questions" },
  { key: "objections",   label: "Objection handling" },
  { key: "pricing",      label: "Pricing conversations" },
  { key: "closing",      label: "Closing" },
  { key: "followups",    label: "Follow-ups" },
  { key: "other",        label: "Other" },
] as const;
export type ScriptMomentKey = (typeof SCRIPT_MOMENTS)[number]["key"];

export const EXPERIENCE_CONSISTENCY = [
  { key: "low",    label: "Varies a lot" },
  { key: "medium", label: "Mostly consistent" },
  { key: "high",   label: "Highly consistent" },
] as const;
export type ExperienceConsistencyKey = (typeof EXPERIENCE_CONSISTENCY)[number]["key"];

export const CRM_OPTIONS = [
  { key: "none",       label: "None" },
  { key: "spreadsheet",label: "Spreadsheet" },
  { key: "hubspot",    label: "HubSpot" },
  { key: "pipedrive",  label: "Pipedrive" },
  { key: "salesforce", label: "Salesforce" },
  { key: "zoho",       label: "Zoho" },
  { key: "monday",     label: "Monday" },
  { key: "other",      label: "Other" },
] as const;
export type CrmKey = (typeof CRM_OPTIONS)[number]["key"];

export const UPDATE_FREQUENCY = [
  { key: "rarely",     label: "Rarely" },
  { key: "weekly",     label: "Weekly" },
  { key: "daily",      label: "Daily" },
  { key: "realtime",   label: "After every interaction" },
] as const;
export type UpdateFrequencyKey = (typeof UPDATE_FREQUENCY)[number]["key"];

export const DOC_TEMPLATES = [
  { key: "proposals",   label: "Proposal templates" },
  { key: "emails",      label: "Email templates" },
  { key: "scripts",     label: "Call scripts" },
  { key: "discovery",   label: "Discovery guides" },
  { key: "objections",  label: "Objection responses" },
  { key: "case_studies",label: "Case studies" },
  { key: "other",       label: "Other" },
] as const;
export type DocTemplateKey = (typeof DOC_TEMPLATES)[number]["key"];

export const ENABLEMENT = [
  { key: "onboarding",  label: "Onboarding programme" },
  { key: "training",    label: "Ongoing training" },
  { key: "coaching",    label: "1:1 coaching" },
  { key: "roleplay",    label: "Role-play / practice" },
  { key: "playbooks",   label: "Playbooks" },
  { key: "none",        label: "None" },
  { key: "other",       label: "Other" },
] as const;
export type EnablementKey = (typeof ENABLEMENT)[number]["key"];

/** One row of the owner's pipeline stage definition (Step 2). */
export type SalesStage = {
  id: string;
  name: string;
  purpose?: string;
  exitCriteria?: string;
};

// ═══════════════════════════════════════════════════════════════════════
// Sales Activity Metrics (Section 4) — stepped intake, owner answers only.
// Same shape rules as prior sections: jsonb blob keyed by config keys;
// reword labels here without touching components or migrations.
// ═══════════════════════════════════════════════════════════════════════

export const ACTIVITY_STEPS = [
  { key: "tracking",   label: "What you track",        short: "Tracking" },
  { key: "volume",     label: "Activity volume",       short: "Volume" },
  { key: "quality",    label: "Quality & confidence",  short: "Quality" },
  { key: "review",     label: "Review & submit",       short: "Review" },
] as const;
export type ActivityStepKey = (typeof ACTIVITY_STEPS)[number]["key"];

export const ACTIVITY_METRICS = [
  { key: "calls",         label: "Calls made" },
  { key: "emails",        label: "Emails sent" },
  { key: "meetings",      label: "Meetings booked" },
  { key: "meetings_held", label: "Meetings held" },
  { key: "proposals",     label: "Proposals sent" },
  { key: "demos",         label: "Demos delivered" },
  { key: "follow_ups",    label: "Follow-ups completed" },
  { key: "new_leads",     label: "New leads added" },
  { key: "none",          label: "Nothing tracked" },
] as const;
export type ActivityMetricKey = (typeof ACTIVITY_METRICS)[number]["key"];

export const TRACKING_METHOD = [
  { key: "nothing",     label: "Not tracked" },
  { key: "memory",      label: "From memory" },
  { key: "spreadsheet", label: "Spreadsheet" },
  { key: "crm_manual",  label: "CRM (manual)" },
  { key: "crm_auto",    label: "CRM (automatic)" },
] as const;
export type TrackingMethodKey = (typeof TRACKING_METHOD)[number]["key"];

export const CALLS_BAND = [
  { key: "0",       label: "0" },
  { key: "1_10",    label: "1–10" },
  { key: "11_25",   label: "11–25" },
  { key: "26_50",   label: "26–50" },
  { key: "gt50",    label: "50+" },
] as const;
export type CallsBandKey = (typeof CALLS_BAND)[number]["key"];

export const EMAILS_BAND = [
  { key: "0",        label: "0" },
  { key: "1_20",     label: "1–20" },
  { key: "21_50",    label: "21–50" },
  { key: "51_100",   label: "51–100" },
  { key: "gt100",    label: "100+" },
] as const;
export type EmailsBandKey = (typeof EMAILS_BAND)[number]["key"];

export const MEETINGS_BAND = [
  { key: "0",     label: "0" },
  { key: "1_2",   label: "1–2" },
  { key: "3_5",   label: "3–5" },
  { key: "6_10",  label: "6–10" },
  { key: "gt10",  label: "10+" },
] as const;
export type MeetingsBandKey = (typeof MEETINGS_BAND)[number]["key"];

export const ACTIVITY_TREND = [
  { key: "grown",  label: "Grown" },
  { key: "flat",   label: "Flat" },
  { key: "shrunk", label: "Shrunk" },
] as const;
export type ActivityTrendKey = (typeof ACTIVITY_TREND)[number]["key"];

export const ACTIVITY_CONFIDENCE = [
  { key: "low",    label: "Low" },
  { key: "medium", label: "Medium" },
  { key: "high",   label: "High" },
] as const;
export type ActivityConfidenceKey = (typeof ACTIVITY_CONFIDENCE)[number]["key"];

export const ACTIVITY_CONSISTENCY = [
  { key: "low",    label: "Varies a lot" },
  { key: "medium", label: "Mostly consistent" },
  { key: "high",   label: "Highly consistent" },
] as const;
export type ActivityConsistencyKey = (typeof ACTIVITY_CONSISTENCY)[number]["key"];

export const STRONGEST_METRIC = [
  { key: "calls",     label: "Calls" },
  { key: "emails",    label: "Emails" },
  { key: "meetings",  label: "Meetings booked" },
  { key: "proposals", label: "Proposals" },
  { key: "follow_ups",label: "Follow-ups" },
  { key: "none",      label: "None stand out" },
  { key: "other",     label: "Other" },
] as const;
export type StrongestMetricKey = (typeof STRONGEST_METRIC)[number]["key"];

export const GOALS_SET = [
  { key: "no",      label: "No" },
  { key: "informal",label: "Informal" },
  { key: "yes",     label: "Yes" },
] as const;
export type GoalsSetKey = (typeof GOALS_SET)[number]["key"];

export const DATA_TRUST = [
  { key: "none",     label: "Don't trust it" },
  { key: "some",     label: "Trust some" },
  { key: "most",     label: "Trust most" },
  { key: "all",      label: "Trust it fully" },
] as const;
export type DataTrustKey = (typeof DATA_TRUST)[number]["key"];

// ---------------------------------------------------------------------------
// Messaging & Positioning
// ---------------------------------------------------------------------------

export const MESSAGING_STEPS = [
  { key: "icp",         label: "Ideal customer clarity", short: "ICP" },
  { key: "problem",     label: "Problem & pain clarity", short: "Problem" },
  { key: "value",       label: "Value proposition",      short: "Value" },
  { key: "proof",       label: "Proof & credibility",    short: "Proof" },
  { key: "consistency", label: "Message consistency",    short: "Consistency" },
  { key: "review",      label: "Review & submit",        short: "Review" },
] as const;
export type MessagingStepKey = (typeof MESSAGING_STEPS)[number]["key"];

export const ICP_WRITTEN = [
  { key: "none",       label: "Nothing written" },
  { key: "inHead",     label: "Held loosely in my head" },
  { key: "notes",      label: "Some written notes" },
  { key: "documented", label: "Documented ICP / persona" },
] as const;
export type IcpWrittenKey = (typeof ICP_WRITTEN)[number]["key"];

export const ICP_BASIS = [
  { key: "data",       label: "From data on best clients" },
  { key: "mix",        label: "Mix of data and assumption" },
  { key: "assumption", label: "Mostly an assumption" },
] as const;
export type IcpBasisKey = (typeof ICP_BASIS)[number]["key"];

export const YES_SOMEWHAT_NO = [
  { key: "yes",      label: "Yes" },
  { key: "somewhat", label: "Somewhat" },
  { key: "no",       label: "No" },
] as const;
export type YesSomewhatNoKey = (typeof YES_SOMEWHAT_NO)[number]["key"];

export const RECOGNITION = [
  { key: "immediately", label: "Yes, immediately" },
  { key: "sometimes",   label: "Sometimes" },
  { key: "rarely",      label: "Rarely" },
] as const;
export type RecognitionKey = (typeof RECOGNITION)[number]["key"];

export const MESSAGE_LEVEL = [
  { key: "symptom", label: "The surface symptom they feel" },
  { key: "both",    label: "Both" },
  { key: "root",    label: "The deeper root cause" },
] as const;
export type MessageLevelKey = (typeof MESSAGE_LEVEL)[number]["key"];

export const CAN_TELL = [
  { key: "yes",      label: "Yes, clearly" },
  { key: "somewhat", label: "Somewhat" },
  { key: "no",       label: "Not really" },
] as const;
export type CanTellKey = (typeof CAN_TELL)[number]["key"];

export const COMPETE_BASIS = [
  { key: "price",     label: "Mostly on price" },
  { key: "mixed",     label: "A mix" },
  { key: "advantage", label: "A clear unique advantage" },
] as const;
export type CompeteBasisKey = (typeof COMPETE_BASIS)[number]["key"];

export const EVIDENCE_TYPES = [
  { key: "caseStudies",  label: "Case studies" },
  { key: "testimonials", label: "Testimonials" },
  { key: "data",         label: "Data / metrics" },
  { key: "results",      label: "Documented client results" },
  { key: "other",        label: "Other" },
] as const;
export type EvidenceKey = (typeof EVIDENCE_TYPES)[number]["key"];

export const PROOF_SPECIFICITY = [
  { key: "specific", label: "Specific & outcome-focused" },
  { key: "mixed",    label: "A mix" },
  { key: "vague",    label: "General & vague" },
] as const;
export type ProofSpecificityKey = (typeof PROOF_SPECIFICITY)[number]["key"];

export const PROOF_TARGETING = [
  { key: "targeted", label: "Targeted to their situation" },
  { key: "somewhat", label: "Somewhat" },
  { key: "generic",  label: "Generic" },
] as const;
export type ProofTargetingKey = (typeof PROOF_TARGETING)[number]["key"];

export const CONSISTENCY_LEVELS = [
  { key: "consistent", label: "Consistent everywhere" },
  { key: "mostly",     label: "Mostly consistent" },
  { key: "varies",     label: "Varies across channels" },
] as const;
export type ConsistencyKey = (typeof CONSISTENCY_LEVELS)[number]["key"];

export const MATCH_LEVELS = [
  { key: "matches", label: "Yes, closely" },
  { key: "roughly", label: "Roughly" },
  { key: "differs", label: "Often differs" },
] as const;
export type MatchKey = (typeof MATCH_LEVELS)[number]["key"];

/* ============================================================
 * Marketing & Sales Alignment
 * ============================================================ */

export const ALIGNMENT_STEPS = [
  { key: "leadQuality",  label: "Lead quality & handoff",     short: "Lead quality" },
  { key: "consistency",  label: "Message consistency",        short: "Consistency" },
  { key: "feedback",     label: "Feedback loops",             short: "Feedback" },
  { key: "enablement",   label: "Content & enablement",       short: "Enablement" },
  { key: "attribution",  label: "Attribution & measurement",  short: "Attribution" },
  { key: "review",       label: "Review & submit",            short: "Review" },
] as const;

export const ICP_ALIGNMENT = [
  { key: "aligned",   label: "Tightly aligned" },
  { key: "drift",     label: "Some drift" },
  { key: "different", label: "Significantly different" },
] as const;
export type IcpAlignmentKey = (typeof ICP_ALIGNMENT)[number]["key"];

export const LEAD_MATCH = [
  { key: "nearlyAll", label: "Nearly all" },
  { key: "most",      label: "Most" },
  { key: "half",      label: "About half" },
  { key: "few",       label: "Few" },
] as const;
export type LeadMatchKey = (typeof LEAD_MATCH)[number]["key"];

export const EXPECTATION_GAP = [
  { key: "yes",     label: "Yes, it's happened" },
  { key: "no",      label: "No" },
  { key: "notSure", label: "Not sure" },
] as const;
export type ExpectationGapKey = (typeof EXPECTATION_GAP)[number]["key"];

export const PAIN_MATCH = [
  { key: "same",      label: "Yes, the same" },
  { key: "roughly",   label: "Roughly" },
  { key: "different", label: "No, different" },
] as const;
export type PainMatchKey = (typeof PAIN_MATCH)[number]["key"];

export const INSIGHT_FLOWBACK = [
  { key: "never",      label: "Never" },
  { key: "adhoc",      label: "Ad hoc" },
  { key: "sometimes",  label: "Sometimes" },
  { key: "systematic", label: "Systematically" },
] as const;
export type InsightFlowbackKey = (typeof INSIGHT_FLOWBACK)[number]["key"];

export const ALIGN_CADENCE = [
  { key: "never",     label: "Never" },
  { key: "adhoc",     label: "Ad hoc" },
  { key: "quarterly", label: "Quarterly" },
  { key: "monthly",   label: "Monthly" },
  { key: "weekly",    label: "Weekly+" },
] as const;
export type AlignCadenceKey = (typeof ALIGN_CADENCE)[number]["key"];

export const FUNNEL_STAGES = [
  { key: "awareness",     label: "Awareness" },
  { key: "consideration", label: "Consideration" },
  { key: "decision",      label: "Decision" },
] as const;
export type FunnelStageKey = (typeof FUNNEL_STAGES)[number]["key"];

export const OBJECTION_CONTENT = [
  { key: "ready", label: "Yes, ready" },
  { key: "some",  label: "Some" },
  { key: "no",    label: "No" },
] as const;
export type ObjectionContentKey = (typeof OBJECTION_CONTENT)[number]["key"];

export const DEAL_TRACING = [
  { key: "cant",      label: "Can't trace it" },
  { key: "sometimes", label: "Sometimes" },
  { key: "usually",   label: "Usually" },
  { key: "always",    label: "Always & consistently" },
] as const;
export type DealTracingKey = (typeof DEAL_TRACING)[number]["key"];

export const CPA_MEASUREMENT = [
  { key: "drivesBudget",   label: "Measured & drives budget" },
  { key: "measuredUnused", label: "Measured, not used" },
  { key: "notMeasured",    label: "Not measured" },
] as const;
export type CpaKey = (typeof CPA_MEASUREMENT)[number]["key"];

export const SHARED_GOALS = [
  { key: "shared",   label: "Shared revenue goals" },
  { key: "partly",   label: "Partly connected" },
  { key: "separate", label: "Separate & disconnected" },
] as const;
export type SharedGoalsKey = (typeof SHARED_GOALS)[number]["key"];





