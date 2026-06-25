/**
 * SalesCode result copy — pure data, no logic.
 *
 * Source: salescode-content-and-scoring.md §5. Treat as a strong first pass:
 * because copy is keyed by axis-letter and trait+outcome, tuning to voice is
 * a data edit, not a rebuild.
 *
 * Some pieces of §5b were not in the pasted excerpt (the message was
 * truncated mid-section). Those entries are authored here in the same voice
 * as the visible ones and marked with `// authored — verify` so they're
 * easy to find and edit.
 */
import type { TraitKey } from "./types";

export const TYPE_LEAD_IN = "Your SalesCode type is {TYPE}. Here's what that means for how you sell:";

export const AXIS_BLURBS: Record<"I" | "E" | "S" | "N" | "T" | "F" | "J" | "P", { title: string; body: string }> = {
  I: { title: "Introversion", body: "You recharge through focus and depth, and do your best selling in considered, one-to-one conversations." },
  E: { title: "Extraversion", body: "You're energised by people and momentum, and thrive selling out loud and in the room." },
  S: { title: "Sensing",      body: "You read opportunities through concrete facts, specifics, and what's already proven." },
  N: { title: "Intuition",    body: "You read opportunities through patterns, possibility, and the bigger picture." },
  T: { title: "Thinking",     body: "You decide and persuade through logic, structure, and proof." },
  F: { title: "Feeling",      body: "You decide and persuade through rapport, values, and human connection." },
  J: { title: "Judging",      body: "You run a planned, structured pipeline and like decisions made." },
  P: { title: "Perceiving",   body: "You run a flexible, adaptive pipeline and like keeping options open." },
};

/** Cosmetic grouping of traits into three areas. Does not affect scoring. */
export type TraitArea = "sales-skills" | "inner-game" | "habits-and-drive";

export const TRAIT_AREA_LABELS: Record<TraitArea, string> = {
  "sales-skills": "Sales skills",
  "inner-game": "Inner game",
  "habits-and-drive": "Habits & drive",
};

export const TRAIT_AREA_OF: Record<TraitKey, TraitArea> = {
  // Sales skills
  "objection-handling": "sales-skills",
  "influence": "sales-skills",
  "simplification": "sales-skills",
  "storytelling": "sales-skills",
  "negotiations": "sales-skills",
  "identifying-key-accounts": "sales-skills",
  "industry-expert": "sales-skills",
  // Inner game
  "comfortable-with-money": "inner-game",
  "self-esteem": "inner-game",
  "personal-accountability": "inner-game",
  "optimism": "inner-game",
  "caveman-brain": "inner-game",
  "emotional-intelligence": "inner-game",
  // Habits & drive
  "assertiveness": "habits-and-drive",
  "productivity": "habits-and-drive",
  "goal-setting": "habits-and-drive",
  "habits": "habits-and-drive",
  "people-pleaser": "habits-and-drive",
  // Neutral style — surfaced as a one-line lead-in, not in the strength/dev grid
  "introvert-extrovert": "habits-and-drive",
};

/** Trait copy keyed by trait + outcome kind. */
export const TRAIT_COPY: Record<TraitKey, {
  name: string;
  strength?: string;
  development?: string;
  /** For the neutral introvert/extrovert style trait — phrased as a style line. */
  neutralExtrovert?: string;
  neutralIntrovert?: string;
}> = {
  // ── Sales skills ──────────────────────────────────────────────────────
  "objection-handling": {
    name: "Objection handling",
    strength: "You stay in control when objections come up and move past the common ones with ease.",
    development: "Objections tend to knock your conversations off course — a clear method for the top few would change that.",
  },
  "influence": {
    name: "Influence",
    strength: "You naturally move people toward a decision, and others tend to follow your lead.",
    development: "Getting buyers to commit is a stretch right now — influence is a learnable skill worth building.",
  },
  "simplification": {
    name: "Simplification",
    strength: "You make complex offers feel simple, so buyers grasp the value fast.",
    development: "Your message may be carrying too much detail — simplifying it will help buyers say yes.",
  },
  "storytelling": {
    name: "Storytelling",
    strength: "You hold attention with a story and usually have the right anecdote ready.",
    development: "Your stories don't yet land the way they could — structure is the missing piece.",
  },
  "negotiations": {
    name: "Negotiations",
    strength: "You negotiate with a clear head and a logical structure rather than emotion.",
    development: "Negotiations tend to get emotional or rigid — a repeatable framework will steady them.",
  },
  "identifying-key-accounts": {
    name: "Identifying key accounts",
    strength: "You focus your time on the accounts that actually move your numbers.",
    development: "Your attention is spread evenly across prospects — concentrating on the vital few will lift results.",
  },
  "industry-expert": {
    name: "Industry expert",
    strength: "You're seen as a credible voice with strong product and industry knowledge.",
    development: "You're not yet positioned as an authority in your space — visible expertise compounds trust.",
  },

  // ── Inner game ────────────────────────────────────────────────────────
  "comfortable-with-money": {
    name: "Comfortable with money",
    strength: "You talk about price and money openly, which keeps deals moving.",
    development: "Money conversations create hesitation — getting comfortable here removes a silent brake on your sales.",
  },
  "self-esteem": {
    name: "Self-esteem",
    strength: "You carry a steady sense of your own worth into every conversation.",
    development: "A shaky sense of self-worth can leak into selling — this is foundational and worth strengthening.",
  },
  "personal-accountability": {
    name: "Personal accountability",
    strength: "You do what you say and finish what you start, watched or not.",
    development: "Follow-through is inconsistent right now — accountability systems will close the gap.",
  },
  "optimism": {
    name: "Optimism",
    strength: "You expect things to go well, which sustains you through the grind of selling.",
    development: "A pessimistic lean makes setbacks heavier than they need to be — outlook is trainable.",
  },
  "caveman-brain": {
    name: "Caveman brain",
    strength: "You stay composed under pressure rather than reacting to threat or rejection.",
    // authored — verify (source truncated mid-sentence at "Fear and the fight-or-flight response are steeri...")
    development: "Fear and the fight-or-flight response are steering more of your selling than they should — naming the trigger is the first step to mastering it.",
  },
  "emotional-intelligence": {
    name: "Emotional intelligence",
    // authored — verify (not in visible excerpt)
    strength: "You read the room well and adjust to what each buyer needs in the moment.",
    development: "Picking up on what buyers feel — and managing your own state — is an edge worth sharpening.",
  },

  // ── Habits & drive ────────────────────────────────────────────────────
  "assertiveness": {
    name: "Assertiveness",
    // authored — verify
    strength: "You ask for what you need, push for decisions, and don't shrink in front of buyers.",
    development: "You hold back when the moment calls for a direct ask — assertiveness will unlock stuck deals.",
  },
  "productivity": {
    name: "Productivity",
    // authored — verify
    strength: "You stay on top of the day's work and protect time for what actually moves deals.",
    development: "Your day runs you more than you run it — a simple system would reclaim hours each week.",
  },
  "goal-setting": {
    name: "Goal setting",
    // authored — verify
    strength: "You set clear sales goals and keep them in sight, quarter after quarter.",
    development: "Without written goals, effort scatters — committing them to paper makes them real.",
  },
  "habits": {
    name: "Habits",
    // authored — verify
    strength: "Your selling is driven by daily routines, not bursts of motivation.",
    development: "You're relying on motivation more than habit right now — small daily routines will outperform big pushes.",
  },
  "people-pleaser": {
    name: "People-pleaser",
    // Strength side = NOT a people-pleaser.
    strength: "You hold your position under pressure and don't lose yourself trying to be liked.",
    development: "You bend too easily to keep people happy — boundaries in selling protect both you and the deal.",
  },

  // ── Neutral style ─────────────────────────────────────────────────────
  "introvert-extrovert": {
    name: "Selling style",
    // authored — verify (source labels this a neutral one-liner above the trait grid)
    neutralExtrovert: "You sell best when you're out loud, in front of people, and feeding off the room.",
    neutralIntrovert: "You sell best in deeper one-to-one conversations, where focus and listening do the work.",
  },
};
