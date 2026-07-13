import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { listOwners } from "@/lib/admin.functions";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ConversionAdminTab } from "@/tools/selling-systems-audit/admin/ConversionAdminTab";
import { SectionAdminTab } from "@/tools/selling-systems-audit/admin/SectionAdminTab";
import { PipelineAdminReadBack } from "@/tools/selling-systems-audit/admin/PipelineAdminReadBack";
import { ProcessAdminReadBack } from "@/tools/selling-systems-audit/admin/ProcessAdminReadBack";
import { ActivityAdminReadBack } from "@/tools/selling-systems-audit/admin/ActivityAdminReadBack";
import { MessagingAdminReadBack } from "@/tools/selling-systems-audit/admin/MessagingAdminReadBack";
import { AlignmentAdminReadBack } from "@/tools/selling-systems-audit/admin/AlignmentAdminReadBack";
import { ContentAdminTab } from "@/tools/selling-systems-audit/admin/ContentAdminTab";
import { getAuditExportData } from "@/tools/selling-systems-audit/admin/auditExport.functions";
import {
  exportToMarkdown,
  hasAnySubmission,
} from "@/tools/selling-systems-audit/admin/exportToMarkdown";
import { downloadMarkdown } from "@/lib/download-file";

const SECTION_TABS = [
  { key: "conversion", label: "Conversion" },
  { key: "pipeline", label: "Pipeline" },
  { key: "process", label: "Process" },
  { key: "activity", label: "Activity" },
  { key: "messaging", label: "Messaging" },
  { key: "alignment", label: "Alignment" },
  { key: "content", label: "Content" },
] as const;

type TabKey = (typeof SECTION_TABS)[number]["key"];

export const Route = createFileRoute("/_authenticated/app/admin/audit/$ownerId")({
  component: OwnerAuditReview,
});

function OwnerAuditReview() {
  const { ownerId } = Route.useParams();
  const list = useServerFn(listOwners);
  const owners = useQuery({
    queryKey: ["admin", "owners"],
    queryFn: () => list(),
  });

  const owner = owners.data?.find((o) => o.id === ownerId) ?? null;
  const [tab, setTab] = useState<TabKey>("conversion");

  const fetchExport = useServerFn(getAuditExportData);
  const exportMut = useMutation({
    mutationFn: async () => {
      const data = await fetchExport({ data: { ownerId } });
      if (!hasAnySubmission(data)) {
        throw new Error("Nothing to export yet.");
      }
      const md = exportToMarkdown(data);
      const nameSource =
        data.owner.fullName?.trim() || data.owner.email.split("@")[0];
      const slug =
        nameSource
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "") || "owner";
      const today = new Date().toISOString().slice(0, 10);
      downloadMarkdown(`audit-${slug}-${today}.md`, md);
    },
  });

  return (
    <div className="app-content py-12 flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Link
          to="/app/admin/audit"
          className="inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink transition-colors w-fit"
        >
          <ArrowLeft className="size-3.5" />
          All owners
        </Link>
        <header className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1 min-w-0">
            <h1 className="text-2xl">
              {owner?.fullName ?? owner?.email ?? (owners.isLoading ? "…" : "Unknown owner")}
            </h1>
            {owner?.fullName && (
              <p className="text-ink-muted text-sm">{owner.email}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => exportMut.mutate()}
              disabled={exportMut.isPending}
            >
              {exportMut.isPending ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <Download className="size-3.5" aria-hidden />
              )}
              {exportMut.isPending ? "Exporting…" : "Export to MD"}
            </Button>
            {exportMut.error && (
              <span className="text-xs text-[var(--red)]">
                {(exportMut.error as Error).message}
              </span>
            )}
          </div>
        </header>
      </div>


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
        {tab === "conversion" && <ConversionAdminTab ownerId={ownerId} />}
        {tab === "pipeline" && (
          <SectionAdminTab
            ownerId={ownerId}
            sectionKey="pipeline"
            sectionLabel="Pipeline"
            renderReadBack={(answers, currency) => (
              <PipelineAdminReadBack answers={answers} currency={currency} />
            )}
          />
        )}
        {tab === "process" && (
          <SectionAdminTab
            ownerId={ownerId}
            sectionKey="process"
            sectionLabel="Process"
            renderReadBack={(answers) => <ProcessAdminReadBack answers={answers} />}
          />
        )}
        {tab === "activity" && (
          <SectionAdminTab
            ownerId={ownerId}
            sectionKey="activity"
            sectionLabel="Activity"
            renderReadBack={(answers) => <ActivityAdminReadBack answers={answers} />}
          />
        )}
        {tab === "messaging" && (
          <SectionAdminTab
            ownerId={ownerId}
            sectionKey="messaging"
            sectionLabel="Messaging"
            renderReadBack={(answers) => <MessagingAdminReadBack answers={answers} />}
          />
        )}
        {tab === "alignment" && (
          <SectionAdminTab
            ownerId={ownerId}
            sectionKey="alignment"
            sectionLabel="Alignment"
            renderReadBack={(answers) => <AlignmentAdminReadBack answers={answers} />}
          />
        )}
        {tab === "content" && <ContentAdminTab ownerId={ownerId} />}
      </section>
    </div>
  );
}
