/**
 * ONE-TIME BOOTSTRAP — delete this file after the first admin is created.
 *
 * Self-disables: returns 409 if any admin already exists. No secret gate
 * needed because once the very first admin lands, this endpoint becomes
 * inert and refuses every subsequent call.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/bootstrap-admin")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { email?: string; fullName?: string };
        try {
          body = (await request.json()) as { email?: string; fullName?: string };
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        const email = body.email?.trim().toLowerCase();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return new Response("Invalid email", { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { count, error: countErr } = await supabaseAdmin
          .from("user_roles")
          .select("*", { count: "exact", head: true })
          .eq("role", "admin");
        if (countErr) {
          return new Response(`Count failed: ${countErr.message}`, { status: 500 });
        }
        if ((count ?? 0) > 0) {
          return new Response("Admin already exists", { status: 409 });
        }

        // Look up existing user by email (createUser would fail with 422 if
        // the email is already registered).
        let userId: string | null = null;
        const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
          page: 1,
          perPage: 200,
        });
        if (listErr) {
          return new Response(`List failed: ${listErr.message}`, { status: 500 });
        }
        const existing = list.users.find((u) => u.email?.toLowerCase() === email);
        if (existing) {
          userId = existing.id;
        } else {
          const { data: created, error: createErr } =
            await supabaseAdmin.auth.admin.createUser({
              email,
              email_confirm: true,
            });
          if (createErr || !created.user) {
            return new Response(`Create failed: ${createErr?.message}`, { status: 500 });
          }
          userId = created.user.id;
        }

        await supabaseAdmin
          .from("profiles")
          .upsert(
            {
              id: userId,
              email,
              full_name: body.fullName ?? null,
              account_status: "active",
            },
            { onConflict: "id" },
          );

        const { error: roleErr } = await supabaseAdmin
          .from("user_roles")
          .upsert(
            { user_id: userId, role: "admin" },
            { onConflict: "user_id,role" },
          );
        if (roleErr) {
          return new Response(`Role insert failed: ${roleErr.message}`, { status: 500 });
        }

        return Response.json({ ok: true, userId });
      },
    },
  },
});
