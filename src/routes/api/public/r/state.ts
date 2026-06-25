import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/r/state")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { token?: string };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        const token = body.token?.trim();
        if (!token) return new Response("Missing token", { status: 400 });

        const { loadSessionState } = await import("@/lib/respondent.server");
        const result = await loadSessionState(token);
        if (!result.ok) {
          return Response.json({ ok: false, reason: result.reason }, { status: 404 });
        }
        return Response.json({
          ok: true,
          session: result.session,
          payload: result.payload,
          result: result.result,
        });
      },
    },
  },
});
