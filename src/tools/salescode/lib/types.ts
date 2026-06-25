/**
 * SalesCode types. Kept tiny on purpose — the assessment is a flat bag of
 * id-keyed Likert answers, scored deterministically into a 4-letter type
 * plus a categorical trait profile.
 */

export type Likert = 1 | 2 | 3 | 4 | 5;

/** Answers are keyed by question ID (the legacy non-contiguous IDs are preserved). */
export type AnswerMap = Record<number, Likert>;

export type Question = {
  /** Stable, non-contiguous ID from the legacy bank. Scoring keys off this. */
  id: number;
  /** Verbatim question text shown to the respondent. */
  text: string;
  /**
   * Internal category — used for admin/debug only. Never shown to the
   * respondent (per the locked content spec: fixed order, no category labels).
   */
  category: QuestionCategory;
};

export type QuestionCategory =
  | "type-axes"
  | "emotional-intelligence"
  | "optimism"
  | "self-esteem"
  | "assertiveness"
  | "growth-mindset"
  | "people-pleaser"
  | "comfortable-with-money"
  | "personal-accountability"
  | "goal-setting"
  | "objection-handling"
  | "influence"
  | "industry-expert"
  | "storytelling"
  | "negotiations"
  | "productivity"
  | "simplification"
  | "identifying-key-accounts"
  | "caveman-brain"
  | "habits";

/** Four-letter SalesCode type. */
export type SalesCodeType = string; // e.g. "ESTJ", "INFP" — always 4 chars from {I,E,S,N,T,F,J,P}

export type AxisLetter = "I" | "E" | "S" | "N" | "T" | "F" | "J" | "P";

export type TraitKey =
  | "introvert-extrovert"
  | "assertiveness"
  | "comfortable-with-money"
  | "emotional-intelligence"
  | "self-esteem"
  | "optimism"
  | "people-pleaser"
  | "personal-accountability"
  | "goal-setting"
  | "objection-handling"
  | "influence"
  | "industry-expert"
  | "storytelling"
  | "negotiations"
  | "productivity"
  | "simplification"
  | "identifying-key-accounts"
  | "caveman-brain"
  | "habits";

/** Outcome label per trait. Every trait is a binary strength/development outcome. */
export type TraitOutcome = {
  key: TraitKey;
  /** Display label for the outcome (e.g. "Assertive", "Not assertive", "Extrovert"). */
  label: string;
  /** Whether this outcome is a strength or a development area. */
  kind: "strength" | "development";
  /** Raw numeric value, kept for admin traceability. */
  raw: number;
};

export type SalesCodeResult = {
  type: SalesCodeType;
  axes: { I_E: number; S_N: number; F_T: number; J_P: number };
  traits: TraitOutcome[];
};

/** Per-type archetype profile content. Populated in Phase 2. */
export type TypeProfile = {
  code: SalesCodeType;
  name: string;
  tagline: string;
  intro: string[];
  pullQuote: string;
  peopleLikeYou: string[];
  strengths: { lead: string; body: string }[];
  weaknesses: { lead: string; body: string }[];
  businessAndSales: string[];
  closingQuote: string;
};

/** Per-trait copy. Strength and growth lines are the declarative outcome labels. */
export type TraitCopyEntry = {
  key: TraitKey;
  name: string;
  whatItMeans: string;
  whyItMatters: string;
  strengthLine: string;
  growthLine: string;
};
