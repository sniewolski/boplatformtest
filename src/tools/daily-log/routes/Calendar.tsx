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
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{format(cursor, "MMMM yyyy")}</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => setCursor((c) => subMonths(c, 1))}
            className="h-9 w-9 rounded-md border border-border flex items-center justify-center text-ink hover:bg-surface-raised transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Next month"
            disabled={atCurrentMonth}
            onClick={() => setCursor((c) => addMonths(c, 1))}
            className="h-9 w-9 rounded-md border border-border flex items-center justify-center text-ink hover:bg-surface-raised transition-colors disabled:text-ink-muted disabled:pointer-events-none disabled:opacity-60"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-3">
        {WEEKDAYS.map((w) => (
          <div key={w} className="text-xs uppercase tracking-wide text-ink-muted pb-1">
            {w}
          </div>
        ))}

        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} aria-hidden className="aspect-square" />;

          const isToday = day.getTime() === today.getTime();
          const isFuture = day.getTime() > today.getTime();

          return (
            <div
              key={format(day, "yyyy-MM-dd")}
              data-date={format(day, "yyyy-MM-dd")}
              className={[
                "aspect-square rounded-xl border border-border bg-background p-3",
                "flex flex-col",
                isFuture
                  ? "text-ink-muted pointer-events-none"
                  : "text-ink daily-log-tile cursor-pointer",
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
