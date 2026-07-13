import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { importSopToWillAi } from "@/lib/sopWillAiImport.functions";
import type { WillAiSource } from "@/lib/useWillAiSources";

export type SopWillAiRow = {
  sop_id: string;
  sop_title: string;
  file_name: string;
  folder_id: string | null;
  folder_name: string | null;
  is_pdf: boolean;
  source_id: string | null;
  status: WillAiSource["status"] | null;
  error_message: string | null;
};

/**
 * Admin-only. Lists every SOP with its Will AI import status (join via
 * `will_ai_sources.sop_id`). Grouped/rendered by folder in the UI.
 *
 * Poll cadence matches the sources list — pending/processing rows tick
 * over as the ingestion worker progresses.
 */
export function useSopsWillAiStatus() {
  return useQuery({
    queryKey: ["sops-will-ai-status"],
    queryFn: async (): Promise<SopWillAiRow[]> => {
      const [{ data: sops, error: sopErr }, { data: folders }, { data: sources, error: srcErr }] =
        await Promise.all([
          supabase
            .from("sops")
            .select("id, title, file_name, folder_id")
            .order("title", { ascending: true }),
          supabase.from("sop_folders").select("id, name"),
          supabase
            .from("will_ai_sources")
            .select("id, sop_id, status, error_message")
            .not("sop_id", "is", null),
        ]);
      if (sopErr) throw sopErr;
      if (srcErr) throw srcErr;

      const folderName = new Map<string, string>();
      for (const f of (folders ?? []) as any[]) folderName.set(f.id, f.name);
      const bySopId = new Map<string, any>();
      for (const s of (sources ?? []) as any[]) bySopId.set(s.sop_id, s);

      return ((sops ?? []) as any[]).map((s) => {
        const src = bySopId.get(s.id);
        return {
          sop_id: s.id,
          sop_title: s.title,
          file_name: s.file_name,
          folder_id: s.folder_id,
          folder_name: s.folder_id ? folderName.get(s.folder_id) ?? null : null,
          is_pdf: /\.pdf$/i.test(s.file_name),
          source_id: src?.id ?? null,
          status: src?.status ?? null,
          error_message: src?.error_message ?? null,
        };
      });
    },
    refetchInterval: (query) => {
      const rows = query.state.data as SopWillAiRow[] | undefined;
      const active = rows?.some(
        (r) => r.status === "pending" || r.status === "processing",
      );
      return active ? 4000 : false;
    },
  });
}

export function useImportSopToWillAi() {
  const qc = useQueryClient();
  const importFn = useServerFn(importSopToWillAi);
  return useMutation({
    mutationFn: async (sopId: string) => {
      return importFn({ data: { sopId } });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["sops-will-ai-status"] });
      void qc.invalidateQueries({ queryKey: ["will-ai-sources"] });
      void qc.invalidateQueries({ queryKey: ["will-ai-chunk-counts"] });
    },
  });
}
