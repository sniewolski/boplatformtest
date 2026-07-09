import { Link } from "@tanstack/react-router";
import { useSession } from "@/core/auth/useSession";
import { useWillAiConversations } from "@/lib/useWillAi";

const TILE_CLASSES =
  "block border border-border rounded-xl p-5 aspect-[4/3] flex flex-col h-full hover:bg-[var(--surface-raised)] transition-[background-color] duration-[120ms]";

/**
 * Dashboard tile for Will AI.
 *
 * Same shape as the SalesCode / Audit widgets — a single Link-tile. The tiny
 * dynamic detail (past-conversation count) rides on the existing
 * `useWillAiConversations` hook, so it costs no extra request beyond what the
 * chat surface already runs. Falls back to a plain prompt when the count
 * isn't loaded yet or is zero.
 */
export function DashboardWidget() {
  const { session } = useSession();
  const ownerId = session?.user.id ?? null;
  const { data } = useWillAiConversations(ownerId);
  const count = data?.length ?? 0;

  return (
    <Link
      to="/app/tools/$key/$"
      params={{ key: "will-ai", _splat: "" }}
      className={TILE_CLASSES}
    >
      <span className="text-ink-muted text-xs uppercase tracking-wider">
        Will AI
      </span>
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-1">
        <span className="text-ink-muted text-sm">Ask a question</span>
        <span
          className="text-ink text-2xl font-medium"
          style={{ letterSpacing: "-0.01em" }}
        >
          {count > 0
            ? `${count} past chat${count === 1 ? "" : "s"}`
            : "Start a chat"}
        </span>
      </div>
    </Link>
  );
}
