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
    <div className="flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-border pt-4">
      <Pair label="Emails sent" value={String(emails)} />
      <Pair label="Calls made" value={String(calls)} />
      <Pair label="Connects" value={String(connects)} />
      <Pair label="Meetings booked" value={String(meetings)} />
      <Pair
        label="Revenue"
        value={currency ? formatCurrency(revenue, currency) : String(revenue)}
      />
      <Pair label="MIT days hit" value={String(mitDays)} />

      <div className="flex items-center gap-3">
        <span className="text-xs uppercase tracking-wide text-ink-muted">Mood</span>
        <span className="flex items-center gap-3 text-sm text-ink font-medium">
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

function Pair({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs uppercase tracking-wide text-ink-muted">{label}</span>
      <span className="text-sm text-ink font-medium">{value}</span>
    </div>
  );
}
