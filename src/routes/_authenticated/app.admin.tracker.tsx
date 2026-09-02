import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useMyRoles } from "@/core/roles/useMyRoles";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  TrackerBreakdownTable,
  type TrackerEventRow,
  type TrackedVideoRow,
} from "@/components/admin/TrackerBreakdownTable";
import { TrackerTrendsCharts } from "@/components/admin/TrackerTrendsCharts";

type TrackerTab = "breakdown" | "trends";

const TRACKER_TABS = ["breakdown", "trends"] as const;

type TrackerSearch = {
  tab?: TrackerTab;
};

function parseTab(v: unknown): TrackerTab | undefined {
  return typeof v === "string" && (TRACKER_TABS as readonly string[]).includes(v)
    ? (v as TrackerTab)
    : undefined;
}

export const Route = createFileRoute("/_authenticated/app/admin/tracker")({
  validateSearch: (raw: Record<string, unknown>): TrackerSearch => {
    const out: TrackerSearch = {};
    const tab = parseTab(raw.tab);
    if (tab) out.tab = tab;
    return out;
  },
  component: TrackerAdmin,
});

// ---------- London day boundary helpers ---------------------------------

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function londonDayStartUtcISO(ymd: string): string {
  for (const hourGuess of [0, -1]) {
    const d = new Date(`${ymd}T00:00:00Z`);
    d.setUTCHours(hourGuess);
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/London",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(d);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    if (
      `${get("year")}-${get("month")}-${get("day")}` === ymd &&
      get("hour") === "00" &&
      get("minute") === "00"
    ) {
      return d.toISOString();
    }
  }
  return new Date(`${ymd}T00:00:00Z`).toISOString();
}

function londonDayEndExclusiveUtcISO(ymd: string): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return londonDayStartUtcISO(toYmd(d));
}

type RangePreset = "7" | "30" | "90" | "360" | "custom";

const TAB_LABELS: { key: TrackerTab; label: string }[] = [
  { key: "breakdown", label: "Breakdown" },
  { key: "trends", label: "Trends" },
];

// ---------- Component ----------------------------------------------------

function TrackerAdmin() {
  const { user } = Route.useRouteContext();
  const { data: roles, isLoading: rolesLoading } = useMyRoles(user.id);
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const activeTab: TrackerTab = search.tab ?? "breakdown";

  const [preset, setPreset] = useState<RangePreset>("30");
  const [toDate, setToDate] = useState<Date>(() => new Date());
  const [fromDate, setFromDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d;
  });


  const { effectiveFrom, effectiveTo } = useMemo(() => {
    if (preset === "custom") {
      return { effectiveFrom: fromDate, effectiveTo: toDate };
    }
    const days =
      preset === "7" ? 7 : preset === "30" ? 30 : preset === "90" ? 90 : 360;
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    return { effectiveFrom: from, effectiveTo: to };
  }, [preset, fromDate, toDate]);

  const fromISO = useMemo(
    () => londonDayStartUtcISO(toYmd(effectiveFrom)),
    [effectiveFrom],
  );
  const toISO = useMemo(
    () => londonDayEndExclusiveUtcISO(toYmd(effectiveTo)),
    [effectiveTo],
  );

  const eventsQuery = useQuery({
    queryKey: ["tracker-events", fromISO, toISO],
    enabled: !rolesLoading && !!roles?.includes("admin"),
    queryFn: async (): Promise<TrackerEventRow[]> => {
      const { data, error } = await supabase
        .from("tracker_events")
        .select("id, event_type, visitor_id, source_type, source_value, booking_id, created_at")
        .gte("created_at", fromISO)
        .lt("created_at", toISO)
        .order("created_at", { ascending: false })
        .limit(10000);
      if (error) throw error;
      return (data ?? []) as TrackerEventRow[];
    },
  });

  const videosQuery = useQuery({
    queryKey: ["tracked-videos"],
    enabled: !rolesLoading && !!roles?.includes("admin"),
    queryFn: async (): Promise<TrackedVideoRow[]> => {
      const { data, error } = await supabase
        .from("tracked_videos")
        .select("video_id, title, thumbnail_url, resolved_at");
      if (error) throw error;
      return (data ?? []) as TrackedVideoRow[];
    },
  });

  const startYmd = useMemo(() => toYmd(effectiveFrom), [effectiveFrom]);
  const endYmd = useMemo(() => toYmd(effectiveTo), [effectiveTo]);

  const queryClient = useQueryClient();
  useEffect(() => {
    const videos = videosQuery.data;
    if (!videos) return;
    const known = new Map(videos.map((v) => [v.video_id, v]));
    const seen = new Set<string>();
    const missing: string[] = [];
    for (const ev of eventsQuery.data ?? []) {
      if (ev.source_type !== "video" || !ev.source_value) continue;
      if (seen.has(ev.source_value)) continue;
      seen.add(ev.source_value);
      const row = known.get(ev.source_value);
      if (!row || !row.resolved_at) missing.push(ev.source_value);
    }
    if (missing.length === 0) return;

    let cancelled = false;
    (async () => {
      for (const id of missing) {
        if (cancelled) return;
        try {
          await supabase.functions.invoke("tracker-resolve-video", {
            body: { video_id: id },
          });
        } catch {
          // ignore; will retry on next mount
        }
      }
      if (!cancelled) {
        queryClient.invalidateQueries({ queryKey: ["tracked-videos"] });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [eventsQuery.data, videosQuery.data, queryClient]);

  if (rolesLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <p className="text-ink-muted text-sm">Loading…</p>
      </div>
    );
  }
  if (!roles?.includes("admin")) {
    return (
      <div className="max-w-md mx-auto px-8 py-16 text-center flex flex-col gap-3">
        <h1 className="text-2xl">Not authorised</h1>
        <p className="text-ink-muted text-sm">
          You don't have access to the admin area.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] px-6 py-16 flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl">Tracker</h1>
        <p className="text-ink-muted text-sm max-w-prose">
          Funnel attribution by YouTube video — views, clicks and confirmed
          bookings for the selected window.
        </p>
      </header>

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-ink-muted">Range</span>
          <Select
            value={preset}
            onValueChange={(v) => setPreset(v as RangePreset)}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="360">Last 360 days</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {preset === "custom" && (
          <>
            <DateField
              label="From"
              value={fromDate}
              onChange={(d) => d && setFromDate(d)}
            />
            <DateField
              label="To"
              value={toDate}
              onChange={(d) => d && setToDate(d)}
            />
          </>
        )}
      </div>

      <div
        role="tablist"
        aria-label="Tracker views"
        className="inline-flex items-center gap-1 rounded-xl border border-border bg-[var(--surface-raised)] p-1 w-fit"
      >
        {TAB_LABELS.map((t) => {
          const active = activeTab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() =>
                navigate({
                  replace: true,
                  search: (prev: TrackerSearch) => ({
                    ...prev,
                    tab: t.key === "breakdown" ? undefined : t.key,
                  }),
                })
              }
              className={cn(
                "px-3 py-1.5 text-sm rounded-lg transition-colors",
                active
                  ? "bg-background text-ink font-medium"
                  : "text-ink-muted hover:text-ink",
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {activeTab === "breakdown" ? (
        <TrackerBreakdownTable
          events={eventsQuery.data}
          eventsLoading={eventsQuery.isLoading}
          eventsError={eventsQuery.error as Error | null}
          videos={videosQuery.data}
          videosLoading={videosQuery.isLoading}
          videosError={videosQuery.error as Error | null}
          startYmd={startYmd}
          endYmd={endYmd}
        />
      ) : (
        <TrackerTrendsCharts
          events={eventsQuery.data}
          eventsLoading={eventsQuery.isLoading}
          eventsError={eventsQuery.error as Error | null}
          videos={videosQuery.data}
          videosLoading={videosQuery.isLoading}
          videosError={videosQuery.error as Error | null}
          startYmd={startYmd}
          endYmd={endYmd}
        />
      )}
    </div>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Date;
  onChange: (d: Date | undefined) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-ink-muted">{label}</span>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn("w-[200px] justify-start text-left font-normal")}
          >
            <CalendarIcon className="mr-2 size-4" />
            {format(value, "PPP")}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            onSelect={onChange}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
