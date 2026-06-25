import type { ToolComponentProps } from "@/tools/registry";
import { SalesCodeOverview } from "./Overview";
import { SalesCodeAssessment } from "./Assessment";

/**
 * In-tool router for SalesCode. Mirrors the audit's splat dispatch.
 *
 *   ""           → overview
 *   "assessment" → stepped form
 *
 * Phase 4 will add the dedicated result renderer; until then the overview
 * carries the post-submit confirmation.
 */
export function SalesCodeApp({ splat }: ToolComponentProps) {
  const segment = (splat || "").split("/")[0] ?? "";
  if (segment === "assessment") return <SalesCodeAssessment />;
  return <SalesCodeOverview />;
}
