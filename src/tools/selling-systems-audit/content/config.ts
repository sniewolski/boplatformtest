/**
 * Editable data spine for Section 2 — Sales Content Review.
 *
 * Every owner-facing label/tip AND every admin-side rubric for this section
 * lives here. Components must not hardcode category strings, tips, or
 * feedback-style instructions.
 *
 * - CONTENT_CATEGORIES: shown to the owner. Folder labels + one-line tips.
 * - CONTENT_RUBRICS: admin-only. Feeds the Gemini draft system prompt.
 *   Never rendered in owner UI.
 * - CONTENT_FEEDBACK_STYLE: global voice rule appended to the system prompt.
 */

export type ContentInputType = "text" | "pdf" | "md" | "image";

export type ContentCategory = {
  key: string;
  label: string;
  tip: string;
  accepts: ContentInputType[];
};

export const CONTENT_CATEGORIES: ContentCategory[] = [
  {
    key: "cold-outreach",
    label: "Cold Outreach",
    tip: "First-touch prospecting — the opener that earns a reply.",
    accepts: ["text", "pdf", "md", "image"],
  },
  {
    key: "email",
    label: "Sales Emails",
    tip: "Individual emails sent during an active deal.",
    accepts: ["text", "pdf", "md", "image"],
  },
  {
    key: "follow-up",
    label: "Follow-Ups",
    tip: "Chase / re-engagement messages after first contact.",
    accepts: ["text", "pdf", "md", "image"],
  },
  {
    key: "sales-call",
    label: "Call Scripts",
    tip: "Discovery and sales-call scripts, talk tracks, openers.",
    accepts: ["text", "pdf", "md", "image"],
  },
  {
    key: "cadences",
    label: "Cadences",
    tip: "The sequence — how outreach, calls, and follow-ups are orchestrated over time.",
    accepts: ["text", "pdf", "md", "image"],
  },
  {
    key: "proposals",
    label: "Proposals & Pricing",
    tip: "Proposals, quotes, pricing pages, the close.",
    accepts: ["text", "pdf", "md", "image"],
  },
  {
    key: "other",
    label: "Other",
    tip: "Anything that doesn't fit the above.",
    accepts: ["text", "pdf", "md", "image"],
  },
];

export type ContentCategoryKey = (typeof CONTENT_CATEGORIES)[number]["key"];

/**
 * Admin-side ONLY. Feeds the AI draft system prompt.
 * NEVER shown to the owner. Replace placeholders with coach standards.
 */
export const CONTENT_RUBRICS: Record<string, { criteria: string[] }> = {
  "cold-outreach": { criteria: ["<placeholder — replace with coach standards>"] },
  email: { criteria: ["<placeholder>"] },
  "follow-up": { criteria: ["<placeholder>"] },
  "sales-call": { criteria: ["<placeholder>"] },
  cadences: { criteria: ["<placeholder>"] },
  proposals: { criteria: ["<placeholder>"] },
  other: { criteria: ["<placeholder>"] },
};

/**
 * Global instruction appended to the AI draft system prompt.
 * Enforces voice across every category.
 */
export const CONTENT_FEEDBACK_STYLE =
  "Write feedback that is short, tight, and concrete. No preamble, no praise padding, no essays. Point to specific problems and the specific fix. Plain text.";

export const CONTENT_STORAGE_BUCKET = "content-review";
