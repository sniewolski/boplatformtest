import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { LogIn, FileText, LayoutGrid, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getActivityForOwner,
  type ActivityForOwner,
  type ActivitySession,
  type ActivityTimelineEvent,
} from "@/lib/activityAdmin.functions";

export function OwnerActivityDetail({ ownerId }: { ownerId: string }) {
  const fetchActivity = useServerFn(getActivityForOwner);
  const activity = useQuery({
    queryKey: ["admin", "activity", ownerId],
    queryFn: () => fetchActivity({ data: { ownerId } }),
  });
  const [openId, setOpenId] = useState<string | null>(null);

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

  const longest = Math.max(
    1,
    ...data.sessions.map((s) => s.durationSeconds || 0),
  );

  return (
    <div className="flex flex-col gap-8 max-w-4xl">
      <SummaryStrip summary={data.summary} />

      <div className="flex flex-col">
        <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr_auto] gap-4 px-2 pb-2 text-xs uppercase tracking-wide text-ink-muted border-b border-border">
          <span>When</span>
          <span>Duration</span>
          <span>IP</span>
          <span>Touched</span>
          <span />
        </div>
        {data.sessions.map((session) => (
          <SessionRow
            key={session.session_id}
            session={session}
            longest={longest}
            open={openId === session.session_id}
            onToggle={() =>
              setOpenId((cur) =>
                cur === session.session_id ? null : session.session_id,
              )
            }
          />
        ))}
      </div>
    </div>
  );
}

function SummaryStrip({ summary }: { summary: ActivityForOwner["summary"] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 border-b border-border pb-5">
      <Stat label="Sessions" value={String(summary.totalSessions)} />
      <Stat
        label="Total time"
        value={formatDuration(summary.totalDurationSeconds)}
      />
      <Stat
        label="Last seen"
        value={summary.lastSeenAt ? formatDateTime(summary.lastSeenAt) : "—"}
      />
      <Stat label="Distinct IPs" value={String(summary.distinctIpCount)} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wide text-ink-muted">
        {label}
      </span>
      <span className="text-lg font-medium text-ink">{value}</span>
    </div>
  );
}

function SessionRow({
  session,
  longest,
  open,
  onToggle,
}: {
  session: ActivitySession;
  longest: number;
  open: boolean;
  onToggle: () => void;
}) {
  const ratio = Math.min(1, (session.durationSeconds || 0) / longest);
  const extraIps =
    session.ipList && session.ipList.length > 1
      ? session.ipList.length - 1
      : 0;
  const lastEvent = session.events[session.events.length - 1];

  return (
    <div className="border-b border-border">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full grid grid-cols-[1.4fr_1fr_1fr_1fr_auto] gap-4 items-center px-2 py-3 text-left text-sm hover:bg-[var(--surface-raised)] transition-colors"
      >
        <span className="text-ink">{formatWhen(session.startedAt)}</span>

        <span className="relative flex items-center">
          <span
            aria-hidden
            className="absolute inset-y-1 left-0 rounded-sm bg-ink/10"
            style={{ width: `${Math.max(6, ratio * 100)}%` }}
          />
          <span
            className={cn(
              "relative z-10 px-1 text-ink",
              ratio > 0.6 && "font-medium",
            )}
          >
            {formatDuration(session.durationSeconds)}
          </span>
        </span>

        <span className="text-ink-muted tabular-nums">
          {session.ip ?? "—"}
          {extraIps > 0 && (
            <span className="text-ink-muted"> +{extraIps}</span>
          )}
        </span>

        <span className="text-ink-muted">
          {formatTouched(session.resourceOpenCount, session.toolViewCount)}
        </span>

        <ChevronRight
          aria-hidden
          className={cn(
            "size-4 text-ink-muted transition-transform",
            open && "rotate-90",
          )}
        />
      </button>

      {open && (
        <div className="px-2 pb-4 pl-6 flex flex-col gap-2">
          {session.ipList && session.ipList.length > 1 && (
            <p className="text-xs text-ink-muted">
              IPs: {session.ipList.join(", ")}
            </p>
          )}
          {session.events.length === 0 ? (
            <p className="text-xs text-ink-muted">No events in this session.</p>
          ) : (
            <ol className="flex flex-col gap-1.5">
              {session.events.map((event, idx) => (
                <EventRow key={idx} event={event} />
              ))}
            </ol>
          )}
          {lastEvent && (
            <p className="text-xs text-ink-muted pt-1">
              Last active {formatTime(session.lastActiveAt)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function EventRow({ event }: { event: ActivityTimelineEvent }) {
  const meta = (event.meta ?? {}) as Record<string, unknown>;
  let Icon = LogIn;
  let label = "Logged in";

  if (event.type === "tool_view") {
    Icon = LayoutGrid;
    label = `Viewed ${friendlyToolName(String(meta["path"] ?? ""))}`;
  } else if (event.type === "resource_open") {
    Icon = FileText;
    const filePath = String(meta["file_path"] ?? "");
    const base = filePath.split("/").filter(Boolean).pop();
    label = base ? `Opened SOP — ${base}` : "Opened SOP";
  }

  return (
    <li className="flex items-center gap-2 text-sm">
      <span className="w-16 shrink-0 text-xs text-ink-muted tabular-nums">
        {formatTime(event.at)}
      </span>
      <Icon
        aria-hidden
        className={cn(
          "size-3.5 shrink-0",
          event.type === "resource_open" ? "text-ink" : "text-ink-muted",
        )}
      />
      <span
        className={cn(
          event.type === "resource_open" ? "text-ink" : "text-ink-muted",
        )}
      >
        {label}
      </span>
    </li>
  );
}

const TOOL_NAMES: Record<string, string> = {
  "/app": "Dashboard",
  "/app/selling-systems-audit": "Selling Systems Audit",
  "/app/salescode": "SalesCode",
  "/app/tools/salescode": "SalesCode",
  "/app/sops": "SOPs",
  "/app/will-ai": "Will AI",
  "/app/daily-log": "Daily Log",
  "/app/business-brief": "Business Brief",
  "/app/settings": "Settings",
};

function friendlyToolName(path: string): string {
  if (!path) return "a page";
  const clean = path.split("?")[0].replace(/\/+$/, "") || "/app";
  if (TOOL_NAMES[clean]) return TOOL_NAMES[clean];
  const prefix = Object.keys(TOOL_NAMES)
    .filter((key) => key !== "/app" && clean.startsWith(key + "/"))
    .sort((a, b) => b.length - a.length)[0];
  if (prefix) return TOOL_NAMES[prefix];
  return clean;
}

function formatTouched(resources: number, tools: number): string {
  const parts: string[] = [];
  if (resources > 0)
    parts.push(`${resources} resource${resources === 1 ? "" : "s"}`);
  if (tools > 0) parts.push(`${tools} tool${tools === 1 ? "" : "s"}`);
  return parts.length ? parts.join(", ") : "—";
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  })}, ${formatTime(iso)}`;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}, ${formatTime(iso)}`;
}

function formatTime(iso: string): string {
  return new Date(iso)
    .toLocaleTimeString("en-GB", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    .replace(/\s?(am|pm)/i, (m) => m.trim().toLowerCase());
}

function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds || 0));
  if (s < 60) return `${s}s`;
  const minutes = Math.floor(s / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem ? `${hours}h ${rem}m` : `${hours}h`;
}
