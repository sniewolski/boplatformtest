import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/audit-lead/state")({
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

        const { loadLeadSession, readLeadSections } = await import(
          "@/lib/auditLead.server"
        );
        const loaded = await loadLeadSession(token);
        if (!loaded.ok) {
          return Response.json({ ok: false, reason: loaded.reason }, { status: 404 });
        }

        const sections = await readLeadSections(loaded.session.auditId);
        return Response.json({
          ok: true,
          name: loaded.session.name,
          status: loaded.session.status,
          currency: loaded.session.currency,
          sections,
        });
      },
    },
  },
});
