/**
 * SalesCode scoring — verbatim port of the original PHP scoring engine.
 *
 * Apparent inversions and inconsistencies in the formulas below are
 * INTENTIONAL replications of the source engine, not bugs. Do not
 * "correct", normalise, recalibrate or tidy any offset, sign, divisor,
 * threshold or comparator. No formula in this file may be changed
 * without a matching change to the source of truth.
 *
 * Known deliberate quirks:
 *   - F_T uses A8 where the pattern would suggest A6 (see computeAxes).
 *   - Four-item traits 10–14 use "> 0" while 15–18 use ">= 0"
 *     (see FOUR_ITEM_TRAITS).
 *   - industry-expert is computed by the source but excluded from the
 *     results list (commented out there, 23-06-2023), so it is not
 *     emitted here either. Questions 189–192 remain in the bank and
 *     are still asked.
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
 *   I_E = 30 − A3 − A7 − A11 + A15 − A19 + A23 + A27 − A31   → E if > 24 else I
 *   S_N = 12 + A4 + A8 + A12 + A16 + A20 − A24 − A28 + A32   → N if > 24 else S
 *   F_T = 30 − A2 + A8 + A10 − A14 − A18 + A22 − A26 − A30   → T if > 24 else F
 *   J_P = 18 + A1 + A5 − A9 + A13 − A17 + A21 − A25 + A29    → P if > 24 else J
 *
 * F_T uses A8, NOT A6: in the source, Q6 is assigned the value of A[8],
 * so Q6 never reaches the type and Q8 is counted twice. This is an
 * intentional replication of the source engine.
 * ────────────────────────────────────────────────────────────────────── */

const AXIS_THRESHOLD = 24;

export function computeAxes(answers: AnswerMap) {
  const I_E =
    30 - a(answers, 3) - a(answers, 7) - a(answers, 11) + a(answers, 15)
       - a(answers, 19) + a(answers, 23) + a(answers, 27) - a(answers, 31);

  const S_N =
    12 + a(answers, 4) + a(answers, 8) + a(answers, 12) + a(answers, 16)
       + a(answers, 20) - a(answers, 24) - a(answers, 28) + a(answers, 32);

  // F_T uses A8, NOT A6: in the source, Q6 is assigned the value of A[8],
  // so Q6 never reaches the type and Q8 is counted twice. Intentional.
  const F_T =
    30 - a(answers, 2) + a(answers, 8) + a(answers, 10) - a(answers, 14)
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
  // 1. Introvert / Extrovert — Extrovert sits on the "above" side.
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
    strengthSide: "above",
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
    aboveLabel: "Assertive",
    belowLabel: "Not assertive",
    strengthSide: "above",
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
    aboveLabel: "Comfortable with money",
    belowLabel: "Not comfortable with money",
    strengthSide: "above",
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
    aboveLabel: "High emotional intelligence",
    belowLabel: "Low emotional intelligence",
    strengthSide: "above",
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
    aboveLabel: "High self-esteem",
    belowLabel: "Low self-esteem",
    strengthSide: "above",
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
    aboveLabel: "Optimistic",
    belowLabel: "Pessimistic",
    strengthSide: "above",
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
 * DELIBERATE INCONSISTENCY, preserved from the source: traits 10–14
 * (objection-handling … productivity) use "> 0" (raw === 0 ⇒ strength),
 * while traits 15–18 (simplification … habits) use ">= 0"
 * (raw === 0 ⇒ development). Do not unify these comparators.
 *
 * Polarity is also the source's: raw on the positive side ⇒ development,
 * raw on the negative/zero side ⇒ strength.
 */
type FourItemSpec = {
  key: TraitKey;
  items: readonly [number, number, number, number];
  /** "gt" ⇒ development when raw > 0; "gte" ⇒ development when raw >= 0. */
  compare: "gt" | "gte";
  strengthLabel: string;
  developmentLabel: string;
};

const FOUR_ITEM_TRAITS: ReadonlyArray<FourItemSpec> = [
  { key: "objection-handling",       items: [181, 182, 183, 184], compare: "gt",  strengthLabel: "Strong at objection handling",    developmentLabel: "Needs work on objection handling" },
  // Influence is a four-item trait in the source (not a threshold trait);
  // its position here falls out of the natural order.
  { key: "influence",                items: [185, 186, 187, 188], compare: "gt",  strengthLabel: "Influential",                     developmentLabel: "Needs work on influence" },
  { key: "storytelling",             items: [193, 194, 195, 196], compare: "gt",  strengthLabel: "Strong storyteller",              developmentLabel: "Needs work on storytelling" },
  { key: "negotiations",             items: [197, 198, 199, 200], compare: "gt",  strengthLabel: "Strong negotiator",               developmentLabel: "Needs work on negotiation" },
  { key: "productivity",             items: [201, 202, 203, 204], compare: "gt",  strengthLabel: "Productive",                      developmentLabel: "Needs work on productivity" },
  { key: "simplification",           items: [205, 206, 207, 208], compare: "gte", strengthLabel: "Strong at simplification",        developmentLabel: "Needs work on simplification" },
  { key: "identifying-key-accounts", items: [209, 210, 211, 212], compare: "gte", strengthLabel: "Identifies key accounts well",    developmentLabel: "Needs work on identifying key accounts" },
  { key: "caveman-brain",            items: [213, 214, 215, 216], compare: "gte", strengthLabel: "Manages caveman brain well",      developmentLabel: "Needs work on caveman brain" },
  { key: "habits",                   items: [217, 218, 219, 220], compare: "gte", strengthLabel: "Strong sales habits",              developmentLabel: "Needs work on sales habits" },
  // industry-expert (questions 189–192) is intentionally absent: the
  // source computes it but excludes it from the results list
  // (commented out, 23-06-2023). The questions remain in the bank.
];

function evaluateFourItem(spec: FourItemSpec, answers: AnswerMap): TraitOutcome {
  const raw = fourItem(answers, spec.items[0], spec.items[1], spec.items[2], spec.items[3]);
  const isDevelopment = spec.compare === "gt" ? raw > 0 : raw >= 0;
  return {
    key: spec.key,
    label: isDevelopment ? spec.developmentLabel : spec.strengthLabel,
    kind: isDevelopment ? "development" : "strength",
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
  out.push(...FOUR_ITEM_TRAITS.map((s) => evaluateFourItem(s, answers)));
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
   2, 8, 10, 14, 18, 22, 26, 30, // F_T deliberately references A8, not A6
   1, 5, 9, 13, 17, 21, 25, 29,
  ].forEach((id) => referenced.add(id));
  for (const t of THRESHOLD_TRAITS) for (const [id] of t.weights) referenced.add(id);
  [152, 153, 154, 155, 156].forEach((id) => referenced.add(id));
  for (const t of FOUR_ITEM_TRAITS) t.items.forEach((id) => referenced.add(id));
  const missing: number[] = [];
  for (const id of referenced) if (!QUESTIONS_BY_ID.has(id)) missing.push(id);
  return missing.length === 0 ? { ok: true } : { ok: false, missing: missing.sort((a, b) => a - b) };
}

// Re-export Likert for convenience to consumers.
export type { Likert };
