/**
 * Respondent-session helpers. SERVER-ONLY: uses the admin client, bypasses
 * RLS. Never import from a client-reachable module — the .server.ts filename
 * is the boundary.
 *
 * Phase 3 wires:
 *   - validateToken: read-only metadata for /r/$token
 *   - captureRespondent: name/email capture
 *   - markCompleted: terminal write
 *
 * Token hardening (hashing, rate-limiting, expiry enforcement) is intentionally
 * a seam — extend the functions here in a later phase without touching the
 * public route handlers or the respondent UI.
 */
import { randomBytes } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { PublicSession, SessionStatus } from "@/lib/respondent.types";

export type { PublicSession, SessionStatus };

export function generateToken(): string {
  // 32 chars of url-safe base64 ≈ 192 bits entropy.
  return randomBytes(24).toString("base64url");
}

function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() < Date.now();
}

export async function validateToken(token: string): Promise<
  | { ok: true; session: PublicSession }
  | { ok: false; reason: "not_found" | "expired" | "revoked" }
> {
  const { data, error } = await supabaseAdmin
    .from("respondent_sessions")
    .select(
      "token, tool_key, status, respondent_name, respondent_email, expires_at",
    )
    .eq("token", token)
    .maybeSingle();

  if (error || !data) return { ok: false, reason: "not_found" };
  if (data.status === "revoked") return { ok: false, reason: "revoked" };
  if (isExpired(data.expires_at)) return { ok: false, reason: "expired" };

  return {
    ok: true,
    session: {
      token: data.token,
      toolKey: data.tool_key,
      status: data.status as SessionStatus,
      respondentName: data.respondent_name,
      respondentEmail: data.respondent_email,
      expiresAt: data.expires_at,
    },
  };
}

export async function captureRespondent(
  token: string,
  name: string,
  email: string,
): Promise<
  | { ok: true; session: PublicSession }
  | { ok: false; reason: "not_found" | "expired" | "revoked" | "completed" }
> {
  const found = await validateToken(token);
  if (!found.ok) return found;
  if (found.session.status === "completed") {
    return { ok: false, reason: "completed" };
  }

  const { data, error } = await supabaseAdmin
    .from("respondent_sessions")
    .update({
      respondent_name: name,
      respondent_email: email,
      status:
        found.session.status === "pending" ? "in_progress" : found.session.status,
    })
    .eq("token", token)
    .select(
      "token, tool_key, status, respondent_name, respondent_email, expires_at",
    )
    .single();

  if (error || !data) return { ok: false, reason: "not_found" };

  return {
    ok: true,
    session: {
      token: data.token,
      toolKey: data.tool_key,
      status: data.status as SessionStatus,
      respondentName: data.respondent_name,
      respondentEmail: data.respondent_email,
      expiresAt: data.expires_at,
    },
  };
}

export async function markCompleted(
  token: string,
  result: unknown,
): Promise<{ ok: boolean }> {
  const { error } = await supabaseAdmin
    .from("respondent_sessions")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      result: (result ?? null) as never,
    })
    .eq("token", token);

  return { ok: !error };
}
