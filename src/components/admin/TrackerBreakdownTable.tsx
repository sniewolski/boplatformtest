import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, ChevronUp } from "lucide-react";
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
  published_at: string | null;
};

type VideoAggregate = {
  videoId: string;
  views: number;
  clicks: number;
  bookings: number;
  optinViews: number;
  optins: number;
  lastActivity: string;
};

type OtherAggregate = {
  sourceType: string;
  views: number;
  clicks: number;
  bookings: number;
  optinViews: number;
  optins: number;
  lastActivity: string;
};

function formatInt(n: number): string {
  return n.toLocaleString("en-US");
}

/** "14 Mar 2026" (en-GB), em dash when null/unparseable. */
function formatPublished(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
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
  | "published"
  | "ytViews"
  | "visits"
  | "clicks"
  | "bookings"
  | "optinViews"
  | "optins"
  | "optinRate"
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

// ---------- Pinned columns + collapsible groups -------------------------

// Pinned top rows: non-pinned-left cells become sticky at z-20; corner cells
// (pin(i, "head")) sit at z-30; pinned-left body cells at z-10.
const TOP_ROW =
  "[&>*:not(.sticky)]:sticky [&>*:not(.sticky)]:z-20 [&>*]:bg-[var(--surface-raised)]";
// Matches the page's bottom padding (py-16).
const BOTTOM_GAP = 64;

type CollapsedGroups = { sales: boolean; optin: boolean };
const DEFAULT_COLLAPSED: CollapsedGroups = { sales: false, optin: false };
const COLLAPSE_KEY = "tracker_breakdown_collapsed";

// Fixed widths so cumulative sticky offsets are exact.
const PINNED = [
  "left-0 w-[110px] min-w-[110px] max-w-[110px]",
  "left-[110px] w-[130px] min-w-[130px] max-w-[130px]",
  "left-[240px] w-[120px] min-w-[120px] max-w-[120px]",
  "left-[360px] w-[280px] min-w-[280px] max-w-[280px] border-r border-border",
] as const;

function pin(i: number, bg: "head" | "base" | "raised"): string {
  return cn(
    "sticky",
    PINNED[i],
    bg === "head" ? "z-30 bg-[var(--surface-raised)]" : "z-10",
    bg === "base" && "bg-background",
    bg === "raised" && "bg-[var(--surface-raised)]",
  );
}

function GroupHeader({
  name,
  span,
  collapsed,
  onToggle,
}: {
  name: string;
  span: number;
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <th
      colSpan={collapsed ? 1 : span}
      rowSpan={collapsed ? 2 : 1}
      className={cn(
        "px-4 py-2 font-medium text-left align-top border-l border-border",
        collapsed && "w-[56px]",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!collapsed}
        aria-label={`${collapsed ? "Expand" : "Collapse"} ${name} columns`}
        className={cn(
          "inline-flex items-center gap-1 rounded-sm hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          collapsed && "flex-col items-start",
        )}
      >
        <ChevronRight
          className={cn(
            "size-3.5 text-[var(--ink-muted)] transition-transform duration-150 ease-out motion-reduce:transition-none",
            !collapsed && "rotate-90",
          )}
        />
        <span>{name}</span>
      </button>
    </th>
  );
}

function SortHeader({
  label,
  sortKey,
  sort,
  onSort,
  align = "left",
  className,
}: {
  label: ReactNode;
  sortKey: SortKey;
  sort: SortState | null;
  onSort: (key: SortKey) => void;
  align?: "left" | "right";
  className?: string;
}) {
  const active = sort?.key === sortKey;
  const shownDir: SortDir = active
    ? sort!.dir
    : TEXT_SORT_KEYS.has(sortKey)
      ? "asc"
      : "desc";
  const Chevron = shownDir === "asc" ? ChevronUp : ChevronDown;
  return (
    <th
      className={cn(
        "group cursor-pointer px-4 py-3 font-medium transition-colors duration-150 ease-out motion-safe",
        "[@media(hover:hover)_and_(pointer:fine)]:hover:bg-muted",
        "[@media(hover:hover)_and_(pointer:fine)]:hover:text-ink",
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
          <Chevron
            className={cn(
              "size-3.5 text-[var(--ink-muted)] transition-opacity duration-150 ease-out motion-safe",
              active
                ? "opacity-100"
                : "opacity-0 [@media(hover:hover)_and_(pointer:fine)]:group-hover:opacity-35",
            )}
          />
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
    let directOptinViews = 0;
    let directOptins = 0;

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
            optinViews: 0,
            optins: 0,
            lastActivity: ev.created_at,
          } as VideoAggregate);
        if (ev.event_type === "click") agg.views += 1;
        else if (ev.event_type === "book_button") agg.clicks += 1;
        else if (ev.event_type === "booking") agg.bookings += 1;
        else if (ev.event_type === "optin_view") agg.optinViews += 1;
        else if (ev.event_type === "optin") agg.optins += 1;
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
            optinViews: 0,
            optins: 0,
            lastActivity: ev.created_at,
          } as OtherAggregate);
        if (ev.event_type === "click") agg.views += 1;
        else if (ev.event_type === "book_button") agg.clicks += 1;
        else if (ev.event_type === "booking") agg.bookings += 1;
        else if (ev.event_type === "optin_view") agg.optinViews += 1;
        else if (ev.event_type === "optin") agg.optins += 1;
        if (ev.created_at > agg.lastActivity) agg.lastActivity = ev.created_at;
        others.set(key, agg);
      } else {
        if (ev.event_type === "click") directViews += 1;
        else if (ev.event_type === "book_button") directClicks += 1;
        else if (ev.event_type === "booking") directBookings += 1;
        else if (ev.event_type === "optin_view") directOptinViews += 1;
        else if (ev.event_type === "optin") directOptins += 1;
      }
    }

    const list = Array.from(map.values()).sort((a, b) =>
      a.lastActivity < b.lastActivity ? 1 : -1,
    );
    const otherList = Array.from(others.values()).sort((a, b) =>
      a.lastActivity < b.lastActivity ? 1 : -1,
    );
    const hasDirect =
      directViews +
        directClicks +
        directBookings +
        directOptinViews +
        directOptins >
      0;
    const sum = (k: "views" | "clicks" | "bookings" | "optinViews" | "optins") =>
      list.reduce((s, r) => s + r[k], 0) + otherList.reduce((s, r) => s + r[k], 0);
    const totalViews = sum("views") + directViews;
    const totalClicks = sum("clicks") + directClicks;
    const totalBookings = sum("bookings") + directBookings;
    const totalOptinViews = sum("optinViews") + directOptinViews;
    const totalOptins = sum("optins") + directOptins;
    return {
      videoAggregates: list,
      otherAggregates: otherList,
      directRow: hasDirect
        ? {
            views: directViews,
            clicks: directClicks,
            bookings: directBookings,
            optinViews: directOptinViews,
            optins: directOptins,
          }
        : null,
      totals: {
        views: totalViews,
        clicks: totalClicks,
        bookings: totalBookings,
        optinViews: totalOptinViews,
        optins: totalOptins,
      },
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const groupRowRef = useRef<HTMLTableRowElement>(null);
  const headRowRef = useRef<HTMLTableRowElement>(null);
  const [fitHeight, setFitHeight] = useState<number | null>(null);
  const [rowH, setRowH] = useState({ g: 0, h: 0 });
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const measure = () => {
      const top = el.getBoundingClientRect().top + window.scrollY;
      setFitHeight(Math.max(320, window.innerHeight - top - BOTTOM_GAP));
      const g = groupRowRef.current?.getBoundingClientRect().height ?? 0;
      const h = headRowRef.current?.getBoundingClientRect().height ?? 0;
      setRowH((prev) => (prev.g === g && prev.h === h ? prev : { g, h }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);
    if (groupRowRef.current) ro.observe(groupRowRef.current);
    if (headRowRef.current) ro.observe(headRowRef.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [eventsLoading, videosLoading, collapsed]);
  const [collapsed, setCollapsed] = useState<CollapsedGroups>(DEFAULT_COLLAPSED);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(COLLAPSE_KEY);
      if (raw) {
        const v = JSON.parse(raw) as Partial<CollapsedGroups>;
        setCollapsed({ sales: v.sales === true, optin: v.optin === true });
      }
    } catch {
      // storage unavailable — keep defaults
    }
  }, []);
  const toggleGroup = (g: keyof CollapsedGroups) => {
    setCollapsed((prev) => {
      const next = { ...prev, [g]: !prev[g] };
      try {
        window.localStorage.setItem(COLLAPSE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };
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

    const published = new Map(
      (videos ?? []).map((v) => [v.video_id, v.published_at ?? null]),
    );

    const videoKey = (r: VideoAggregate): string | number | null => {
      switch (sort.key) {
        case "title":
          return titles.get(r.videoId) ?? "";
        case "category":
          return "video";
        case "published":
          return published.get(r.videoId) ?? null;
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
        case "optinViews":
          return r.optinViews;
        case "optins":
          return r.optins;
        case "optinRate":
          return ratioValue(r.optins, r.optinViews);
      }
    };

    const otherKey = (r: OtherAggregate): string | number | null => {
      switch (sort.key) {
        case "title":
          return r.sourceType.charAt(0).toUpperCase() + r.sourceType.slice(1);
        case "category":
          return r.sourceType;
        case "published":
          return null;
        case "visits":
          return r.views;
        case "clicks":
          return r.clicks;
        case "bookings":
          return r.bookings;
        case "visitsToBookings":
          return ratioValue(r.bookings, r.views);
        case "optinViews":
          return r.optinViews;
        case "optins":
          return r.optins;
        case "optinRate":
          return ratioValue(r.optins, r.optinViews);
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
        <div
          ref={scrollRef}
          className="rounded-md border border-border overflow-auto max-w-full min-h-[320px]"
          style={{ height: fitHeight ?? undefined }}
        >
          <table
            className="min-w-full text-sm border-separate border-spacing-0"
            style={{ "--t1": `${rowH.g}px`, "--t2": `${rowH.g + rowH.h}px` } as CSSProperties}
          >
            <thead className="bg-[var(--surface-raised)] text-ink-muted">
              <tr ref={groupRowRef} className={cn("text-left", TOP_ROW, "[&>*]:top-0")}>
                {PINNED.map((c, i) => (
                  <th key={i} className={cn(pin(i, "head"), "px-4 py-2")} aria-hidden="true" />
                ))}
                <th className="px-4 py-2" aria-hidden="true" />
                <th className="px-4 py-2" aria-hidden="true" />
                <GroupHeader
                  name="Sales"
                  span={5}
                  collapsed={collapsed.sales}
                  onToggle={() => toggleGroup("sales")}
                />
                <GroupHeader
                  name="Opt-in"
                  span={3}
                  collapsed={collapsed.optin}
                  onToggle={() => toggleGroup("optin")}
                />
              </tr>
              <tr ref={headRowRef} className={cn("text-left", TOP_ROW, "[&>*]:top-[var(--t1)]")}>
                <SortHeader label="Category" sortKey="category" sort={sort} onSort={onSort} className={cn(pin(0, "head"), "border-t border-border")} />
                <SortHeader label="Published" sortKey="published" sort={sort} onSort={onSort} className={cn(pin(1, "head"), "whitespace-nowrap border-t border-border")} />
                <th className={cn(pin(2, "head"), "px-4 py-3 font-medium border-t border-border")}>Thumbnail</th>
                <SortHeader label="Title" sortKey="title" sort={sort} onSort={onSort} className={cn(pin(3, "head"), "border-t border-border")} />
                <SortHeader label="Views" sortKey="ytViews" sort={sort} onSort={onSort} align="right" className="w-[110px] border-t border-border" />
                <SortHeader label="Views→Visits" sortKey="viewsToVisits" sort={sort} onSort={onSort} align="right" className="w-[120px] border-t border-border" />
                {!collapsed.sales && (
                  <>
                    <SortHeader label="Visits" sortKey="visits" sort={sort} onSort={onSort} align="right" className="w-[90px] border-t border-border" />
                    <SortHeader label="Button Clicks" sortKey="clicks" sort={sort} onSort={onSort} align="right" className="w-[110px] border-t border-border" />
                    <SortHeader label="Bookings" sortKey="bookings" sort={sort} onSort={onSort} align="right" className="w-[100px] border-t border-border" />
                    <SortHeader label="Visits→Bookings" sortKey="visitsToBookings" sort={sort} onSort={onSort} align="right" className="w-[140px] border-t border-border" />
                    <SortHeader label="Views→Bookings" sortKey="viewsToBookings" sort={sort} onSort={onSort} align="right" className="w-[130px] border-t border-border" />
                  </>
                )}
                {!collapsed.optin && (
                  <>
                    <SortHeader label={<>Optin<br />Visits</>} sortKey="optinViews" sort={sort} onSort={onSort} align="right" className="w-[100px] border-t border-border" />
                    <SortHeader label="Opt-ins" sortKey="optins" sort={sort} onSort={onSort} align="right" className="w-[100px] border-t border-border" />
                    <SortHeader label="Opt-in Rate" sortKey="optinRate" sort={sort} onSort={onSort} align="right" className="w-[110px] border-t border-border" />
                  </>
                )}
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
                  optinViews: totals.optinViews - (includeDirect ? 0 : directRow?.optinViews ?? 0),
                  optins: totals.optins - (includeDirect ? 0 : directRow?.optins ?? 0),
                };
                const bg = "head" as const;
                const td = "px-4 py-2 text-right tabular-nums border-t border-border";
                return (
                  <tr className={cn("bg-[var(--surface-raised)] font-medium", TOP_ROW, "[&>*]:top-[var(--t2)] [&>*]:border-b")}>
                    <td className={cn(pin(0, bg), "px-4 py-2 border-t border-border")}>TOTAL</td>
                    <td className={cn(pin(1, bg), "px-4 py-2 border-t border-border")}>—</td>
                    <td className={cn(pin(2, bg), "px-4 py-2 border-t border-border")} />
                    <td className={cn(pin(3, bg), "px-4 py-2 border-t border-border")} />
                    <td className={td}>
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
                    <td className={td}>{formatRatio(effectiveTotals.views, denom)}</td>
                    {collapsed.sales ? (
                      <td className={td} />
                    ) : (
                      <>
                        <td className={td}>{effectiveTotals.views}</td>
                        <td className={td}>{effectiveTotals.clicks}</td>
                        <td className={td}>{effectiveTotals.bookings}</td>
                        <td className={td}>
                          {formatRatio(effectiveTotals.bookings, effectiveTotals.views)}
                        </td>
                        <td className={td}>{formatRatio(effectiveTotals.bookings, denom)}</td>
                      </>
                    )}
                    {collapsed.optin ? (
                      <td className={td} />
                    ) : (
                      <>
                        <td className={td}>{effectiveTotals.optinViews}</td>
                        <td className={td}>{effectiveTotals.optins}</td>
                        <td className={td}>
                          {formatRatio(effectiveTotals.optins, effectiveTotals.optinViews)}
                        </td>
                      </>
                    )}
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
                const td = "px-4 py-3 text-right tabular-nums border-t border-border";
                return (
                  <tr key={row.videoId}>
                    <td className={cn(pin(0, "base"), "px-4 py-3 text-ink-muted border-t border-border")}>video</td>
                    <td className={cn(pin(1, "base"), "px-4 py-3 whitespace-nowrap text-ink-muted border-t border-border")}>
                      {formatPublished(meta?.published_at ?? null)}
                    </td>
                    <td className={cn(pin(2, "base"), "px-4 py-3 align-middle border-t border-border")}>
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
                    <td className={cn(pin(3, "base"), "px-4 py-3 align-middle border-t border-border")}>
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
                    <td className={td}>
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
                    <td className={td}>{formatRatio(row.views, ytViews)}</td>
                    {collapsed.sales ? (
                      <td className={td} />
                    ) : (
                      <>
                        <td className={td}>{row.views}</td>
                        <td className={td}>{row.clicks}</td>
                        <td className={td}>{row.bookings}</td>
                        <td className={td}>{formatRatio(row.bookings, row.views)}</td>
                        <td className={td}>{formatRatio(row.bookings, ytViews)}</td>
                      </>
                    )}
                    {collapsed.optin ? (
                      <td className={td} />
                    ) : (
                      <>
                        <td className={td}>{row.optinViews}</td>
                        <td className={td}>{row.optins}</td>
                        <td className={td}>{formatRatio(row.optins, row.optinViews)}</td>
                      </>
                    )}
                  </tr>
                );
              })}
              {sortedOtherAggregates.map((row) => {
                const td = "px-4 py-3 text-right tabular-nums border-t border-border";
                return (
                  <tr key={`src-${row.sourceType}`}>
                    <td className={cn(pin(0, "base"), "px-4 py-3 text-ink-muted border-t border-border")}>{row.sourceType}</td>
                    <td className={cn(pin(1, "base"), "px-4 py-3 border-t border-border")}>—</td>
                    <td className={cn(pin(2, "base"), "px-4 py-3 border-t border-border")} />
                    <td className={cn(pin(3, "base"), "px-4 py-3 align-middle text-ink border-t border-border")}>
                      {row.sourceType.charAt(0).toUpperCase() + row.sourceType.slice(1)}
                    </td>
                    <td className={td}>—</td>
                    <td className={td}>—</td>
                    {collapsed.sales ? (
                      <td className={td} />
                    ) : (
                      <>
                        <td className={td}>{row.views}</td>
                        <td className={td}>{row.clicks}</td>
                        <td className={td}>{row.bookings}</td>
                        <td className={td}>{formatRatio(row.bookings, row.views)}</td>
                        <td className={td}>—</td>
                      </>
                    )}
                    {collapsed.optin ? (
                      <td className={td} />
                    ) : (
                      <>
                        <td className={td}>{row.optinViews}</td>
                        <td className={td}>{row.optins}</td>
                        <td className={td}>{formatRatio(row.optins, row.optinViews)}</td>
                      </>
                    )}
                  </tr>
                );
              })}

              {directRow && (() => {
                const td = "px-4 py-3 text-right tabular-nums border-t border-border";
                return (
                  <tr className={cn("bg-[var(--surface-raised)]", !includeDirect && "text-[var(--ink-muted)]")}>
                    <td className={cn(pin(0, "raised"), "px-4 py-3 border-t border-border")}>
                      <Checkbox
                        checked={includeDirect}
                        onCheckedChange={(v) => setIncludeDirect(v === true)}
                        aria-label="Include direct and unattributed traffic in totals"
                      />
                    </td>
                    <td className={cn(pin(1, "raised"), "px-4 py-3 border-t border-border")}>—</td>
                    <td className={cn(pin(2, "raised"), "px-4 py-3 border-t border-border")} />
                    <td className={cn(pin(3, "raised"), "px-4 py-3 italic border-t border-border")}>
                      Direct / unattributed
                    </td>
                    <td className={td}>—</td>
                    <td className={td}>—</td>
                    {collapsed.sales ? (
                      <td className={td} />
                    ) : (
                      <>
                        <td className={td}>{directRow.views}</td>
                        <td className={td}>{directRow.clicks}</td>
                        <td className={td}>{directRow.bookings}</td>
                        <td className={td}>{formatRatio(directRow.bookings, directRow.views)}</td>
                        <td className={td}>—</td>
                      </>
                    )}
                    {collapsed.optin ? (
                      <td className={td} />
                    ) : (
                      <>
                        <td className={td}>{directRow.optinViews}</td>
                        <td className={td}>{directRow.optins}</td>
                        <td className={td}>{formatRatio(directRow.optins, directRow.optinViews)}</td>
                      </>
                    )}
                  </tr>
                );
              })()}

            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
