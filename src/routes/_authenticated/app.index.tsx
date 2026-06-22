import { createFileRoute } from "@tanstack/react-router";
import { toolRegistry } from "@/tools/registry";

export const Route = createFileRoute("/_authenticated/app/")({
  component: Dashboard,
});

function Dashboard() {
  const hasTools = toolRegistry.length > 0;

  return (
    <div className="max-w-3xl mx-auto px-8 py-16 flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl">Dashboard</h1>
        <p className="text-ink-muted text-sm">Your private workspace.</p>
      </header>

      {!hasTools ? (
        <div className="border border-border rounded-xl px-6 py-8">
          <p className="text-ink text-sm">
            No tools are mounted yet. When tools are added they will appear here and
            in the sidebar.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {toolRegistry.map((tool) => (
            <li
              key={tool.key}
              className="border border-border rounded-xl px-5 py-4 flex flex-col gap-1"
            >
              <span className="text-ink font-medium">{tool.name}</span>
              <span className="text-ink-muted text-sm">{tool.description}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
