import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import {
  getDailyLogForOwner,
  type AdminDailyLogRow,
} from "@/tools/daily-log/admin.functions";
import { formatCurrency } from "@/lib/format-currency";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const MOOD_LABELS: Record<string, string> = {
  bad: "Bad",
  neutral: "Neutral",
  good: "Good",
};

type Totals = {
  emails_sent: number;
  calls_made: number;
  meetings_booked: number;
  connects: number;
  revenue: number;
  mit: number;
};

const emptyTotals = (): Totals => ({
  emails_sent: 0,
  calls_made: 0,
  meetings_booked: 0,
  connects: 0,
  revenue: 0,
  mit: 0,
});

function addRow(acc: Totals, row: AdminDailyLogRow) {
  acc.emails_sent += row.emails_sent ?? 0;
  acc.calls_made += row.calls_made ?? 0;
  acc.meetings_booked += row.meetings_booked ?? 0;
  acc.connects += row.connects ?? 0;
  acc.revenue += Number(row.revenue ?? 0);
  if (row.mit_done) acc.mit += 1;
  return acc;
}

/**
 * Admin/mentor read-only Daily Log for one owner: one calendar month at a
 * time, most recent day first, grouped into Monday-anchored weeks clipped to
 * the visible month. Unlogged days render as empty rows — the gaps are the
 * signal.
 */
export function OwnerDailyLogDetail({ ownerId }: { ownerId: string }) {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const monthStart = format(startOfMonth(cursor), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(cursor), "yyyy-MM-dd");
  const atCurrentMonth = isSameMonth(cursor, new Date());

  const fetchLog = useServerFn(getDailyLogForOwner);
  const log = useQuery({
    queryKey: ["admin", "daily-log", ownerId, format(cursor, "yyyy-MM")],
    queryFn: () => fetchLog({ data: { ownerId, monthStart, monthEnd } }),
  });

  const header = (
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
  );

  let body: React.ReactNode = null;

  if (log.isLoading) {
    body = <p className="text-ink-muted text-sm">Loading…</p>;
  } else if (log.error) {
    body = (
      <p className="text-sm text-[var(--red)]">{(log.error as Error).message}</p>
    );
  } else {
    const { entries, currency } = log.data!;
    const byDate = new Map<string, AdminDailyLogRow>();
    for (const row of entries) byDate.set(row.entry_date, row);

    const days = eachDayOfInterval({
      start: startOfMonth(cursor),
      end: endOfMonth(cursor),
    }).map((d) => {
      const key = format(d, "yyyy-MM-dd");
      return { date: d, key, row: byDate.get(key) ?? null };
    });

    // Monday-anchored weeks, clipped to the visible month.
    const weekMap = new Map<string, typeof days>();
    for (const day of days) {
      const wk = format(startOfWeek(day.date, { weekStartsOn: 1 }), "yyyy-MM-dd");
      const list = weekMap.get(wk) ?? [];
      list.push(day);
      weekMap.set(wk, list);
    }
    const weeks = Array.from(weekMap.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([wk, list]) => {
        const sorted = [...list].sort((a, b) => (a.key < b.key ? 1 : -1));
        const totals = sorted.reduce(
          (acc, d) => (d.row ? addRow(acc, d.row) : acc),
          emptyTotals(),
        );
        const first = sorted[sorted.length - 1].date;
        const last = sorted[0].date;
        return {
          wk,
          days: sorted,
          totals,
          label: `${format(first, "d MMM")} – ${format(last, "d MMM")}`,
        };
      });

    const monthTotals = days.reduce(
      (acc, d) => (d.row ? addRow(acc, d.row) : acc),
      emptyTotals(),
    );

    const num = "text-right tabular-nums";

    const totalCells = (t: Totals) => (
      <>
        <TableCell className={num}>{t.emails_sent}</TableCell>
        <TableCell className={num}>{t.calls_made}</TableCell>
        <TableCell className={num}>{t.meetings_booked}</TableCell>
        <TableCell className={num}>{t.connects}</TableCell>
        <TableCell className={num}>
          {formatCurrency(t.revenue, currency)}
        </TableCell>
        <TableCell className="text-center tabular-nums">{t.mit}</TableCell>
        <TableCell />
      </>
    );

    body = (
      <Table>
        <TableHeader className="sticky top-0 z-20 bg-background">
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Emails</TableHead>
            <TableHead className="text-right">Calls</TableHead>
            <TableHead className="text-right">Meetings</TableHead>
            <TableHead className="text-right">Connects</TableHead>
            <TableHead className="text-right">Revenue</TableHead>
            <TableHead className="text-center">MIT</TableHead>
            <TableHead className="text-center">Mood</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow className="bg-[var(--surface-raised)] font-semibold text-ink">
            <TableCell className="whitespace-nowrap">Month total</TableCell>
            {totalCells(monthTotals)}
          </TableRow>

          {weeks.map((week) => (
            <>
              <TableRow
                key={week.wk}
                className="border-t border-t-[var(--border-strong)] font-medium text-ink"
              >
                <TableCell className="whitespace-nowrap">
                  {week.label}
                </TableCell>
                {totalCells(week.totals)}
              </TableRow>

              {week.days.map(({ key, date, row }) => {
                const logged = !!row;
                const revenue = Number(row?.revenue ?? 0);
                return (
                  <TableRow key={key}>
                    <TableCell
                      className="whitespace-nowrap"
                      style={{
                        color: logged ? "var(--ink)" : "var(--ink-muted)",
                      }}
                    >
                      {format(date, "EEE d MMM")}
                    </TableCell>
                    <TableCell className={num}>
                      {logged ? row!.emails_sent : ""}
                    </TableCell>
                    <TableCell className={num}>
                      {logged ? row!.calls_made : ""}
                    </TableCell>
                    <TableCell className={num}>
                      {logged ? row!.meetings_booked : ""}
                    </TableCell>
                    <TableCell className={num}>
                      {logged ? row!.connects : ""}
                    </TableCell>
                    <TableCell className={num}>
                      {!logged ? (
                        ""
                      ) : revenue > 0 ? (
                        formatCurrency(revenue, currency)
                      ) : (
                        <span style={{ color: "var(--ink-muted)" }}>0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {!logged ? (
                        ""
                      ) : row!.mit_done ? (
                        <Check
                          className="size-4 inline-block"
                          style={{ color: "var(--ink)" }}
                          aria-label="Most important task done"
                        />
                      ) : (
                        <span style={{ color: "var(--ink-muted)" }}>—</span>
                      )}
                    </TableCell>
                    <TableCell
                      className="text-center text-sm"
                      style={{ color: "var(--ink-muted)" }}
                    >
                      {!logged
                        ? ""
                        : row!.mood
                          ? (MOOD_LABELS[row!.mood] ?? row!.mood)
                          : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </>
          ))}
        </TableBody>
      </Table>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {header}
      {body}
    </div>
  );
}
