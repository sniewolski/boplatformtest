import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
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

type Point = { key: string; label: string; value: number };

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

  const emptySeries = (): Map<string, number> =>
    new Map(bucketKeys.map((k) => [k, 0]));

  const { clicksSeries, bookingsSeries } = useMemo(() => {
    const clicks = emptySeries();
    const bookings = emptySeries();
    for (const ev of events ?? []) {
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
      const key = bucketOf(londonYmd(ev.created_at));
      if (ev.event_type === "click") {
        if (clicks.has(key)) clicks.set(key, (clicks.get(key) ?? 0) + 1);
      } else if (ev.event_type === "booking") {
        if (bookings.has(key)) bookings.set(key, (bookings.get(key) ?? 0) + 1);
      }
    }
    return { clicksSeries: clicks, bookingsSeries: bookings };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, source, bucketKeys, bucket]);

  const viewsSeries = useMemo(() => {
    const series = emptySeries();
    const data = viewsQuery.data;
    if (!data || !isVideoScope) return series;
    for (const id of scopedVideoIds) {
      const byDay = data[id];
      if (!byDay) continue;
      for (const [day, count] of Object.entries(byDay)) {
        const key = bucketOf(day);
        if (series.has(key)) series.set(key, (series.get(key) ?? 0) + count);
      }
    }
    return series;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewsQuery.data, scopedVideoIds, bucketKeys, bucket, isVideoScope]);

  const toPoints = (m: Map<string, number>): Point[] =>
    bucketKeys.map((k) => ({
      key: k,
      label: labelForBucket(k, bucket),
      value: m.get(k) ?? 0,
    }));

  const viewsData = toPoints(viewsSeries);
  const clicksData = toPoints(clicksSeries);
  const bookingsData = toPoints(bookingsSeries);

  const total = (d: Point[]) => d.reduce((s, p) => s + p.value, 0);

  const loading = eventsLoading || videosLoading;

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

      {loading ? (
        <p className="text-sm text-ink-muted">Loading…</p>
      ) : (
        <div className="flex flex-col gap-6">
          <Panel
            label="Views"
            total={isVideoScope ? total(viewsData) : null}
            empty={
              !isVideoScope
                ? "View data is only available for YouTube sources."
                : null
            }
            data={viewsData}
            colour="var(--ink-muted)"
            showXAxis={false}
          />
          <Panel
            label="Clicks"
            total={total(clicksData)}
            empty={null}
            data={clicksData}
            colour="var(--ink)"
            showXAxis={false}
          />
          <Panel
            label="Bookings"
            total={total(bookingsData)}
            empty={null}
            data={bookingsData}
            colour="var(--red)"
            showXAxis
          />
        </div>
      )}
    </div>
  );
}

const CHART_MARGIN = { top: 4, right: 8, left: 8, bottom: 0 };
const Y_AXIS_WIDTH = 44;

function Panel({
  label,
  total,
  empty,
  data,
  colour,
  showXAxis,
}: {
  label: string;
  total: number | null;
  empty: string | null;
  data: Point[];
  colour: string;
  showXAxis: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-ink-muted">{label}</span>
        {total !== null && (
          <span className="text-xs text-ink-muted">{formatInt(total)}</span>
        )}
      </div>
      {empty ? (
        <div className="rounded-md border border-border bg-[var(--surface-raised)] px-6 py-10 text-center">
          <p className="text-sm text-ink-muted">{empty}</p>
        </div>
      ) : (
        <div className={showXAxis ? "h-[200px]" : "h-[160px]"}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={CHART_MARGIN} barCategoryGap="20%">
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="label"
                hide={!showXAxis}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                tick={{ fontSize: 11, fill: "var(--ink-muted)" }}
              />
              <YAxis
                width={Y_AXIS_WIDTH}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "var(--ink-muted)" }}
              />
              <Tooltip
                cursor={{ fill: "var(--surface-raised)" }}
                formatter={(value: number) => [formatInt(value), label]}
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "var(--background)",
                  color: "var(--ink)",
                }}
              />
              <Bar
                dataKey="value"
                fill={colour}
                isAnimationActive={false}
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
