import { createFileRoute, Link } from "@tanstack/react-router";
import { ClipboardList, Gauge } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/admin/review")({
  component: ReviewHub,
});

const TILES = [
  {
    to: "/app/admin/audit",
    label: "Selling Systems Audit",
    description: "Owner-by-owner read-through of each submitted audit section.",
    icon: ClipboardList,
  },
  {
    to: "/app/admin/salescode",
    label: "SalesCode",
    description: "Owner self-assessments and the assessments they've sent out.",
    icon: Gauge,
  },
] as const;

function ReviewHub() {
  return (
    <div className="app-content py-16 flex flex-col gap-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl">Review</h1>
        <p className="text-ink-muted text-sm max-w-prose">
          Pick a tool to review what owners have submitted.
        </p>
      </header>

      <ul className="grid gap-3 sm:grid-cols-2 max-w-2xl">
        {TILES.map((t) => (
          <li key={t.to}>
            <Link
              to={t.to}
              className="flex items-start gap-4 rounded-2xl border border-border p-5 hover:bg-[var(--surface-raised)] transition-colors h-full"
            >
              <t.icon className="size-5 mt-0.5 text-ink-muted shrink-0" />
              <div className="flex flex-col gap-1 min-w-0">
                <span className="text-ink text-sm font-medium">{t.label}</span>
                <span className="text-ink-muted text-xs">{t.description}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
