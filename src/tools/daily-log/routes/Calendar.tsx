import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import {
  addMonths,
  endOfMonth,
  format,
  getDay,
  isSameMonth,
  parse,
  startOfDay,
  startOfMonth,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDailyLogMonth } from "../data/useDailyLog";
import { DailyLogEntryDialog } from "../components/EntryDialog";
import { TotalsStrip } from "../components/TotalsStrip";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const VT_NAME = "daily-log-active-tile";

/** Monday-first offset (0 = Monday … 6 = Sunday). */
function mondayOffset(date: Date) {
  return (getDay(date) + 6) % 7;
}

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

export function DailyLogCalendar({ segment }: { segment?: string }) {
  // "today" from the browser's local date — never derived via toISOString().
  const today = useMemo(() => startOfDay(new Date()), []);
  const [cursor, setCursor] = useState(() => startOfMonth(today));
  const [openDate, setOpenDate] = useState<Date | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const currentMonth = startOfMonth(today);
  const atCurrentMonth = isSameMonth(cursor, currentMonth);

  const { entries, byDate, save, isSaving } = useDailyLogMonth(cursor);

  const todayKey = format(today, "yyyy-MM-dd");
  const todayLogged = byDate.has(todayKey);

  /* ── route segment: "today" | "YYYY-MM-DD" — open directly, no flight ── */
  const appliedSegment = useRef<string | null>(null);
  useEffect(() => {
    const seg = (segment ?? "").trim();
    if (!seg || appliedSegment.current === seg) return;
    appliedSegment.current = seg;

    if (seg === "today") {
      setOpenDate(today);
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(seg)) return;
    const parsed = startOfDay(parse(seg, "yyyy-MM-dd", new Date()));
    if (Number.isNaN(parsed.getTime())) return;
    if (parsed.getTime() > today.getTime()) return;
    setCursor(startOfMonth(parsed));
    setOpenDate(parsed);
  }, [segment, today]);

  /* ── view transition: tag the origin tile, then flip state ── */
  const clearNames = useCallback(() => {
    gridRef.current
      ?.querySelectorAll<HTMLElement>("[data-date]")
      .forEach((el) => (el.style.viewTransitionName = ""));
  }, []);

  const runTransition = useCallback(
    (originKey: string | null, update: () => void) => {
      const start = (
        document as Document & {
          startViewTransition?: (cb: () => void) => { finished: Promise<void> };
        }
      ).startViewTransition?.bind(document);

      if (!start || prefersReducedMotion()) {
        update();
        return;
      }

      clearNames();
      const origin = originKey
        ? gridRef.current?.querySelector<HTMLElement>(`[data-date="${originKey}"]`)
        : null;
      if (origin) origin.style.viewTransitionName = VT_NAME;

      const transition = start(() => {
        flushSync(update);
      });
      transition.finished.finally(clearNames);
    },
    [clearNames],
  );

  const openDay = (day: Date) =>
    runTransition(format(day, "yyyy-MM-dd"), () => setOpenDate(day));

  const closeDialog = () => {
    const key = openDate ? format(openDate, "yyyy-MM-dd") : null;
    const visible = openDate ? isSameMonth(openDate, cursor) : false;
    runTransition(visible ? key : null, () => setOpenDate(null));
  };

  const logToday = () => {
    if (!atCurrentMonth) {
      // Land on the current month first so the flight has an on-screen origin.
      setCursor(currentMonth);
      requestAnimationFrame(() => openDay(today));
      return;
    }
    openDay(today);
  };

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

  const openKey = openDate ? format(openDate, "yyyy-MM-dd") : null;

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

          <Button type="button" onClick={logToday}>
            {todayLogged ? "Edit Today" : "Log Today"}
          </Button>
        </div>
      </header>

      <div ref={gridRef} className="grid grid-cols-7 gap-2">
        {WEEKDAYS.map((w) => (
          <div key={w} className="text-xs uppercase tracking-wide text-ink-muted">
            {w}
          </div>
        ))}

        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} aria-hidden className="h-20" />;

          const key = format(day, "yyyy-MM-dd");
          const isToday = day.getTime() === today.getTime();
          const isFuture = day.getTime() > today.getTime();
          const logged = byDate.has(key);

          if (isFuture) {
            return (
              <div
                key={key}
                data-date={key}
                className="h-20 rounded-xl border bg-background p-3 flex flex-col text-ink-muted opacity-50 border-[var(--surface-raised)] pointer-events-none"
              >
                <span className="text-sm font-medium leading-none">{format(day, "d")}</span>
              </div>
            );
          }

          return (
            <button
              key={key}
              type="button"
              data-date={key}
              onClick={() => openDay(day)}
              aria-label={`${logged ? "Edit" : "Log"} ${format(day, "EEEE d MMMM yyyy")}`}
              className={[
                "h-20 rounded-xl border p-3 flex flex-col items-start text-left",
                "text-ink daily-log-tile cursor-pointer",
                logged
                  ? "bg-[var(--border-token)] border-[var(--border-strong)]"
                  : "bg-background border-border",
                isToday ? "ring-1 ring-[var(--red)]" : "",
              ].join(" ")}
            >
              <span className="text-sm font-medium leading-none">{format(day, "d")}</span>
            </button>
          );
        })}
      </div>

      <TotalsStrip entries={entries} />

      <DailyLogEntryDialog
        date={openDate}
        entry={openKey ? byDate.get(openKey) : undefined}
        isSaving={isSaving}
        onSave={(draft) => save(openKey!, draft)}
        onClose={closeDialog}
      />
    </div>
  );
}
