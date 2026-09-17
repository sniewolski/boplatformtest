import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  createResource,
  deleteResource,
  replaceResourceFile,
} from "@/lib/resources.functions";

export const RESOURCES_BUCKET = "resources";
export const RESOURCES_MAX_BYTES = 20 * 1024 * 1024;

export const RESOURCES_DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
export const RESOURCES_ACCEPT_ATTR = `application/pdf,.pdf,${RESOURCES_DOCX_MIME},.docx`;

export function isAllowedResourceFile(file: File): boolean {
  const nameOk = /\.(pdf|docx)$/i.test(file.name);
  const typeOk =
    file.type === "application/pdf" ||
    file.type === RESOURCES_DOCX_MIME ||
    file.type === "";
  return nameOk && typeOk;
}

export function isDocxFileName(name: string): boolean {
  return /\.docx$/i.test(name);
}

export type Resource = {
  id: string;
  category: string | null;
  title: string;
  description: string | null;
  file_path: string;
  file_name: string;
  file_size: number;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
};

export function useResources() {
  return useQuery({
    queryKey: ["resources"],
    queryFn: async (): Promise<Resource[]> => {
      const { data, error } = await supabase
        .from("resources")
        .select("*")
        .order("title", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Resource[];
    },
  });
}

/**
 * Distinct categories currently in use, trimmed and de-duplicated
 * case-insensitively (first spelling seen wins), sorted alphabetically.
 */
export function useResourceCategories(): string[] {
  const { data } = useResources();
  const seen = new Map<string, string>();
  for (const r of data ?? []) {
    const name = (r.category ?? "").trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (!seen.has(key)) seen.set(key, name);
  }
  return [...seen.values()].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  );
}

/**
 * Normalise a typed category against the ones already in use, so
 * "sales  scripts" reuses "Sales Scripts" instead of creating a twin.
 */
export function normaliseCategory(
  input: string,
  existing: string[],
): string | null {
  const trimmed = input.trim().replace(/\s+/g, " ");
  if (!trimmed) return null;
  const match = existing.find(
    (c) => c.toLowerCase() === trimmed.toLowerCase(),
  );
  return match ?? trimmed;
}

function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function useUploadResource() {
  const qc = useQueryClient();
  const create = useServerFn(createResource);
  return useMutation({
    mutationFn: async (vars: {
      category: string | null;
      title: string;
      description: string | null;
      file: File;
    }) => {
      if (vars.file.size > RESOURCES_MAX_BYTES) throw new Error("File is over 20MB.");
      if (!isAllowedResourceFile(vars.file)) {
        throw new Error("Only PDF or Word (.docx) files are allowed.");
      }
      const resourceId = crypto.randomUUID();
      const path = `${resourceId}/${safeName(vars.file.name)}`;
      const contentType = isDocxFileName(vars.file.name)
        ? RESOURCES_DOCX_MIME
        : "application/pdf";
      const { error: upErr } = await supabase.storage
        .from(RESOURCES_BUCKET)
        .upload(path, vars.file, { contentType, upsert: false });
      if (upErr) throw upErr;
      try {
        await create({
          data: {
            category: vars.category,
            title: vars.title.trim(),
            description: vars.description?.trim() || null,
            filePath: path,
            fileName: vars.file.name,
            fileSize: vars.file.size,
          },
        });
      } catch (e) {
        await supabase.storage.from(RESOURCES_BUCKET).remove([path]);
        throw e;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["resources"] }),
  });
}

export function useUpdateResourceMeta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      id: string;
      title: string;
      description: string | null;
      category: string | null;
    }) => {
      const { error } = await supabase
        .from("resources")
        .update({
          title: vars.title.trim(),
          description: vars.description,
          category: vars.category,
        })
        .eq("id", vars.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["resources"] }),
  });
}

export function useReplaceResourceFile() {
  const qc = useQueryClient();
  const replace = useServerFn(replaceResourceFile);
  return useMutation({
    mutationFn: async (vars: { resource: Resource; file: File }) => {
      if (vars.file.size > RESOURCES_MAX_BYTES) throw new Error("File is over 20MB.");
      if (!isAllowedResourceFile(vars.file)) {
        throw new Error("Only PDF or Word (.docx) files are allowed.");
      }
      const path = `${vars.resource.id}/${safeName(vars.file.name)}`;
      const contentType = isDocxFileName(vars.file.name)
        ? RESOURCES_DOCX_MIME
        : "application/pdf";
      const { error: upErr } = await supabase.storage
        .from(RESOURCES_BUCKET)
        .upload(path, vars.file, { contentType, upsert: true });
      if (upErr) throw upErr;
      try {
        await replace({
          data: {
            resourceId: vars.resource.id,
            filePath: path,
            fileName: vars.file.name,
            fileSize: vars.file.size,
          },
        });
      } catch (e) {
        await supabase.storage.from(RESOURCES_BUCKET).remove([path]);
        throw e;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["resources"] }),
  });
}

export function useDeleteResource() {
  const qc = useQueryClient();
  const del = useServerFn(deleteResource);
  return useMutation({
    mutationFn: async (resourceId: string) => {
      await del({ data: { resourceId } });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["resources"] }),
  });
}

/** Signed URL for in-app preview. */
export async function getResourceSignedUrl(
  storagePath: string,
  expiresIn = 600,
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(RESOURCES_BUCKET)
    .createSignedUrl(storagePath, expiresIn);
  if (error) return null;
  return data?.signedUrl ?? null;
}

/** Signed URL that forces a download with the original filename. */
export async function getResourceDownloadUrl(
  storagePath: string,
  fileName: string,
  expiresIn = 600,
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(RESOURCES_BUCKET)
    .createSignedUrl(storagePath, expiresIn, { download: fileName });
  if (error) return null;
  return data?.signedUrl ?? null;
}

/** Trigger a browser download for a resource. */
export async function downloadResource(resource: Resource): Promise<void> {
  const url = await getResourceDownloadUrl(resource.file_path, resource.file_name);
  if (!url) return;
  const a = document.createElement("a");
  a.href = url;
  a.download = resource.file_name;
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  a.remove();
}
