import { useEffect, useState } from "react";
import { format, isSameYear } from "date-fns";
import { Frown, Meh, Smile } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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

const NUMERIC_FIELDS: Array<{ key: keyof DailyLogDraft; label: string }> = [
  { key: "emails_sent", label: "Emails sent" },
  { key: "calls_made", label: "Calls made" },
  { key: "connects", label: "Connects" },
  { key: "meetings_booked", label: "Meetings booked" },
];

const MOODS: Array<{ value: Mood; label: string; Icon: typeof Frown }> = [
  { value: "bad", label: "Bad day", Icon: Frown },
  { value: "neutral", label: "Neutral day", Icon: Meh },
  { value: "good", label: "Good day", Icon: Smile },
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

          <div className="flex items-center gap-2.5">
            <Checkbox
              id="dl-mit"
              checked={draft.mit_done}
              onCheckedChange={(v) => setDraft((d) => ({ ...d, mit_done: v === true }))}
            />
            <label htmlFor="dl-mit" className="text-sm text-ink cursor-pointer">
              Most important task done
            </label>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm text-ink-muted">Mood</span>
            <ToggleGroup
              type="single"
              value={draft.mood ?? ""}
              onValueChange={(v) =>
                setDraft((d) => ({ ...d, mood: v ? (v as Mood) : null }))
              }
              className="justify-start gap-2"
            >
              {MOODS.map(({ value, label, Icon }) => (
                <ToggleGroupItem
                  key={value}
                  value={value}
                  aria-label={label}
                  className="daily-log-mood h-10 w-10 rounded-lg border border-border text-ink-muted data-[state=on]:bg-[var(--ink)] data-[state=on]:text-[var(--white)]"
                >
                  <Icon className="h-5 w-5" strokeWidth={1.5} />
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
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
