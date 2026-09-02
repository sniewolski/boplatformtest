import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

function formatInt(n: number): string {
  return n.toLocaleString("en-US");
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
  const [source, setSource] = useState<SourceSel>("all");
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

  const isVideoScope = source === "all" || source.startsWith("video:");
  const scopedVideoIds = useMemo(
    () =>
      source.startsWith("video:") ? [source.slice("video:".length)] : videoIds,
    [source, videoIds],
  );

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

  const activeData =
    metric === "views" ? viewsData : metric === "clicks" ? clicksData : bookingsData;

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
        <SingleChart metric={metric} bucket={bucket} data={activeData} />
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

function SingleChart({
  metric,
  bucket,
  data,
}: {
  metric: Metric;
  bucket: Bucket;
  data: BucketPoint[];
}) {
  const label = metric === "views" ? "Views" : metric === "clicks" ? "Clicks" : "Bookings";

  if (metric === "bookings") {
    return (
      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={CHART_MARGIN} barCategoryGap="20%">
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
        <AreaChart data={data} margin={CHART_MARGIN}>
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
