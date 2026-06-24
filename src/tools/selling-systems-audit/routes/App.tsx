import type { ToolComponentProps } from "@/tools/registry";
import { AuditOverview } from "./AuditOverview";
import { ConversionReview } from "./ConversionReview";
import { ContentReview } from "./ContentReview";
import { PipelineHealth } from "./PipelineHealth";
import { SectionLocked } from "./SectionLocked";
import { AUDIT_SECTIONS } from "../config";

/**
 * In-tool router. Receives the splat from `/app/tools/selling-systems-audit/*`
 * and dispatches to the right screen. Internal routing keeps the registry
 * mount surface minimal.
 */
export function SellingSystemsAuditApp({ splat }: ToolComponentProps) {
  const segment = (splat || "").split("/")[0] ?? "";

  if (!segment) return <AuditOverview />;
  if (segment === "conversion") return <ConversionReview />;
  if (segment === "pipeline") return <PipelineHealth />;
  if (segment === "content") return <ContentReview />;

  const locked = AUDIT_SECTIONS.find(
    (s) => s.key === segment && s.status === "locked",
  );
  if (locked) {
    return <SectionLocked title={locked.label} description={locked.description} />;
  }

  return <AuditOverview />;
}
