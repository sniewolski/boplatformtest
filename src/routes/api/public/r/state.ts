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

        // Reads recompute from the raw payload (same as the owner result
        // route); the stored `result` blob is only a fallback when the
        // payload is missing/empty. Nothing is written back.
        let computed: unknown = result.result;
        if (result.session.toolKey === "salescode") {
          const payload = result.payload;
          const hasAnswers =
            !!payload &&
            typeof payload === "object" &&
            Object.keys(payload as Record<string, unknown>).length > 0;
          if (hasAnswers) {
            try {
              const { scoreSalesCode } = await import(
                "@/tools/salescode/lib/scoring"
              );
              computed = scoreSalesCode(payload as never);
            } catch {
              computed = result.result;
            }
          }
        }

        return Response.json({
          ok: true,
          session: result.session,
          payload: result.payload,
          result: computed,
        });

      },
    },
  },
});
