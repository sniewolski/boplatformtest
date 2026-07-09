import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  createWillAiSource,
  deleteWillAiSource,
  retryWillAiSource,
} from "@/lib/willAiSources.functions";

export const WILL_AI_BUCKET = "will-ai-content";
export const WILL_AI_MAX_BYTES = 200 * 1024 * 1024;

export type WillAiSourceType =
  | "book"
  | "video"
  | "podcast"
  | "blog_post"
  | "document";

export type WillAiFailedPage = {
  page: number;
  stage: string;
  error: string;
};

export type WillAiSource = {
  id: string;
  source_type: WillAiSourceType;
  title: string;
  author: string | null;
  status: "pending" | "processing" | "completed" | "failed";
  storage_path: string | null;
  total_pages: number | null;
  failed_pages: WillAiFailedPage[];
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

export type WillAiChunkCounts = {
  text: number;
  diagram: number;
  total: number;
};

export function isPdfFile(file: File): boolean {
  const nameOk = /\.pdf$/i.test(file.name);
  const typeOk = file.type === "application/pdf" || file.type === "";
  return nameOk && typeOk;
}


function hasActive(rows: WillAiSource[] | undefined): boolean {
  return !!rows?.some((r) => r.status === "pending" || r.status === "processing");
}

export function useWillAiSources() {
  return useQuery({
    queryKey: ["will-ai-sources"],
    queryFn: async (): Promise<WillAiSource[]> => {
      const { data, error } = await supabase
        .from("will_ai_sources")
        .select(
          "id, source_type, title, author, status, storage_path, total_pages, failed_pages, error_message, created_at, updated_at",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        ...r,
        failed_pages: Array.isArray(r.failed_pages) ? r.failed_pages : [],
      })) as WillAiSource[];
    },
    // Poll while anything is still working. Stops naturally once all rows
    // reach a terminal state.
    refetchInterval: (query) =>
      hasActive(query.state.data as WillAiSource[] | undefined) ? 4000 : false,
  });
}

export function useWillAiChunkCounts() {
  return useQuery({
    queryKey: ["will-ai-chunk-counts"],
    queryFn: async (): Promise<Record<string, WillAiChunkCounts>> => {
      const { data, error } = await supabase
        .from("will_ai_chunks")
        .select("source_id, chunk_type");
      if (error) throw error;
      const acc: Record<string, WillAiChunkCounts> = {};
      for (const row of (data ?? []) as { source_id: string; chunk_type: string }[]) {
        const b = acc[row.source_id] ?? { text: 0, diagram: 0, total: 0 };
        if (row.chunk_type === "diagram") b.diagram++;
        else b.text++;
        b.total++;
        acc[row.source_id] = b;
      }
      return acc;
    },
    refetchInterval: 8000,
  });
}

export function useUploadWillAiSource() {
  const qc = useQueryClient();
  const create = useServerFn(createWillAiSource);
  return useMutation({
    mutationFn: async (vars: {
      sourceType: WillAiSourceType;
      title: string;
      author: string | null;
      file: File;
    }) => {
      if (vars.file.size > WILL_AI_MAX_BYTES) {
        throw new Error(
          `File is over ${Math.round(WILL_AI_MAX_BYTES / 1024 / 1024)}MB.`,
        );
      }
      if (!isPdfFile(vars.file)) throw new Error("Only PDF files are allowed.");

      // The client-generated id IS the row id. All artifacts for this source
      // (source PDF + rendered page images) live under `${sourceId}/…`,
      // so delete/retry can find them without extra lookups.
      const sourceId = crypto.randomUUID();
      const path = `${sourceId}/source.pdf`;
      const { error: upErr } = await supabase.storage
        .from(WILL_AI_BUCKET)
        .upload(path, vars.file, {
          contentType: "application/pdf",
          upsert: false,
        });
      if (upErr) throw upErr;

      try {
        await create({
          data: {
            sourceId,
            sourceType: vars.sourceType,
            title: vars.title.trim(),
            author: vars.author?.trim() || null,
            filePath: path,
          },
        });
      } catch (e) {
        await supabase.storage.from(WILL_AI_BUCKET).remove([path]);
        throw e;
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["will-ai-sources"] });
      void qc.invalidateQueries({ queryKey: ["will-ai-chunk-counts"] });
    },
  });
}

export function useRetryWillAiSource() {
  const qc = useQueryClient();
  const retry = useServerFn(retryWillAiSource);
  return useMutation({
    mutationFn: async (sourceId: string) => {
      await retry({ data: { sourceId } });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["will-ai-sources"] });
      void qc.invalidateQueries({ queryKey: ["will-ai-chunk-counts"] });
    },
  });
}

export function useDeleteWillAiSource() {
  const qc = useQueryClient();
  const del = useServerFn(deleteWillAiSource);
  return useMutation({
    mutationFn: async (sourceId: string) => {
      await del({ data: { sourceId } });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["will-ai-sources"] });
      void qc.invalidateQueries({ queryKey: ["will-ai-chunk-counts"] });
    },
  });
}
