/**
 * SalesCode scoring — port of the original PHP scoring engine.
 *
 * The arithmetic (offsets, signs, divisors, thresholds) is preserved
 * verbatim from the source engine. Four deliberate deviations from the
 * source exist, all of them label/logic corrections rather than
 * recalibrations:
 *
 *   1. LABEL DIRECTION CORRECTED. The source mapped most results to the
 *      wrong label (an assertive respondent was told "Not assertive").
 *      The four-letter type mappings and six threshold-trait label
 *      assignments are flipped relative to the source. Formulas,
 *      offsets, divisors and thresholds are unchanged.
 *   2. F_T Q6 BUG FIXED. The source had `$Q6 = $A[8]`, so Q6 never
 *      reached the type and Q8 was counted twice. Q6 is now used and
 *      the Q8 duplication removed.
 *   3. FOUR-ITEM BOUNDARY UNIFIED. The source split four-item traits
 *      between "> 0" and ">= 0" comparators. All eight now use one
 *      rule: raw > 0 → strength, raw <= 0 → development. raw = 0 means
 *      the positive and negative items cancel out — no evidence of
 *      strength — so it lands on development.
 *   4. INFLUENCE Q186 SIGN CORRECTED. Q186 ("You're capable in
 *      influencing most people") is positively worded but carried a
 *      negative sign in the source. Its sign is now positive.
 *
 * industry-expert is computed by the source but excluded from the
 * results list (commented out there, 23-06-2023), so it is not
 * emitted here either. Questions 189–192 remain in the bank and are
 * still asked.
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

/** x = Qa − Qb + Qc − Qd. */
function fourItem(answers: AnswerMap, qa: number, qb: number, qc: number, qd: number): number {
  return a(answers, qa) - a(answers, qb) + a(answers, qc) - a(answers, qd);
}

/* ─────────────────────────────────────────────────────────────────────────
 * Four-letter type
 *
 *   I_E = 30 − A3 − A7 − A11 + A15 − A19 + A23 + A27 − A31   → I if > 24 else E
 *   S_N = 12 + A4 + A8 + A12 + A16 + A20 − A24 − A28 + A32   → S if > 24 else N
 *   F_T = 30 − A2 + A6 + A10 − A14 − A18 + A22 − A26 − A30   → F if > 24 else T
 *   J_P = 18 + A1 + A5 − A9 + A13 − A17 + A21 − A25 + A29    → J if > 24 else P
 *
 * F_T uses A6. The source's `$Q6 = $A[8]` was a bug (Q6 never reached
 * the type, Q8 counted twice); Q6 is now used.
 * ────────────────────────────────────────────────────────────────────── */

const AXIS_THRESHOLD = 24;

export function computeAxes(answers: AnswerMap) {
  const I_E =
    30 - a(answers, 3) - a(answers, 7) - a(answers, 11) + a(answers, 15)
       - a(answers, 19) + a(answers, 23) + a(answers, 27) - a(answers, 31);

  const S_N =
    12 + a(answers, 4) + a(answers, 8) + a(answers, 12) + a(answers, 16)
       + a(answers, 20) - a(answers, 24) - a(answers, 28) + a(answers, 32);

  // F_T uses A6: the source's `$Q6 = $A[8]` was a bug; Q6 is now used.
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
    I_E > AXIS_THRESHOLD ? "I" : "E",
    S_N > AXIS_THRESHOLD ? "S" : "N",
    F_T > AXIS_THRESHOLD ? "F" : "T",
    J_P > AXIS_THRESHOLD ? "J" : "P",
  ];
  return { type: letters.join(""), letters };
}

/* ─────────────────────────────────────────────────────────────────────────
 * Trait profile — 18 traits, emitted in the source's order.
 * ────────────────────────────────────────────────────────────────────── */

/** Threshold-trait spec. raw = (offset + signed sum) / divisor. */
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
   * Which side is the strength. "above" means the above-threshold label is
   * the strength. "below" handles the people-pleaser case (the
   * below-threshold label is the strength).
   */
  strengthSide: "above" | "below";
  /**
   * Comparator. Most traits use `>`; people-pleaser uses `<`.
   * The boundary case (raw === threshold) always lands on the
   * below/not-strength side.
   */
  compare?: ">" | "<";
};

const THRESHOLD_TRAITS: ReadonlyArray<ThresholdSpec> = [
  // 1. Introvert / Extrovert — Introvert sits on the "above" side.
  {
    key: "introvert-extrovert",
    offset: 38,
    weights: [
      [3, -1], [7, 1], [11, -1], [15, 1],
      [19, -1], [23, 1], [27, -1], [31, -1],
    ],
    divisor: 8,
    threshold: 3,
    aboveLabel: "Introvert",
    belowLabel: "Extrovert",
    strengthSide: "below",
  },
  // 2. Assertiveness
  {
    key: "assertiveness",
    offset: 25,
    weights: [
      [81, 1], [82, 1], [83, 1], [84, 1], [85, 1], [86, 1],
      [87, -1], [88, -1], [89, -1], [90, -1], [91, -1], [92, -1],
    ],
    divisor: 12,
    threshold: 3,
    aboveLabel: "Not assertive",
    belowLabel: "Assertive",
    strengthSide: "below",
  },
  // 3. Comfortable with money
  {
    key: "comfortable-with-money",
    offset: 13,
    weights: [
      [115, 1], [116, 1], [117, 1],
      [118, -1], [119, -1], [120, -1],
    ],
    divisor: 6,
    threshold: 2,
    aboveLabel: "Not comfortable with money",
    belowLabel: "Comfortable with money",
    strengthSide: "below",
  },
  // 4. Emotional intelligence
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
    aboveLabel: "Low emotional intelligence",
    belowLabel: "High emotional intelligence",
    strengthSide: "below",
  },
  // 5. Self-esteem
  {
    key: "self-esteem",
    offset: 22,
    weights: [
      [71, -1], [72, 1], [73, -1], [74, -1], [75, 1],
      [76, 1], [77, -1], [78, 1], [79, 1], [80, -1],
    ],
    divisor: 10,
    threshold: 2,
    aboveLabel: "Low self-esteem",
    belowLabel: "High self-esteem",
    strengthSide: "below",
  },
  // 6. Optimism
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
    aboveLabel: "Pessimistic",
    belowLabel: "Optimistic",
    strengthSide: "below",
  },
  // 7. People-pleaser — INVERTED: raw < 4 ⇒ strength ("not a people-pleaser").
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
  // 8. Personal accountability — raw >= 3 ⇒ strength.
  {
    key: "personal-accountability",
    offset: 0,
    weights: [[121, 1], [122, 1], [123, 1], [124, 1], [125, 1]],
    divisor: 5,
    threshold: 3,
    aboveLabel: "Has personal accountability",
    belowLabel: "Lacks personal accountability",
    strengthSide: "above",
    compare: "<", // strength when raw >= threshold; see evaluateThreshold
  },
];

function evaluateThreshold(spec: ThresholdSpec, answers: AnswerMap): TraitOutcome {
  let sum = spec.offset;
  for (const [id, sign] of spec.weights) sum += sign * a(answers, id);
  const raw = sum / spec.divisor;
  // compare ">": above when raw > threshold.
  // compare "<": above when raw >= threshold (boundary lands below) — used
  // for people-pleaser (raw < 4 ⇒ below label) and personal-accountability
  // (raw >= 3 ⇒ above label), both of which put raw === threshold on the
  // "above" side as defined here.
  const above = spec.compare === "<" ? raw >= spec.threshold : raw > spec.threshold;
  const isStrengthSide = spec.strengthSide === "above" ? above : !above;
  const label = above ? spec.aboveLabel : spec.belowLabel;
  const kind: TraitOutcome["kind"] = isStrengthSide ? "strength" : "development";
  return { key: spec.key, label, kind, raw };
}

/**
 * Four-item traits. raw = Qa − Qb + Qc − Qd.
 *
 * UNIFIED BOUNDARY (a deliberate deviation from the source): the source
 * split these traits between "> 0" and ">= 0" comparators; all eight now
 * use one rule — raw > 0 → strength, raw <= 0 → development. raw = 0
 * means the positive and negative items cancel out, i.e. no evidence of
 * strength, so it lands on the development side for all eight.
 */
type FourItemSpec = {
  key: TraitKey;
  items: readonly [number, number, number, number];
  strengthLabel: string;
  developmentLabel: string;
};

const FOUR_ITEM_TRAITS: ReadonlyArray<FourItemSpec> = [
  { key: "objection-handling",       items: [181, 182, 183, 184], strengthLabel: "Strong at objection handling",    developmentLabel: "Needs work on objection handling" },
  // Influence is NOT here: it is a custom threshold trait (see
  // evaluateInfluence). Its output position is preserved in computeTraits.
  { key: "storytelling",             items: [193, 194, 195, 196], strengthLabel: "Strong storyteller",              developmentLabel: "Needs work on storytelling" },
  { key: "negotiations",             items: [197, 198, 199, 200], strengthLabel: "Strong negotiator",               developmentLabel: "Needs work on negotiation" },
  { key: "productivity",             items: [201, 202, 203, 204], strengthLabel: "Productive",                      developmentLabel: "Needs work on productivity" },
  { key: "simplification",           items: [205, 206, 207, 208], strengthLabel: "Strong at simplification",        developmentLabel: "Needs work on simplification" },
  { key: "identifying-key-accounts", items: [209, 210, 211, 212], strengthLabel: "Identifies key accounts well",    developmentLabel: "Needs work on identifying key accounts" },
  { key: "caveman-brain",            items: [213, 214, 215, 216], strengthLabel: "Manages caveman brain well",      developmentLabel: "Needs work on caveman brain" },
  { key: "habits",                   items: [217, 218, 219, 220], strengthLabel: "Strong sales habits",             developmentLabel: "Needs work on sales habits" },
  // industry-expert (questions 189–192) is intentionally absent: the
  // source computes it but excludes it from the results list
  // (commented out, 23-06-2023). The questions remain in the bank.
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

/**
 * Influence. raw = A185 + A186 + A187 − A188.
 *
 * Q186 ("You're capable in influencing most people") is positively worded
 * but carried a negative sign in the source; its sign is corrected here.
 * The threshold is 6 because that is the all-neutral score for this shape
 * (3 + 3 + 3 − 3), so it separates above-neutral from at-or-below-neutral.
 */
function evaluateInfluence(answers: AnswerMap): TraitOutcome {
  const raw =
    a(answers, 185) + a(answers, 186) + a(answers, 187) - a(answers, 188);
  const isStrength = raw > 6;
  return {
    key: "influence",
    label: isStrength ? "Influential" : "Needs work on influence",
    kind: isStrength ? "strength" : "development",
    raw,
  };
}

/** Goal setting — source form: signed sum with no divisor; raw >= 5 ⇒ strength. */
function evaluateGoalSetting(answers: AnswerMap): TraitOutcome {
  const raw =
    a(answers, 152) - a(answers, 153) + a(answers, 154)
    + a(answers, 155) - a(answers, 156);
  const isStrength = raw >= 5;
  return {
    key: "goal-setting",
    label: isStrength ? "Strong goal-setter" : "Weak goal-setter",
    kind: isStrength ? "strength" : "development",
    raw,
  };
}

export function computeTraits(answers: AnswerMap): TraitOutcome[] {
  const out: TraitOutcome[] = THRESHOLD_TRAITS.map((s) => evaluateThreshold(s, answers));
  // goal-setting sits between personal-accountability (8) and
  // objection-handling (10) in the source's order.
  out.push(evaluateGoalSetting(answers));
  // Four-item traits in order, with influence between objection-handling
  // and storytelling, matching the source's order.
  for (const spec of FOUR_ITEM_TRAITS) {
    if (spec.key === "storytelling") out.push(evaluateInfluence(answers));
    out.push(evaluateFourItem(spec, answers));
  }
  return out;
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
  [152, 153, 154, 155, 156].forEach((id) => referenced.add(id));
  [185, 186, 187, 188].forEach((id) => referenced.add(id));
  for (const t of FOUR_ITEM_TRAITS) t.items.forEach((id) => referenced.add(id));
  const missing: number[] = [];
  for (const id of referenced) if (!QUESTIONS_BY_ID.has(id)) missing.push(id);
  return missing.length === 0 ? { ok: true } : { ok: false, missing: missing.sort((a, b) => a - b) };
}

// Re-export Likert for convenience to consumers.
export type { Likert };
