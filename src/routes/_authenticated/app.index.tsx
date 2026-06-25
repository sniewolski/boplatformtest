import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarCheck, Lock } from "lucide-react";
import { toolRegistry } from "@/tools/registry";
import { useSession } from "@/core/auth/useSession";
import { useBookingReadiness } from "@/lib/useBookingReadiness";

export const Route = createFileRoute("/_authenticated/app/")({
  component: Dashboard,
});

const BOOK_TILE_CLASSES =
  "block border border-border rounded-xl p-5 aspect-[4/3] flex flex-col h-full hover:bg-[var(--surface-raised)] transition-[background-color] duration-[120ms]";

function BookCallTile() {
  const { session } = useSession();
  const userId = session?.user.id;
  const { allComplete } = useBookingReadiness(userId);

  if (!allComplete) {
    return (
      <div
        className={BOOK_TILE_CLASSES + " opacity-50"}
        aria-disabled="true"
      >
        <span className="text-ink-muted text-xs uppercase tracking-wider">
          Book a 1:1 call
        </span>
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-2">
          <Lock
            className="size-8 text-ink-muted"
            strokeWidth={1.5}
            aria-label="Locked until audit and assessment are complete"
          />
          <span className="text-ink-muted text-sm">
            Finish your audit and assessment to unlock.
          </span>
        </div>
      </div>
    );
  }

  return (
    <Link to="/app/book-call" className={BOOK_TILE_CLASSES}>
      <span className="text-ink-muted text-xs uppercase tracking-wider">
        Book a 1:1 call
      </span>
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-2">
        <CalendarCheck className="size-8 text-ink" strokeWidth={1.5} />
        <span
          className="text-ink text-2xl font-medium"
          style={{ letterSpacing: "-0.01em" }}
        >
          You're ready
        </span>
      </div>
    </Link>
  );
}

function Dashboard() {
  const hasTools = toolRegistry.length > 0;

  return (
    <div className="app-content py-16 flex flex-col gap-8">
      <header>
        <h1 className="text-3xl">Dashboard</h1>
      </header>

      {!hasTools ? (
        <div className="border border-border rounded-xl px-6 py-8">
          <p className="text-ink text-sm">
            No tools are mounted yet. When tools are added they will appear here and
            in the sidebar.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {toolRegistry.map((tool) => (
            <li key={tool.key}>
              {tool.dashboardWidget ? (
                tool.dashboardWidget.render()
              ) : (
                <div className="border border-border rounded-xl px-5 py-4 flex flex-col gap-1">
                  <span className="text-ink font-medium">{tool.name}</span>
                  <span className="text-ink-muted text-sm">{tool.description}</span>
                </div>
              )}
            </li>
          ))}
          <li>
            <BookCallTile />
          </li>
        </ul>
      )}
    </div>
  );
}
