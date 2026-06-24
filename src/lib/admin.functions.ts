/**
 * Admin-only server functions.
 *
 * Every function in this file MUST:
 *   1. Use `requireSupabaseAuth` middleware (caller must be signed in).
 *   2. Re-check that the caller has the `admin` role via has_role().
 *   3. Load the admin client INSIDE the handler with await import(), so
 *      `@/integrations/supabase/client.server` never leaks into the client
 *      bundle through this module.
 *
 * Owner provisioning replaces the planned `admin-provision-owner` edge
 * function — TanStack Start uses createServerFn for app-internal logic.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error) throw new Error("Failed to verify admin role");
  if (!data) throw new Error("Forbidden");
}

// notify() seam — actual email send lives outside Phase 2.
async function notify(_payload: { kind: string; to: string; data?: unknown }) {
  // Intentionally a no-op stub. Phase 3+ wires a real provider here.
}

export const provisionOwner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        email: z.string().email(),
        fullName: z.string().trim().min(1).max(120).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Create the auth user (email pre-confirmed; no signup flow).
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      email_confirm: true,
    });
    if (createErr || !created.user) {
      throw new Error(createErr?.message ?? "Failed to create user");
    }
    const newUserId = created.user.id;

    // 2. Profile row (active by default).
    const { error: profileErr } = await supabaseAdmin.from("profiles").insert({
      id: newUserId,
      email: data.email,
      full_name: data.fullName ?? null,
      account_status: "active",
    });
    if (profileErr) {
      // Best-effort rollback so we don't leak an auth user without a profile.
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      throw new Error(profileErr.message);
    }

    // 3. Role row.
    const { error: roleErr } = await supabaseAdmin.from("user_roles").insert({
      user_id: newUserId,
      role: "owner",
    });
    if (roleErr) {
      await supabaseAdmin.from("profiles").delete().eq("id", newUserId);
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      throw new Error(roleErr.message);
    }

    await notify({ kind: "owner_provisioned", to: data.email });

    return { ok: true, userId: newUserId };
  });

export const setAccountStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        userId: z.string().uuid(),
        status: z.enum(["active", "suspended"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ account_status: data.status })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);

    return { ok: true };
  });

export const setAdminRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        userId: z.string().uuid(),
        grant: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);

    if (!data.grant && data.userId === context.userId) {
      throw new Error("You can't revoke your own admin role.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.grant) {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: data.userId, role: "admin" });
      // Ignore unique-violation: role already granted.
      if (error && !/duplicate key|unique/i.test(error.message)) {
        throw new Error(error.message);
      }
    } else {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", "admin");
      if (error) throw new Error(error.message);
    }

    return { ok: true };
  });

export const listOwners = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);

    // profiles ↔ user_roles have no direct FK (both reference auth.users),
    // so PostgREST cannot embed them. Fetch separately and merge in JS.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profiles, error: profilesErr } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name, account_status, created_at")
      .order("created_at", { ascending: false });
    if (profilesErr) throw new Error(profilesErr.message);

    const ids = (profiles ?? []).map((p: any) => p.id as string);
    let rolesByUser = new Map<string, ("owner" | "admin")[]>();
    if (ids.length > 0) {
      const { data: roles, error: rolesErr } = await supabaseAdmin
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", ids);
      if (rolesErr) throw new Error(rolesErr.message);
      for (const r of roles ?? []) {
        const uid = (r as any).user_id as string;
        const role = (r as any).role as "owner" | "admin";
        const arr = rolesByUser.get(uid) ?? [];
        arr.push(role);
        rolesByUser.set(uid, arr);
      }
    }

    return (profiles ?? []).map((row: any) => ({
      id: row.id as string,
      email: row.email as string,
      fullName: (row.full_name as string | null) ?? null,
      accountStatus: row.account_status as "active" | "suspended",
      createdAt: row.created_at as string,
      roles: rolesByUser.get(row.id as string) ?? [],
    }));
  });
