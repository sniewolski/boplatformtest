import { lazy, Suspense } from "react";
import type { ToolComponentProps } from "@/tools/registry";
import { ResourcesOverview } from "./Overview";

const ResourceDetail = lazy(() =>
  import("./ResourceDetail").then((m) => ({ default: m.ResourceDetail })),
);

/**
 * In-tool router for Resources.
 *
 *   ""              → category-grouped library + search
 *   "<resourceId>"  → PDF preview + download
 */
export function ResourcesApp({ splat }: ToolComponentProps) {
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
        <ResourceDetail resourceId={segment} />
      </Suspense>
    );
  }
  return <ResourcesOverview />;
}
