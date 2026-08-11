import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
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

export const Route = createFileRoute("/_authenticated/app/admin/tracker")({
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

// ---------- Types --------------------------------------------------------

type TrackerEventRow = {
  id: string;
  event_type: "click" | "book_button" | "booking" | string;
  visitor_id: string | null;
  source_type: string | null;
  source_value: string | null;
  booking_id: string | null;
  created_at: string;
};

type TrackedVideoRow = {
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

function formatInt(n: number): string {
  return n.toLocaleString("en-US");
}

function formatRatio(num: number, den: number | null | undefined): string {
  if (!den || den <= 0 || !Number.isFinite(den)) return "—";
  const pct = (num / den) * 100;
  if (!Number.isFinite(pct)) return "—";
  return `${pct.toFixed(1)}%`;
}

type RangePreset = "7" | "30" | "90" | "360" | "custom";

// ---------- Component ----------------------------------------------------

function TrackerAdmin() {
  const { user } = Route.useRouteContext();
  const { data: roles, isLoading: rolesLoading } = useMyRoles(user.id);

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

  const { videoAggregates, directRow, totals } = useMemo(() => {
    const map = new Map<string, VideoAggregate>();
    let directViews = 0;
    let directClicks = 0;
    let directBookings = 0;

    for (const ev of eventsQuery.data ?? []) {
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
      } else if (!ev.source_type || !ev.source_value) {
        if (ev.event_type === "click") directViews += 1;
        else if (ev.event_type === "book_button") directClicks += 1;
        else if (ev.event_type === "booking") directBookings += 1;
      }
    }

    const list = Array.from(map.values()).sort((a, b) =>
      a.lastActivity < b.lastActivity ? 1 : -1,
    );
    const hasDirect = directViews + directClicks + directBookings > 0;
    const totalViews =
      list.reduce((s, r) => s + r.views, 0) + directViews;
    const totalClicks =
      list.reduce((s, r) => s + r.clicks, 0) + directClicks;
    const totalBookings =
      list.reduce((s, r) => s + r.bookings, 0) + directBookings;
    return {
      videoAggregates: list,
      directRow: hasDirect
        ? { views: directViews, clicks: directClicks, bookings: directBookings }
        : null,
      totals: { views: totalViews, clicks: totalClicks, bookings: totalBookings },
    };
  }, [eventsQuery.data]);

  // ---- Windowed YouTube views (Analytics API v2, live, no cache) ----
  const startYmd = useMemo(() => toYmd(effectiveFrom), [effectiveFrom]);
  const endYmd = useMemo(() => toYmd(effectiveTo), [effectiveTo]);
  const videoIds = useMemo(
    () => videoAggregates.map((a) => a.videoId),
    [videoAggregates],
  );

  const viewsQuery = useQuery({
    queryKey: ["tracker-yt-views", startYmd, endYmd, videoIds.join(",")],
    enabled:
      !rolesLoading && !!roles?.includes("admin") && videoIds.length > 0,
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

  const queryClient = useQueryClient();
  useEffect(() => {
    const videos = videosQuery.data;
    if (!videos) return;
    const known = new Map(videos.map((v) => [v.video_id, v]));
    const missing = videoAggregates
      .map((a) => a.videoId)
      .filter((id) => {
        const row = known.get(id);
        return !row || !row.resolved_at;
      });
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
  }, [videoAggregates, videosQuery.data, queryClient]);

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

  const videosById = new Map(
    (videosQuery.data ?? []).map((v) => [v.video_id, v]),
  );
  const loading = eventsQuery.isLoading || videosQuery.isLoading;
  const hasRows = videoAggregates.length > 0 || !!directRow;

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

      {eventsQuery.error && (
        <p className="text-xs text-[var(--red)]">
          Tracker events unavailable: {(eventsQuery.error as Error).message}
        </p>
      )}
      {videosQuery.error && (
        <p className="text-xs text-[var(--red)]">
          Video metadata unavailable: {(videosQuery.error as Error).message}
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
                <th className="px-4 py-3 font-medium w-[110px]">Category</th>
                <th className="px-4 py-3 font-medium w-[120px]">Thumbnail</th>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium text-right w-[110px]">Views</th>
                <th className="px-4 py-3 font-medium text-right w-[90px]">Visits</th>
                <th className="px-4 py-3 font-medium text-right w-[110px]">Button Clicks</th>
                <th className="px-4 py-3 font-medium text-right w-[100px]">Bookings</th>
                <th className="px-4 py-3 font-medium text-right w-[120px]">Views→Visits</th>
                <th className="px-4 py-3 font-medium text-right w-[140px]">Visits→Bookings</th>
                <th className="px-4 py-3 font-medium text-right w-[130px]">Views→Bookings</th>
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
                    <td className="px-4 py-2 text-right tabular-nums">{totals.views}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{totals.clicks}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{totals.bookings}</td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {formatRatio(totals.views, denom)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {formatRatio(totals.bookings, totals.views)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {formatRatio(totals.bookings, denom)}
                    </td>
                  </tr>
                );
              })()}
              {videoAggregates.map((row) => {
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
              {directRow && (
                <tr className="border-t border-border bg-[var(--surface-raised)]">
                  <td className="px-4 py-3 text-ink-muted">—</td>
                  <td className="px-4 py-3" />
                  <td className="px-4 py-3 text-ink-muted italic">
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
