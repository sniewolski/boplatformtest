import type { ToolComponentProps } from "@/tools/registry";
import { useSession } from "@/core/auth/useSession";
import { Navigate } from "@tanstack/react-router";
import { AuditList } from "./AuditList";
import { AuditOverview } from "./AuditOverview";
import { ConversionReview } from "./ConversionReview";
import { ContentReview } from "./ContentReview";
import { PipelineHealth } from "./PipelineHealth";
import { SalesActivity } from "./SalesActivity";
import { SalesProcess } from "./SalesProcess";
import { Messaging } from "./Messaging";
import { Alignment } from "./Alignment";
import { SectionLocked } from "./SectionLocked";
import { AUDIT_SECTIONS } from "../config";
import { useAudits } from "../data/useAudits";

/**
 * In-tool router. Three levels:
 *   ""                      → audit list
 *   "/:auditId"             → that audit's seven-section overview
 *   "/:auditId/:sectionKey" → a section of that audit
 */
export function SellingSystemsAuditApp({ splat }: ToolComponentProps) {
  const { session } = useSession();
  const ownerId = session?.user.id;
  const { data: audits, isLoading } = useAudits(ownerId);

  const parts = (splat || "").split("/").filter(Boolean);
  const auditId = parts[0] ?? "";
  const segment = parts[1] ?? "";

  if (!auditId) return <AuditList />;

  // Wait for the owner's audits before judging the id.
  if (isLoading || !audits) {
    return <div className="app-content py-16 text-ink-muted text-sm">Loading…</div>;
  }

  const audit = audits.find((a) => a.id === auditId);
  if (!audit) {
    return (
      <Navigate
        to="/app/tools/$key/$"
        params={{ key: "selling-systems-audit", _splat: "" }}
        replace
      />
    );
  }

  if (!segment) return <AuditOverview auditId={auditId} auditName={audit.name} />;
  if (segment === "conversion") return <ConversionReview auditId={auditId} />;
  if (segment === "pipeline") return <PipelineHealth auditId={auditId} />;
  if (segment === "process") return <SalesProcess auditId={auditId} />;
  if (segment === "activity") return <SalesActivity auditId={auditId} />;
  if (segment === "messaging") return <Messaging auditId={auditId} />;
  if (segment === "alignment") return <Alignment auditId={auditId} />;
  if (segment === "content") return <ContentReview auditId={auditId} />;

  const locked = AUDIT_SECTIONS.find(
    (s) => s.key === segment && s.status === "locked",
  );
  if (locked) {
    return <SectionLocked title={locked.label} auditId={auditId} />;
  }

  return <AuditOverview auditId={auditId} auditName={audit.name} />;
}
