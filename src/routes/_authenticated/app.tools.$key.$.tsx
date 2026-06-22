import { createFileRoute, notFound } from "@tanstack/react-router";
import { toolRegistry } from "@/tools/registry";

export const Route = createFileRoute("/_authenticated/app/tools/$key/$")({
  loader: ({ params }) => {
    const tool = toolRegistry.find((t) => t.key === params.key);
    if (!tool) throw notFound();
    return { tool };
  },
  component: ToolMountPoint,
  notFoundComponent: () => (
    <div className="max-w-2xl mx-auto px-8 py-16 flex flex-col gap-3">
      <h1 className="text-2xl">Tool not found</h1>
      <p className="text-ink-muted text-sm">
        No tool is registered for this URL.
      </p>
    </div>
  ),
});

function ToolMountPoint() {
  const { tool } = Route.useLoaderData();
  // Phase 3 wires the manifest's appRoutes here. Until then, this is the
  // single delegation point — siblings never import each other.
  return (
    <div className="max-w-3xl mx-auto px-8 py-16 flex flex-col gap-4">
      <h1 className="text-2xl">{tool.name}</h1>
      <p className="text-ink-muted text-sm">{tool.description}</p>
      <p className="text-ink-muted text-sm">
        This tool has no UI mounted yet.
      </p>
    </div>
  );
}
