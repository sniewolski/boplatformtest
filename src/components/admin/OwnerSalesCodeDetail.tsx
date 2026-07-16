import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Download } from "lucide-react";
import { listOwners } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { SalesCodeResultView } from "@/tools/salescode/components/SalesCodeResultView";
import { scoreSalesCode } from "@/tools/salescode/lib/scoring";
import type { AnswerMap, SalesCodeResult } from "@/tools/salescode/lib/types";
import {
  formatSalesCodeMarkdown,
  salesCodeExportFilename,
} from "@/tools/salescode/admin/exportToMarkdown";
import { downloadMarkdown } from "@/lib/download-file";

type IntakeRow = {
  submitted_answers: AnswerMap | null;
  submitted_at: string | null;
};

type SessionRow = {
  id: string;
  token: string;
  status: string;
  respondent_name: string | null;
  respondent_email: string | null;
  created_at: string;
  completed_at: string | null;
  result: SalesCodeResult | null;
};

export function OwnerSalesCodeDetail({ ownerId }: { ownerId: string }) {
  const list = useServerFn(listOwners);
  const owners = useQuery({
    queryKey: ["admin", "owners"],
    queryFn: () => list(),
  });
  const owner = owners.data?.find((o) => o.id === ownerId) ?? null;

  const intake = useQuery({
    queryKey: ["admin", "salescode-intake", ownerId],
    queryFn: async (): Promise<IntakeRow | null> => {
      const { data, error } = await supabase
        .from("salescode_results" as never)
        .select("submitted_answers, submitted_at")
        .eq("owner_id", ownerId)
        .maybeSingle();
      if (error) throw error;
      return (data as IntakeRow | null) ?? null;
    },
  });

  const sessions = useQuery({
    queryKey: ["admin", "salescode-sessions", ownerId],
    queryFn: async (): Promise<SessionRow[]> => {
      const { data, error } = await supabase
        .from("respondent_sessions" as never)
        .select(
          "id, token, status, respondent_name, respondent_email, created_at, completed_at, result",
        )
        .eq("owner_id", ownerId)
        .eq("tool_key", "salescode")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as SessionRow[]) ?? [];
    },
  });

  const [openId, setOpenId] = useState<string | null>(null);

  const submitted = intake.data?.submitted_answers ?? null;
  const ownResult = submitted ? scoreSalesCode(submitted as AnswerMap) : null;

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm uppercase tracking-wide text-ink-muted">
            Self-assessment
          </h2>
          {ownResult ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const input = {
                  kind: "owner" as const,
                  ownerName: owner?.fullName ?? null,
                  ownerEmail: owner?.email ?? "",
                  submittedAt: intake.data?.submitted_at ?? null,
                  result: ownResult,
                };
                downloadMarkdown(
                  salesCodeExportFilename(input),
                  formatSalesCodeMarkdown(input),
                );
              }}
              className="inline-flex items-center gap-1.5"
            >
              <Download className="size-3.5" aria-hidden />
              Export to MD
            </Button>
          ) : null}
        </div>
        {intake.isLoading ? (
          <p className="text-ink-muted text-sm">Loading…</p>
        ) : intake.error ? (
          <p className="text-sm text-[var(--red)]">
            {(intake.error as Error).message}
          </p>
        ) : !ownResult ? (
          <p className="text-ink-muted text-sm">SalesCode not taken yet.</p>
        ) : (
          <SalesCodeResultView result={ownResult} variant="owner" />
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm uppercase tracking-wide text-ink-muted">
          Sent assessments
        </h2>
        {sessions.isLoading ? (
          <p className="text-ink-muted text-sm">Loading…</p>
        ) : sessions.error ? (
          <p className="text-sm text-[var(--red)]">
            {(sessions.error as Error).message}
          </p>
        ) : (sessions.data ?? []).length === 0 ? (
          <p className="text-ink-muted text-sm">
            This owner hasn't sent any SalesCode links yet.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-surface">
            {sessions.data!.map((r) => {
              const isOpen = openId === r.id;
              const isCompleted = r.status === "completed" && r.result?.type;
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
                    {isCompleted && r.result ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label="Export to MD"
                        onClick={() => {
                          const input = {
                            kind: "respondent" as const,
                            ownerName: owner?.fullName ?? null,
                            ownerEmail: owner?.email ?? "",
                            respondentName: r.respondent_name,
                            respondentEmail: r.respondent_email,
                            completedAt: r.completed_at,
                            result: r.result!,
                          };
                          downloadMarkdown(
                            salesCodeExportFilename(input),
                            formatSalesCodeMarkdown(input),
                          );
                        }}
                      >
                        <Download className="size-4" aria-hidden />
                      </Button>
                    ) : null}
                  </div>
                  {isOpen && isCompleted && r.result ? (
                    <div className="px-4 pb-6 pt-2 border-t border-border bg-background">
                      <SalesCodeResultView
                        result={r.result}
                        variant="respondent"
                      />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
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
