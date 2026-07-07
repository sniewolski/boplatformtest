import type { ToolComponentProps } from "@/tools/registry";
import { SopsOverview } from "./Overview";
import { SopDetail } from "./SopDetail";

/**
 * In-tool router for SOPs.
 *
 *   ""          → search + folder list (Uncategorized inline when non-empty)
 *   "<sopId>"   → PDF preview + download
 */
export function SopsApp({ splat }: ToolComponentProps) {
  const segment = (splat || "").split("/")[0] ?? "";
  if (segment) return <SopDetail sopId={segment} />;
  return <SopsOverview />;
}
