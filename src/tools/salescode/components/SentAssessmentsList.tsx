import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronDown, ChevronRight, Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  deleteRespondentSession,
  listMyRespondentSessions,
} from "@/lib/sessions.functions";
import { SalesCodeResultView } from "./SalesCodeResultView";
import type { SalesCodeResult } from "../lib/types";
import { useSession } from "@/core/auth/useSession";
import { useMyProfile } from "@/core/auth/useProfile";
import {
  formatSalesCodeMarkdown,
  salesCodeExportFilename,
} from "@/tools/salescode/admin/exportToMarkdown";
import { downloadMarkdown } from "@/lib/download-file";

/**
 * Owner-side list of respondents the owner has sent SalesCode links to.
 * Completed rows expand inline into the same SalesCodeResultView the
 * respondent saw. Raw answer payloads are intentionally not shown.
 */
export function SentAssessmentsList() {
  const list = useServerFn(listMyRespondentSessions);
  const del = useServerFn(deleteRespondentSession);
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["sessions", "salescode"],
    queryFn: () => list(),
  });

  const [openId, setOpenId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const { session } = useSession();
  const profile = useMyProfile(session?.user.id);
  const ownerName = profile.data?.full_name ?? null;
  const ownerEmail = profile.data?.email ?? session?.user.email ?? "";


  const deleteMutation = useMutation({
    mutationFn: (sessionId: string) => del({ data: { sessionId } }),
    onSuccess: (_data, sessionId) => {
      if (openId === sessionId) setOpenId(null);
      queryClient.invalidateQueries({ queryKey: ["sessions", "salescode"] });
      setPendingDeleteId(null);
    },
  });

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
    <>
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
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Delete sent assessment"
                  onClick={() => setPendingDeleteId(r.id)}
                  className="text-ink-muted hover:text-ink"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
              {isOpen && isCompleted ? (
                <ExpandedResult sessionId={r.id} />
              ) : null}
            </li>
          );
        })}
      </ul>

      <AlertDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => {
          if (!open && !deleteMutation.isPending) setPendingDeleteId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this sent assessment?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the respondent's link and any answers
              they've submitted. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (pendingDeleteId) deleteMutation.mutate(pendingDeleteId);
              }}
              disabled={deleteMutation.isPending}
              className="bg-red text-white hover:bg-red/90"
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
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
      <SalesCodeResultView result={result} variant="respondent" />
    </div>
  );
}
