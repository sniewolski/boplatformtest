import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CONTENT_STORAGE_BUCKET, type ContentInputType } from "./config";

const ASSETS = "content_review_assets";
const NOTES = "content_review_notes";

export type ContentAsset = {
  id: string;
  owner_id: string;
  category: string;
  title: string;
  input_type: ContentInputType;
  body_text: string | null;
  storage_path: string | null;
  review_status: "pending" | "reviewed";
  created_at: string;
  updated_at: string;
};

export type ContentNote = {
  id: string;
  asset_id: string;
  body: string;
  source: "coach" | "ai_suggestion";
  status: "draft" | "published";
  created_at: string;
  updated_at: string;
};

export function useContentAssets(ownerId: string | undefined) {
  return useQuery({
    queryKey: ["content-assets", ownerId],
    enabled: !!ownerId,
    queryFn: async (): Promise<ContentAsset[]> => {
      const { data, error } = await supabase
        .from(ASSETS)
        .select("*")
        .eq("owner_id", ownerId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ContentAsset[];
    },
  });
}

export function useAssetNotes(assetId: string | null) {
  return useQuery({
    queryKey: ["content-notes", assetId],
    enabled: !!assetId,
    queryFn: async (): Promise<ContentNote[]> => {
      const { data, error } = await supabase
        .from(NOTES)
        .select("id, asset_id, body, source, status, created_at, updated_at")
        .eq("asset_id", assetId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ContentNote[];
    },
  });
}

export type UploadInput = {
  ownerId: string;
  category: string;
  title: string;
} & (
  | { kind: "text"; body: string }
  | { kind: "file"; file: File; inputType: Exclude<ContentInputType, "text"> }
);

export function useUploadAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UploadInput) => {
      const id = crypto.randomUUID();
      let storagePath: string | null = null;
      let inputType: ContentInputType;
      let bodyText: string | null = null;

      if (input.kind === "text") {
        inputType = "text";
        bodyText = input.body;
      } else {
        inputType = input.inputType;
        const safeName = input.file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        storagePath = `${input.ownerId}/${id}/${safeName}`;
        const { error: upErr } = await supabase.storage
          .from(CONTENT_STORAGE_BUCKET)
          .upload(storagePath, input.file, {
            contentType: input.file.type || undefined,
            upsert: false,
          });
        if (upErr) throw upErr;
      }

      const { error } = await supabase.from(ASSETS).insert({
        id,
        owner_id: input.ownerId,
        category: input.category,
        title: input.title,
        input_type: inputType,
        body_text: bodyText,
        storage_path: storagePath,
      });
      if (error) {
        // best-effort rollback of upload
        if (storagePath) {
          await supabase.storage.from(CONTENT_STORAGE_BUCKET).remove([storagePath]);
        }
        throw error;
      }
      return id;
    },
    onSuccess: (_id, vars) => {
      void qc.invalidateQueries({ queryKey: ["content-assets", vars.ownerId] });
    },
  });
}

export function useDeleteAsset(ownerId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (asset: ContentAsset) => {
      if (asset.storage_path) {
        await supabase.storage
          .from(CONTENT_STORAGE_BUCKET)
          .remove([asset.storage_path]);
      }
      const { error } = await supabase.from(ASSETS).delete().eq("id", asset.id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["content-assets", ownerId] });
    },
  });
}

export async function getSignedAssetUrl(
  storagePath: string,
  expiresIn = 300,
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(CONTENT_STORAGE_BUCKET)
    .createSignedUrl(storagePath, expiresIn);
  if (error) return null;
  return data?.signedUrl ?? null;
}
