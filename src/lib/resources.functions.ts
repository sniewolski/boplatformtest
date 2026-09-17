/**
 * Admin-only server functions for Resources.
 *
 * Mirrors the SOPs server-function shape: the client uploads to the private
 * `resources` bucket (storage RLS restricts writes to admins), then calls
 * these functions which re-check the admin role, re-validate the file bytes
 * server-side, and insert/update the row. On failure the object is removed.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BUCKET = "resources";
const MAX_BYTES = 20 * 1024 * 1024;

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
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
  const isDocxByExt = storagePath.toLowerCase().endsWith(".docx");
  if (!(isPdf || (isZip && isDocxByExt))) {
    await supabaseAdmin.storage.from(BUCKET).remove([storagePath]);
    throw new Error("File must be a PDF or Word (.docx) document.");
  }
}

export const createResource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        category: z.string().trim().max(120).nullable(),
        title: z.string().trim().min(1).max(200),
        description: z.string().trim().max(2000).optional().nullable(),
        filePath: z.string().min(1),
        fileName: z.string().min(1).max(255),
        fileSize: z.number().int().nonnegative().max(MAX_BYTES),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    await assertPdfOrDocxAtPath(data.filePath);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("resources")
      .insert({
        category: data.category || null,
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

export const replaceResourceFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        resourceId: z.string().uuid(),
        filePath: z.string().min(1),
        fileName: z.string().min(1).max(255),
        fileSize: z.number().int().nonnegative().max(MAX_BYTES),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    await assertPdfOrDocxAtPath(data.filePath);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing, error: exErr } = await supabaseAdmin
      .from("resources")
      .select("file_path")
      .eq("id", data.resourceId)
      .maybeSingle();
    if (exErr) throw new Error(exErr.message);
    if (!existing) throw new Error("Resource not found");

    const { error } = await supabaseAdmin
      .from("resources")
      .update({
        file_path: data.filePath,
        file_name: data.fileName,
        file_size: data.fileSize,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.resourceId);
    if (error) {
      await supabaseAdmin.storage.from(BUCKET).remove([data.filePath]);
      throw new Error(error.message);
    }

    if (existing.file_path && existing.file_path !== data.filePath) {
      await supabaseAdmin.storage.from(BUCKET).remove([existing.file_path]);
    }
    return { ok: true };
  });

export const deleteResource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ resourceId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existing } = await supabaseAdmin
      .from("resources")
      .select("file_path")
      .eq("id", data.resourceId)
      .maybeSingle();

    const { error } = await supabaseAdmin
      .from("resources")
      .delete()
      .eq("id", data.resourceId);
    if (error) throw new Error(error.message);

    if (existing?.file_path) {
      await supabaseAdmin.storage.from(BUCKET).remove([existing.file_path]);
    }
    return { ok: true };
  });
