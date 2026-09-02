import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import type {
  TrackerEventRow,
  TrackedVideoRow,
} from "@/components/admin/TrackerBreakdownTable";


// ---------- London-day helpers (must agree with the route's boundaries) ---

const LONDON_YMD = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/London",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** UTC instant -> Europe/London calendar day (YYYY-MM-DD). */
function londonYmd(iso: string): string {
  return LONDON_YMD.format(new Date(iso));
}

function addDaysYmd(ymd: string, n: number): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Monday-start week bucket key for a calendar day. */
function weekStartYmd(ymd: string): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  const dow = d.getUTCDay(); // 0 = Sunday
  const back = dow === 0 ? 6 : dow - 1;
  return addDaysYmd(ymd, -back);
}

function eachDay(startYmd: string, endYmd: string): string[] {
  const out: string[] = [];
  let cur = startYmd;
  let guard = 0;
  while (cur <= endYmd && guard < 1000) {
    out.push(cur);
    cur = addDaysYmd(cur, 1);
    guard += 1;
  }
  return out;
}

/** Europe/London midnight for a calendar day, as a UTC ISO instant. */
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

/** Exclusive end instant of a London calendar day. */
function londonDayEndExclusiveUtcISO(ymd: string): string {
  return londonDayStartUtcISO(addDaysYmd(ymd, 1));
}

/** Inclusive day count between two calendar days. */
function dayCount(startYmd: string, endYmd: string): number {
  const a = Date.parse(`${startYmd}T00:00:00Z`);
  const b = Date.parse(`${endYmd}T00:00:00Z`);
  return Math.max(1, Math.round((b - a) / 86400000) + 1);
}

function formatInt(n: number): string {
  return n.toLocaleString("en-US");
}

function formatDelta(current: number, previous: number): string {
  if (previous <= 0) return "no prior data";
  const pct = ((current - previous) / previous) * 100;
  if (!Number.isFinite(pct)) return "no prior data";
  const sign = pct >= 0 ? "+" : "\u2212";
  return `${sign}${Math.abs(pct).toFixed(1)}% vs prev`;
}


function labelForBucket(key: string, bucket: Bucket): string {
  const d = new Date(`${key}T00:00:00Z`);
  const day = d.toLocaleDateString("en-GB", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
  });
  return bucket === "week" ? `w/c ${day}` : day;
}

// ---------- Types --------------------------------------------------------

type Bucket = "week" | "day";

/** "all" | "video:<id>" | "source:<type>" | "direct" */
type SourceSel = string;

type Metric = "views" | "clicks" | "bookings";

type SourceSlice = { key: string; label: string; value: number };

type BucketPoint = {
  bucketKey: string;
  label: string;
  total: number;
  bySource: SourceSlice[];
};

/** Stable key for an event's source: "video:<id>" | "source:<type>" | "direct". */
function eventSourceKey(ev: TrackerEventRow): string {
  if (ev.source_type === "video" && ev.source_value) {
    return `video:${ev.source_value}`;
  }
  if (ev.source_type) return `source:${ev.source_type}`;
  return "direct";
}

export function TrackerTrendsCharts({
  events,
  eventsLoading,
  eventsError,
  videos,
  videosLoading,
  videosError,
  startYmd,
  endYmd,
}: {
  events: TrackerEventRow[] | undefined;
  eventsLoading: boolean;
  eventsError: Error | null;
  videos: TrackedVideoRow[] | undefined;
  videosLoading: boolean;
  videosError: Error | null;
  startYmd: string;
  endYmd: string;
}) {
  const [bucket, setBucket] = useState<Bucket>("week");
  const [metric, setMetric] = useState<Metric>("clicks");

  const videosById = useMemo(
    () => new Map((videos ?? []).map((v) => [v.video_id, v])),
    [videos],
  );

  // ---- Source options -------------------------------------------------
  const { videoIds, sourceTypes, hasDirect } = useMemo(() => {
    const ids = new Set<string>();
    const types = new Set<string>();
    let direct = false;
    for (const ev of events ?? []) {
      if (ev.source_type === "video" && ev.source_value) ids.add(ev.source_value);
      else if (ev.source_type) types.add(ev.source_type);
      else direct = true;
    }
    return {
      videoIds: Array.from(ids),
      sourceTypes: Array.from(types).sort(),
      hasDirect: direct,
    };
  }, [events]);

  const orderedVideoIds = useMemo(() => {
    const withTitle = videoIds.map((id) => ({
      id,
      title: videosById.get(id)?.title ?? "",
    }));
    withTitle.sort((a, b) =>
      (a.title || a.id).localeCompare(b.title || b.id, undefined, {
        sensitivity: "base",
      }),
    );
    return withTitle;
  }, [videoIds, videosById]);

  // ---- Multi-select selection ------------------------------------------
  //
  // `selRaw === null` means "nothing touched yet" and resolves to every
  // currently-available key. Once the user interacts we materialise an
  // explicit Set, so an empty selection stays empty.
  const videoKeys = useMemo(
    () => orderedVideoIds.map((v) => `video:${v.id}`),
    [orderedVideoIds],
  );
  const otherKeys = useMemo(
    () => sourceTypes.map((t) => `source:${t}`),
    [sourceTypes],
  );
  const allKeys = useMemo(
    () => [...videoKeys, ...otherKeys, ...(hasDirect ? ["direct"] : [])],
    [videoKeys, otherKeys, hasDirect],
  );

  const [selRaw, setSelRaw] = useState<Set<string> | null>(null);
  const selected = useMemo(
    () => selRaw ?? new Set(allKeys),
    [selRaw, allKeys],
  );
  const selectionSig = useMemo(
    () => Array.from(selected).sort().join("|"),
    [selected],
  );

  const scopedVideoIds = useMemo(
    () => videoIds.filter((id) => selected.has(`video:${id}`)),
    [videoIds, selected],
  );
  const hasNonVideoSelected = useMemo(
    () => Array.from(selected).some((k) => !k.startsWith("video:")),
    [selected],
  );
  const nothingSelected = selected.size === 0;


  // ---- Per-day YouTube views ------------------------------------------
  const viewsQuery = useQuery({
    queryKey: [
      "tracker-yt-views",
      "day",
      startYmd,
      endYmd,
      scopedVideoIds.slice().sort().join(","),
    ],
    enabled: isVideoScope && scopedVideoIds.length > 0,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<Record<string, Record<string, number>>> => {
      const { data, error } = await supabase.functions.invoke(
        "tracker-video-views",
        {
          body: {
            video_ids: scopedVideoIds,
            start_date: startYmd,
            end_date: endYmd,
            granularity: "day",
          },
        },
      );
      if (error) throw error;
      if (!data?.ok) {
        throw new Error(data?.error ?? "Unknown error from tracker-video-views");
      }
      return (data.views ?? {}) as Record<string, Record<string, number>>;
    },
  });

  const viewsError = viewsQuery.error as Error | null;

  // ---- Previous period (same length, ending the day before) ------------
  const { prevStartYmd, prevEndYmd } = useMemo(() => {
    const len = dayCount(startYmd, endYmd);
    const pEnd = addDaysYmd(startYmd, -1);
    return { prevStartYmd: addDaysYmd(pEnd, -(len - 1)), prevEndYmd: pEnd };
  }, [startYmd, endYmd]);

  const prevEventsQuery = useQuery({
    queryKey: ["tracker-events", "prev", prevStartYmd, prevEndYmd],
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<TrackerEventRow[]> => {
      const { data, error } = await supabase
        .from("tracker_events")
        .select(
          "id, event_type, visitor_id, source_type, source_value, booking_id, created_at",
        )
        .gte("created_at", londonDayStartUtcISO(prevStartYmd))
        .lt("created_at", londonDayEndExclusiveUtcISO(prevEndYmd))
        .order("created_at", { ascending: false })
        .limit(10000);
      if (error) throw error;
      return (data ?? []) as TrackerEventRow[];
    },
  });

  const prevViewsQuery = useQuery({
    queryKey: [
      "tracker-yt-views",
      "day",
      "prev",
      prevStartYmd,
      prevEndYmd,
      scopedVideoIds.slice().sort().join(","),
    ],
    enabled: isVideoScope && scopedVideoIds.length > 0,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<Record<string, Record<string, number>>> => {
      const { data, error } = await supabase.functions.invoke(
        "tracker-video-views",
        {
          body: {
            video_ids: scopedVideoIds,
            start_date: prevStartYmd,
            end_date: prevEndYmd,
            granularity: "day",
          },
        },
      );
      if (error) throw error;
      if (!data?.ok) {
        throw new Error(data?.error ?? "Unknown error from tracker-video-views");
      }
      return (data.views ?? {}) as Record<string, Record<string, number>>;
    },
  });


  // ---- Buckets ---------------------------------------------------------
  const bucketKeys = useMemo(() => {
    const days = eachDay(startYmd, endYmd);
    if (bucket === "day") return days;
    const seen: string[] = [];
    const set = new Set<string>();
    for (const d of days) {
      const w = weekStartYmd(d);
      if (!set.has(w)) {
        set.add(w);
        seen.push(w);
      }
    }
    return seen;
  }, [startYmd, endYmd, bucket]);

  const bucketOf = (ymd: string) => (bucket === "week" ? weekStartYmd(ymd) : ymd);

  // ---- Per-bucket aggregation with per-source breakdown ----------------
  //
  // Each bucket carries its total plus a descending-sorted bySource array.
  // Clicks/bookings come from the events prop (scoped by the Source
  // dropdown); views come from the day-mode views response and are
  // video-only by construction — non-video sources and Direct never appear
  // in the views breakdown.
  const buildSeries = useMemo(() => {
    return (metricKey: Metric): BucketPoint[] => {
      // bucketKey -> sourceKey -> value
      const byBucket = new Map<string, Map<string, number>>();
      for (const k of bucketKeys) byBucket.set(k, new Map());

      const add = (bucketKey: string, sourceKey: string, value: number) => {
        const m = byBucket.get(bucketKey);
        if (!m) return;
        m.set(sourceKey, (m.get(sourceKey) ?? 0) + value);
      };

      if (metricKey === "views") {
        const data = viewsQuery.data;
        if (data && isVideoScope) {
          for (const id of scopedVideoIds) {
            const byDay = data[id];
            if (!byDay) continue;
            for (const [day, count] of Object.entries(byDay)) {
              add(bucketOf(day), `video:${id}`, count);
            }
          }
        }
      } else {
        const wantedType = metricKey === "clicks" ? "click" : "booking";
        for (const ev of events ?? []) {
          if (ev.event_type !== wantedType) continue;
          // Scope filter
          if (source !== "all") {
            if (source === "direct") {
              if (ev.source_type) continue;
            } else if (source.startsWith("video:")) {
              if (
                ev.source_type !== "video" ||
                ev.source_value !== source.slice("video:".length)
              )
                continue;
            } else if (source.startsWith("source:")) {
              if (ev.source_type !== source.slice("source:".length)) continue;
            }
          }
          add(bucketOf(londonYmd(ev.created_at)), eventSourceKey(ev), 1);
        }
      }

      const sourceLabel = (key: string): string => {
        if (key.startsWith("video:")) {
          const id = key.slice("video:".length);
          return videosById.get(id)?.title || id;
        }
        if (key.startsWith("source:")) return key.slice("source:".length);
        return "Direct / unattributed";
      };

      return bucketKeys.map((k) => {
        const m = byBucket.get(k) ?? new Map<string, number>();
        const bySource: SourceSlice[] = Array.from(m.entries())
          .map(([key, value]) => ({ key, label: sourceLabel(key), value }))
          .sort((a, b) => b.value - a.value);
        const total = bySource.reduce((s, x) => s + x.value, 0);
        return { bucketKey: k, label: labelForBucket(k, bucket), total, bySource };
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, source, bucketKeys, bucket, viewsQuery.data, scopedVideoIds, isVideoScope, videosById]);

  const viewsData = useMemo(() => buildSeries("views"), [buildSeries]);
  const clicksData = useMemo(() => buildSeries("clicks"), [buildSeries]);
  const bookingsData = useMemo(() => buildSeries("bookings"), [buildSeries]);

  const total = (d: BucketPoint[]) => d.reduce((s, p) => s + p.total, 0);

  const totals: Record<Metric, number | null> = {
    views: isVideoScope ? total(viewsData) : null,
    clicks: total(clicksData),
    bookings: total(bookingsData),
  };

  // ---- Previous-period totals (same source scope) ----------------------
  const inScope = (ev: TrackerEventRow): boolean => {
    if (source === "all") return true;
    if (source === "direct") return !ev.source_type;
    if (source.startsWith("video:")) {
      return (
        ev.source_type === "video" &&
        ev.source_value === source.slice("video:".length)
      );
    }
    if (source.startsWith("source:")) {
      return ev.source_type === source.slice("source:".length);
    }
    return true;
  };

  const prevTotals: Record<Metric, number | null> = useMemo(() => {
    const rows = prevEventsQuery.data;
    let clicks: number | null = null;
    let bookings: number | null = null;
    if (rows) {
      clicks = 0;
      bookings = 0;
      for (const ev of rows) {
        if (!inScope(ev)) continue;
        if (ev.event_type === "click") clicks += 1;
        else if (ev.event_type === "booking") bookings += 1;
      }
    }
    let views: number | null = null;
    if (isVideoScope && prevViewsQuery.data) {
      views = 0;
      for (const id of scopedVideoIds) {
        const byDay = prevViewsQuery.data[id];
        if (!byDay) continue;
        for (const v of Object.values(byDay)) views += v;
      }
    }
    return { views, clicks, bookings };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prevEventsQuery.data, prevViewsQuery.data, source, isVideoScope, scopedVideoIds]);

  const activeData =
    metric === "views" ? viewsData : metric === "clicks" ? clicksData : bookingsData;

  // ---- Pinned bucket ----------------------------------------------------
  const [pinnedKey, setPinnedKey] = useState<string | null>(null);
  useEffect(() => {
    setPinnedKey(null);
  }, [metric, bucket, source, startYmd, endYmd]);

  const pinnedPoint =
    pinnedKey === null
      ? null
      : (activeData.find((p) => p.bucketKey === pinnedKey) ?? null);

  const togglePin = (key: string | undefined) => {
    if (!key) return;
    setPinnedKey((cur) => (cur === key ? null : key));
  };

  const loading = eventsLoading || videosLoading;


  const METRICS: { key: Metric; label: string }[] = [
    { key: "views", label: "Views" },
    { key: "clicks", label: "Clicks" },
    { key: "bookings", label: "Bookings" },
  ];

  return (
    <div className="flex flex-col gap-6">
      {eventsError && (
        <p className="text-xs text-[var(--red)]">
          Tracker events unavailable: {eventsError.message}
        </p>
      )}
      {videosError && (
        <p className="text-xs text-[var(--red)]">
          Video metadata unavailable: {videosError.message}
        </p>
      )}
      {viewsError && (
        <p className="text-xs text-[var(--red)]">
          YouTube views unavailable: {viewsError.message}
        </p>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-ink-muted">Bucket</span>
          <div
            role="tablist"
            aria-label="Bucket size"
            className="inline-flex items-center gap-1 rounded-xl border border-border bg-[var(--surface-raised)] p-1 w-fit"
          >
            {(["week", "day"] as Bucket[]).map((b) => (
              <button
                key={b}
                type="button"
                role="tab"
                aria-selected={bucket === b}
                onClick={() => setBucket(b)}
                className={cn(
                  "px-3 py-1.5 text-sm rounded-lg transition-colors capitalize",
                  bucket === b
                    ? "bg-background text-ink font-medium"
                    : "text-ink-muted hover:text-ink",
                )}
              >
                {b}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-ink-muted">Source</span>
          <Select value={source} onValueChange={setSource}>
            <SelectTrigger className="w-[280px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              {orderedVideoIds.map((v) => (
                <SelectItem key={v.id} value={`video:${v.id}`}>
                  {v.title || v.id}
                </SelectItem>
              ))}
              {sourceTypes.map((t) => (
                <SelectItem key={t} value={`source:${t}`}>
                  {t}
                </SelectItem>
              ))}
              {hasDirect && (
                <SelectItem value="direct">Direct / unattributed</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-3 gap-3">
        {METRICS.map((m) => {
          const selected = metric === m.key;
          const value = totals[m.key];
          const prev = prevTotals[m.key];
          const deltaLoading =
            m.key === "views"
              ? isVideoScope && prevViewsQuery.isLoading
              : prevEventsQuery.isLoading;
          const deltaText =
            deltaLoading || value === null || prev === null
              ? ""
              : formatDelta(value, prev);
          return (
            <button
              key={m.key}
              type="button"
              aria-pressed={selected}
              onClick={() => setMetric(m.key)}
              className={cn(
                "flex flex-col gap-1 rounded-xl border bg-[var(--surface-raised)] px-4 py-3 text-left",
                selected ? "border-2 border-[var(--red)]" : "border-border",
              )}
            >
              <span className="text-xs text-ink-muted">{m.label}</span>
              <span className="text-lg font-medium text-ink">
                {value === null ? "—" : formatInt(value)}
              </span>
              {/* Fixed-height slot so cards don't resize when deltas arrive */}
              <span className="h-4 text-xs leading-4 text-ink-muted">
                {deltaText}
              </span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <p className="text-sm text-ink-muted">Loading…</p>
      ) : metric === "views" && !isVideoScope ? (
        <div className="rounded-md border border-border bg-[var(--surface-raised)] px-6 py-10 text-center">
          <p className="text-sm text-ink-muted">
            View data is only available for YouTube sources.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <SingleChart
            metric={metric}
            bucket={bucket}
            data={activeData}
            pinnedKey={pinnedKey}
            onPick={togglePin}
          />
          {pinnedPoint && (
            <BucketDetailPanel
              point={pinnedPoint}
              metric={metric}
              bucket={bucket}
              onClose={() => setPinnedKey(null)}
            />
          )}
        </div>
      )}

    </div>
  );
}

// ---------- Single chart --------------------------------------------------

const CHART_MARGIN = { top: 4, right: 8, left: 8, bottom: 0 };
const Y_AXIS_WIDTH = 44;

const AXIS_TICK = { fontSize: 11, fill: "var(--ink-muted)" };

function formatTooltipDate(bucketKey: string): string {
  const d = new Date(`${bucketKey}T00:00:00Z`);
  return d.toLocaleDateString("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function CustomTooltip({
  active,
  payload,
  metric,
  bucket,
}: {
  active?: boolean;
  payload?: Array<{ payload: BucketPoint }>;
  metric: Metric;
  bucket: Bucket;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;
  const label = metric === "views" ? "Views" : metric === "clicks" ? "Clicks" : "Bookings";
  const dateLine =
    bucket === "week" ? `Week of ${formatTooltipDate(point.bucketKey)}` : formatTooltipDate(point.bucketKey);

  return (
    <div className="rounded-xl border border-border bg-[var(--surface-raised)] px-3 py-2 shadow-sm">
      <p className="text-xs text-ink-muted">{dateLine}</p>
      <p className="text-sm font-medium text-ink">
        {formatInt(point.total)} {label.toLowerCase()}
      </p>
      {point.total > 0 && point.bySource.length > 0 && (
        <ul className="mt-2 flex flex-col gap-0.5 border-t border-border pt-1.5">
          {point.bySource.slice(0, 3).map((s) => (
            <li key={s.key} className="flex items-center justify-between gap-4 text-xs">
              <span className="truncate text-ink-muted" title={s.label}>
                {s.label}
              </span>
              <span className="shrink-0 tabular-nums text-ink">{formatInt(s.value)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function metricLabel(metric: Metric): string {
  return metric === "views" ? "Views" : metric === "clicks" ? "Clicks" : "Bookings";
}

/** Full breakdown for the pinned bucket. Rendered directly below the chart. */
function BucketDetailPanel({
  point,
  metric,
  bucket,
  onClose,
}: {
  point: BucketPoint;
  metric: Metric;
  bucket: Bucket;
  onClose: () => void;
}) {
  const dateLine =
    bucket === "week"
      ? `Week of ${formatTooltipDate(point.bucketKey)}`
      : formatTooltipDate(point.bucketKey);
  const rows = point.bySource.slice().sort((a, b) => b.value - a.value);
  const max = rows.reduce((m, r) => Math.max(m, r.value), 0);

  return (
    <div className="rounded-xl border border-border bg-[var(--surface-raised)] p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-ink-muted">{dateLine}</p>
          <p className="text-sm font-medium text-ink">
            {formatInt(point.total)} {metricLabel(metric).toLowerCase()}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close breakdown"
          className="rounded-md px-2 py-1 text-xs text-ink-muted hover:text-ink"
        >
          Close
        </button>
      </div>

      {point.total === 0 || rows.length === 0 ? (
        <p className="mt-3 text-xs text-ink-muted">
          Nothing recorded in this {bucket === "week" ? "week" : "day"}.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {rows.map((r) => {
            const pct = max > 0 ? (r.value / max) * 100 : 0;
            const unattributed = r.key === "direct";
            return (
              <li key={r.key} className="flex items-center gap-3">
                <span
                  className="w-[40%] truncate text-xs text-ink-muted"
                  title={r.label}
                >
                  {r.label}
                </span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--surface)]">
                  <span
                    className="block h-full rounded-full"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: unattributed
                        ? "var(--ink-muted)"
                        : "var(--red)",
                    }}
                  />
                </span>
                <span className="w-14 shrink-0 text-right text-xs tabular-nums text-ink">
                  {formatInt(r.value)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function SingleChart({
  metric,
  bucket,
  data,
  pinnedKey,
  onPick,
}: {
  metric: Metric;
  bucket: Bucket;
  data: BucketPoint[];
  pinnedKey: string | null;
  onPick: (bucketKey: string | undefined) => void;
}) {
  const pinnedLabel =
    pinnedKey === null
      ? null
      : (data.find((p) => p.bucketKey === pinnedKey)?.label ?? null);

  const handleClick = (state: unknown) => {
    const s = state as
      | { activePayload?: Array<{ payload?: BucketPoint }> }
      | undefined;
    onPick(s?.activePayload?.[0]?.payload?.bucketKey);
  };

  const pinMarker =
    pinnedLabel !== null ? (
      <ReferenceLine
        x={pinnedLabel}
        stroke="var(--ink-muted)"
        strokeDasharray="3 3"
        isFront
      />
    ) : null;

  if (metric === "bookings") {
    return (
      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={CHART_MARGIN}
            barCategoryGap="20%"
            onClick={handleClick}
            style={{ cursor: "pointer" }}
          >
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              tick={AXIS_TICK}
            />
            <YAxis
              width={Y_AXIS_WIDTH}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              domain={[0, "auto"]}
              tick={AXIS_TICK}
            />
            <Tooltip
              cursor={{ fill: "var(--surface-raised)" }}
              content={<CustomTooltip metric={metric} bucket={bucket} />}
            />
            {pinMarker}
            <Bar
              dataKey="total"
              fill="var(--red)"
              isAnimationActive={false}
              radius={[2, 2, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="h-[240px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={CHART_MARGIN}
          onClick={handleClick}
          style={{ cursor: "pointer" }}
        >
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            tick={AXIS_TICK}
          />
          <YAxis
            width={Y_AXIS_WIDTH}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            domain={[0, "auto"]}
            tick={AXIS_TICK}
          />
          <Tooltip
            cursor={{ fill: "var(--surface-raised)" }}
            content={<CustomTooltip metric={metric} bucket={bucket} />}
          />
          {pinMarker}
          <Area
            type="monotone"
            dataKey="total"
            stroke="var(--red)"
            strokeWidth={2}
            fill="var(--red)"
            fillOpacity={0.1}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

