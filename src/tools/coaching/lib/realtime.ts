/**
 * The ONLY place that opens Realtime channels for Coaching.
 *
 * Each subscription gets its own uniquely named channel (one Supabase client
 * returns an already-open channel for a reused name), is opened inside an
 * effect and is removed on unmount or when its inputs change. Realtime
 * respects the tables' RLS, so callers only ever receive rows they may read.
 */
import { useEffect, useRef } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type CoachingRealtimeTable = "coaching_messages" | "coaching_tasks";
export type CoachingRealtimeEvent = "INSERT" | "UPDATE" | "DELETE";

export type CoachingRealtimeListen = {
  event: CoachingRealtimeEvent;
  /** PostgREST-style filter, e.g. "owner_id=eq.<uuid>". Not supported for DELETE. */
  filter?: string;
};

export type CoachingRealtimePayload = RealtimePostgresChangesPayload<Record<string, unknown>>;

function uniqueChannelName(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Subscribes to postgres changes on one coaching table while `enabled`.
 * `onChange` may change between renders without re-subscribing.
 */
export function useCoachingRealtime({
  name,
  table,
  listen,
  enabled,
  onChange,
}: {
  /** Readable prefix for the channel name; a unique suffix is added. */
  name: string;
  table: CoachingRealtimeTable;
  listen: CoachingRealtimeListen[];
  enabled: boolean;
  onChange: (payload: CoachingRealtimePayload) => void;
}) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const listenKey = JSON.stringify(listen);

  useEffect(() => {
    if (!enabled) return;
    const specs = JSON.parse(listenKey) as CoachingRealtimeListen[];
    let channel = supabase.channel(uniqueChannelName(name));
    for (const spec of specs) {
      channel = channel.on(
        "postgres_changes",
        {
          // Cast picks the generic overload; the real event is passed through.
          event: spec.event as "*",
          schema: "public",
          table,
          ...(spec.filter ? { filter: spec.filter } : {}),
        },
        (payload: CoachingRealtimePayload) => onChangeRef.current(payload),
      );
    }
    channel.subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [enabled, name, table, listenKey]);
}
