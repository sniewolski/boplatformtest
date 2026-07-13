/**
 * Admin-only: import an existing SOP PDF into the Will AI content library
 * without a manual re-upload.
 *
 * Copy-on-import design: we service-role copy the SOP's file from the
 * `sops` bucket into `will-ai-content/{sourceId}/source.pdf` so the
 * existing ingestion worker + citation-resolution code paths keep working
 * unchanged (both are hardcoded to the `will-ai-content` bucket and to the
 * `${sourceId}/source.pdf` path layout enforced by `createWillAiSource`).
 *
 * Dedupe: `will_ai_sources.sop_id` is unique. Re-importing the same SOP
 * overwrites the existing PDF in place, wipes chunks + rendered pages,
 * resets the source row, and re-enqueues the same `source_id`.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SOPS_BUCKET = "sops";
const WILL_AI_BUCKET = "will-ai-content";
const QUEUE = "will_ai_ingestion";
const MAX_BYTES = 200 * 1024 * 1024;

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error) throw new Error("Failed to verify admin role");
  if (!data) throw new Error("Forbidden");
}

export const importSopToWillAi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ sopId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Load SOP row
    const { data: sop, error: sopErr } = await supabaseAdmin
      .from("sops")
      .select("id, title, file_path, file_name")
      .eq("id", data.sopId)
      .maybeSingle();
    if (sopErr) throw new Error(sopErr.message);
    if (!sop) throw new Error("SOP not found");

    // PDF-only: DOCX SOPs can't be ingested by the Will AI pipeline.
    if (!/\.pdf$/i.test(sop.file_name)) {
      throw new Error("Only PDF SOPs can be imported into Will AI.");
    }

    // 2. Download SOP PDF (service role → bypasses storage RLS)
    const { data: fileBlob, error: dlErr } = await supabaseAdmin.storage
      .from(SOPS_BUCKET)
      .download(sop.file_path);
    if (dlErr || !fileBlob) throw new Error("SOP file not found in storage");
    if (fileBlob.size > MAX_BYTES) {
      throw new Error(`SOP is over ${Math.round(MAX_BYTES / 1024 / 1024)}MB.`);
    }
    // Magic-byte check — defence in depth against a mislabeled SOP.
    const head = new Uint8Array(await fileBlob.slice(0, 5).arrayBuffer());
    const isPdf =
      head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 &&
      head[3] === 0x46 && head[4] === 0x2d;
    if (!isPdf) throw new Error("SOP file is not a valid PDF.");

    // 3. Check for existing import
    const { data: existing, error: exErr } = await supabaseAdmin
      .from("will_ai_sources")
      .select("id, storage_path")
      .eq("sop_id", data.sopId)
      .maybeSingle();
    if (exErr) throw new Error(exErr.message);

    const sourceId = existing?.id ?? crypto.randomUUID();
    const destPath = `${sourceId}/source.pdf`;

    // 4. Copy PDF into will-ai-content bucket (upsert covers re-import overwrite)
    const { error: upErr } = await supabaseAdmin.storage
      .from(WILL_AI_BUCKET)
      .upload(destPath, fileBlob, {
        contentType: "application/pdf",
        upsert: true,
      });
    if (upErr) throw new Error(`Copy to Will AI bucket failed: ${upErr.message}`);

    if (!existing) {
      // 5a. Fresh import — insert new source row
      const { error: insErr } = await supabaseAdmin
        .from("will_ai_sources")
        .insert({
          id: sourceId,
          source_type: "document",
          title: sop.title,
          author: null,
          storage_path: destPath,
          sop_id: sop.id,
          status: "pending",
        });
      if (insErr) {
        await supabaseAdmin.storage.from(WILL_AI_BUCKET).remove([destPath]);
        throw new Error(insErr.message);
      }
    } else {
      // 5b. Re-import — wipe chunks + rendered pages, reset row
      const { error: dErr } = await supabaseAdmin
        .from("will_ai_chunks")
        .delete()
        .eq("source_id", sourceId);
      if (dErr) throw new Error(dErr.message);

      const { data: pageFiles } = await supabaseAdmin.storage
        .from(WILL_AI_BUCKET)
        .list(`${sourceId}/pages`, { limit: 1000 });
      if (pageFiles?.length) {
        await supabaseAdmin.storage
          .from(WILL_AI_BUCKET)
          .remove(pageFiles.map((f) => `${sourceId}/pages/${f.name}`));
      }

      const { error: uErr } = await supabaseAdmin
        .from("will_ai_sources")
        .update({
          title: sop.title,
          status: "pending",
          error_message: null,
          total_pages: null,
          last_completed_page: 0,
          failed_pages: [],
        })
        .eq("id", sourceId);
      if (uErr) throw new Error(uErr.message);
    }

    // 6. Enqueue for the ingestion worker
    const { error: qErr } = await supabaseAdmin.rpc("enqueue_email", {
      queue_name: QUEUE,
      payload: { source_id: sourceId } as any,
    });
    if (qErr) throw new Error(`Enqueue failed: ${qErr.message}`);

    return {
      sourceId,
      wasReimport: !!existing,
    };
  });
