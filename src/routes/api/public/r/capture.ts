import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/r/capture")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { token?: string; name?: string; email?: string };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        const token = body.token?.trim();
        const name = body.name?.trim();
        const email = body.email?.trim().toLowerCase();
        if (!token || !name || !email) {
          return new Response("Missing fields", { status: 400 });
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return new Response("Invalid email", { status: 400 });
        }
        if (name.length > 200 || email.length > 320) {
          return new Response("Field too long", { status: 400 });
        }

        const { captureRespondent } = await import("@/lib/respondent.server");
        const result = await captureRespondent(token, name, email);
        if (!result.ok) {
          return Response.json({ ok: false, reason: result.reason }, { status: 400 });
        }
        return Response.json({ ok: true, session: result.session });
      },
    },
  },
});
