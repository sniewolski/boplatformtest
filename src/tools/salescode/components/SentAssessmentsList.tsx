import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listMyRespondentSessions } from "@/lib/sessions.functions";
import { SalesCodeResultView } from "./SalesCodeResultView";
import type { SalesCodeResult } from "../lib/types";

/**
 * Owner-side list of respondents the owner has sent SalesCode links to.
 * Completed rows expand inline into the same SalesCodeResultView the
 * respondent saw. Raw answer payloads are intentionally not shown.
 */
export function SentAssessmentsList() {
  const list = useServerFn(listMyRespondentSessions);
  const query = useQuery({
    queryKey: ["sessions", "salescode"],
    queryFn: () => list(),
  });

  const [openId, setOpenId] = useState<string | null>(null);

  if (query.isLoading) {
    return <p className="text-sm text-ink-muted">Loading…</p>;
  }
  if (query.error) {
    return (
      <p className="text-sm text-red">
        {(query.error as Error).message}
      </p>
    );
  }

  const rows = (query.data ?? []).filter((r) => r.tool_key === "salescode");

  if (!rows.length) {
    return (
      <p className="text-sm text-ink-muted">
        You haven't sent any SalesCode links yet.
      </p>
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-surface">
      {rows.map((r) => {
        const isOpen = openId === r.id;
        const isCompleted = r.status === "completed";
        return (
          <li key={r.id} className="flex flex-col">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="flex flex-col min-w-0 grow">
                <span className="text-sm text-ink truncate">
                  {r.respondent_name ?? "—"}
                </span>
                <span className="text-xs text-ink-muted truncate">
                  {r.respondent_email ?? "Not started"}
                </span>
              </div>
              <StatusBadge status={r.status} />
              <span className="text-xs text-ink-muted tabular-nums hidden sm:inline">
                {new Date(r.created_at).toLocaleDateString()}
              </span>
              {isCompleted ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpenId(isOpen ? null : r.id)}
                  className="inline-flex items-center gap-1"
                >
                  {isOpen ? (
                    <ChevronDown className="size-4" />
                  ) : (
                    <ChevronRight className="size-4" />
                  )}
                  {isOpen ? "Hide" : "View"}
                </Button>
              ) : null}
            </div>
            {isOpen && isCompleted ? (
              <ExpandedResult sessionId={r.id} />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function StatusBadge({ status }: { status: string }) {
  const label =
    status === "completed"
      ? "Completed"
      : status === "in_progress"
        ? "In progress"
        : status === "revoked"
          ? "Revoked"
          : status === "expired"
            ? "Expired"
            : "Pending";
  return (
    <span className="text-xs text-ink-muted border border-border rounded-full px-2 py-0.5">
      {label}
    </span>
  );
}

/**
 * Fetch the session's stored result via the public state endpoint
 * (token-scoped, owner already owns the link). We re-use the public
 * /api/public/r/state endpoint with the session token rather than adding
 * a new owner-scoped endpoint.
 */
function ExpandedResult({ sessionId }: { sessionId: string }) {
  const list = useServerFn(listMyRespondentSessions);
  // We already have the token from the list query; refetch is cached.
  const query = useQuery({
    queryKey: ["sessions", "salescode"],
    queryFn: () => list(),
  });
  const row = (query.data ?? []).find((r) => r.id === sessionId);
  const token = row?.token;

  const stateQuery = useQuery({
    queryKey: ["respondent-state", token],
    enabled: !!token,
    queryFn: async () => {
      const res = await fetch("/api/public/r/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) throw new Error("Failed to load result");
      return (await res.json()) as {
        ok: boolean;
        payload: unknown;
        result: unknown;
      };
    },
  });

  if (stateQuery.isLoading) {
    return (
      <div className="px-4 pb-4 text-sm text-ink-muted">Loading result…</div>
    );
  }
  if (stateQuery.error || !stateQuery.data?.ok) {
    return (
      <div className="px-4 pb-4 text-sm text-red">
        Couldn't load this result.
      </div>
    );
  }

  const result = stateQuery.data.result as SalesCodeResult | null;
  if (!result || !result.type) {
    return (
      <div className="px-4 pb-4 text-sm text-ink-muted">
        No result data available.
      </div>
    );
  }

  return (
    <div className="px-4 pb-6 pt-2 border-t border-border bg-background">
      <SalesCodeResultView result={result} />
    </div>
  );
}
