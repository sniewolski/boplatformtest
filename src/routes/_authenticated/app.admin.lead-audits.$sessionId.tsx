import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { getLeadAudit } from "@/lib/leadAudits.functions";
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
  const qc = useQueryClient();

  const load = useServerFn(getLeadAudit);
  const leadQ = useQuery({
    queryKey: ["admin", "lead-audit", sessionId],
    queryFn: () => load({ data: { sessionId } }),
  });

  const lead = leadQ.data ?? null;
  const auditId = lead?.auditId ?? null;
  const ownerId = lead?.holdingOwnerId ?? null;

  /**
   * The shared section tabs read the currency through
   * useOwnerCurrency(ownerId) — `owner_settings`, which the holding account
   * has no row in. Rather than editing the shared components, we prime that
   * exact query with the currency stored on the lead's session payload and
   * pin it so it is never refetched away.
   */
  if (ownerId) {
    const key = ["admin-audit", "currency", ownerId];
    if (qc.getQueryData(key) === undefined) {
      qc.setQueryDefaults(key, {
        staleTime: Infinity,
        gcTime: Infinity,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      });
      qc.setQueryData(key, lead?.currency ?? null);
    }
  }

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
        <header className="flex flex-col gap-1">
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

      {auditId && ownerId && (
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
              <ConversionAdminTab ownerId={ownerId} auditId={auditId} />
            )}
            {tab === "pipeline" && (
              <SectionAdminTab
                ownerId={ownerId}
                auditId={auditId}
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
                auditId={auditId}
                sectionKey="process"
                sectionLabel="Process"
                renderReadBack={(answers) => (
                  <ProcessAdminReadBack answers={answers} />
                )}
              />
            )}
            {tab === "activity" && (
              <SectionAdminTab
                ownerId={ownerId}
                auditId={auditId}
                sectionKey="activity"
                sectionLabel="Activity"
                renderReadBack={(answers) => (
                  <ActivityAdminReadBack answers={answers} />
                )}
              />
            )}
            {tab === "messaging" && (
              <SectionAdminTab
                ownerId={ownerId}
                auditId={auditId}
                sectionKey="messaging"
                sectionLabel="Messaging"
                renderReadBack={(answers) => (
                  <MessagingAdminReadBack answers={answers} />
                )}
              />
            )}
            {tab === "alignment" && (
              <SectionAdminTab
                ownerId={ownerId}
                auditId={auditId}
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
    </div>
  );
}
