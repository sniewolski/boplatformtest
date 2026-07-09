/**
 * Will AI ingestion queue processor.
 *
 * Mirrors /lovable/email/queue/process:
 * - Same vault-sourced service-role bearer check
 * - Same generic pgmq RPC helpers (read_email_batch, delete_email, move_to_dlq)
 * - Self-disarming pg_cron dispatch (public.will_ai_ingestion_dispatch)
 *
 * Differences from the email processor:
 * - Queue: will_ai_ingestion (+ will_ai_ingestion_dlq)
 * - Visibility timeout: 3600s (60 min) — a full book with diagram
 *   captioning + embedding can run long. The email queue's 30s VT is far
 *   too short.
 * - Retry budget: 2 attempts, then DLQ + set will_ai_sources.status='failed'
 *   with error_message populated.
 *
 * Per-source ingestion logic (PDF rasterize → Gemini text/diagram
 * extraction → embedding → will_ai_chunks insert) lands in a later phase.
 * This route ships the harness now so the pattern is proven end-to-end.
 */
import { createFileRoute } from "@tanstack/react-router";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const MAX_ATTEMPTS = 2;
const BATCH_SIZE = 1;
const VISIBILITY_TIMEOUT_SECONDS = 60 * 60; // 60 minutes
const QUEUE = "will_ai_ingestion";
const DLQ = "will_ai_ingestion_dlq";

type IngestionPayload = {
  source_id?: string;
  [key: string]: unknown;
};

async function markSourceFailed(
  supabase: SupabaseClient<any, any>,
  sourceId: string | undefined,
  reason: string,
): Promise<void> {
  if (!sourceId) return;
  const { error } = await supabase
    .from("will_ai_sources")
    .update({
      status: "failed",
      error_message: reason.slice(0, 2000),
    })
    .eq("id", sourceId);
  if (error) {
    console.error("Failed to mark will_ai_sources row as failed", {
      source_id: sourceId,
      error,
    });
  }
}

async function processSource(_payload: IngestionPayload): Promise<void> {
  // TODO(will-ai phase 3+): implement rasterize → Gemini caption → embed →
  // insert into will_ai_chunks. Throwing here keeps the harness honest: any
  // message enqueued before the processor is implemented will retry twice
  // then land in the DLQ with the reason recorded on the source row.
  throw new Error("Will AI ingestion processor not yet implemented");
}

export const Route = createFileRoute("/api/public/hooks/will-ai-ingest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
          console.error("will-ai-ingest: missing required env vars");
          return Response.json(
            { error: "Server configuration error" },
            { status: 500 },
          );
        }

        // Identical bearer check to /lovable/email/queue/process.
        const authHeader = request.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        const token = authHeader.slice("Bearer ".length).trim();
        if (token !== supabaseServiceKey) {
          return Response.json({ error: "Forbidden" }, { status: 403 });
        }

        const supabase: SupabaseClient<any, any> = createClient(
          supabaseUrl,
          supabaseServiceKey,
        );

        const { data: messages, error: readError } = await supabase.rpc(
          "read_email_batch",
          {
            queue_name: QUEUE,
            batch_size: BATCH_SIZE,
            vt: VISIBILITY_TIMEOUT_SECONDS,
          },
        );

        if (readError) {
          console.error("will-ai-ingest: failed to read queue", readError);
          return Response.json(
            { error: "Failed to read queue" },
            { status: 500 },
          );
        }

        if (!messages?.length) {
          return Response.json({ processed: 0 });
        }

        let processed = 0;

        for (const msg of messages) {
          const payload = (msg.message ?? {}) as IngestionPayload;
          const sourceId =
            typeof payload.source_id === "string" ? payload.source_id : undefined;
          const attemptNumber = msg.read_ct ?? 1;

          try {
            await processSource(payload);

            const { error: delError } = await supabase.rpc("delete_email", {
              queue_name: QUEUE,
              message_id: msg.msg_id,
            });
            if (delError) {
              console.error("will-ai-ingest: failed to delete completed message", {
                msg_id: msg.msg_id,
                error: delError,
              });
            }
            processed++;
          } catch (error) {
            const errorMsg =
              error instanceof Error ? error.message : String(error);
            console.error("will-ai-ingest: processing failed", {
              msg_id: msg.msg_id,
              attempt: attemptNumber,
              source_id: sourceId,
              error: errorMsg,
            });

            if (attemptNumber >= MAX_ATTEMPTS) {
              const reason = `Max retries (${MAX_ATTEMPTS}) exceeded: ${errorMsg}`;
              await markSourceFailed(supabase, sourceId, reason);
              const { error: dlqError } = await supabase.rpc("move_to_dlq", {
                source_queue: QUEUE,
                dlq_name: DLQ,
                message_id: msg.msg_id,
                payload,
              });
              if (dlqError) {
                console.error("will-ai-ingest: failed to move to DLQ", {
                  msg_id: msg.msg_id,
                  error: dlqError,
                });
              }
            }
            // Otherwise leave invisible; VT expires and the cron re-reads it.
          }
        }

        return Response.json({ processed });
      },
    },
  },
});
