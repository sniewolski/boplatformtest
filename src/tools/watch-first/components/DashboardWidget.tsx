import { Link } from "@tanstack/react-router";
import {
  useWatchFirstLessons,
  useWatchFirstProgress,
} from "../useWatchFirst";

const TILE_CLASSES =
  "block border border-border rounded-xl p-5 aspect-[4/3] flex flex-col h-full hover:bg-[var(--surface-raised)] transition-[background-color] duration-[120ms]";

/**
 * "Start Here" dashboard tile for Watch First.
 *
 * Renders nothing while lessons load, when no lessons exist, or once every
 * lesson is watched — onboarding disappears from the dashboard when done.
 */
export function WatchFirstDashboardWidget() {
  const lessonsQuery = useWatchFirstLessons();
  const progressQuery = useWatchFirstProgress();

  if (lessonsQuery.isLoading || progressQuery.isLoading) return null;

  const lessons = lessonsQuery.data ?? [];
  const watchedIds = new Set((progressQuery.data ?? []).map((p) => p.lesson_id));

  // No lessons at all, or everything watched — render nothing.
  if (lessons.length === 0) return null;
  const watchedCount = lessons.filter((l) => watchedIds.has(l.id)).length;
  if (watchedCount >= lessons.length) return null;

  const started = watchedCount > 0;
  const pct = Math.round((watchedCount / lessons.length) * 100);

  return (
    <Link
      to="/app/tools/$key/$"
      params={{ key: "watch-first", _splat: "" }}
      className={TILE_CLASSES}
    >
      <span className="text-ink-muted text-xs uppercase tracking-wider">
        Onboarding
      </span>
      <div className="flex-1 flex flex-col justify-center gap-2">
        <span
          className="text-ink text-2xl font-medium"
          style={{ letterSpacing: "-0.01em" }}
        >
          Start here
        </span>
        {started ? (
          <>
            <div className="h-1.5 w-full rounded-full bg-[var(--surface-raised)] overflow-hidden">
              <div
                className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-[200ms] ease-out motion-reduce:transition-none"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-ink-muted text-sm">
              {watchedCount} of {lessons.length} watched
            </span>
          </>
        ) : (
          <span className="text-ink-muted text-sm">
            A few short lessons to get you set up.
          </span>
        )}
      </div>
      <span className="text-sm font-medium text-[var(--accent)]">
        {started ? "Continue watching" : "Watch the first lesson"}
      </span>
    </Link>
  );
}
