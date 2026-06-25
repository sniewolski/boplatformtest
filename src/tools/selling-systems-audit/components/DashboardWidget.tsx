import { Link } from "@tanstack/react-router";
import { useSession } from "@/core/auth/useSession";
import { useContentAssets } from "../content/useContentReview";

const TILE_CLASSES =
  "block border border-border rounded-xl p-5 aspect-[4/3] flex flex-col justify-between h-full hover:bg-[var(--surface-raised)] transition-[background-color] duration-[120ms]";

export function DashboardWidget() {
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: assets } = useContentAssets(userId);

  const count = assets?.length ?? 0;

  return (
    <Link
      to="/app/tools/$key/$"
      params={{ key: "selling-systems-audit", _splat: "content" }}
      className={TILE_CLASSES}
    >
      <span className="text-ink-muted text-xs uppercase tracking-wider">
        Selling Systems Audit
      </span>
      <span
        className="text-ink text-4xl font-medium tabular-nums"
        style={{ letterSpacing: "-0.02em" }}
      >
        {count}
      </span>
      <span className="text-ink-muted text-sm">
        {count === 1 ? "content piece added" : "content pieces added"}
      </span>
    </Link>
  );
}
