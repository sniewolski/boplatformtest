import { lazy, Suspense } from "react";
import type { ToolComponentProps } from "@/tools/registry";
import { SopsOverview } from "./Overview";

const SopDetail = lazy(() =>
  import("./SopDetail").then((m) => ({ default: m.SopDetail })),
);

/**
 * In-tool router for SOPs.
 *
 *   ""          → search + folder list (Uncategorized inline when non-empty)
 *   "<sopId>"   → PDF preview + download
 */
export function SopsApp({ splat }: ToolComponentProps) {
  const segment = (splat || "").split("/")[0] ?? "";
  if (segment) {
    return (
      <Suspense
        fallback={
          <div className="app-content py-16">
            <p className="text-ink-muted text-sm">Loading…</p>
          </div>
        }
      >
        <SopDetail sopId={segment} />
      </Suspense>
    );
  }
  return <SopsOverview />;
}
