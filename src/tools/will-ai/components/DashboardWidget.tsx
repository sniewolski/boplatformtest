import { Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { useSession } from "@/core/auth/useSession";
import { useMyRoles } from "@/core/roles/useMyRoles";
import { useWillAiConversations } from "@/lib/useWillAi";
import { useWillAiSettings } from "@/lib/useWillAiSettings";

const TILE_CLASSES =
  "block border border-border rounded-xl p-5 aspect-[4/3] flex flex-col h-full hover:bg-[var(--surface-raised)] transition-[background-color] duration-[120ms]";

const DISABLED_TILE_CLASSES =
  "border border-border rounded-xl p-5 aspect-[4/3] flex flex-col h-full text-ink-muted cursor-not-allowed select-none";

/**
 * Dashboard tile for Will AI.
 *
 * When the admin toggles `will_ai_settings.owner_access_enabled = false`,
 * the tile renders in a greyed non-clickable state for non-admins. Admins
 * always see the normal clickable tile.
 */
export function DashboardWidget() {
  const { session } = useSession();
  const ownerId = session?.user.id ?? null;
  const { data: roles = [] } = useMyRoles(ownerId ?? undefined);
  const isAdmin = roles.includes("admin");
  const { data: settings } = useWillAiSettings();
  const paused = settings?.owner_access_enabled === false && !isAdmin;
  const { data } = useWillAiConversations(ownerId);
  const count = data?.length ?? 0;

  if (paused) {
    return (
      <div className={DISABLED_TILE_CLASSES} aria-disabled="true">
        <span className="text-ink-muted text-xs uppercase tracking-wider">
          Will AI
        </span>
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-2">
          <Lock className="size-5" aria-hidden />
          <span
            className="text-2xl font-medium"
            style={{ letterSpacing: "-0.01em" }}
          >
            Temporarily unavailable
          </span>
        </div>
      </div>
    );
  }

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
