import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/audit-lead/set-currency")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { token?: string; currency?: string };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        const token = body.token?.trim();
        const currency = body.currency?.trim().toUpperCase();
        if (!token) return new Response("Missing token", { status: 400 });
        if (!currency || !/^[A-Z]{3}$/.test(currency)) {
          return new Response("Invalid currency", { status: 400 });
        }

        const { loadWritableLeadSession, setLeadCurrency } = await import(
          "@/lib/auditLead.server"
        );
        const loaded = await loadWritableLeadSession(token);
        if (!loaded.ok) {
          return Response.json({ ok: false, reason: loaded.reason }, { status: 400 });
        }

        const res = await setLeadCurrency(token, loaded.session.auditId, currency);
        if (!res.ok) return new Response("Update failed", { status: 500 });
        return Response.json({ ok: true, currency });
      },
    },
  },
});
