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
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/admin/tracker")({
  component: TrackerAdmin,
});

// ---------- London day boundary helpers ---------------------------------

function toYmd(d: Date): string {
  // Interpret Date as local calendar; format YYYY-MM-DD.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Return the UTC ISO string for 00:00 Europe/London on the given YYYY-MM-DD.
 * Iterates candidate UTC offsets (0 or -1h for BST) and picks the one that
 * maps back to 00:00 London on that calendar date.
 */
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
  // Start of the next day, London.
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
  clicks: number;
  bookButton: number;
  bookings: number;
  lastActivity: string;
};

// ---------- Component ----------------------------------------------------

function TrackerAdmin() {
  const { user } = Route.useRouteContext();
  const { data: roles, isLoading: rolesLoading } = useMyRoles(user.id);

  const [toDate, setToDate] = useState<Date>(() => new Date());
  const [fromDate, setFromDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d;
  });

  const fromISO = useMemo(
    () => londonDayStartUtcISO(toYmd(fromDate)),
    [fromDate],
  );
  const toISO = useMemo(
    () => londonDayEndExclusiveUtcISO(toYmd(toDate)),
    [toDate],
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

  // Aggregate events per video and the unattributed bucket.
  const { videoAggregates, directRow } = useMemo(() => {
    const map = new Map<string, VideoAggregate>();
    let directClicks = 0;
    let directBook = 0;
    let directBookings = 0;

    for (const ev of eventsQuery.data ?? []) {
      const isVideo = ev.source_type === "video" && ev.source_value;
      if (isVideo) {
        const key = ev.source_value!;
        const agg =
          map.get(key) ??
          ({
            videoId: key,
            clicks: 0,
            bookButton: 0,
            bookings: 0,
            lastActivity: ev.created_at,
          } as VideoAggregate);
        if (ev.event_type === "click") agg.clicks += 1;
        else if (ev.event_type === "book_button") agg.bookButton += 1;
        else if (ev.event_type === "booking") agg.bookings += 1;
        if (ev.created_at > agg.lastActivity) agg.lastActivity = ev.created_at;
        map.set(key, agg);
      } else if (!ev.source_type || !ev.source_value) {
        if (ev.event_type === "click") directClicks += 1;
        else if (ev.event_type === "book_button") directBook += 1;
        else if (ev.event_type === "booking") directBookings += 1;
      }
    }

    const list = Array.from(map.values()).sort((a, b) =>
      a.lastActivity < b.lastActivity ? 1 : -1,
    );
    const hasDirect = directClicks + directBook + directBookings > 0;
    return {
      videoAggregates: list,
      directRow: hasDirect
        ? { clicks: directClicks, bookButton: directBook, bookings: directBookings }
        : null,
    };
  }, [eventsQuery.data]);

  // Resolve missing/unresolved video metadata via edge function.
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
    <div className="app-content py-16 flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl">Tracker</h1>
        <p className="text-ink-muted text-sm max-w-prose">
          Funnel attribution by YouTube video — clicks, book-button taps and
          confirmed bookings for the selected window.
        </p>
      </header>

      <div className="flex flex-wrap items-end gap-4">
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
        <div className="text-xs text-ink-muted pb-2">
          Europe/London — inclusive
        </div>
      </div>

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
                <th className="px-4 py-3 font-medium w-[88px]">Video</th>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium text-right w-[100px]">Clicks</th>
                <th className="px-4 py-3 font-medium text-right w-[140px]">Book button</th>
                <th className="px-4 py-3 font-medium text-right w-[110px]">Bookings</th>
              </tr>
            </thead>
            <tbody>
              {videoAggregates.map((row) => {
                const meta = videosById.get(row.videoId);
                const resolving = !meta || !meta.resolved_at;
                const title = resolving
                  ? null
                  : meta!.title ?? "Untitled / unavailable";
                return (
                  <tr key={row.videoId} className="border-t border-border">
                    <td className="px-4 py-3 align-middle">
                      {meta?.thumbnail_url ? (
                        <img
                          src={meta.thumbnail_url}
                          alt=""
                          className="w-16 h-9 object-cover rounded"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-16 h-9 rounded bg-[var(--surface-raised)]" />
                      )}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      {resolving ? (
                        <span className="text-ink-muted">Resolving…</span>
                      ) : (
                        <a
                          href={`https://www.youtube.com/watch?v=${row.videoId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-ink hover:underline"
                        >
                          {title}
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {row.clicks}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {row.bookButton}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {row.bookings}
                    </td>
                  </tr>
                );
              })}
              {directRow && (
                <tr className="border-t border-border bg-[var(--surface-raised)]">
                  <td className="px-4 py-3" />
                  <td className="px-4 py-3 text-ink-muted italic">
                    Direct / unattributed
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {directRow.clicks}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {directRow.bookButton}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {directRow.bookings}
                  </td>
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
