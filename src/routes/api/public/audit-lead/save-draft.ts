import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/audit-lead/save-draft")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: {
          token?: string;
          section_key?: string;
          draft?: unknown;
          has_submitted?: boolean;
        };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        const token = body.token?.trim();
        if (!token) return new Response("Missing token", { status: 400 });

        const { isLeadSectionKey, loadWritableLeadSession, saveLeadDraft } =
          await import("@/lib/auditLead.server");
        if (!isLeadSectionKey(body.section_key)) {
          return new Response("Invalid section", { status: 400 });
        }

        const loaded = await loadWritableLeadSession(token);
        if (!loaded.ok) {
          return Response.json({ ok: false, reason: loaded.reason }, { status: 400 });
        }

        const res = await saveLeadDraft(
          loaded.session.ownerId,
          loaded.session.auditId,
          body.section_key,
          body.draft ?? null,
          !!body.has_submitted,
        );
        if (!res.ok) return new Response("Save failed", { status: 500 });
        return Response.json({ ok: true });
      },
    },
  },
});
