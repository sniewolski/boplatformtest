import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  LogIn,
  FolderOpen,
  LayoutGrid,
  Clock,
  Monitor,
  MapPin,
  CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getActivityForOwner,
  type ActivityForOwner,
  type ActivitySession,
  type ActivityTimelineEvent,
} from "@/lib/activityAdmin.functions";

export function OwnerActivityDetail({ ownerId }: { ownerId: string }) {
  const fetch = useServerFn(getActivityForOwner);
  const activity = useQuery({
    queryKey: ["admin", "activity", ownerId],
    queryFn: () => fetch({ data: { ownerId } }),
  });

  if (activity.isLoading) {
    return <p className="text-ink-muted text-sm">Loading…</p>;
  }
  if (activity.error) {
    return (
      <p className="text-sm text-[var(--red)]">
        {(activity.error as Error).message}
      </p>
    );
  }

  const data = activity.data;
  if (!data || data.summary.totalSessions === 0) {
    return (
      <p className="text-ink-muted text-sm">
        No activity recorded for this user.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-4xl">
      <SummaryStrip summary={data.summary} />

      <section className="flex flex-col gap-4">
        <h3 className="text-sm font-medium text-ink">Sessions</h3>
        <div className="flex flex-col gap-4">
          {data.sessions.map((session) => (
            <SessionCard key={session.session_id} session={session} />
          ))}
        </div>
      </section>
    </div>
  );
}

function SummaryStrip({ summary }: { summary: ActivityForOwner["summary"] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <Stat label="Sessions" value={summary.totalSessions.toString()} />
      <Stat
        label="Total time"
        value={formatDuration(summary.totalDurationSeconds)}
      />
      <Stat
        label="Last seen"
        value={
          summary.lastSeenAt
            ? new Date(summary.lastSeenAt).toLocaleString("en-GB", {
                dateStyle: "short",
                timeStyle: "short",
              })
            : "—"
        }
      />
      <Stat
        label="Distinct IPs"
        value={summary.distinctIpCount.toString()}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border bg-[var(--surface-raised)] p-4">
      <span className="text-xs text-ink-muted uppercase tracking-wide">
        {label}
      </span>
      <span className="text-lg font-medium text-ink">{value}</span>
    </div>
  );
}

function SessionCard({ session }: { session: ActivitySession }) {
  const started = new Date(session.startedAt);
  const lastActive = new Date(session.lastActiveAt);

  return (
    <div className="flex flex-col gap-0 rounded-xl border border-border bg-[var(--surface-raised)] overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-b border-border bg-[var(--surface-raised)]">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-8 rounded-lg bg-background border border-border">
            <Monitor className="size-4 text-ink-muted" aria-hidden />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-ink">
              {started.toLocaleDateString("en-GB", {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
            <span className="text-xs text-ink-muted">
              {started.toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
              })}
              {" — "}
              {lastActive.toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-ink-muted">
          <span
            className="inline-flex items-center gap-1.5"
            title={session.ipList ? session.ipList.join("\n") : undefined}
          >
            <MapPin className="size-3.5" aria-hidden />
            {session.ip ?? "—"}
            {session.ipList && session.ipList.length > 1 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-background border border-border">
                {session.ipList.length} IPs
              </span>
            )}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-3.5" aria-hidden />
            {formatDuration(session.durationSeconds)}
          </span>
        </div>
      </div>

      <div className="px-4 py-3 flex flex-col gap-2 bg-background">
        <div className="flex items-center gap-3 text-xs text-ink-muted pb-2">
          <span className="inline-flex items-center gap-1">
            <FolderOpen className="size-3.5" aria-hidden />
            {session.resourceOpenCount} resource
            {session.resourceOpenCount === 1 ? "" : "s"} opened
          </span>
          <span className="inline-flex items-center gap-1">
            <LayoutGrid className="size-3.5" aria-hidden />
            {session.toolViewCount} tool view
            {session.toolViewCount === 1 ? "" : "s"}
          </span>
        </div>

        <ol className="flex flex-col gap-1.5">
          {session.events.map((event, idx) => (
            <EventRow key={idx} event={event} />
          ))}
        </ol>
      </div>
    </div>
  );
}

function EventRow({ event }: { event: ActivityTimelineEvent }) {
  const Icon = EVENT_ICON[event.type] ?? LogIn;
  const label = EVENT_LABEL[event.type] ?? event.type;
  const meta = event.meta ?? {};

  return (
    <li className="flex items-start gap-3 text-sm">
      <div className="mt-0.5">
        <Icon className="size-3.5 text-ink-muted" aria-hidden />
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-ink">
          <span className="font-medium">{label}</span>
          {event.type === "resource_open" && meta.file_path && (
            <span className="text-ink-muted"> — {String(meta.file_path)}</span>
          )}
          {event.type === "tool_view" && meta.path && (
            <span className="text-ink-muted"> — {String(meta.path)}</span>
          )}
        </span>
        <span className="text-xs text-ink-muted">
          {new Date(event.at).toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}
        </span>
      </div>
    </li>
  );
}

const EVENT_ICON = {
  login: LogIn,
  resource_open: FolderOpen,
  tool_view: LayoutGrid,
};

const EVENT_LABEL = {
  login: "Login",
  resource_open: "Resource opened",
  tool_view: "Tool viewed",
};

function formatDuration(totalSeconds: number): string {
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes < 60) return `${minutes}m ${seconds}s`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}
