/** Shown when sign-in fails because an admin suspended (banned) the account. */
export const PAUSED_MESSAGE =
  "Your access is currently paused. Please get in touch with the team.";

export function isBannedError(err: { code?: string; message?: string }): boolean {
  return err.code === "user_banned" || /banned/i.test(err.message ?? "");
}
