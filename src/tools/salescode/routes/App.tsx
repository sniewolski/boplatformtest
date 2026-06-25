import type { ToolComponentProps } from "@/tools/registry";
import { SalesCodeOverview } from "./Overview";

/**
 * In-tool router for SalesCode. Mirrors the audit's splat dispatch.
 *
 * Phase 1 mounts only the overview. The assessment screen, scoring, and
 * result renderer arrive in subsequent phases.
 */
export function SalesCodeApp({ splat }: ToolComponentProps) {
  const segment = (splat || "").split("/")[0] ?? "";
  if (!segment) return <SalesCodeOverview />;
  return <SalesCodeOverview />;
}
