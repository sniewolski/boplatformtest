import { createFileRoute } from "@tanstack/react-router";
import { LEAD_AUDIT_CONSENT_LABEL } from "@/lib/auditLeadPublic";

export const Route = createFileRoute("/api/public/audit-lead/start")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: {
          name?: string;
          email?: string;
          consent?: boolean;
          consentLabel?: string;
        };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const name = body.name?.trim();
        const email = body.email?.trim().toLowerCase();
        if (!name || !email) return new Response("Missing fields", { status: 400 });
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return new Response("Invalid email", { status: 400 });
        }
        if (name.length > 200 || email.length > 320) {
          return new Response("Field too long", { status: 400 });
        }
        if (body.consent !== true) {
          return new Response("Consent required", { status: 400 });
        }

        const { startLeadAudit } = await import("@/lib/auditLead.server");
        try {
          const { token } = await startLeadAudit(
            name,
            email,
            LEAD_AUDIT_CONSENT_LABEL,
          );
          return Response.json({ ok: true, token });
        } catch {
          return new Response("Could not start audit", { status: 500 });
        }
      },
    },
  },
});
