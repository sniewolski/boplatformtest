import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import {
  deleteLeadAudit,
  listLeadAudits,
  type LeadAuditRow,
} from "@/lib/leadAudits.functions";
import { Input } from "@/components/ui/input";
import { DeleteLeadAuditDialog } from "@/components/admin/DeleteLeadAuditDialog";

export const Route = createFileRoute("/_authenticated/app/admin/lead-audits/")({
  component: LeadAuditsList,
  head: () => ({
    meta: [
      { title: "Lead audits · Sales Lab admin" },
      {
        name: "description",
        content:
          "Public Selling Systems Audit submissions from the shared lead link.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function LeadAuditsList() {
  const list = useServerFn(listLeadAudits);
  const leads = useQuery({
    queryKey: ["admin", "lead-audits"],
    queryFn: () => list(),
  });

  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const rows = leads.data ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        (r.email ?? "").toLowerCase().includes(q) ||
        (r.name ?? "").toLowerCase().includes(q),
    );
  }, [leads.data, query]);

  const qc = useQueryClient();
  const remove = useServerFn(deleteLeadAudit);
  const [target, setTarget] = useState<LeadAuditRow | null>(null);
  const deleteMut = useMutation({
    mutationFn: (sessionId: string) => remove({ data: { sessionId } }),
    onSuccess: async () => {
      setTarget(null);
      await qc.invalidateQueries({ queryKey: ["admin", "lead-audits"] });
    },
  });

  return (
    <div className="app-content py-16 flex flex-col gap-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl">Lead audits</h1>
        <p className="text-ink-muted text-sm max-w-prose">
          Audits taken through the public link, by people without an account.
        </p>
      </header>

      <section className="flex flex-col gap-4">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or email"
          className="max-w-sm"
        />

        {leads.isLoading && <p className="text-ink-muted text-sm">Loading…</p>}
        {leads.error && (
          <p className="text-sm text-[var(--red)]">
            {(leads.error as Error).message}
          </p>
        )}

        {leads.data && leads.data.length === 0 && (
          <div className="border border-border rounded-xl px-5 py-10 text-sm text-ink-muted">
            No one has taken the public audit yet.
          </div>
        )}

        {leads.data && leads.data.length > 0 && filtered.length === 0 && (
          <p className="text-ink-muted text-sm">No lead audits match.</p>
        )}

        {filtered.length > 0 && (
          <ul className="flex flex-col divide-y divide-border border border-border rounded-xl">
            {filtered.map((row) => (
              <li key={row.sessionId}>
                <Link
                  to="/app/admin/lead-audits/$sessionId"
                  params={{ sessionId: row.sessionId }}
                  className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-[var(--surface-raised)] transition-colors"
                >
                  <div className="flex flex-col min-w-0">
                    <span className="text-ink text-sm truncate">
                      {row.name?.trim() || row.email || "Unnamed"}
                    </span>
                    {row.name?.trim() && row.email && (
                      <span className="text-ink-muted text-xs truncate">
                        {row.email}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-ink-muted text-xs tabular-nums">
                      {formatDate(row.createdAt)}
                    </span>
                    <span className="text-ink-muted text-xs tabular-nums">
                      {row.completedSections} of 6
                    </span>
                    <span className="text-ink-muted text-xs">
                      {row.status === "completed" ? "Completed" : "In progress"}
                    </span>
                    <span className="text-ink-muted text-xs">Open →</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
