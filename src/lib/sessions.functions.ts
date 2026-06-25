/**
 * Owner-side helpers for respondent sessions.
 *
 * Authenticated server functions only — respondents use the public routes
 * under /api/public/r/*, never these.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const createRespondentSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        toolKey: z.string().min(1).max(64),
        expiresAt: z.string().datetime().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { generateToken } = await import("@/lib/respondent.server");
    const token = generateToken();

    const { data: row, error } = await context.supabase
      .from("respondent_sessions")
      .insert({
        token,
        owner_id: context.userId,
        tool_key: data.toolKey,
        expires_at: data.expiresAt ?? null,
      })
      .select("id, token, tool_key, status, created_at, expires_at")
      .single();

    if (error) throw new Error(error.message);
    return row;
  });

export const listMyRespondentSessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("respondent_sessions")
      .select(
        "id, token, tool_key, status, respondent_name, respondent_email, created_at, expires_at, completed_at",
      )
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const deleteRespondentSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ sessionId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("respondent_sessions")
      .delete()
      .eq("id", data.sessionId);
    if (error) throw new Error(error.message);
    return { id: data.sessionId };
  });
