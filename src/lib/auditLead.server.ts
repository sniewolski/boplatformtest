/**
 * Public "lead" audit backend. SERVER-ONLY: uses the admin client and
 * bypasses RLS. Never import from a client-reachable module — the
 * `.server.ts` filename is the boundary.
 *
 * Lead audits are stored in exactly the same tables as owner audits
 * (`audits` + the six `selling_systems_audit_*` tables). They hang off a
 * single internal holding auth account that has no profile row, no role
 * row, and is permanently banned, so it can never sign in and never shows
 * up in the admin roster (which is derived from `profiles`).
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { generateToken, validateToken } from "@/lib/respondent.server";

export const LEAD_TOOL_KEY = "audit-lead";
const HOLDING_EMAIL = "audit-leads@holding.invalid";
/** ~100 years. Supabase treats any future duration as a permanent ban. */
const BAN_DURATION = "876000h";

export const LEAD_SECTION_KEYS = [
  "conversion",
  "pipeline",
  "process",
  "activity",
  "messaging",
  "alignment",
] as const;

export type LeadSectionKey = (typeof LEAD_SECTION_KEYS)[number];

const SECTION_TABLES: Record<LeadSectionKey, string> = {
  conversion: "selling_systems_audit_conversion",
  pipeline: "selling_systems_audit_pipeline",
  process: "selling_systems_audit_process",
  activity: "selling_systems_audit_activity",
  messaging: "selling_systems_audit_messaging",
  alignment: "selling_systems_audit_alignment",
};

export function isLeadSectionKey(value: unknown): value is LeadSectionKey {
  return (
    typeof value === "string" &&
    (LEAD_SECTION_KEYS as readonly string[]).includes(value)
  );
}

let cachedHoldingId: string | undefined;

async function findHoldingUserId(): Promise<string | undefined> {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) throw error;
    const hit = data.users.find((u) => u.email === HOLDING_EMAIL);
    if (hit) return hit.id;
    if (data.users.length < 200) return undefined;
  }
  return undefined;
}

/**
 * Idempotently resolve the internal holding account id. Creates the auth
 * user on first call, then keeps it banned. Server-only — the id is never
 * returned to the browser.
 */
export async function getLeadHoldingUserId(): Promise<string> {
  if (cachedHoldingId) return cachedHoldingId;

  let id = await findHoldingUserId();

  if (!id) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: HOLDING_EMAIL,
      email_confirm: false,
      user_metadata: { internal: true, purpose: "public audit lead holder" },
    });
    if (error || !data.user) {
      // Lost a race with a concurrent request — re-read.
      id = await findHoldingUserId();
      if (!id) throw error ?? new Error("Could not create holding account");
    } else {
      id = data.user.id;
    }
  }

  // Always (re-)assert the ban; cheap and keeps the invariant true.
  await supabaseAdmin.auth.admin.updateUserById(id, {
    ban_duration: BAN_DURATION,
  });

  cachedHoldingId = id;
  return id;
}

export type LeadSessionPayload = {
  audit_id: string;
  currency: string | null;
};

type LoadedLeadSession = {
  token: string;
  ownerId: string;
  auditId: string;
  currency: string | null;
  status: string;
  name: string | null;
  email: string | null;
};

export type LeadFailure = {
  ok: false;
  reason: "not_found" | "expired" | "revoked" | "completed" | "invalid";
};

/**
 * Validate a lead token: must exist, be live, and carry tool_key
 * 'audit-lead'. `audit_id` comes only from the stored payload.
 */
export async function loadLeadSession(
  token: string,
): Promise<{ ok: true; session: LoadedLeadSession } | LeadFailure> {
  const v = await validateToken(token);
  if (!v.ok) return v;
  if (v.session.toolKey !== LEAD_TOOL_KEY) return { ok: false, reason: "not_found" };

  const { data, error } = await supabaseAdmin
    .from("respondent_sessions")
    .select("token, owner_id, payload, status, respondent_name, respondent_email")
    .eq("token", token)
    .maybeSingle();
  if (error || !data) return { ok: false, reason: "not_found" };

  const payload = (data.payload ?? {}) as Partial<LeadSessionPayload>;
  if (!payload.audit_id) return { ok: false, reason: "invalid" };

  return {
    ok: true,
    session: {
      token: data.token,
      ownerId: data.owner_id,
      auditId: payload.audit_id,
      currency: payload.currency ?? null,
      status: data.status,
      name: data.respondent_name,
      email: data.respondent_email,
    },
  };
}

/** Same as loadLeadSession, but refuses a completed (locked) session. */
export async function loadWritableLeadSession(token: string) {
  const loaded = await loadLeadSession(token);
  if (!loaded.ok) return loaded;
  if (loaded.session.status === "completed") {
    return { ok: false, reason: "completed" } as LeadFailure;
  }
  return loaded;
}

export type LeadConsent = {
  label: string;
  agreed: true;
  at: string;
};

export async function startLeadAudit(
  name: string,
  email: string,
  consentLabel: string,
): Promise<{ token: string }> {
  const ownerId = await getLeadHoldingUserId();

  const { data: audit, error: auditError } = await supabaseAdmin
    .from("audits")
    .insert({ owner_id: ownerId, name })
    .select("id")
    .single();
  if (auditError || !audit) throw auditError ?? new Error("Could not create audit");

  const token = generateToken();
  const consent: LeadConsent = {
    label: consentLabel,
    agreed: true,
    at: new Date().toISOString(),
  };
  const payload: LeadSessionPayload = { audit_id: audit.id, currency: null };

  const { error: sessionError } = await supabaseAdmin
    .from("respondent_sessions")
    .insert({
      token,
      owner_id: ownerId,
      tool_key: LEAD_TOOL_KEY,
      status: "in_progress",
      respondent_name: name,
      respondent_email: email,
      payload: payload as never,
    });
  if (sessionError) throw sessionError;

  return { token };
}

export type LeadSectionState = {
  draft_answers: unknown;
  submitted_answers: unknown;
  has_unsubmitted_changes: boolean;
  submitted_at: string | null;
};

export async function readLeadSections(
  auditId: string,
): Promise<Record<LeadSectionKey, LeadSectionState>> {
  const entries = await Promise.all(
    LEAD_SECTION_KEYS.map(async (key) => {
      const { data } = await supabaseAdmin
        .from(SECTION_TABLES[key] as never)
        .select(
          "draft_answers, submitted_answers, has_unsubmitted_changes, submitted_at",
        )
        .eq("audit_id", auditId)
        .maybeSingle();
      const row = (data ?? null) as LeadSectionState | null;
      return [
        key,
        {
          draft_answers: row?.draft_answers ?? null,
          submitted_answers: row?.submitted_answers ?? null,
          has_unsubmitted_changes: row?.has_unsubmitted_changes ?? false,
          submitted_at: row?.submitted_at ?? null,
        },
      ] as const;
    }),
  );
  return Object.fromEntries(entries) as Record<LeadSectionKey, LeadSectionState>;
}

/** Mirrors the owner `useSaveDraft` hook: same columns, same onConflict. */
export async function saveLeadDraft(
  ownerId: string,
  auditId: string,
  sectionKey: LeadSectionKey,
  draft: unknown,
  hasSubmitted: boolean,
): Promise<{ ok: boolean }> {
  const row = {
    owner_id: ownerId,
    audit_id: auditId,
    draft_answers: draft,
    ...(hasSubmitted ? { has_unsubmitted_changes: true } : {}),
  };
  const { error } = await supabaseAdmin
    .from(SECTION_TABLES[sectionKey] as never)
    .upsert(row as never, { onConflict: "audit_id" });
  return { ok: !error };
}

/** Mirrors the owner `useSubmitIntake` hook: same columns, same onConflict. */
export async function submitLeadSection(
  ownerId: string,
  auditId: string,
  sectionKey: LeadSectionKey,
  answers: unknown,
): Promise<{ ok: boolean; allSubmitted: boolean }> {
  const row = {
    owner_id: ownerId,
    audit_id: auditId,
    draft_answers: answers,
    submitted_answers: answers,
    has_unsubmitted_changes: false,
    submitted_at: new Date().toISOString(),
  };
  const { error } = await supabaseAdmin
    .from(SECTION_TABLES[sectionKey] as never)
    .upsert(row as never, { onConflict: "audit_id" });
  if (error) return { ok: false, allSubmitted: false };

  const sections = await readLeadSections(auditId);
  const allSubmitted = LEAD_SECTION_KEYS.every((k) => !!sections[k].submitted_at);
  return { ok: true, allSubmitted };
}

export async function completeLeadSession(token: string): Promise<void> {
  await supabaseAdmin
    .from("respondent_sessions")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("token", token);
}

export async function setLeadCurrency(
  token: string,
  auditId: string,
  currency: string,
): Promise<{ ok: boolean }> {
  const payload: LeadSessionPayload = { audit_id: auditId, currency };
  const { error } = await supabaseAdmin
    .from("respondent_sessions")
    .update({ payload: payload as never })
    .eq("token", token);
  return { ok: !error };
}
