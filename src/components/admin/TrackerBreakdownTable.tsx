import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

// ---------- Types --------------------------------------------------------

export type TrackerEventRow = {
  id: string;
  event_type: "click" | "book_button" | "booking" | string;
  visitor_id: string | null;
  source_type: string | null;
  source_value: string | null;
  booking_id: string | null;
  created_at: string;
};

export type TrackedVideoRow = {
  video_id: string;
  title: string | null;
  thumbnail_url: string | null;
  resolved_at: string | null;
};

type VideoAggregate = {
  videoId: string;
  views: number;
  clicks: number;
  bookings: number;
  lastActivity: string;
};

type OtherAggregate = {
  sourceType: string;
  views: number;
  clicks: number;
  bookings: number;
  lastActivity: string;
};

function formatInt(n: number): string {
  return n.toLocaleString("en-US");
}

function formatRatio(num: number, den: number | null | undefined): string {
  if (!den || den <= 0 || !Number.isFinite(den)) return "—";
  const pct = (num / den) * 100;
  if (!Number.isFinite(pct)) return "—";
  return `${pct.toFixed(1)}%`;
}

// ---------- Sorting (reusable pattern) -----------------------------------

type SortKey =
  | "title"
  | "category"
  | "ytViews"
  | "visits"
  | "clicks"
  | "bookings"
  | "viewsToVisits"
  | "visitsToBookings"
  | "viewsToBookings";

type SortDir = "asc" | "desc";
type SortState = { key: SortKey; dir: SortDir };

const TEXT_SORT_KEYS = new Set<SortKey>(["title", "category"]);

/** Same null condition formatRatio uses to emit "—". */
function ratioValue(num: number, den: number | null | undefined): number | null {
  if (!den || den <= 0 || !Number.isFinite(den)) return null;
  const v = num / den;
  return Number.isFinite(v) ? v : null;
}

/** Nulls always last, in both directions. */
function compareBy(
  a: string | number | null,
  b: string | number | null,
  dir: SortDir,
): number {
  const aNull = a === null || a === "";
  const bNull = b === null || b === "";
  if (aNull && bNull) return 0;
  if (aNull) return 1;
  if (bNull) return -1;
  const sign = dir === "asc" ? 1 : -1;
  if (typeof a === "string" || typeof b === "string") {
    return (
      sign *
      String(a).localeCompare(String(b), undefined, { sensitivity: "base" })
    );
  }
  return sign * ((a as number) - (b as number));
}

function SortHeader({
  label,
  sortKey,
  sort,
  onSort,
  align = "left",
  className,
}: {
  label: string;
  sortKey: SortKey;
  sort: SortState | null;
  onSort: (key: SortKey) => void;
  align?: "left" | "right";
  className?: string;
}) {
  const active = sort?.key === sortKey;
  return (
    <th
      className={cn(
        "px-4 py-3 font-medium",
        align === "right" && "text-right",
        className,
      )}
      aria-sort={active ? (sort!.dir === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "inline-flex w-full items-center gap-1 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          align === "right" ? "justify-end" : "justify-start",
        )}
      >
        <span>{label}</span>
        <span className="inline-flex w-4 shrink-0 justify-center">
          {active ? (
            sort!.dir === "asc" ? (
              <ChevronUp className="size-3.5 text-[var(--ink-muted)]" />
            ) : (
              <ChevronDown className="size-3.5 text-[var(--ink-muted)]" />
            )
          ) : null}
        </span>
      </button>
    </th>
  );
}

// ---------- Component ----------------------------------------------------

export function TrackerBreakdownTable({
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
  const [includeDirect, setIncludeDirect] = useState(true);

  const { videoAggregates, otherAggregates, directRow, totals } = useMemo(() => {
    const map = new Map<string, VideoAggregate>();
    const others = new Map<string, OtherAggregate>();
    let directViews = 0;
    let directClicks = 0;
    let directBookings = 0;

    for (const ev of events ?? []) {
      const isVideo = ev.source_type === "video" && ev.source_value;
      if (isVideo) {
        const key = ev.source_value!;
        const agg =
          map.get(key) ??
          ({
            videoId: key,
            views: 0,
            clicks: 0,
            bookings: 0,
            lastActivity: ev.created_at,
          } as VideoAggregate);
        if (ev.event_type === "click") agg.views += 1;
        else if (ev.event_type === "book_button") agg.clicks += 1;
        else if (ev.event_type === "booking") agg.bookings += 1;
        if (ev.created_at > agg.lastActivity) agg.lastActivity = ev.created_at;
        map.set(key, agg);
      } else if (ev.source_type) {
        const key = ev.source_type;
        const agg =
          others.get(key) ??
          ({
            sourceType: key,
            views: 0,
            clicks: 0,
            bookings: 0,
            lastActivity: ev.created_at,
          } as OtherAggregate);
        if (ev.event_type === "click") agg.views += 1;
        else if (ev.event_type === "book_button") agg.clicks += 1;
        else if (ev.event_type === "booking") agg.bookings += 1;
        if (ev.created_at > agg.lastActivity) agg.lastActivity = ev.created_at;
        others.set(key, agg);
      } else {
        if (ev.event_type === "click") directViews += 1;
        else if (ev.event_type === "book_button") directClicks += 1;
        else if (ev.event_type === "booking") directBookings += 1;
      }
    }

    const list = Array.from(map.values()).sort((a, b) =>
      a.lastActivity < b.lastActivity ? 1 : -1,
    );
    const otherList = Array.from(others.values()).sort((a, b) =>
      a.lastActivity < b.lastActivity ? 1 : -1,
    );
    const hasDirect = directViews + directClicks + directBookings > 0;
    const sum = (k: "views" | "clicks" | "bookings") =>
      list.reduce((s, r) => s + r[k], 0) + otherList.reduce((s, r) => s + r[k], 0);
    const totalViews = sum("views") + directViews;
    const totalClicks = sum("clicks") + directClicks;
    const totalBookings = sum("bookings") + directBookings;
    return {
      videoAggregates: list,
      otherAggregates: otherList,
      directRow: hasDirect
        ? { views: directViews, clicks: directClicks, bookings: directBookings }
        : null,
      totals: { views: totalViews, clicks: totalClicks, bookings: totalBookings },
    };
  }, [events]);

  // ---- Windowed YouTube views (Analytics API v2, live, no cache) ----
  const videoIds = useMemo(
    () => videoAggregates.map((a) => a.videoId),
    [videoAggregates],
  );

  const viewsQuery = useQuery({
    queryKey: ["tracker-yt-views", startYmd, endYmd, videoIds.join(",")],
    enabled: videoIds.length > 0,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<Record<string, number>> => {
      const { data, error } = await supabase.functions.invoke(
        "tracker-video-views",
        {
          body: {
            video_ids: videoIds,
            start_date: startYmd,
            end_date: endYmd,
          },
        },
      );
      if (error) throw error;
      if (!data?.ok) {
        throw new Error(data?.error ?? "Unknown error from tracker-video-views");
      }
      return (data.views ?? {}) as Record<string, number>;
    },
  });

  const viewsMap = viewsQuery.data ?? null;
  const viewsLoading = videoIds.length > 0 && viewsQuery.isLoading;
  const viewsError = viewsQuery.error as Error | null;

  // ---- Sort state (default: existing lastActivity desc order) ----
  const [sort, setSort] = useState<SortState | null>(null);
  const onSort = (key: SortKey) =>
    setSort((prev) =>
      prev && prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: TEXT_SORT_KEYS.has(key) ? "asc" : "desc" },
    );

  const { sortedVideoAggregates, sortedOtherAggregates } = useMemo(() => {
    if (!sort) {
      return {
        sortedVideoAggregates: videoAggregates,
        sortedOtherAggregates: otherAggregates,
      };
    }
    const titles = new Map(
      (videos ?? []).map((v) => [
        v.video_id,
        v.resolved_at ? v.title ?? "" : "",
      ]),
    );
    const yt = (id: string): number | null =>
      viewsError || !viewsMap ? null : viewsMap[id] ?? 0;

    const videoKey = (r: VideoAggregate): string | number | null => {
      switch (sort.key) {
        case "title":
          return titles.get(r.videoId) ?? "";
        case "category":
          return "video";
        case "ytViews":
          return yt(r.videoId);
        case "visits":
          return r.views;
        case "clicks":
          return r.clicks;
        case "bookings":
          return r.bookings;
        case "viewsToVisits":
          return ratioValue(r.views, yt(r.videoId));
        case "visitsToBookings":
          return ratioValue(r.bookings, r.views);
        case "viewsToBookings":
          return ratioValue(r.bookings, yt(r.videoId));
      }
    };

    const otherKey = (r: OtherAggregate): string | number | null => {
      switch (sort.key) {
        case "title":
          return r.sourceType.charAt(0).toUpperCase() + r.sourceType.slice(1);
        case "category":
          return r.sourceType;
        case "visits":
          return r.views;
        case "clicks":
          return r.clicks;
        case "bookings":
          return r.bookings;
        case "visitsToBookings":
          return ratioValue(r.bookings, r.views);
        default:
          return null;
      }
    };

    return {
      sortedVideoAggregates: [...videoAggregates].sort((a, b) =>
        compareBy(videoKey(a), videoKey(b), sort.dir),
      ),
      sortedOtherAggregates: [...otherAggregates].sort((a, b) =>
        compareBy(otherKey(a), otherKey(b), sort.dir),
      ),
    };
  }, [sort, videoAggregates, otherAggregates, videos, viewsMap, viewsError]);

  const videosById = new Map(
    (videos ?? []).map((v) => [v.video_id, v]),
  );
  const loading = eventsLoading || videosLoading;
  const hasRows =
    videoAggregates.length > 0 || otherAggregates.length > 0 || !!directRow;

  return (
    <>
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

      {loading ? (
        <p className="text-sm text-ink-muted">Loading…</p>
      ) : !hasRows ? (
        <div className="rounded-md border border-border bg-[var(--surface-raised)] px-6 py-10 text-center">
          <p className="text-sm text-ink-muted">
            No tracker events in this range.
          </p>
        </div>
      ) : (
        <div className="rounded-md border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--surface-raised)] text-ink-muted">
              <tr className="text-left">
                <SortHeader label="Category" sortKey="category" sort={sort} onSort={onSort} className="w-[110px]" />
                <th className="px-4 py-3 font-medium w-[120px]">Thumbnail</th>
                <SortHeader label="Title" sortKey="title" sort={sort} onSort={onSort} />
                <SortHeader label="Views" sortKey="ytViews" sort={sort} onSort={onSort} align="right" className="w-[110px]" />
                <SortHeader label="Visits" sortKey="visits" sort={sort} onSort={onSort} align="right" className="w-[90px]" />
                <SortHeader label="Button Clicks" sortKey="clicks" sort={sort} onSort={onSort} align="right" className="w-[110px]" />
                <SortHeader label="Bookings" sortKey="bookings" sort={sort} onSort={onSort} align="right" className="w-[100px]" />
                <SortHeader label="Views→Visits" sortKey="viewsToVisits" sort={sort} onSort={onSort} align="right" className="w-[120px]" />
                <SortHeader label="Visits→Bookings" sortKey="visitsToBookings" sort={sort} onSort={onSort} align="right" className="w-[140px]" />
                <SortHeader label="Views→Bookings" sortKey="viewsToBookings" sort={sort} onSort={onSort} align="right" className="w-[130px]" />
              </tr>
            </thead>
            <tbody>
              {(() => {
                const totalYtViews =
                  viewsError || !viewsMap
                    ? null
                    : videoAggregates.reduce(
                        (s, r) => s + (viewsMap[r.videoId] ?? 0),
                        0,
                      );
                const denom = totalYtViews ?? 0;
                const effectiveTotals = {
                  views: totals.views - (includeDirect ? 0 : directRow?.views ?? 0),
                  clicks: totals.clicks - (includeDirect ? 0 : directRow?.clicks ?? 0),
                  bookings: totals.bookings - (includeDirect ? 0 : directRow?.bookings ?? 0),
                };
                return (
                  <tr className="border-t border-border bg-[var(--surface-raised)] font-medium">
                    <td className="px-4 py-2">TOTAL</td>
                    <td className="px-4 py-2" />
                    <td className="px-4 py-2" />
                    <td className="px-4 py-2 text-right tabular-nums">
                      {viewsError ? (
                        "—"
                      ) : viewsLoading ? (
                        <span className="text-ink-muted">…</span>
                      ) : totalYtViews != null ? (
                        formatInt(totalYtViews)
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">{effectiveTotals.views}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{effectiveTotals.clicks}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{effectiveTotals.bookings}</td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {formatRatio(effectiveTotals.views, denom)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {formatRatio(effectiveTotals.bookings, effectiveTotals.views)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {formatRatio(effectiveTotals.bookings, denom)}
                    </td>
                  </tr>
                );
              })()}

              {sortedVideoAggregates.map((row) => {
                const meta = videosById.get(row.videoId);
                const resolving = !meta || !meta.resolved_at;
                const title = resolving
                  ? "Resolving…"
                  : meta!.title ?? "Untitled / unavailable";
                const href = `https://www.youtube.com/watch?v=${row.videoId}`;
                const ytViews =
                  viewsError || !viewsMap ? null : viewsMap[row.videoId] ?? 0;
                return (
                  <tr key={row.videoId} className="border-t border-border">
                    <td className="px-4 py-3 text-ink-muted">video</td>
                    <td className="px-4 py-3 align-middle">
                      {meta?.thumbnail_url ? (
                        <img
                          src={meta.thumbnail_url}
                          alt=""
                          className="w-24 h-[54px] object-cover rounded"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-24 h-[54px] rounded bg-[var(--surface-raised)]" />
                      )}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          "hover:underline",
                          resolving ? "text-ink-muted" : "text-ink",
                        )}
                      >
                        {title}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {viewsError ? (
                        "—"
                      ) : viewsLoading ? (
                        <span className="text-ink-muted">…</span>
                      ) : ytViews != null ? (
                        formatInt(ytViews)
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{row.views}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{row.clicks}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{row.bookings}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatRatio(row.views, ytViews)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatRatio(row.bookings, row.views)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatRatio(row.bookings, ytViews)}
                    </td>
                  </tr>
                );
              })}
              {sortedOtherAggregates.map((row) => (
                <tr key={`src-${row.sourceType}`} className="border-t border-border">
                  <td className="px-4 py-3 text-ink-muted">{row.sourceType}</td>
                  <td className="px-4 py-3" />
                  <td className="px-4 py-3 align-middle text-ink">
                    {row.sourceType.charAt(0).toUpperCase() + row.sourceType.slice(1)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">—</td>
                  <td className="px-4 py-3 text-right tabular-nums">{row.views}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{row.clicks}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{row.bookings}</td>
                  <td className="px-4 py-3 text-right tabular-nums">—</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatRatio(row.bookings, row.views)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">—</td>
                </tr>
              ))}

              {directRow && (
                <tr className={cn("border-t border-border bg-[var(--surface-raised)]", !includeDirect && "text-[var(--ink-muted)]")}>
                  <td className="px-4 py-3">
                    <Checkbox
                      checked={includeDirect}
                      onCheckedChange={(v) => setIncludeDirect(v === true)}
                      aria-label="Include direct and unattributed traffic in totals"
                    />
                  </td>
                  <td className="px-4 py-3" />
                  <td className="px-4 py-3 italic">
                    Direct / unattributed
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">—</td>
                  <td className="px-4 py-3 text-right tabular-nums">{directRow.views}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{directRow.clicks}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{directRow.bookings}</td>
                  <td className="px-4 py-3 text-right tabular-nums">—</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatRatio(directRow.bookings, directRow.views)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">—</td>
                </tr>
              )}

            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
