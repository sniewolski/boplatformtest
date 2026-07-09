/**
 * Admin-only server functions for the Will AI content library.
 *
 * Ownership of the ingestion lifecycle:
 *   - Client uploads the PDF to the private `will-ai-content` bucket at
 *     a temporary path (RLS restricts writes to admins).
 *   - `createWillAiSource` validates the file server-side (magic bytes +
 *     size cap), inserts a `will_ai_sources` row with status='pending',
 *     and enqueues one message on the `will_ai_ingestion` pgmq queue.
 *     The cron-fed hook route (`/api/public/hooks/will-ai-ingest`) does
 *     the actual per-page work.
 *   - `retryWillAiSource` wipes any existing chunks for the source and
 *     re-enqueues it from page 1. No incremental resume — deliberate.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BUCKET = "will-ai-content";
const MAX_BYTES = 200 * 1024 * 1024; // 200 MB — books can be big
const QUEUE = "will_ai_ingestion";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error) throw new Error("Failed to verify admin role");
  if (!data) throw new Error("Forbidden");
}

async function assertPdfAtPath(storagePath: string): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.storage.from(BUCKET).download(storagePath);
  if (error || !data) throw new Error("Uploaded file not found");
  if (data.size > MAX_BYTES) {
    await supabaseAdmin.storage.from(BUCKET).remove([storagePath]);
    throw new Error(`File is over ${Math.round(MAX_BYTES / 1024 / 1024)}MB.`);
  }
  const head = new Uint8Array(await data.slice(0, 5).arrayBuffer());
  // %PDF-
  const isPdf =
    head[0] === 0x25 &&
    head[1] === 0x50 &&
    head[2] === 0x44 &&
    head[3] === 0x46 &&
    head[4] === 0x2d;
  if (!isPdf) {
    await supabaseAdmin.storage.from(BUCKET).remove([storagePath]);
    throw new Error("File must be a PDF.");
  }
}

export const createWillAiSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        sourceId: z.string().uuid(),
        sourceType: z.enum(["book", "video", "podcast", "blog_post", "document"]),
        title: z.string().trim().min(1).max(300),
        author: z.string().trim().max(200).optional().nullable(),
        filePath: z.string().min(1),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);

    // Enforce single-source layout: everything for this source lives under
    // `${sourceId}/…`. Reject any client that tries to upload elsewhere.
    const expectedPrefix = `${data.sourceId}/`;
    if (!data.filePath.startsWith(expectedPrefix)) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.storage.from(BUCKET).remove([data.filePath]);
      throw new Error("File path must live under the source id");
    }

    await assertPdfAtPath(data.filePath);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("will_ai_sources")
      .insert({
        id: data.sourceId,
        source_type: data.sourceType,
        title: data.title,
        author: data.author ?? null,
        storage_path: data.filePath,
        status: "pending",
      })
      .select("*")
      .single();
    if (error) {
      await supabaseAdmin.storage.from(BUCKET).remove([data.filePath]);
      throw new Error(error.message);
    }

    const { error: qErr } = await supabaseAdmin.rpc("enqueue_email", {
      queue_name: QUEUE,
      payload: { source_id: row.id } as any,
    });
    if (qErr) {
      // Row already exists; surface but leave the source so the admin can retry.
      throw new Error(`Source created, but enqueue failed: ${qErr.message}`);
    }
    return row;
  });

export const retryWillAiSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ sourceId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: src, error: sErr } = await supabaseAdmin
      .from("will_ai_sources")
      .select("id, storage_path, status")
      .eq("id", data.sourceId)
      .maybeSingle();
    if (sErr) throw new Error(sErr.message);
    if (!src) throw new Error("Source not found");
    if (!src.storage_path) throw new Error("Source has no file to reprocess");

    // Wipe existing chunks + any rendered page images under `${id}/pages/`.
    const { error: dErr } = await supabaseAdmin
      .from("will_ai_chunks")
      .delete()
      .eq("source_id", data.sourceId);
    if (dErr) throw new Error(dErr.message);

    const { data: pageFiles } = await supabaseAdmin.storage
      .from(BUCKET)
      .list(`${data.sourceId}/pages`, { limit: 1000 });
    if (pageFiles?.length) {
      await supabaseAdmin.storage
        .from(BUCKET)
        .remove(pageFiles.map((f) => `${data.sourceId}/pages/${f.name}`));
    }

    const { error: uErr } = await supabaseAdmin
      .from("will_ai_sources")
      .update({
        status: "pending",
        error_message: null,
        total_pages: null,
      })
      .eq("id", data.sourceId);
    if (uErr) throw new Error(uErr.message);

    const { error: qErr } = await supabaseAdmin.rpc("enqueue_email", {
      queue_name: QUEUE,
      payload: { source_id: data.sourceId } as any,
    });
    if (qErr) throw new Error(`Retry failed to enqueue: ${qErr.message}`);
    return { ok: true };
  });

export const deleteWillAiSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ sourceId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: src } = await supabaseAdmin
      .from("will_ai_sources")
      .select("storage_path")
      .eq("id", data.sourceId)
      .maybeSingle();

    const { error } = await supabaseAdmin
      .from("will_ai_sources")
      .delete()
      .eq("id", data.sourceId);
    if (error) throw new Error(error.message);

    // Remove uploaded PDF + any rendered diagram images.
    const toRemove: string[] = [];
    if (src?.storage_path) toRemove.push(src.storage_path);
    const { data: pageFiles } = await supabaseAdmin.storage
      .from(BUCKET)
      .list(`${data.sourceId}/pages`, { limit: 1000 });
    if (pageFiles?.length) {
      for (const f of pageFiles) toRemove.push(`${data.sourceId}/pages/${f.name}`);
    }
    if (toRemove.length) {
      await supabaseAdmin.storage.from(BUCKET).remove(toRemove);
    }
    return { ok: true };
  });
