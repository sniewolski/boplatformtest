import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inputSchema = z.object({
  session_id: z.string().uuid(),
  event_type: z.enum(["login", "heartbeat", "resource_open", "tool_view"]),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const logActivityEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data, context }) => {
    try {
      const cf = getRequestHeader("cf-connecting-ip");
      const xff = getRequestHeader("x-forwarded-for");
      const ip =
        cf?.trim() || xff?.split(",")[0]?.trim() || null;

      const { supabaseAdmin } = await import(
        "@/integrations/supabase/client.server"
      );

      const { error } = await supabaseAdmin.from("activity_events").insert({
        user_id: context.userId,
        session_id: data.session_id,
        event_type: data.event_type,
        ip,
        metadata: (data.metadata ?? {}) as never,
      });

      if (error) {
        console.error("[activity] insert failed:", error.message);
      }
    } catch (err) {
      console.error("[activity] logActivityEvent failed:", err);
    }

    return { ok: true as const };
  });
