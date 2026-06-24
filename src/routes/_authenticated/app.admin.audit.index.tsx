import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listOwners } from "@/lib/admin.functions";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/app/admin/audit/")({
  component: AuditOwnerPicker,
});

function AuditOwnerPicker() {
  const list = useServerFn(listOwners);
  const owners = useQuery({
    queryKey: ["admin", "owners"],
    queryFn: () => list(),
  });

  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const rows = owners.data ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.email.toLowerCase().includes(q) ||
        (r.fullName ?? "").toLowerCase().includes(q),
    );
  }, [owners.data, query]);

  return (
    <div className="app-content py-16 flex flex-col gap-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl">Audit review</h1>
        <p className="text-ink-muted text-sm max-w-prose">
          Pick an owner to review everything they've submitted, prep the call,
          and keep private notes.
        </p>
      </header>

      <section className="flex flex-col gap-4">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or email"
          className="max-w-sm"
        />

        {owners.isLoading && (
          <p className="text-ink-muted text-sm">Loading…</p>
        )}
        {owners.error && (
          <p className="text-sm text-[var(--red)]">
            {(owners.error as Error).message}
          </p>
        )}
        {owners.data && filtered.length === 0 && (
          <p className="text-ink-muted text-sm">No owners match.</p>
        )}

        {filtered.length > 0 && (
          <ul className="flex flex-col divide-y divide-border border border-border rounded-xl">
            {filtered.map((row) => (
              <li key={row.id}>
                <Link
                  to="/app/admin/audit/$ownerId"
                  params={{ ownerId: row.id }}
                  className="flex items-center justify-between px-5 py-4 hover:bg-[var(--surface-raised)] transition-colors"
                >
                  <div className="flex flex-col min-w-0">
                    <span className="text-ink text-sm truncate">
                      {row.fullName ?? row.email}
                    </span>
                    {row.fullName && (
                      <span className="text-ink-muted text-xs truncate">
                        {row.email}
                      </span>
                    )}
                  </div>
                  <span className="text-ink-muted text-xs">Review →</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
