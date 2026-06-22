import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/r/complete")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { token?: string; result?: unknown };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        const token = body.token?.trim();
        if (!token) return new Response("Missing token", { status: 400 });

        const { markCompleted, validateToken } = await import(
          "@/lib/respondent.server"
        );
        // Re-validate so we don't accept completion on a revoked/expired token.
        const v = await validateToken(token);
        if (!v.ok) {
          return Response.json({ ok: false, reason: v.reason }, { status: 404 });
        }
        const res = await markCompleted(token, body.result);
        if (!res.ok) return new Response("Update failed", { status: 500 });
        return Response.json({ ok: true });
      },
    },
  },
});
