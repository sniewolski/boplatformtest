import { createServerFn } from "@tanstack/react-start";

/**
 * Dev-only bypass: returns a hashed magiclink token for an existing user
 * when the caller supplies the dev code "000000". The client then calls
 * supabase.auth.verifyOtp({ email, token, type: 'magiclink' }) to mint a
 * real session. Remove this file once real email delivery is wired up.
 */
export const devLoginBypass = createServerFn({ method: "POST" })
  .inputValidator((input: { email: string; code: string }) => input)
  .handler(async ({ data }) => {
    if (data.code !== "000000") {
      throw new Error("Invalid dev code");
    }
    const email = data.email.trim().toLowerCase();
    if (!email) throw new Error("Email required");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Only allow bypass for an existing, active profile (mirrors invite-only rule).
    const { data: userList, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
    if (listErr) throw new Error(listErr.message);
    const user = userList.users.find((u) => u.email?.toLowerCase() === email);
    if (!user) throw new Error("No account for that email");

    const { data: link, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    if (linkErr || !link?.properties?.hashed_token) {
      throw new Error(linkErr?.message ?? "Failed to generate bypass token");
    }

    return { token: link.properties.hashed_token };
  });
