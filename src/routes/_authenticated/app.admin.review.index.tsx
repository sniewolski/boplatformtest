import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Check, Minus } from "lucide-react";
import { listOwners } from "@/lib/admin.functions";
import { listOwnerReviewStatuses } from "@/lib/adminReviewStatus.functions";
import { Input } from "@/components/ui/input";
import { useMyRoles } from "@/core/roles/useMyRoles";
import { salesOperatingSystemAuditManifest } from "@/tools/sales-operating-system-audit/manifest";
import { getSosaReviewStatus, sosaReviewStatusLabel, type SosaReviewStatus } from "@/tools/sales-operating-system-audit/engine/adminReview";

export const Route = createFileRoute("/_authenticated/app/admin/review/")({
  component: ReviewRoster,
  head: () => ({ meta: [
    { title: "Owner Review | Salesman Lab" },
    { name: "description", content: "Review owner submissions and Sales OS Audit progress in Salesman Lab." },
    { property: "og:title", content: "Owner Review | Salesman Lab" },
    { property: "og:description", content: "Review owner submissions and audit progress." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
});

function ReviewRoster() {
  const { user } = Route.useRouteContext();
  const { data: roles } = useMyRoles(user.id);
  const showSosa = roles?.includes("admin") || (!salesOperatingSystemAuditManifest.adminOnly && roles?.includes("mentor"));
  const list = useServerFn(listOwners);
  const owners = useQuery({
    queryKey: ["admin", "owners"],
    queryFn: () => list(),
  });

  const listStatuses = useServerFn(listOwnerReviewStatuses);
  const statuses = useQuery({
    queryKey: ["admin", "owner-review-statuses"],
    queryFn: () => listStatuses(),
  });

  const statusById = useMemo(() => {
    const map = new Map<
      string,
      { auditSubmitted: boolean; salescodeTaken: boolean; briefFilled: boolean; sosaStatus?: SosaReviewStatus }
    >();
    for (const s of statuses.data ?? []) {
      map.set(s.ownerId, {
        auditSubmitted: s.auditSubmitted,
        salescodeTaken: s.salescodeTaken,
        briefFilled: s.briefFilled,
        sosaStatus: s.sosaStatus,
      });
    }
    return map;
  }, [statuses.data]);

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
        <h1 className="text-3xl">Review</h1>
        <p className="text-ink-muted text-sm max-w-prose">
          Pick an owner to review everything they've submitted.
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
            {filtered.map((row) => {
              const s = statusById.get(row.id);
              return (
                <li key={row.id}>
                  <Link
                    to="/app/admin/review/$ownerId"
                    params={{ ownerId: row.id }}
                    className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-[var(--surface-raised)] transition-colors"
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
                    <div className="flex flex-wrap items-center justify-end gap-4">
                      <StatusPill
                        label="Audit"
                        done={!!s?.auditSubmitted}
                      />
                      <StatusPill
                        label="SalesCode"
                        done={!!s?.salescodeTaken}
                      />
                      <StatusPill
                        label="Brief"
                        done={!!s?.briefFilled}
                        doneAria="filled"
                        notDoneAria="not filled"
                      />

                      {showSosa && <span className="text-xs text-ink-muted">Sales OS Audit: {statuses.isPending ? "Loading…" : statuses.error ? "Unavailable" : sosaReviewStatusLabel(s?.sosaStatus ?? getSosaReviewStatus({}, null))}</span>}
                      <span className="text-ink-muted text-xs">Review →</span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatusPill({
  label,
  done,
  doneAria = "submitted",
  notDoneAria = "not submitted",
}: {
  label: string;
  done: boolean;
  doneAria?: string;
  notDoneAria?: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 text-xs text-ink-muted tabular-nums"
      aria-label={`${label} ${done ? doneAria : notDoneAria}`}
    >
      {done ? (
        <Check className="size-3.5 text-ink" strokeWidth={2.5} aria-hidden />
      ) : (
        <Minus className="size-3.5" aria-hidden />
      )}
      {label}
    </span>
  );
}
