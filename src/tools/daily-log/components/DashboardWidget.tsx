import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { useDailyLogMonth } from "../data/useDailyLog";

const TILE_CLASSES =
  "block border border-border rounded-xl p-5 aspect-[4/3] flex flex-col h-full hover:bg-[var(--surface-raised)] transition-[background-color] duration-[120ms]";

export function DashboardWidget() {
  const today = new Date();
  const { byDate, entries } = useDailyLogMonth(today);

  const loggedToday = byDate.has(format(today, "yyyy-MM-dd"));
  const daysLogged = entries.length;

  return (
    <Link
      to="/app/tools/$key/$"
      params={{ key: "daily-log", _splat: "today" }}
      className={TILE_CLASSES}
    >
      <span className="text-ink-muted text-xs uppercase tracking-wider">
        Daily Log
      </span>
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-1">
        <span
          className="text-ink text-2xl font-medium"
          style={{ letterSpacing: "-0.01em" }}
        >
          {loggedToday ? "Logged today" : "Not logged yet"}
        </span>
        <span className="text-ink-muted text-sm">
          {daysLogged} {daysLogged === 1 ? "day" : "days"} logged this month
        </span>
      </div>
    </Link>
  );
}
