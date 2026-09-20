import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/audit-lead/submit-section")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { token?: string; section_key?: string; answers?: unknown };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        const token = body.token?.trim();
        if (!token) return new Response("Missing token", { status: 400 });

        const {
          isLeadSectionKey,
          loadWritableLeadSession,
          submitLeadSection,
          completeLeadSession,
        } = await import("@/lib/auditLead.server");
        if (!isLeadSectionKey(body.section_key)) {
          return new Response("Invalid section", { status: 400 });
        }

        const loaded = await loadWritableLeadSession(token);
        if (!loaded.ok) {
          return Response.json({ ok: false, reason: loaded.reason }, { status: 400 });
        }

        const res = await submitLeadSection(
          loaded.session.ownerId,
          loaded.session.auditId,
          body.section_key,
          body.answers ?? null,
        );
        if (!res.ok) return new Response("Submit failed", { status: 500 });

        if (res.allSubmitted) await completeLeadSession(token);

        return Response.json({
          ok: true,
          status: res.allSubmitted ? "completed" : "in_progress",
        });
      },
    },
  },
});
