/**
 * Admin-only read of a user's activity log, grouped into sessions.
 *
 * activity_events has RLS enabled with NO owner policies — it is only ever
 * read through the service-role client, and only after the caller has been
 * verified as an *admin* (mentors are explicitly excluded, so assertElevated
 * is deliberately NOT used here).
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * A session_id lives in sessionStorage and can persist across days, so rows
 * sharing one id may cover unrelated visits. On read we split each id's rows
 * into sub-sessions whenever they go quiet for longer than this.
 */
const SESSION_GAP_SECONDS = 30 * 60;

/**
 * Sub-sessions shorter than this that contain no real events (no logins,
 * no tool views, no resource opens — heartbeats only) are pure background
 * noise and are dropped on read. Anything under 3 minutes that DID touch
 * something is kept; anything over 3 minutes is kept regardless.
 */
const MIN_EMPTY_SESSION_SECONDS = 180;

/**
 * Strict admin gate. Uses the caller's own RLS-bound client and the
 * `has_role(_user_id, _role)` security-definer function against
 * `user_roles` — the same source of truth behind `useIsAdmin()`.
 */
async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error) throw new Error("Failed to verify role");
  if (!data) throw new Error("Forbidden");
}

export type ActivityEventType = "login" | "resource_open" | "tool_view";

export type ActivityTimelineEvent = {
  type: ActivityEventType;
  at: string;
  meta: Record<string, string | number | boolean | null> | null;
};

export type ActivitySession = {
  /** Stable unique key: `${session_id}#${n}` — session_id alone is not unique. */
  key: string;
  session_id: string;
  startedAt: string;
  lastActiveAt: string;
  durationSeconds: number;
  ip: string | null;
  ipList?: string[];
  events: ActivityTimelineEvent[];
  resourceOpenCount: number;
  toolViewCount: number;
};

export type ActivityForOwner = {
  summary: {
    totalSessions: number;
    totalDurationSeconds: number;
    lastSeenAt: string | null;
    distinctIpCount: number;
  };
  sessions: ActivitySession[];
};

type Row = {
  session_id: string;
  event_type: string;
  ip: string | null;
  metadata: Record<string, string | number | boolean | null> | null;
  created_at: string;
};

export const getActivityForOwner = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { ownerId: string }) => data)
  .handler(async ({ data, context }): Promise<ActivityForOwner> => {
    await assertAdmin(context.supabase, context.userId);

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const { data: rows, error } = await supabaseAdmin
      .from("activity_events" as any)
      .select("session_id, event_type, ip, metadata, created_at")
      .eq("user_id", data.ownerId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    const all = (rows ?? []) as unknown as Row[];
    if (all.length === 0) {
      return {
        summary: {
          totalSessions: 0,
          totalDurationSeconds: 0,
          lastSeenAt: null,
          distinctIpCount: 0,
        },
        sessions: [],
      };
    }

    const bySession = new Map<string, Row[]>();
    for (const row of all) {
      const arr = bySession.get(row.session_id) ?? [];
      arr.push(row);
      bySession.set(row.session_id, arr);
    }

    const sessions: ActivitySession[] = [];
    for (const [sessionId, rows] of bySession) {
      // rows arrive ascending from the query; split on inactivity gaps so that
      // unrelated visits sharing one session_id don't weld into one row.
      const chunks: Row[][] = [];
      let current: Row[] = [];
      for (const row of rows) {
        const previous = current[current.length - 1];
        if (
          previous &&
          (new Date(row.created_at).getTime() -
            new Date(previous.created_at).getTime()) /
            1000 >
            SESSION_GAP_SECONDS
        ) {
          chunks.push(current);
          current = [];
        }
        current.push(row);
      }
      if (current.length > 0) chunks.push(current);

      chunks.forEach((events, index) => {
        const first = events[0]!;
        const last = events[events.length - 1]!;
        const login = events.find((e) => e.event_type === "login");

        const startedAt = login?.created_at ?? first.created_at;
        const lastActiveAt = last.created_at;
        const durationSeconds = Math.max(
          0,
          Math.round(
            (new Date(lastActiveAt).getTime() - new Date(startedAt).getTime()) /
              1000,
          ),
        );

        const sessionIps: string[] = [];
        for (const e of events) {
          if (e.ip && !sessionIps.includes(e.ip)) sessionIps.push(e.ip);
        }
        const primaryIp = login?.ip ?? sessionIps[0] ?? null;

        const timeline: ActivityTimelineEvent[] = events
          .filter((e) => e.event_type !== "heartbeat")
          .map((e) => ({
            type: e.event_type as ActivityEventType,
            at: e.created_at,
            meta: e.metadata ?? null,
          }));

        sessions.push({
          key: `${sessionId}#${index}`,
          session_id: sessionId,
          startedAt,
          lastActiveAt,
          durationSeconds,
          ip: primaryIp,
          ...(sessionIps.length > 1 ? { ipList: sessionIps } : {}),
          events: timeline,
          resourceOpenCount: events.filter(
            (e) => e.event_type === "resource_open",
          ).length,
          toolViewCount: events.filter((e) => e.event_type === "tool_view")
            .length,
        });
      });
    }

    // Drop empty micro-sessions: under MIN_EMPTY_SESSION_SECONDS AND no real
    // events (heartbeat-only background noise). Filtering only — the raw
    // activity_events rows are untouched.
    const beforeFilterCount = sessions.length;
    const filtered = sessions.filter(
      (s) =>
        s.durationSeconds >= MIN_EMPTY_SESSION_SECONDS || s.events.length > 0,
    );
    const filteredOut = beforeFilterCount - filtered.length;

    filtered.sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
    );

    const lastSeenAt = filtered.reduce<string | null>((acc, s) => {
      if (!acc) return s.lastActiveAt;
      return new Date(s.lastActiveAt) > new Date(acc) ? s.lastActiveAt : acc;
    }, null);

    // Summary is derived from the filtered sub-sessions, so the header
    // matches exactly what is rendered.
    const distinctIps = new Set<string>();
    for (const s of filtered) {
      for (const ip of s.ipList ?? (s.ip ? [s.ip] : [])) distinctIps.add(ip);
    }

    if (filteredOut > 0) {
      console.info(
        `[activityAdmin] filtered ${filteredOut} empty micro-session(s) (<${MIN_EMPTY_SESSION_SECONDS}s, no real events)`,
      );
    }

    return {
      summary: {
        totalSessions: filtered.length,
        totalDurationSeconds: filtered.reduce(
          (sum, s) => sum + s.durationSeconds,
          0,
        ),
        lastSeenAt,
        distinctIpCount: distinctIps.size,
      },
      sessions: filtered,
    };
  });

/**
 * Watch First onboarding progress for one owner, shown in the Review tab.
 *
 * Separate from getActivityForOwner on purpose: this section is safe for
 * mentors too, so it uses the caller's own RLS-bound client (no service
 * role, no assertAdmin). RLS already limits lessons to published ones for
 * owners and exposes all lessons + all progress rows to elevated users.
 * Only PUBLISHED lessons are returned here — drafts must not appear in an
 * owner's onboarding progress or inflate the total.
 */
export type WatchFirstOnboardingLesson = {
  id: string;
  title: string;
  sort_order: number;
};

export type WatchFirstOnboardingWatched = {
  lesson_id: string;
  watched_at: string;
};

export type WatchFirstOnboardingForOwner = {
  lessons: WatchFirstOnboardingLesson[];
  watched: WatchFirstOnboardingWatched[];
};

export const getWatchFirstOnboardingForOwner = createServerFn({
  method: "GET",
})
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { ownerId: string }) => data)
  .handler(async ({ data, context }): Promise<WatchFirstOnboardingForOwner> => {
    const { data: lessons, error } = await context.supabase
      .from("watch_first_lessons" as any)
      .select("id, title, sort_order")
      .eq("is_published", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    const { data: progress, error: progressError } = await context.supabase
      .from("watch_first_lesson_progress" as any)
      .select("lesson_id, watched_at")
      .eq("owner_id", data.ownerId);
    if (progressError) throw new Error(progressError.message);

    return {
      lessons: (lessons ?? []) as unknown as WatchFirstOnboardingLesson[],
      watched: (progress ?? []) as unknown as WatchFirstOnboardingWatched[],
    };
  });
