import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { createSop, deleteSop, replaceSopFile } from "@/lib/sops.functions";

export const SOPS_BUCKET = "sops";
export const SOPS_MAX_BYTES = 20 * 1024 * 1024;

export const SOPS_DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
export const SOPS_ACCEPT_ATTR = `application/pdf,.pdf,${SOPS_DOCX_MIME},.docx`;

export function isAllowedSopFile(file: File): boolean {
  const nameOk = /\.(pdf|docx)$/i.test(file.name);
  const typeOk =
    file.type === "application/pdf" ||
    file.type === SOPS_DOCX_MIME ||
    // Some browsers/OS may not set a MIME type for .docx
    file.type === "";
  return nameOk && typeOk;
}

export function isDocxFileName(name: string): boolean {
  return /\.docx$/i.test(name);
}


export type SopFolder = {
  id: string;
  name: string;
  created_at: string;
};

export type Sop = {
  id: string;
  folder_id: string | null;
  title: string;
  description: string | null;
  file_path: string;
  file_name: string;
  file_size: number;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
};

export function useSopFolders() {
  return useQuery({
    queryKey: ["sop-folders"],
    queryFn: async (): Promise<SopFolder[]> => {
      const { data, error } = await supabase
        .from("sop_folders")
        .select("id, name, created_at")
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as SopFolder[];
    },
  });
}

export function useSops() {
  return useQuery({
    queryKey: ["sops"],
    queryFn: async (): Promise<Sop[]> => {
      const { data, error } = await supabase
        .from("sops")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Sop[];
    },
  });
}

export function useCreateFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase
        .from("sop_folders")
        .insert({ name: name.trim() });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sop-folders"] }),
  });
}

export function useRenameFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; name: string }) => {
      const { error } = await supabase
        .from("sop_folders")
        .update({ name: vars.name.trim() })
        .eq("id", vars.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sop-folders"] }),
  });
}

export function useDeleteFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sop_folders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["sop-folders"] });
      void qc.invalidateQueries({ queryKey: ["sops"] });
    },
  });
}

export function useUpdateSopMeta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      id: string;
      title: string;
      description: string | null;
      folder_id: string | null;
    }) => {
      const { error } = await supabase
        .from("sops")
        .update({
          title: vars.title.trim(),
          description: vars.description,
          folder_id: vars.folder_id,
        })
        .eq("id", vars.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sops"] }),
  });
}

function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

/**
 * Upload a PDF to the sops bucket, then create the DB row via a server fn
 * that re-validates admin + PDF magic bytes.
 */
export function useUploadSop() {
  const qc = useQueryClient();
  const create = useServerFn(createSop);
  return useMutation({
    mutationFn: async (vars: {
      folderId: string | null;
      title: string;
      description: string | null;
      file: File;
    }) => {
      if (vars.file.size > SOPS_MAX_BYTES) throw new Error("File is over 20MB.");
      if (!isAllowedSopFile(vars.file)) {
        throw new Error("Only PDF or Word (.docx) files are allowed.");
      }
      const sopId = crypto.randomUUID();
      const folderSeg = vars.folderId ?? "unassigned";
      const path = `${folderSeg}/${sopId}/${safeName(vars.file.name)}`;
      const contentType = isDocxFileName(vars.file.name)
        ? SOPS_DOCX_MIME
        : "application/pdf";
      const { error: upErr } = await supabase.storage
        .from(SOPS_BUCKET)
        .upload(path, vars.file, { contentType, upsert: false });

      if (upErr) throw upErr;
      try {
        await create({
          data: {
            folderId: vars.folderId,
            title: vars.title.trim(),
            description: vars.description?.trim() || null,
            filePath: path,
            fileName: vars.file.name,
            fileSize: vars.file.size,
          },
        });
      } catch (e) {
        await supabase.storage.from(SOPS_BUCKET).remove([path]);
        throw e;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sops"] }),
  });
}

export function useReplaceSopFile() {
  const qc = useQueryClient();
  const replace = useServerFn(replaceSopFile);
  return useMutation({
    mutationFn: async (vars: { sop: Sop; file: File }) => {
      if (vars.file.size > SOPS_MAX_BYTES) throw new Error("File is over 20MB.");
      if (!/\.pdf$/i.test(vars.file.name) || vars.file.type !== "application/pdf") {
        throw new Error("Only PDF files are allowed.");
      }
      const folderSeg = vars.sop.folder_id ?? "unassigned";
      const path = `${folderSeg}/${vars.sop.id}/${safeName(vars.file.name)}`;
      const { error: upErr } = await supabase.storage
        .from(SOPS_BUCKET)
        .upload(path, vars.file, { contentType: "application/pdf", upsert: true });
      if (upErr) throw upErr;
      try {
        await replace({
          data: {
            sopId: vars.sop.id,
            filePath: path,
            fileName: vars.file.name,
            fileSize: vars.file.size,
          },
        });
      } catch (e) {
        await supabase.storage.from(SOPS_BUCKET).remove([path]);
        throw e;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sops"] }),
  });
}

export function useDeleteSop() {
  const qc = useQueryClient();
  const del = useServerFn(deleteSop);
  return useMutation({
    mutationFn: async (sopId: string) => {
      await del({ data: { sopId } });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sops"] }),
  });
}

export async function getSopSignedUrl(
  storagePath: string,
  expiresIn = 600,
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(SOPS_BUCKET)
    .createSignedUrl(storagePath, expiresIn);
  if (error) return null;
  return data?.signedUrl ?? null;
}
