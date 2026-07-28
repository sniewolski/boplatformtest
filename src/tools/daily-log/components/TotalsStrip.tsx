import { Frown, Meh, Smile } from "lucide-react";
import { formatCurrency } from "@/lib/format-currency";
import { useCurrency } from "@/core/settings/useCurrency";
import type { DailyLogEntry } from "../data/useDailyLog";

/** Quiet single-line summary of the visible month. Computed client-side. */
export function TotalsStrip({ entries }: { entries: DailyLogEntry[] }) {
  const { currency } = useCurrency();

  const sum = (pick: (e: DailyLogEntry) => number) =>
    entries.reduce((acc, e) => acc + (Number(pick(e)) || 0), 0);

  const emails = sum((e) => e.emails_sent);
  const calls = sum((e) => e.calls_made);
  const connects = sum((e) => e.connects);
  const meetings = sum((e) => e.meetings_booked);
  const revenue = sum((e) => Number(e.revenue));
  const mitDays = entries.filter((e) => e.mit_done).length;

  const moodCount = (m: "good" | "neutral" | "bad") =>
    entries.filter((e) => e.mood === m).length;

  return (
    <div
      className="grid items-center border-t border-border pt-4"
      style={{
        gridTemplateColumns:
          "1fr 1fr 1fr 1.2fr 1.6fr 1.2fr 1.4fr",
      }}
    >
      <Pair label="Emails sent" value={String(emails)} num />
      <Pair label="Calls made" value={String(calls)} num />
      <Pair label="Connects" value={String(connects)} num />
      <Pair label="Meetings booked" value={String(meetings)} num />
      <Pair
        label="Revenue"
        value={currency ? formatCurrency(revenue, currency) : String(revenue)}
        num
      />
      <Pair label="MIT days hit" value={String(mitDays)} num />

      <div className="flex items-center gap-2 whitespace-nowrap">
        <span className="text-xs uppercase tracking-wide text-ink-muted">Mood</span>
        <span className="flex items-center gap-3 text-sm text-ink font-medium tabular-nums whitespace-nowrap">
          <span className="flex items-center gap-1">
            <Smile className="h-4 w-4 text-ink-muted" strokeWidth={1.5} aria-label="Good days" />
            {moodCount("good")}
          </span>
          <span className="flex items-center gap-1">
            <Meh className="h-4 w-4 text-ink-muted" strokeWidth={1.5} aria-label="Neutral days" />
            {moodCount("neutral")}
          </span>
          <span className="flex items-center gap-1">
            <Frown className="h-4 w-4 text-ink-muted" strokeWidth={1.5} aria-label="Bad days" />
            {moodCount("bad")}
          </span>
        </span>
      </div>
    </div>
  );
}

function Pair({
  label,
  value,
  num = false,
}: {
  label: string;
  value: string;
  num?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 whitespace-nowrap">
      <span className="text-xs uppercase tracking-wide text-ink-muted">{label}</span>
      <span
        className={`text-sm text-ink font-medium ${num ? "tabular-nums" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
