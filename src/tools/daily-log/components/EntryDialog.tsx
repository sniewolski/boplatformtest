import { useEffect, useState } from "react";
import { format, isSameYear } from "date-fns";
import { Check, Frown, Meh, Smile } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCurrency } from "@/core/settings/useCurrency";
import { currencySymbol } from "@/lib/format-currency";
import type { DailyLogDraft, DailyLogEntry, Mood } from "../data/useDailyLog";

const EMPTY: DailyLogDraft = {
  emails_sent: 0,
  calls_made: 0,
  connects: 0,
  meetings_booked: 0,
  revenue: 0,
  mit_done: false,
  mood: null,
};

// Order matches the target grid rows:
//   row 1: Emails sent | Calls made
//   row 2: Meetings booked | Connects
const NUMERIC_FIELDS: Array<{ key: keyof DailyLogDraft; label: string }> = [
  { key: "emails_sent", label: "Emails sent" },
  { key: "calls_made", label: "Calls made" },
  { key: "meetings_booked", label: "Meetings booked" },
  { key: "connects", label: "Connects" },
];

const MOODS: Array<{ value: Mood; label: string; ariaLabel: string; Icon: typeof Frown }> = [
  { value: "bad", label: "Bad", ariaLabel: "Bad day", Icon: Frown },
  { value: "neutral", label: "Neutral", ariaLabel: "Neutral day", Icon: Meh },
  { value: "good", label: "Good", ariaLabel: "Good day", Icon: Smile },
];

function titleFor(date: Date) {
  const sameYear = isSameYear(date, new Date());
  return format(date, sameYear ? "EEEE d MMMM" : "EEEE d MMMM yyyy");
}

export function DailyLogEntryDialog({
  date,
  entry,
  isSaving,
  onSave,
  onClose,
}: {
  /** Local Date for the open day, or null when closed. */
  date: Date | null;
  entry: DailyLogEntry | undefined;
  isSaving: boolean;
  onSave: (draft: DailyLogDraft) => Promise<void>;
  onClose: () => void;
}) {
  const { currency } = useCurrency();
  const [draft, setDraft] = useState<DailyLogDraft>(EMPTY);

  const dateKey = date ? format(date, "yyyy-MM-dd") : null;

  useEffect(() => {
    if (!dateKey) return;
    setDraft(
      entry
        ? {
            emails_sent: entry.emails_sent ?? 0,
            calls_made: entry.calls_made ?? 0,
            connects: entry.connects ?? 0,
            meetings_booked: entry.meetings_booked ?? 0,
            revenue: Number(entry.revenue ?? 0),
            mit_done: !!entry.mit_done,
            mood: entry.mood ?? null,
          }
        : EMPTY,
    );
  }, [dateKey, entry]);

  const setNum = (key: keyof DailyLogDraft, raw: string, decimal = false) => {
    const parsed = decimal ? parseFloat(raw) : parseInt(raw, 10);
    const next = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
    setDraft((d) => ({ ...d, [key]: next }));
  };

  const handleSave = async () => {
    try {
      await onSave(draft);
      onClose();
    } catch (e) {
      toast.error(
        e instanceof Error ? `Couldn't save: ${e.message}` : "Couldn't save this entry.",
      );
    }
  };

  return (
    <Dialog open={!!date} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="daily-log-dialog max-w-md gap-5 duration-0 data-[state=open]:animate-none data-[state=closed]:animate-none data-[state=open]:zoom-in-100 data-[state=closed]:zoom-out-100 data-[state=open]:fade-in-100 data-[state=closed]:fade-out-100"
        style={{ viewTransitionName: "daily-log-active-tile" }}
      >
        <DialogHeader>
          <DialogTitle>{date ? titleFor(date) : ""}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* 1. Most important task done — full-width clickable row */}
          <button
            type="button"
            role="checkbox"
            aria-checked={draft.mit_done}
            onClick={() => setDraft((d) => ({ ...d, mit_done: !d.mit_done }))}
            className={[
              "flex w-full items-center gap-2.5 rounded-lg px-3 py-3.5 text-left outline-none",
              "transition-transform duration-[120ms] ease-[var(--ease-out)]",
              "active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100",
              draft.mit_done
                ? "bg-[var(--surface-raised)] border border-[var(--ink)]"
                : "bg-transparent border border-[var(--border-token)] hover:bg-[var(--surface-raised)]",
            ].join(" ")}
          >
            <span
              className={[
                "flex h-5 w-5 shrink-0 items-center justify-center rounded transition-colors",
                draft.mit_done
                  ? "bg-[var(--surface-raised)] text-[var(--ink)] border border-[var(--ink)]"
                  : "border border-[var(--border-token)] bg-transparent text-transparent",
              ].join(" ")}
            >
              <Check className="h-3.5 w-3.5" strokeWidth={3} />
            </span>
            <span className="text-sm text-ink">Most important task done</span>
          </button>

          {/* 2. Mood — segmented control */}
          <div className="flex flex-col gap-1.5">
            <span className="text-sm text-ink-muted">Mood</span>
            <div
              role="radiogroup"
              aria-label="Mood"
              className="daily-log-mood flex w-full"
            >
              {MOODS.map(({ value, label, ariaLabel, Icon }, i) => {
                const selected = draft.mood === value;
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={ariaLabel}
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        mood: d.mood === value ? null : value,
                      }))
                    }
                    className={[
                      "flex flex-1 flex-col items-center justify-center gap-1.5 border py-3.5 outline-none transition-colors",
                      i === 0 ? "rounded-l-lg" : "",
                      i === 1 ? "rounded-none -ml-px" : "-ml-px",
                      i === 2 ? "rounded-r-lg" : "",
                      selected
                        ? "relative z-10 border-[var(--ink)] bg-[var(--surface-raised)] text-ink"
                        : "border-[var(--border-token)] bg-transparent text-ink-muted hover:bg-[var(--surface-raised)]",
                    ].join(" ")}
                  >
                    <Icon className="h-5 w-5" strokeWidth={1.5} />
                    <span className="text-xs leading-none">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3–4. Counters — 2-col grid (row 1: Emails | Calls, row 2: Meetings | Connects) */}
          <div className="grid grid-cols-2 gap-3">
            {NUMERIC_FIELDS.map(({ key, label }) => (
              <div key={key} className="flex flex-col gap-1.5">
                <label htmlFor={`dl-${key}`} className="text-sm text-ink-muted">
                  {label}
                </label>
                <Input
                  id={`dl-${key}`}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={String(draft[key] as number)}
                  onChange={(e) => setNum(key, e.target.value)}
                />
              </div>
            ))}
          </div>

          {/* 5. Revenue — full width */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="dl-revenue" className="text-sm text-ink-muted">
              Revenue
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-muted">
                {currency ? currencySymbol(currency) : ""}
              </span>
              <Input
                id="dl-revenue"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                className="pl-7"
                value={String(draft.revenue)}
                onChange={(e) => setNum("revenue", e.target.value, true)}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
