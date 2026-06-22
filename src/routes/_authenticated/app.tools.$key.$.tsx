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
      <p className="text-ink-muted text-sm">No tool is registered for this URL.</p>
    </div>
  ),
});

function ToolMountPoint() {
  const { tool } = Route.useLoaderData();
  const params = Route.useParams() as { key: string; _splat?: string };
  const splat = params._splat ?? "";

  if (!tool.Component) {
    return (
      <div className="max-w-3xl mx-auto px-8 py-16 flex flex-col gap-4">
        <h1 className="text-2xl">{tool.name}</h1>
        <p className="text-ink-muted text-sm">{tool.description}</p>
        <p className="text-ink-muted text-sm">This tool has no UI mounted yet.</p>
      </div>
    );
  }

  const ToolComponent = tool.Component;
  return <ToolComponent splat={splat} />;
}
