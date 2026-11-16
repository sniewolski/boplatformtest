/**
 * Pure helpers for the coaching reply email (shared by the notify route,
 * the template preview and tests).
 */
export const COACHING_REPLY_TEMPLATE = "coaching-reply";
export const COACHING_REPLY_SUBJECT = "New message from the Sales Lab team";
export const COACHING_CHAT_URL = "https://lab.salesman.com/app/tools/coaching";
export const COACHING_EMAIL_PREVIEW_MAX = 200;

/** Plain-text preview: whitespace collapsed, cut at ~200 characters on a word boundary. */
export function coachingReplyPreview(body: string, max = COACHING_EMAIL_PREVIEW_MAX): string {
  const flat = body.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  const trimmed = (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s.,;:!?-]+$/, "");
  return `${trimmed}…`;
}

/** First word of a staff member's full name, or null when unknown. */
export function staffFirstName(fullName: string | null | undefined): string | null {
  const first = fullName?.trim().split(/\s+/)[0];
  return first ? first : null;
}
