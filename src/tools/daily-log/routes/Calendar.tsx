import { useMemo, useState } from "react";
import {
  addMonths,
  endOfMonth,
  format,
  getDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Monday-first offset (0 = Monday … 6 = Sunday). */
function mondayOffset(date: Date) {
  return (getDay(date) + 6) % 7;
}

export function DailyLogCalendar() {
  // "today" from the browser's local date — never derived via toISOString().
  const today = useMemo(() => startOfDay(new Date()), []);
  const [cursor, setCursor] = useState(() => startOfMonth(today));

  const currentMonth = startOfMonth(today);
  const atCurrentMonth = isSameMonth(cursor, currentMonth);

  const cells = useMemo(() => {
    const first = startOfMonth(cursor);
    const last = endOfMonth(cursor);
    const lead = mondayOffset(first);
    const days: (Date | null)[] = Array.from({ length: lead }, () => null);
    for (let d = 1; d <= last.getDate(); d++) {
      days.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
    }
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [cursor]);

  return (
    <div className="app-content py-12 flex flex-col gap-8">
      <header className="flex flex-col gap-4">
        <h1 className="text-3xl" style={{ letterSpacing: "-0.02em" }}>
          Daily Log
        </h1>

        <div className="flex items-center justify-between gap-4">
          {/* LEFT: month/year with arrows grouped immediately beside it */}
          <div className="flex items-center gap-3">
            <span className="text-lg font-semibold text-ink">
              {format(cursor, "MMMM yyyy")}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                aria-label="Previous month"
                onClick={() => setCursor((c) => subMonths(c, 1))}
                className="h-8 w-8 rounded-md border border-border flex items-center justify-center text-ink hover:bg-surface-raised transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Next month"
                disabled={atCurrentMonth}
                onClick={() => setCursor((c) => addMonths(c, 1))}
                className="h-8 w-8 rounded-md border border-border flex items-center justify-center text-ink hover:bg-surface-raised transition-colors disabled:text-ink-muted disabled:pointer-events-none disabled:opacity-60"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* RIGHT: Log Today — placed now, wired in Phase 2 */}
          <Button type="button">Log Today</Button>
        </div>
      </header>

      <div className="grid grid-cols-7 gap-2">
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            className="text-xs uppercase tracking-wide text-ink-muted"
          >
            {w}
          </div>
        ))}

        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} aria-hidden className="h-20" />;

          const isToday = day.getTime() === today.getTime();
          const isFuture = day.getTime() > today.getTime();

          return (
            <div
              key={format(day, "yyyy-MM-dd")}
              data-date={format(day, "yyyy-MM-dd")}
              className={[
                "h-20 rounded-xl border bg-background p-3",
                "flex flex-col",
                isFuture
                  ? "text-ink-muted opacity-50 border-[var(--surface-raised)] pointer-events-none"
                  : "text-ink border-border daily-log-tile cursor-pointer",
                isToday ? "ring-1 ring-[var(--red)]" : "",
              ].join(" ")}
            >
              <span className="text-sm font-medium leading-none">{format(day, "d")}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
