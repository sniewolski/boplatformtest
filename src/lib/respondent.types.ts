/**
 * Client-safe types shared between respondent UI and the .server helpers.
 * Keep this file free of imports from `*.server.ts` so it can be loaded
 * from any bundle.
 */
export type SessionStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "expired"
  | "revoked";

export type PublicSession = {
  token: string;
  toolKey: string;
  status: SessionStatus;
  respondentName: string | null;
  respondentEmail: string | null;
  expiresAt: string | null;
};
