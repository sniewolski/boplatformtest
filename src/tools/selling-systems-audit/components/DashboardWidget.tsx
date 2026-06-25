import { Link } from "@tanstack/react-router";
import { useSession } from "@/core/auth/useSession";
import { useBookingReadiness } from "@/lib/useBookingReadiness";
import { useContentAssets } from "../content/useContentReview";

const TILE_CLASSES =
  "block border border-border rounded-xl p-5 aspect-[4/3] flex flex-col justify-between h-full hover:bg-[var(--surface-raised)] transition-[background-color] duration-[120ms]";

const AUDIT_SECTION_KEYS = [
  "conversion",
  "pipeline",
  "process",
  "activity",
  "messaging",
  "alignment",
];

export function DashboardWidget() {
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: assets } = useContentAssets(userId);
  const { incomplete } = useBookingReadiness(userId);

  const contentCount = assets?.length ?? 0;
  const auditIncomplete = incomplete.filter((item) =>
    AUDIT_SECTION_KEYS.includes(item.key),
  ).length;
  const completedCount = 6 - auditIncomplete;

  return (
    <Link to="/app/tools/selling-systems-audit" className={TILE_CLASSES}>
      <span className="text-ink-muted text-xs uppercase tracking-wider">
        Selling Systems Audit
      </span>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col">
          <span
            className="text-ink text-4xl font-medium tabular-nums"
            style={{ letterSpacing: "-0.02em" }}
          >
            {completedCount} of 6
          </span>
          <span className="text-ink-muted text-sm">audit sections submitted</span>
        </div>

        <div className="border-t border-border pt-3 flex flex-col">
          <span
            className="text-ink text-lg font-medium tabular-nums"
            style={{ letterSpacing: "-0.01em" }}
          >
            {contentCount}
          </span>
          <span className="text-ink-muted text-sm">
            {contentCount === 1 ? "content piece added" : "content pieces added"}
          </span>
        </div>
      </div>
    </Link>
  );
}
