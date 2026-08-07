import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCurrency } from "@/core/settings/useCurrency";
import { currencySymbol } from "@/lib/format-currency";
import {
  useBusinessBrief,
  useSaveBusinessBrief,
} from "@/core/business-brief/useBusinessBrief";
import {
  BUSINESS_BRIEF_FIELD_MAX,
  type GoalPeriod,
} from "@/core/business-brief/businessBrief.functions";

export const Route = createFileRoute("/_authenticated/app/business-brief")({
  component: BusinessBriefPage,
});

const AUTOSAVE_MS = 700;

type Fields = {
  business_name: string;
  website: string;
  your_offer: string;
  average_deal_size: string;
  ideal_client: string;
  how_you_sell: string;
  whos_selling: string;
  sales_cycle: string;
  goal_amount: number | null;
  goal_period: GoalPeriod | null;
  goal_by: string | null;
  goal_notes: string;
};

const EMPTY: Fields = {
  business_name: "",
  website: "",
  your_offer: "",
  average_deal_size: "",
  ideal_client: "",
  how_you_sell: "",
  whos_selling: "",
  sales_cycle: "",
  goal_amount: null,
  goal_period: null,
  goal_by: null,
  goal_notes: "",
};

function BusinessBriefPage() {
  const { data: brief, isLoading } = useBusinessBrief();
  const save = useSaveBusinessBrief();
  const { currency } = useCurrency();
  const symbol = currency ? currencySymbol(currency) : "£";

  const [fields, setFields] = useState<Fields>(EMPTY);
  const [hydrated, setHydrated] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">(
    "idle",
  );

  useEffect(() => {
    if (hydrated || isLoading || !brief) return;
    setFields({
      business_name: brief.business_name ?? "",
      website: brief.website ?? "",
      your_offer: brief.your_offer ?? "",
      average_deal_size: brief.average_deal_size ?? "",
      ideal_client: brief.ideal_client ?? "",
      how_you_sell: brief.how_you_sell ?? "",
      whos_selling: brief.whos_selling ?? "",
      sales_cycle: brief.sales_cycle ?? "",
      goal_amount:
        brief.goal_amount === null || brief.goal_amount === undefined
          ? null
          : Number(brief.goal_amount),
      goal_period: brief.goal_period ?? null,
      goal_by: brief.goal_by ?? null,
      goal_notes: brief.goal_notes ?? "",
    });
    setHydrated(true);
  }, [brief, isLoading, hydrated]);

  const currentDraft = useMemo(() => fields, [fields]);

  const lastSavedRef = useRef<string | null>(null);
  const latestDraftRef = useRef<Fields>(currentDraft);
  const dirtyRef = useRef(false);
  const saveMutateRef = useRef(save.mutate);

  useEffect(() => {
    latestDraftRef.current = currentDraft;
  }, [currentDraft]);
  useEffect(() => {
    saveMutateRef.current = save.mutate;
  }, [save.mutate]);

  const flushSave = useCallback(() => {
    if (!dirtyRef.current) return;
    const draft = latestDraftRef.current;
    const serialized = JSON.stringify(draft);
    dirtyRef.current = false;
    lastSavedRef.current = serialized;
    setSaveState("saving");
    saveMutateRef.current(draft, {
      onSuccess: () => setSaveState("saved"),
      onError: () => {
        dirtyRef.current = true;
        setSaveState("idle");
      },
    });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const serialized = JSON.stringify(currentDraft);
    if (lastSavedRef.current === null) {
      lastSavedRef.current = serialized;
      return;
    }
    if (lastSavedRef.current === serialized) return;
    dirtyRef.current = true;
    setSaveState("saving");
    const t = setTimeout(() => flushSave(), AUTOSAVE_MS);
    return () => clearTimeout(t);
  }, [currentDraft, hydrated, flushSave]);

  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === "hidden") flushSave();
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      flushSave();
    };
  }, [flushSave]);

  const setField =
    (k: "business_name" | "website" | "your_offer" | "average_deal_size" | "ideal_client" | "how_you_sell" | "whos_selling" | "sales_cycle" | "goal_notes") =>
    (v: string) =>
      setFields((prev) => ({
        ...prev,
        [k]: v.slice(0, BUSINESS_BRIEF_FIELD_MAX),
      }));

  const setGoal = <K extends "goal_amount" | "goal_period" | "goal_by">(
    k: K,
    v: Fields[K],
  ) => setFields((prev) => ({ ...prev, [k]: v }));

  return (
    <div className="app-content py-12 flex flex-col gap-10 max-w-3xl">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl" style={{ letterSpacing: "-0.02em" }}>
          Business Brief
        </h1>
        <p className="text-ink-muted text-sm">
          A short profile of your business — the more you fill in, the better
          Will AI can tailor its answers to you.
        </p>
      </header>

      {isLoading ? (
        <p className="text-ink-muted text-sm">Loading…</p>
      ) : (
        <>
          <section className="flex flex-col gap-6">
            <BriefField
              label="Business Name"
              value={fields.business_name}
              onChange={setField("business_name")}
              placeholder="e.g. Apex Home Services Ltd"
            />
            <BriefField
              label="Website"
              value={fields.website}
              onChange={setField("website")}
              placeholder="e.g. apexhome.co.uk"
            />
          </section>

          <section className="flex flex-col gap-6">
            <BriefField
              label="Your Offer"
              value={fields.your_offer}
              onChange={setField("your_offer")}
              placeholder="e.g. 6-week done-with-you sales coaching for home-service business owners"
              multiline
            />
            <BriefField
              label="Average Deal Size"
              value={fields.average_deal_size}
              onChange={setField("average_deal_size")}
              placeholder="e.g. £4,000 per client, or £500–£2,000 depending on the package"
            />
            <BriefField
              label="Your Ideal Client (ICP)"
              helper="Your ideal customer profile."
              value={fields.ideal_client}
              onChange={setField("ideal_client")}
              placeholder="e.g. B2B, home-service contractors, £1–5m turnover, decision-maker is the owner"
              multiline
            />
            <BriefField
              label="How You Sell"
              value={fields.how_you_sell}
              onChange={setField("how_you_sell")}
              placeholder="e.g. mostly inbound referrals plus some LinkedIn outbound; deals close on a booked call"
              multiline
            />
            <BriefField
              label="Who's Selling"
              value={fields.whos_selling}
              onChange={setField("whos_selling")}
              placeholder="e.g. just me — or me plus two salespeople"
            />
            <BriefField
              label="Sales Cycle"
              value={fields.sales_cycle}
              onChange={setField("sales_cycle")}
              placeholder="e.g. one call to close, or 3–4 conversations over about a month"
              multiline
            />
          </section>

          <section className="flex flex-col gap-6">
            <h2 className="text-lg text-ink" style={{ letterSpacing: "-0.01em" }}>
              Goals
            </h2>
            <GoalFields
              symbol={symbol}
              amount={fields.goal_amount}
              period={fields.goal_period}
              goalBy={fields.goal_by}
              onAmount={(v) => setGoal("goal_amount", v)}
              onPeriod={(v) => setGoal("goal_period", v)}
              onGoalBy={(v) => setGoal("goal_by", v)}
            />
            <BriefField
              label="What reaching this goal would mean"
              value={fields.goal_notes}
              onChange={setField("goal_notes")}
              placeholder="e.g. a second closer on the team and stepping back from delivery"
              multiline
            />
          </section>

          <SavedIndicator
            state={saveState}
            updatedAt={brief?.updated_at ?? null}
          />
        </>
      )}
    </div>
  );
}

function BriefField({
  label,
  helper,
  value,
  onChange,
  placeholder,
  multiline,
}: {
  label: string;
  helper?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-sm text-ink">{label}</Label>
      {helper && <p className="text-xs text-ink-muted">{helper}</p>}
      {multiline ? (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          maxLength={BUSINESS_BRIEF_FIELD_MAX}
        />
      ) : (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={BUSINESS_BRIEF_FIELD_MAX}
        />
      )}
    </div>
  );
}

function SavedIndicator({
  state,
  updatedAt,
}: {
  state: "idle" | "saving" | "saved";
  updatedAt: string | null;
}) {
  const label =
    state === "saving"
      ? "Saving…"
      : state === "saved"
        ? "Saved"
        : updatedAt
          ? `Last saved ${new Date(updatedAt).toLocaleString()}`
          : "";
  if (!label) return null;
  return (
    <p className="text-xs text-ink-muted" aria-live="polite">
      {label}
    </p>
  );
}

// -------------------- goals --------------------

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** Amount + period on one row, then a month + year target. */
function GoalFields({
  symbol,
  amount,
  period,
  goalBy,
  onAmount,
  onPeriod,
  onGoalBy,
}: {
  symbol: string;
  amount: number | null;
  period: GoalPeriod | null;
  goalBy: string | null;
  onAmount: (v: number | null) => void;
  onPeriod: (v: GoalPeriod | null) => void;
  onGoalBy: (v: string | null) => void;
}) {
  // Local text mirror so partially-typed values ("1,2") stay editable while
  // the stored value remains a raw number (or null when cleared).
  const [text, setText] = useState<string>(
    amount === null ? "" : amount.toLocaleString("en-GB"),
  );
  const syncedRef = useRef<number | null>(null);
  useEffect(() => {
    if (syncedRef.current === amount) return;
    syncedRef.current = amount;
    setText(amount === null ? "" : amount.toLocaleString("en-GB"));
  }, [amount]);

  const handleAmount = (raw: string) => {
    const cleaned = raw.replace(/[^0-9.]/g, "");
    setText(cleaned === "" ? "" : formatThousands(cleaned));
    if (cleaned === "" || cleaned === ".") {
      syncedRef.current = null;
      onAmount(null);
      return;
    }
    const n = Number(cleaned);
    const next = Number.isFinite(n) ? n : null;
    syncedRef.current = next;
    onAmount(next);
  };

  const month = goalBy ? Number(goalBy.slice(5, 7)) : null;
  const year = goalBy ? Number(goalBy.slice(0, 4)) : null;
  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: 8 }, (_, i) => thisYear + i);

  const setMonthYear = (m: number | null, y: number | null) => {
    if (m === null && y === null) {
      onGoalBy(null);
      return;
    }
    const mm = m ?? 1;
    const yy = y ?? thisYear;
    onGoalBy(`${yy}-${String(mm).padStart(2, "0")}-01`);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <Label className="text-sm text-ink">Revenue goal</Label>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <span
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-muted"
            >
              {symbol}
            </span>
            <Input
              inputMode="decimal"
              value={text}
              onChange={(e) => handleAmount(e.target.value)}
              placeholder="50,000"
              className="pl-7"
              aria-label="Revenue goal amount"
            />
          </div>
          <Select
            value={period ?? undefined}
            onValueChange={(v) => onPeriod(v as GoalPeriod)}
          >
            <SelectTrigger className="sm:w-44" aria-label="Goal period">
              <SelectValue placeholder="per month" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="per_month">per month</SelectItem>
              <SelectItem value="per_year">per year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-sm text-ink">Target date</Label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Select
            value={month ? String(month) : undefined}
            onValueChange={(v) => setMonthYear(Number(v), year)}
          >
            <SelectTrigger className="sm:w-48" aria-label="Target month">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((label, i) => (
                <SelectItem key={label} value={String(i + 1)}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={year ? String(year) : undefined}
            onValueChange={(v) => setMonthYear(month, Number(v))}
          >
            <SelectTrigger className="sm:w-32" aria-label="Target year">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

function formatThousands(cleaned: string): string {
  const [whole, ...rest] = cleaned.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return rest.length > 0 ? `${grouped}.${rest.join("")}` : grouped;
}
