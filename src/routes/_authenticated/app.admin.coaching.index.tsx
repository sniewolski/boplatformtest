import { createFileRoute, Link } from "@tanstack/react-router";
import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  formatWaiting,
  ownerLabel,
  splitCoachingInbox,
  useCoachingInbox,
  type CoachingInboxRow,
} from "@/lib/useCoachingInbox";

export const Route = createFileRoute("/_authenticated/app/admin/coaching/")({
  component: CoachingInbox,
  head: () => ({
    meta: [
      { title: "Chat inbox · Sales Lab admin" },
      { name: "description", content: "Owner coaching threads awaiting a reply, and every owner's thread." },
      { property: "og:title", content: "Chat inbox · Sales Lab admin" },
      { property: "og:description", content: "Owner coaching threads awaiting a reply, and every owner's thread." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function formatActivity(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    ...(d.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}),
  });
}

function CoachingInbox() {
  const inbox = useCoachingInbox(true);
  const { awaiting, others } = splitCoachingInbox(inbox.data ?? []);

  return (
    <div className="app-content py-16 flex flex-col gap-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl">Chat inbox</h1>
        <p className="text-ink-muted text-sm max-w-prose">
          Private threads with each owner. Threads waiting on a reply come first.
        </p>
      </header>

      {inbox.isLoading && <p className="text-ink-muted text-sm">Loading…</p>}
      {inbox.isError && (
        <div className="flex flex-col items-start gap-2 text-sm">
          <p className="text-ink-muted">Couldn't load the inbox.</p>
          <Button variant="outline" size="sm" onClick={() => inbox.refetch()}>
            <RotateCw className="size-4" />
            Try again
          </Button>
        </div>
      )}

      {inbox.isSuccess && (
        <>
          <section className="flex flex-col gap-3" aria-labelledby="awaiting-heading">
            <h2 id="awaiting-heading" className="text-lg font-medium text-ink">
              Awaiting reply
              {awaiting.length > 0 && (
                <span className="ml-2 text-ink-muted font-normal tabular-nums">{awaiting.length}</span>
              )}
            </h2>
            {awaiting.length === 0 ? (
              <p className="text-ink-muted text-sm">You're all caught up.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border border border-border rounded-xl list-none">
                {awaiting.map((r) => (
                  <InboxRow
                    key={r.owner_id}
                    row={r}
                    meta={
                      <span className="text-[var(--red)] text-xs font-medium tabular-nums whitespace-nowrap">
                        Waiting {formatWaiting(r.awaiting_since ?? r.last_message_at ?? new Date().toISOString())}
                      </span>
                    }
                  />
                ))}
              </ul>
            )}
          </section>

          <section className="flex flex-col gap-3" aria-labelledby="all-heading">
            <h2 id="all-heading" className="text-lg font-medium text-ink">
              All owners
            </h2>
            {others.length === 0 ? (
              <p className="text-ink-muted text-sm">No other owners.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border border border-border rounded-xl list-none">
                {others.map((r) => (
                  <InboxRow
                    key={r.owner_id}
                    row={r}
                    meta={
                      r.last_message_at ? (
                        <span className="text-ink-muted text-xs tabular-nums whitespace-nowrap">
                          {formatActivity(r.last_message_at)}
                        </span>
                      ) : null
                    }
                  />
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function InboxRow({ row, meta }: { row: CoachingInboxRow; meta: React.ReactNode }) {
  return (
    <li>
      <Link
        to="/app/admin/coaching/$ownerId"
        params={{ ownerId: row.owner_id }}
        className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:gap-4 px-5 py-4 hover:bg-[var(--surface-raised)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl transition-colors"
      >
        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
          <span className="text-sm font-medium text-ink break-words sm:truncate">{ownerLabel(row)}</span>
          <span className="text-sm text-ink-muted line-clamp-2 break-words sm:line-clamp-none sm:truncate">
            {row.last_message_body ?? "No messages yet"}
          </span>
        </div>
        <div className="shrink-0 flex flex-row flex-wrap gap-x-3 gap-y-1 sm:flex-col sm:items-end sm:gap-1">
          {meta}
          {row.tasks_total > 0 && (
            <span className="text-xs text-ink-muted tabular-nums whitespace-nowrap">
              {row.tasks_done}/{row.tasks_total} tasks
            </span>
          )}
        </div>
      </Link>
    </li>
  );
}
