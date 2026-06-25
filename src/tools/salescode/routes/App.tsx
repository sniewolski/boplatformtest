import type { ToolComponentProps } from "@/tools/registry";
import { SalesCodeOverview } from "./Overview";
import { SalesCodeAssessment } from "./Assessment";
import { SalesCodeResultRoute } from "./Result";

/**
 * In-tool router for SalesCode. Mirrors the audit's splat dispatch.
 *
 *   ""           → overview
 *   "assessment" → stepped form
 *   "result"     → full result renderer
 */
export function SalesCodeApp({ splat }: ToolComponentProps) {
  const segment = (splat || "").split("/")[0] ?? "";
  if (segment === "assessment") return <SalesCodeAssessment />;
  if (segment === "result") return <SalesCodeResultRoute />;
  return <SalesCodeOverview />;
}
