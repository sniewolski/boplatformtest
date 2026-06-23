import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listReviewAssets } from "@/tools/selling-systems-audit/content/admin.functions";
import { CONTENT_CATEGORIES } from "@/tools/selling-systems-audit/content/config";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/app/admin/content")({
  component: AdminContentList,
});

function categoryLabel(key: string) {
  return CONTENT_CATEGORIES.find((c) => c.key === key)?.label ?? key;
}

function relativeTime(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(iso).toLocaleDateString();
}

type StatusFilter = "pending" | "all" | "reviewed";

function AdminContentList() {
  const [status, setStatus] = useState<StatusFilter>("pending");
  const list = useServerFn(listReviewAssets);
  const q = useQuery({
    queryKey: ["admin-content-assets", status],
    queryFn: () => list({ data: { status } }),
  });

  return (
    <div className="app-content py-16 flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <Link to="/app/admin" className="text-ink-muted text-xs hover:text-ink">
          ← Admin
        </Link>
        <h1 className="text-3xl">Sales Content Review</h1>
        <p className="text-ink-muted text-sm">
          Owner-submitted content awaiting coach feedback.
        </p>
      </header>

      <div className="flex gap-2">
        {(["pending", "reviewed", "all"] as StatusFilter[]).map((s) => (
          <Button
            key={s}
            variant={s === status ? "default" : "outline"}
            size="sm"
            onClick={() => setStatus(s)}
            className="capitalize"
          >
            {s}
          </Button>
        ))}
      </div>

      {q.isLoading && <p className="text-ink-muted text-sm">Loading…</p>}
      {q.error && (
        <p className="text-sm text-[var(--red)]">{(q.error as Error).message}</p>
      )}
      {q.data && q.data.length === 0 && (
        <p className="text-ink-muted text-sm">No assets in this view.</p>
      )}

      {q.data && q.data.length > 0 && (
        <ul className="flex flex-col divide-y divide-border border border-border rounded-xl">
          {q.data.map((a) => (
            <li key={a.id}>
              <Link
                to="/app/admin/content/$assetId"
                params={{ assetId: a.id }}
                className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-[var(--surface-raised)] transition-colors"
              >
                <div className="flex flex-col min-w-0 gap-1">
                  <span className="text-ink text-sm truncate">{a.title}</span>
                  <span className="text-ink-muted text-xs truncate">
                    {categoryLabel(a.category)} · {a.input_type} ·{" "}
                    {a.owner_email} · {relativeTime(a.created_at)}
                  </span>
                </div>
                <span
                  className={`text-xs uppercase tracking-wider shrink-0 ${
                    a.review_status === "reviewed"
                      ? "text-ink-muted"
                      : "text-ink"
                  }`}
                >
                  {a.review_status === "reviewed" ? "Reviewed" : "Pending"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
