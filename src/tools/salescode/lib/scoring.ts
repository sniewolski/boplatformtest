/**
 * SalesCode scoring — pure, deterministic, ID-keyed.
 *
 * Source of truth: salescode-content-and-scoring.md §4. All formulas here
 * match the spec verbatim, with the locked bug-fixes:
 *
 *   - Q6 = A[6] on the F_T axis (legacy double-counted Q8).
 *   - Four-item traits: corrected polarity so x > 0 ⇒ strength.
 *   - Percentage rollups dropped; categorical outcomes only.
 *
 * The two I/E formulas are intentional, not a bug: the type axis (I_E) and
 * the standalone introvert/extrovert *trait* use different signed forms
 * from the source.
 */

import type {
  AnswerMap,
  AxisLetter,
  Likert,
  SalesCodeResult,
  TraitKey,
  TraitOutcome,
} from "./types";
import { QUESTIONS_BY_ID } from "./questions";

/* ─────────────────────────────────────────────────────────────────────────
 * Helpers
 * ────────────────────────────────────────────────────────────────────── */

/** Coerce a missing answer to neutral (3). Useful for partial-save scoring previews. */
function a(answers: AnswerMap, id: number): number {
  const v = answers[id];
  return v == null ? 3 : v;
}

/** x = Qa − Qb + Qc − Qd. Corrected polarity: x > 0 ⇒ strength. */
function fourItem(answers: AnswerMap, qa: number, qb: number, qc: number, qd: number): number {
  return a(answers, qa) - a(answers, qb) + a(answers, qc) - a(answers, qd);
}

/* ─────────────────────────────────────────────────────────────────────────
 * 4a. SalesCode type (four letters)
 *
 *   I_E = 30 − Q3 − Q7 − Q11 + Q15 − Q19 + Q23 + Q27 − Q31   → E if > 24 else I
 *   S_N = 12 + Q4 + Q8 + Q12 + Q16 + Q20 − Q24 − Q28 + Q32    → N if > 24 else S
 *   F_T = 30 − Q2 + Q6 + Q10 − Q14 − Q18 + Q22 − Q26 − Q30    → T if > 24 else F  (Q6 fix)
 *   J_P = 18 + Q1 + Q5 − Q9 + Q13 − Q17 + Q21 − Q25 + Q29     → P if > 24 else J
 * ────────────────────────────────────────────────────────────────────── */

const AXIS_THRESHOLD = 24;

export function computeAxes(answers: AnswerMap) {
  const I_E =
    30 - a(answers, 3) - a(answers, 7) - a(answers, 11) + a(answers, 15)
       - a(answers, 19) + a(answers, 23) + a(answers, 27) - a(answers, 31);

  const S_N =
    12 + a(answers, 4) + a(answers, 8) + a(answers, 12) + a(answers, 16)
       + a(answers, 20) - a(answers, 24) - a(answers, 28) + a(answers, 32);

  const F_T =
    30 - a(answers, 2) + a(answers, 6) + a(answers, 10) - a(answers, 14)
       - a(answers, 18) + a(answers, 22) - a(answers, 26) - a(answers, 30);

  const J_P =
    18 + a(answers, 1) + a(answers, 5) - a(answers, 9) + a(answers, 13)
       - a(answers, 17) + a(answers, 21) - a(answers, 25) + a(answers, 29);

  return { I_E, S_N, F_T, J_P };
}

export function computeType(answers: AnswerMap): { type: string; letters: AxisLetter[] } {
  const { I_E, S_N, F_T, J_P } = computeAxes(answers);
  const letters: AxisLetter[] = [
    I_E > AXIS_THRESHOLD ? "E" : "I",
    S_N > AXIS_THRESHOLD ? "N" : "S",
    F_T > AXIS_THRESHOLD ? "T" : "F",
    J_P > AXIS_THRESHOLD ? "P" : "J",
  ];
  return { type: letters.join(""), letters };
}

/* ─────────────────────────────────────────────────────────────────────────
 * 4b. Trait profile
 * ────────────────────────────────────────────────────────────────────── */

/** Threshold-trait spec. raw = numerator/denominator; outcome is `raw > threshold`. */
type ThresholdSpec = {
  key: TraitKey;
  /** Constant offset added to the signed sum. */
  offset: number;
  /** Map of question ID → sign (+1 or −1). */
  weights: ReadonlyArray<readonly [number, 1 | -1]>;
  divisor: number;
  threshold: number;
  /** Label when raw is on the "above-threshold" side. */
  aboveLabel: string;
  /** Label when raw is on the "below-threshold" side. */
  belowLabel: string;
  /**
   * Which side is the strength. "above" means raw > threshold ⇒ strength.
   * "below" handles the people-pleaser case (raw < threshold ⇒ strength).
   * "neutral" is used for introvert/extrovert style (no S/D semantics).
   */
  strengthSide: "above" | "below" | "neutral";
  /**
   * Comparator. Most traits use `>`; goal-setting and personal accountability
   * use `≥`; people-pleaser uses `<`.
   */
  compare?: ">" | ">=" | "<";
};

const THRESHOLD_TRAITS: ReadonlyArray<ThresholdSpec> = [
  // Introvert / Extrovert — neutral style trait (separate from the type's I/E axis).
  {
    key: "introvert-extrovert",
    offset: 38,
    weights: [
      [3, -1], [7, 1], [11, -1], [15, 1],
      [19, -1], [23, 1], [27, -1], [31, -1],
    ],
    divisor: 8,
    threshold: 3,
    aboveLabel: "Extrovert",
    belowLabel: "Introvert",
    strengthSide: "neutral",
  },
  // Assertiveness
  {
    key: "assertiveness",
    offset: 25,
    weights: [
      [81, 1], [82, 1], [83, 1], [84, 1], [85, 1], [86, 1],
      [87, -1], [88, -1], [89, -1], [90, -1], [91, -1], [92, -1],
    ],
    divisor: 12,
    threshold: 3,
    aboveLabel: "Assertive",
    belowLabel: "Not assertive",
    strengthSide: "above",
  },
  // Comfortable with money
  {
    key: "comfortable-with-money",
    offset: 13,
    weights: [
      [115, 1], [116, 1], [117, 1],
      [118, -1], [119, -1], [120, -1],
    ],
    divisor: 6,
    threshold: 2,
    aboveLabel: "Comfortable with money",
    belowLabel: "Not comfortable with money",
    strengthSide: "above",
  },
  // Emotional intelligence — full signed form expanded from §4b:
  //   (58 − Q41 − Q42 − Q43 − Q44 + Q45 − Q46 − Q47 − Q48 − Q49 − Q50 − Q51
  //    + Q52 − Q53 − Q54 + Q55) / 15
  {
    key: "emotional-intelligence",
    offset: 58,
    weights: [
      [41, -1], [42, -1], [43, -1], [44, -1], [45, 1],
      [46, -1], [47, -1], [48, -1], [49, -1], [50, -1], [51, -1],
      [52, 1], [53, -1], [54, -1], [55, 1],
    ],
    divisor: 15,
    threshold: 2,
    aboveLabel: "High emotional intelligence",
    belowLabel: "Low emotional intelligence",
    strengthSide: "above",
  },
  // Self-esteem — full signed form expanded from §4b:
  //   (22 − Q71 + Q72 − Q73 − Q74 + Q75 + Q76 − Q77 + Q78 + Q79 − Q80) / 10
  {
    key: "self-esteem",
    offset: 22,
    weights: [
      [71, -1], [72, 1], [73, -1], [74, -1], [75, 1],
      [76, 1], [77, -1], [78, 1], [79, 1], [80, -1],
    ],
    divisor: 10,
    threshold: 2,
    aboveLabel: "High self-esteem",
    belowLabel: "Low self-esteem",
    strengthSide: "above",
  },
  // Optimism — full signed form expanded from §4b:
  //   (46 + Q56 + Q57 + Q58 − Q59 + Q60 − Q61 − Q62 − Q63 − Q64 − Q65
  //    + Q66 − Q67 − Q68 − Q69 − Q70) / 15
  {
    key: "optimism",
    offset: 46,
    weights: [
      [56, 1], [57, 1], [58, 1], [59, -1], [60, 1],
      [61, -1], [62, -1], [63, -1], [64, -1], [65, -1],
      [66, 1], [67, -1], [68, -1], [69, -1], [70, -1],
    ],
    divisor: 15,
    threshold: 2,
    aboveLabel: "Optimistic",
    belowLabel: "Pessimistic",
    strengthSide: "above",
  },
  // People-pleaser — INVERTED: raw < 4 ⇒ strength ("not a people-pleaser").
  {
    key: "people-pleaser",
    offset: 38,
    weights: [
      [103, 1], [104, -1], [105, 1], [106, 1], [107, 1],
      [108, -1], [109, -1], [110, 1], [111, 1],
      [112, -1], [113, 1], [114, 1],
    ],
    divisor: 12,
    threshold: 4,
    aboveLabel: "People-pleaser",
    belowLabel: "Not a people-pleaser",
    strengthSide: "below",
    compare: "<",
  },
  // Personal accountability — (Q121+Q122+Q123+Q124+Q125) / 5, ≥ 3
  {
    key: "personal-accountability",
    offset: 0,
    weights: [[121, 1], [122, 1], [123, 1], [124, 1], [125, 1]],
    divisor: 5,
    threshold: 3,
    aboveLabel: "Has personal accountability",
    belowLabel: "Lacks personal accountability",
    strengthSide: "above",
    compare: ">=",
  },
  // Goal setting — (Q152 − Q153 + Q154 + Q155 − Q156), ≥ 5
  {
    key: "goal-setting",
    offset: 0,
    weights: [[152, 1], [153, -1], [154, 1], [155, 1], [156, -1]],
    divisor: 1,
    threshold: 5,
    aboveLabel: "Strong goal-setter",
    belowLabel: "Weak goal-setter",
    strengthSide: "above",
    compare: ">=",
  },
];

function evaluateThreshold(spec: ThresholdSpec, answers: AnswerMap): TraitOutcome {
  let sum = spec.offset;
  for (const [id, sign] of spec.weights) sum += sign * a(answers, id);
  const raw = sum / spec.divisor;
  const cmp = spec.compare ?? ">";
  const isAbove = cmp === ">" ? raw > spec.threshold
                : cmp === ">=" ? raw >= spec.threshold
                : raw >= spec.threshold; // for "<" we negate below
  const above = cmp === "<" ? raw >= spec.threshold : isAbove;
  // For "<" compare: strength when raw < threshold (i.e. NOT above).
  const isStrengthSide =
    spec.strengthSide === "neutral" ? false
    : spec.strengthSide === "above" ? above
    : !above;
  const label = above ? spec.aboveLabel : spec.belowLabel;
  const kind: TraitOutcome["kind"] =
    spec.strengthSide === "neutral" ? "neutral"
    : isStrengthSide ? "strength" : "development";
  return { key: spec.key, label, kind, raw };
}

/** Four-item traits — corrected polarity: x > 0 ⇒ strength. */
type FourItemSpec = {
  key: TraitKey;
  items: readonly [number, number, number, number];
  strengthLabel: string;
  developmentLabel: string;
};

const FOUR_ITEM_TRAITS: ReadonlyArray<FourItemSpec> = [
  { key: "objection-handling",       items: [181, 182, 183, 184], strengthLabel: "Strong at objection handling",    developmentLabel: "Needs work on objection handling" },
  { key: "influence",                items: [185, 186, 187, 188], strengthLabel: "Influential",                     developmentLabel: "Needs work on influence" },
  { key: "industry-expert",          items: [189, 190, 191, 192], strengthLabel: "Industry expert",                 developmentLabel: "Not yet an industry expert" },
  { key: "storytelling",             items: [193, 194, 195, 196], strengthLabel: "Strong storyteller",              developmentLabel: "Needs work on storytelling" },
  { key: "negotiations",             items: [197, 198, 199, 200], strengthLabel: "Strong negotiator",               developmentLabel: "Needs work on negotiation" },
  { key: "productivity",             items: [201, 202, 203, 204], strengthLabel: "Productive",                      developmentLabel: "Needs work on productivity" },
  { key: "simplification",           items: [205, 206, 207, 208], strengthLabel: "Strong at simplification",        developmentLabel: "Needs work on simplification" },
  { key: "identifying-key-accounts", items: [209, 210, 211, 212], strengthLabel: "Identifies key accounts well",    developmentLabel: "Needs work on identifying key accounts" },
  { key: "caveman-brain",            items: [213, 214, 215, 216], strengthLabel: "Manages caveman brain well",      developmentLabel: "Needs work on caveman brain" },
  { key: "habits",                   items: [217, 218, 219, 220], strengthLabel: "Strong sales habits",              developmentLabel: "Needs work on sales habits" },
];

function evaluateFourItem(spec: FourItemSpec, answers: AnswerMap): TraitOutcome {
  const raw = fourItem(answers, spec.items[0], spec.items[1], spec.items[2], spec.items[3]);
  const isStrength = raw > 0;
  return {
    key: spec.key,
    label: isStrength ? spec.strengthLabel : spec.developmentLabel,
    kind: isStrength ? "strength" : "development",
    raw,
  };
}

export function computeTraits(answers: AnswerMap): TraitOutcome[] {
  return [
    ...THRESHOLD_TRAITS.map((s) => evaluateThreshold(s, answers)),
    ...FOUR_ITEM_TRAITS.map((s) => evaluateFourItem(s, answers)),
  ];
}

export function scoreSalesCode(answers: AnswerMap): SalesCodeResult {
  const axes = computeAxes(answers);
  const { type } = computeType(answers);
  return { type, axes, traits: computeTraits(answers) };
}

/* ─────────────────────────────────────────────────────────────────────────
 * Self-check: every scored ID resolves to a real question in the bank.
 * Run in dev to catch a bank/scoring drift early.
 * ────────────────────────────────────────────────────────────────────── */
export function verifyScoringReferencesResolve(): { ok: true } | { ok: false; missing: number[] } {
  const referenced = new Set<number>();
  // Type axes
  [3, 7, 11, 15, 19, 23, 27, 31,
   4, 8, 12, 16, 20, 24, 28, 32,
   2, 6, 10, 14, 18, 22, 26, 30,
   1, 5, 9, 13, 17, 21, 25, 29,
  ].forEach((id) => referenced.add(id));
  for (const t of THRESHOLD_TRAITS) for (const [id] of t.weights) referenced.add(id);
  for (const t of FOUR_ITEM_TRAITS) t.items.forEach((id) => referenced.add(id));
  const missing: number[] = [];
  for (const id of referenced) if (!QUESTIONS_BY_ID.has(id)) missing.push(id);
  return missing.length === 0 ? { ok: true } : { ok: false, missing: missing.sort((a, b) => a - b) };
}

// Re-export Likert for convenience to consumers.
export type { Likert };
