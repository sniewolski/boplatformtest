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
  meta: Record<string, unknown> | null;
};

export type ActivitySession = {
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
  metadata: Record<string, unknown> | null;
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
    const distinctIps = new Set<string>();
    for (const row of all) {
      if (row.ip) distinctIps.add(row.ip);
      const arr = bySession.get(row.session_id) ?? [];
      arr.push(row);
      bySession.set(row.session_id, arr);
    }

    const sessions: ActivitySession[] = [];
    for (const [sessionId, events] of bySession) {
      // rows arrive ascending from the query, so first/last are earliest/latest
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
    }

    sessions.sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
    );

    const lastSeenAt = sessions.reduce<string | null>((acc, s) => {
      if (!acc) return s.lastActiveAt;
      return new Date(s.lastActiveAt) > new Date(acc) ? s.lastActiveAt : acc;
    }, null);

    return {
      summary: {
        totalSessions: sessions.length,
        totalDurationSeconds: sessions.reduce(
          (sum, s) => sum + s.durationSeconds,
          0,
        ),
        lastSeenAt,
        distinctIpCount: distinctIps.size,
      },
      sessions,
    };
  });
