import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Download, Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DeleteLeadAuditDialog } from "@/components/admin/DeleteLeadAuditDialog";
import { deleteLeadAudit, getLeadAudit, getLeadAuditExportData } from "@/lib/leadAudits.functions";
import { exportToMarkdown, hasAnySubmission } from "@/tools/selling-systems-audit/admin/exportToMarkdown";
import { downloadMarkdown } from "@/lib/download-file";
import { ConversionAdminTab } from "@/tools/selling-systems-audit/admin/ConversionAdminTab";
import { SectionAdminTab } from "@/tools/selling-systems-audit/admin/SectionAdminTab";
import { PipelineAdminReadBack } from "@/tools/selling-systems-audit/admin/PipelineAdminReadBack";
import { ProcessAdminReadBack } from "@/tools/selling-systems-audit/admin/ProcessAdminReadBack";
import { ActivityAdminReadBack } from "@/tools/selling-systems-audit/admin/ActivityAdminReadBack";
import { MessagingAdminReadBack } from "@/tools/selling-systems-audit/admin/MessagingAdminReadBack";
import { AlignmentAdminReadBack } from "@/tools/selling-systems-audit/admin/AlignmentAdminReadBack";

export const Route = createFileRoute(
  "/_authenticated/app/admin/lead-audits/$sessionId",
)({
  component: LeadAuditDetail,
  head: () => ({
    meta: [
      { title: "Lead audit · Sales Lab admin" },
      {
        name: "description",
        content: "Review a public Selling Systems Audit submission.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
});

/** Six sections only — lead audits have no Content Review step. */
const SECTION_TABS = [
  { key: "conversion", label: "Conversion" },
  { key: "pipeline", label: "Pipeline" },
  { key: "process", label: "Process" },
  { key: "activity", label: "Activity" },
  { key: "messaging", label: "Messaging" },
  { key: "alignment", label: "Alignment" },
] as const;

type TabKey = (typeof SECTION_TABS)[number]["key"];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function LeadAuditDetail() {
  const { sessionId } = Route.useParams();
  const [tab, setTab] = useState<TabKey>("conversion");
  const load = useServerFn(getLeadAudit);
  const leadQ = useQuery({
    queryKey: ["admin", "lead-audit", sessionId],
    queryFn: () => load({ data: { sessionId } }),
  });

  const lead = leadQ.data ?? null;
  const auditId = lead?.auditId ?? null;
  const fetchExport = useServerFn(getLeadAuditExportData);
  const exportMut = useMutation({
    mutationFn: async () => {
      const data = await fetchExport({ data: { sessionId } });
      if (!hasAnySubmission(data)) throw new Error("Nothing to export yet.");
      const markdown = exportToMarkdown(data);
      const nameSource = data.owner.fullName?.trim() || data.owner.email.split("@")[0];
      const slug = nameSource.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "lead";
      const today = new Date().toISOString().slice(0, 10);
      downloadMarkdown(`audit-${slug}-${today}.md`, markdown);
    },
  });

  const navigate = useNavigate();
  const qc = useQueryClient();
  const remove = useServerFn(deleteLeadAudit);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const deleteMut = useMutation({
    mutationFn: () => remove({ data: { sessionId } }),
    onSuccess: async () => {
      setConfirmOpen(false);
      await qc.invalidateQueries({ queryKey: ["admin", "lead-audits"] });
      navigate({ to: "/app/admin/lead-audits" });
    },
  });

  return (
    <div className="app-content py-12 flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Link
          to="/app/admin/lead-audits"
          className="inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink transition-colors w-fit"
        >
          <ArrowLeft className="size-3.5" />
          All lead audits
        </Link>
        <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl">
            {lead?.name?.trim() ||
              lead?.email ||
              (leadQ.isLoading ? "…" : "Unknown")}
            </h1>
            <p className="text-ink-muted text-sm">
            {[
              lead?.name?.trim() ? lead.email : null,
              lead ? `Started ${formatDate(lead.createdAt)}` : null,
              lead?.completedAt
                ? `Submitted ${formatDate(lead.completedAt)}`
                : lead
                  ? `${lead.completedSections} of 6 sections`
                  : null,
            ]
              .filter(Boolean)
              .join(" · ")}
            </p>
            {lead && (
              <p className="text-xs text-ink-muted">
                {lead.consentGivenAt
                  ? `Consent given ${formatDate(lead.consentGivenAt)}`
                  : "No consent recorded"}
              </p>
            )}
          </div>
          <div className="flex flex-col items-start sm:items-end gap-1 shrink-0">
            <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                deleteMut.reset();
                setConfirmOpen(true);
              }}
              className="text-ink-muted hover:text-[var(--red)]"
            >
              <Trash2 className="size-3.5" aria-hidden />
              Delete
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => exportMut.mutate()} disabled={!auditId || exportMut.isPending}>
              {exportMut.isPending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Download className="size-3.5" aria-hidden />}
              {exportMut.isPending ? "Exporting…" : "Export to MD"}
            </Button>
            </div>
            {exportMut.error && <span className="text-xs text-[var(--red)]">{(exportMut.error as Error).message}</span>}
          </div>
        </header>
      </div>

      {leadQ.error && (
        <p className="text-sm text-[var(--red)]">
          {(leadQ.error as Error).message}
        </p>
      )}

      {lead && !auditId && (
        <div className="border border-border rounded-xl px-5 py-8 text-sm text-ink-muted">
          This lead audit has no audit attached.
        </div>
      )}

      {auditId && lead && (
        <>
          <nav
            role="tablist"
            aria-label="Audit sections"
            className="flex gap-1 border-b border-border overflow-x-auto no-scrollbar"
          >
            {SECTION_TABS.map((t) => {
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(t.key)}
                  className={cn(
                    "px-3 py-2 text-sm transition-colors border-b-2 -mb-px whitespace-nowrap",
                    active
                      ? "border-ink text-ink font-medium"
                      : "border-transparent text-ink-muted hover:text-ink",
                  )}
                >
                  {t.label}
                </button>
              );
            })}
          </nav>

          <section className="min-h-[40vh]">
            {tab === "conversion" && (
              <ConversionAdminTab auditId={auditId} readBackOnly={{ currency: lead.currency as import("@/lib/format-currency").CurrencyCode | null }} />
            )}
            {tab === "pipeline" && (
              <SectionAdminTab
                auditId={auditId}
                readBackOnly={{ currency: lead.currency as import("@/lib/format-currency").CurrencyCode | null }}
                sectionKey="pipeline"
                sectionLabel="Pipeline"
                renderReadBack={(answers, currency) => (
                  <PipelineAdminReadBack answers={answers} currency={currency} />
                )}
              />
            )}
            {tab === "process" && (
              <SectionAdminTab
                auditId={auditId}
                readBackOnly={{ currency: null }}
                sectionKey="process"
                sectionLabel="Process"
                renderReadBack={(answers) => (
                  <ProcessAdminReadBack answers={answers} />
                )}
              />
            )}
            {tab === "activity" && (
              <SectionAdminTab
                auditId={auditId}
                readBackOnly={{ currency: null }}
                sectionKey="activity"
                sectionLabel="Activity"
                renderReadBack={(answers) => (
                  <ActivityAdminReadBack answers={answers} />
                )}
              />
            )}
            {tab === "messaging" && (
              <SectionAdminTab
                auditId={auditId}
                readBackOnly={{ currency: null }}
                sectionKey="messaging"
                sectionLabel="Messaging"
                renderReadBack={(answers) => (
                  <MessagingAdminReadBack answers={answers} />
                )}
              />
            )}
            {tab === "alignment" && (
              <SectionAdminTab
                auditId={auditId}
                readBackOnly={{ currency: null }}
                sectionKey="alignment"
                sectionLabel="Alignment"
                renderReadBack={(answers) => (
                  <AlignmentAdminReadBack answers={answers} />
                )}
              />
            )}
          </section>
        </>
      )}

      <DeleteLeadAuditDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!deleteMut.isPending) setConfirmOpen(open);
        }}
        name={lead?.name ?? null}
        email={lead?.email ?? null}
        isPending={deleteMut.isPending}
        error={deleteMut.error ? (deleteMut.error as Error).message : null}
        onConfirm={() => deleteMut.mutate()}
      />
    </div>
  );
}
