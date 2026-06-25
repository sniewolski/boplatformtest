import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/r/save")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { token?: string; payload?: unknown };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        const token = body.token?.trim();
        if (!token) return new Response("Missing token", { status: 400 });

        const { saveProgress } = await import("@/lib/respondent.server");
        const result = await saveProgress(token, body.payload ?? null);
        if (!result.ok) {
          return Response.json({ ok: false, reason: result.reason }, { status: 400 });
        }
        return Response.json({ ok: true });
      },
    },
  },
});
