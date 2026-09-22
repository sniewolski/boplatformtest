export const LEAD_AUDIT_STORAGE_KEY = "sales-lab:free-audit-token";

/** Exact wording shown next to the consent checkbox; stored on the session. */
export const LEAD_AUDIT_CONSENT_LABEL =
  "I agree that my answers and business details may be shared publicly, including in a YouTube video.";

/**
 * Set to false to reopen new submissions on the /free-audit start screen.
 * This one flag controls both the UI (greyed-out form on the start screen)
 * and the server check in src/routes/api/public/audit-lead/start.ts.
 * Closing only blocks NEW audits — in-progress audits keep working.
 */
export const LEAD_AUDIT_SUBMISSIONS_CLOSED = true;

export const LEAD_AUDIT_SECTIONS = [
  { key: "conversion", label: "Conversion" },
  { key: "pipeline", label: "Pipeline" },
  { key: "process", label: "Process" },
  { key: "activity", label: "Activity" },
  { key: "messaging", label: "Messaging" },
  { key: "alignment", label: "Alignment" },
] as const;

export type LeadAuditSectionKey = (typeof LEAD_AUDIT_SECTIONS)[number]["key"];

export type LeadAuditSectionState = {
  draft_answers: unknown;
  submitted_answers: unknown;
  has_unsubmitted_changes: boolean;
  submitted_at: string | null;
};

export type LeadAuditStateResponse =
  | {
      ok: true;
      name: string | null;
      status: string;
      currency: string | null;
      sections: Record<LeadAuditSectionKey, LeadAuditSectionState>;
    }
  | { ok: false; reason: string };

export function readStoredLeadAuditToken(): string | null {
  try {
    return window.localStorage.getItem(LEAD_AUDIT_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function storeLeadAuditToken(token: string): void {
  try {
    window.localStorage.setItem(LEAD_AUDIT_STORAGE_KEY, token);
  } catch {
    // Storage can be blocked in privacy modes. The returned link still works.
  }
}

export async function fetchLeadAuditState(
  token: string,
): Promise<LeadAuditStateResponse> {
  const response = await fetch("/api/public/audit-lead/state", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });

  try {
    return (await response.json()) as LeadAuditStateResponse;
  } catch {
    return { ok: false, reason: "not_found" };
  }
}