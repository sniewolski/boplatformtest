/**
 * Admin-only server functions for SOPs.
 *
 * The client uploads the file to the private `sops` bucket (RLS restricts
 * writes to admins), then calls `createSop` / `replaceSopFile` which:
 *   1. Re-checks admin role via has_role().
 *   2. Re-validates the file server-side by downloading the first bytes
 *      and asserting the %PDF- magic header (defence-in-depth against a
 *      spoofed client MIME).
 *   3. Inserts/updates the row. On validation failure the object is removed.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BUCKET = "sops";
const MAX_BYTES = 20 * 1024 * 1024;

async function assertElevated(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("is_elevated", {
    _user_id: userId,
  });
  if (error) throw new Error("Failed to verify role");
  if (!data) throw new Error("Forbidden");
}

async function assertPdfOrDocxAtPath(storagePath: string): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.storage.from(BUCKET).download(storagePath);
  if (error || !data) throw new Error("Uploaded file not found");
  if (data.size > MAX_BYTES) {
    await supabaseAdmin.storage.from(BUCKET).remove([storagePath]);
    throw new Error("File is over 20MB.");
  }
  const head = new Uint8Array(await data.slice(0, 5).arrayBuffer());
  // %PDF-
  const isPdf =
    head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46 && head[4] === 0x2d;
  // PK\x03\x04 — docx is a ZIP container
  const isZip =
    head[0] === 0x50 && head[1] === 0x4b && head[2] === 0x03 && head[3] === 0x04;
  const lower = storagePath.toLowerCase();
  const isDocxByExt = lower.endsWith(".docx");
  const ok = isPdf || (isZip && isDocxByExt);
  if (!ok) {
    await supabaseAdmin.storage.from(BUCKET).remove([storagePath]);
    throw new Error("File must be a PDF or Word (.docx) document.");
  }
}

export const createSop = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        folderId: z.string().uuid().nullable(),
        title: z.string().trim().min(1).max(200),
        description: z.string().trim().max(2000).optional().nullable(),
        filePath: z.string().min(1),
        fileName: z.string().min(1).max(255),
        fileSize: z.number().int().nonnegative().max(MAX_BYTES),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertElevated(context.supabase, context.userId);
    await assertPdfOrDocxAtPath(data.filePath);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("sops")
      .insert({
        folder_id: data.folderId,
        title: data.title,
        description: data.description ?? null,
        file_path: data.filePath,
        file_name: data.fileName,
        file_size: data.fileSize,
        uploaded_by: context.userId,
      })
      .select("*")
      .single();
    if (error) {
      await supabaseAdmin.storage.from(BUCKET).remove([data.filePath]);
      throw new Error(error.message);
    }
    return row;
  });

export const replaceSopFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        sopId: z.string().uuid(),
        filePath: z.string().min(1),
        fileName: z.string().min(1).max(255),
        fileSize: z.number().int().nonnegative().max(MAX_BYTES),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertElevated(context.supabase, context.userId);
    await assertPdfOrDocxAtPath(data.filePath);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing, error: exErr } = await supabaseAdmin
      .from("sops")
      .select("file_path")
      .eq("id", data.sopId)
      .maybeSingle();
    if (exErr) throw new Error(exErr.message);
    if (!existing) throw new Error("SOP not found");

    const { error } = await supabaseAdmin
      .from("sops")
      .update({
        file_path: data.filePath,
        file_name: data.fileName,
        file_size: data.fileSize,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.sopId);
    if (error) {
      await supabaseAdmin.storage.from(BUCKET).remove([data.filePath]);
      throw new Error(error.message);
    }

    if (existing.file_path && existing.file_path !== data.filePath) {
      await supabaseAdmin.storage.from(BUCKET).remove([existing.file_path]);
    }
    return { ok: true };
  });

export const deleteSop = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ sopId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertElevated(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existing } = await supabaseAdmin
      .from("sops")
      .select("file_path")
      .eq("id", data.sopId)
      .maybeSingle();

    const { error } = await supabaseAdmin.from("sops").delete().eq("id", data.sopId);
    if (error) throw new Error(error.message);

    if (existing?.file_path) {
      await supabaseAdmin.storage.from(BUCKET).remove([existing.file_path]);
    }
    return { ok: true };
  });
