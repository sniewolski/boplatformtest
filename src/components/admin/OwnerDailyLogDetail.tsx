import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { Check, Frown, Meh, Smile } from "lucide-react";
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

const MOOD_ICONS = {
  bad: { Icon: Frown, label: "Bad" },
  neutral: { Icon: Meh, label: "Neutral" },
  good: { Icon: Smile, label: "Good" },
} as const;

/**
 * Admin/mentor read-only Daily Log for one owner: last 30 calendar days,
 * most recent first, unlogged days included as empty rows (the gaps are
 * the signal). Totals row is pinned at the top of the body.
 */
export function OwnerDailyLogDetail({ ownerId }: { ownerId: string }) {
  const fetchLog = useServerFn(getDailyLogForOwner);
  const log = useQuery({
    queryKey: ["admin", "daily-log", ownerId],
    queryFn: () => fetchLog({ data: { ownerId } }),
  });

  if (log.isLoading) {
    return <p className="text-ink-muted text-sm">Loading…</p>;
  }
  if (log.error) {
    return (
      <p className="text-sm text-[var(--red)]">{(log.error as Error).message}</p>
    );
  }

  const { entries, currency } = log.data!;
  const byDate = new Map<string, AdminDailyLogRow>();
  for (const row of entries) byDate.set(row.entry_date, row);

  const today = new Date();
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = subDays(today, i);
    const key = format(d, "yyyy-MM-dd");
    return { date: d, key, row: byDate.get(key) ?? null };
  });

  const totals = days.reduce(
    (acc, d) => {
      if (!d.row) return acc;
      acc.emails_sent += d.row.emails_sent ?? 0;
      acc.calls_made += d.row.calls_made ?? 0;
      acc.meetings_booked += d.row.meetings_booked ?? 0;
      acc.connects += d.row.connects ?? 0;
      acc.revenue += Number(d.row.revenue ?? 0);
      if (d.row.mit_done) acc.mit += 1;
      return acc;
    },
    {
      emails_sent: 0,
      calls_made: 0,
      meetings_booked: 0,
      connects: 0,
      revenue: 0,
      mit: 0,
    },
  );

  return (
    <Table>
      <TableHeader>
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
        <TableRow className="bg-[var(--surface-raised)] font-medium">
          <TableCell />
          <TableCell className="text-right tabular-nums">
            {totals.emails_sent}
          </TableCell>
          <TableCell className="text-right tabular-nums">
            {totals.calls_made}
          </TableCell>
          <TableCell className="text-right tabular-nums">
            {totals.meetings_booked}
          </TableCell>
          <TableCell className="text-right tabular-nums">
            {totals.connects}
          </TableCell>
          <TableCell className="text-right tabular-nums">
            {currency ? formatCurrency(totals.revenue, currency) : "—"}
          </TableCell>
          <TableCell className="text-center tabular-nums">
            {totals.mit}
          </TableCell>
          <TableCell />
        </TableRow>

        {days.map(({ key, date, row }) => {
          const mood = row?.mood
            ? MOOD_ICONS[row.mood as keyof typeof MOOD_ICONS]
            : null;
          return (
            <TableRow key={key}>
              <TableCell className="whitespace-nowrap">
                {format(date, "EEE d MMM")}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {row ? row.emails_sent : ""}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {row ? row.calls_made : ""}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {row ? row.meetings_booked : ""}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {row ? row.connects : ""}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {row
                  ? currency
                    ? formatCurrency(Number(row.revenue ?? 0), currency)
                    : String(row.revenue ?? 0)
                  : ""}
              </TableCell>
              <TableCell className="text-center">
                {row?.mit_done ? (
                  <Check
                    className="size-4 inline-block"
                    style={{ color: "var(--ink)" }}
                    aria-label="Most important task done"
                  />
                ) : null}
              </TableCell>
              <TableCell className="text-center">
                {mood ? (
                  <mood.Icon
                    className="size-4 inline-block"
                    style={{ color: "var(--ink)" }}
                    aria-label={`Mood: ${mood.label}`}
                  />
                ) : null}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
