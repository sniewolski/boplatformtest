/**
 * SalesCode trait copy — placeholder shells.
 *
 * Content is populated in Phase 2 from the canonical trait document.
 * Every trait carries:
 *   - `whatItMeans` / `whyItMatters` — shared between strength and growth views
 *   - `strengthLine` / `growthLine` — the declarative outcome line shown when
 *     the respondent's result sits on that side of the threshold.
 *
 * The introvert-extrovert entry is treated like every other trait: it has a
 * strength and growth line and is rendered inside the normal trait grid.
 */
import type { TraitCopyEntry, TraitKey } from "./types";

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
  "introvert-extrovert": "habits-and-drive",
};

const placeholder = (name: string, key: TraitKey): TraitCopyEntry => ({
  key,
  name,
  whatItMeans: "",
  whyItMatters: "",
  strengthLine: "",
  growthLine: "",
});

export const TRAIT_COPY: Record<TraitKey, TraitCopyEntry> = {
  "introvert-extrovert": placeholder("Introvert / Extrovert", "introvert-extrovert"),
  "assertiveness": placeholder("Assertiveness", "assertiveness"),
  "comfortable-with-money": placeholder("Comfortable talking about money", "comfortable-with-money"),
  "emotional-intelligence": placeholder("Emotional intelligence", "emotional-intelligence"),
  "self-esteem": placeholder("Self-esteem", "self-esteem"),
  "optimism": placeholder("Optimism", "optimism"),
  "people-pleaser": placeholder("People pleaser", "people-pleaser"),
  "personal-accountability": placeholder("Personal accountability", "personal-accountability"),
  "goal-setting": placeholder("Goal setting", "goal-setting"),
  "objection-handling": placeholder("Objection handling", "objection-handling"),
  "influence": placeholder("Influence", "influence"),
  "industry-expert": placeholder("Industry expert", "industry-expert"),
  "storytelling": placeholder("Storytelling", "storytelling"),
  "negotiations": placeholder("Negotiation", "negotiations"),
  "productivity": placeholder("Productivity", "productivity"),
  "simplification": placeholder("Simplification", "simplification"),
  "identifying-key-accounts": placeholder("Identifying high-value clients", "identifying-key-accounts"),
  "caveman-brain": placeholder("Emotional self-control (caveman brain)", "caveman-brain"),
  "habits": placeholder("Habits", "habits"),
};
