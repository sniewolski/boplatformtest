/** The ONLY module that touches the "sosa-uploads" storage bucket. */
import { supabase } from "@/integrations/supabase/client";
import type { SosaUploadItem } from "../types";

const BUCKET = "sosa-uploads";
export const SOSA_MAX_FILE_BYTES = 52428800; // 50 MB — matches the bucket limit
export const SOSA_ALLOWED_EXTENSIONS = [
  "pdf", "doc", "docx", "txt", "md", "vtt", "srt", "csv", "xls", "xlsx", "ppt", "pptx",
  "png", "jpg", "jpeg", "webp", "gif", "mp3", "m4a", "wav", "mp4", "mov",
];

export class SosaUploadError extends Error {}

function extOf(name: string) {
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(i + 1).toLowerCase() : "";
}

/** Lower-case, [a-z0-9._-] only, max 100 chars, extension kept. */
export function safeFileName(name: string): string {
  const clean = name.toLowerCase().replace(/[^a-z0-9._-]/g, "-");
  if (clean.length <= 100) return clean;
  const ext = extOf(clean);
  const tail = ext ? `.${ext}` : "";
  return clean.slice(0, 100 - tail.length) + tail;
}

/** Throws SosaUploadError with a user-facing message if the file is not acceptable. */
export function validateSosaFile(file: File) {
  if (file.size > SOSA_MAX_FILE_BYTES) throw new SosaUploadError("This file is over 50 MB. Paste a link to it instead.");
  if (!SOSA_ALLOWED_EXTENSIONS.includes(extOf(file.name)))
    throw new SosaUploadError("That file type isn't supported. Paste a link instead.");
}

export async function uploadSosaFile(questionId: string, file: File): Promise<SosaUploadItem> {
  validateSosaFile(file);
  const { data: auth } = await supabase.auth.getUser();
  const ownerId = auth.user?.id;
  if (!ownerId) throw new SosaUploadError("You're signed out. Sign in and try again.");
  const fileId = crypto.randomUUID();
  const path = `${ownerId}/${questionId}/${fileId}/${safeFileName(file.name)}`;
  const mime = file.type || "application/octet-stream";
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: mime, upsert: false });
  if (error) throw new SosaUploadError("Upload failed. Try again, or paste a link instead.");
  return { id: fileId, kind: "file", path, name: file.name, size: file.size, mime };
}

/** Best-effort delete; never throws. */
export async function removeSosaFile(path: string): Promise<void> {
  try {
    const { error } = await supabase.storage.from(BUCKET).remove([path]);
    if (error) console.error("[sosa-uploads] remove failed", path, error);
  } catch (e) {
    console.error("[sosa-uploads] remove failed", path, e);
  }
}

export async function getSosaFileUrl(path: string, seconds = 300): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, seconds);
  if (error || !data) throw error ?? new Error("No signed URL");
  return data.signedUrl;
}
