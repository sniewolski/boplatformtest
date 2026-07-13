/**
 * Client-side data hooks for the owner-facing Will AI chat.
 *
 * Conversation model:
 *   - Load the owner's most recent conversation + its messages on mount.
 *   - "New chat" is a UI-only reset (activeConversationId=null); the server
 *     creates the row lazily on first send (Phase 5 behaviour), so an
 *     opened-but-unused chat leaves no orphan.
 *   - Conversation switcher lists past conversations with a title derived
 *     from the first user message.
 *
 * Citation resolution:
 *   - `useResolvedChunks(chunkIds)` fetches chunk rows + source titles for a
 *     set of ids in one round trip. RLS permits authenticated SELECT on
 *     will_ai_chunks/will_ai_sources.
 *   - Diagram images live in the private `will-ai-content` bucket; the
 *     bucket policy already permits authenticated SELECT, so client-side
 *     signed-URL creation works (same pattern as SOPs).
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { sendWillAiMessage } from "@/lib/willAi.functions";

export const WILL_AI_BUCKET = "will-ai-content";

export type WillAiConversation = {
  id: string;
  owner_id: string;
  created_at: string;
};

export type WillAiMessage = {
  id: string;
  conversation_id: string;
  owner_id: string;
  role: "user" | "assistant";
  content: string;
  cited_chunk_ids: string[];
  used_fallback: boolean;
  created_at: string;
};

export type WillAiChunkRef = {
  id: string;
  source_id: string;
  source_title: string;
  source_type: "book" | "video" | "podcast" | "blog_post" | "document" | "youtube" | string;
  chunk_type: "text" | "diagram" | "transcript" | string;
  page_number: number | null;
  start_seconds: number | null;
  end_seconds: number | null;
  image_storage_path: string | null;
  source_storage_path: string | null;
  external_id: string | null;
};

// -------------------- conversations --------------------

/**
 * The owner's conversation list, newest first. Titles derive from the first
 * user message on that conversation (fetched separately).
 */
export function useWillAiConversations(ownerId: string | null | undefined) {
  return useQuery({
    queryKey: ["will-ai-conversations", ownerId],
    enabled: !!ownerId,
    queryFn: async (): Promise<
      Array<WillAiConversation & { title: string | null }>
    > => {
      const { data: convs, error } = await supabase
        .from("will_ai_conversations")
        .select("id, owner_id, created_at")
        .eq("owner_id", ownerId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = (convs ?? []) as WillAiConversation[];
      if (rows.length === 0) return [];
      // Pull first user message per conversation for a title.
      const ids = rows.map((r) => r.id);
      const { data: firstMsgs, error: mErr } = await supabase
        .from("will_ai_messages")
        .select("conversation_id, content, created_at, role")
        .in("conversation_id", ids)
        .eq("role", "user")
        .order("created_at", { ascending: true });
      if (mErr) throw mErr;
      const titleByConv = new Map<string, string>();
      for (const m of (firstMsgs ?? []) as any[]) {
        if (!titleByConv.has(m.conversation_id)) {
          titleByConv.set(m.conversation_id, m.content);
        }
      }
      return rows.map((r) => ({ ...r, title: titleByConv.get(r.id) ?? null }));
    },
  });
}

export function useWillAiMessages(conversationId: string | null | undefined) {
  return useQuery({
    queryKey: ["will-ai-messages", conversationId],
    enabled: !!conversationId,
    queryFn: async (): Promise<WillAiMessage[]> => {
      const { data, error } = await supabase
        .from("will_ai_messages")
        .select("*")
        .eq("conversation_id", conversationId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return ((data ?? []) as any[]).map((r) => ({
        ...r,
        cited_chunk_ids: Array.isArray(r.cited_chunk_ids)
          ? (r.cited_chunk_ids as string[])
          : [],
      })) as WillAiMessage[];
    },
  });
}

/**
 * Resolve chunk ids to full metadata + source titles + source storage paths
 * (for PDF preview). One query per call, deduped per (sorted-ids) cache key.
 */
export function useResolvedChunks(chunkIds: string[]) {
  const key = [...chunkIds].sort().join(",");
  return useQuery({
    queryKey: ["will-ai-chunk-refs", key],
    enabled: chunkIds.length > 0,
    queryFn: async (): Promise<WillAiChunkRef[]> => {
      const { data: chunks, error } = await supabase
        .from("will_ai_chunks")
        .select("id, source_id, chunk_type, page_number, start_seconds, end_seconds, image_storage_path")
        .in("id", chunkIds);
      if (error) throw error;
      const rows = (chunks ?? []) as any[];
      const sourceIds = Array.from(new Set(rows.map((r) => r.source_id)));
      const { data: sources } = await supabase
        .from("will_ai_sources")
        .select("id, title, storage_path, source_type, external_id")
        .in("id", sourceIds);
      const sourceMap = new Map<
        string,
        {
          title: string;
          storage_path: string | null;
          source_type: string;
          external_id: string | null;
        }
      >();
      for (const s of (sources ?? []) as any[]) {
        sourceMap.set(s.id, {
          title: s.title,
          storage_path: s.storage_path,
          source_type: s.source_type,
          external_id: s.external_id ?? null,
        });
      }
      // Preserve caller order.
      const byId = new Map(rows.map((r) => [r.id, r]));
      return chunkIds
        .map((id) => byId.get(id))
        .filter(Boolean)
        .map((r: any) => {
          const s = sourceMap.get(r.source_id);
          return {
            id: r.id,
            source_id: r.source_id,
            source_title: s?.title ?? "Source",
            source_type: s?.source_type ?? "document",
            chunk_type: r.chunk_type,
            page_number: r.page_number,
            start_seconds: r.start_seconds,
            end_seconds: r.end_seconds,
            image_storage_path: r.image_storage_path,
            source_storage_path: s?.storage_path ?? null,
            external_id: s?.external_id ?? null,
          } satisfies WillAiChunkRef;
        });
    },
  });
}

export async function getWillAiSignedUrl(
  storagePath: string,
  expiresIn = 600,
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(WILL_AI_BUCKET)
    .createSignedUrl(storagePath, expiresIn);
  if (error) return null;
  return data?.signedUrl ?? null;
}

// -------------------- send --------------------

export function useSendWillAiMessage(ownerId: string | null | undefined) {
  const qc = useQueryClient();
  const send = useServerFn(sendWillAiMessage);
  return useMutation({
    mutationFn: async (vars: {
      conversationId: string | null;
      userMessage: string;
    }) => {
      if (!ownerId) throw new Error("Not signed in");
      const res = await send({
        data: {
          ownerId,
          conversationId: vars.conversationId,
          userMessage: vars.userMessage,
        },
      });
      return res;
    },
    onSuccess: (res) => {
      // Seed the message-thread cache directly with the two persisted rows
      // the RPC returned. Both are real database rows (real ids + real
      // created_at) so a later natural refetch of the same query key won't
      // reveal a mismatch. Avoids a follow-up round-trip after send.
      const convId = res.conversationId;
      const userRow = {
        ...res.userMessage,
        conversation_id: convId,
        owner_id: ownerId!,
        role: "user" as const,
      } satisfies WillAiMessage;
      const assistantRow = {
        ...res.assistantMessage,
        conversation_id: convId,
        owner_id: ownerId!,
        role: "assistant" as const,
      } satisfies WillAiMessage;

      qc.setQueryData<WillAiMessage[]>(
        ["will-ai-messages", convId],
        (prev) => {
          const base = prev ?? [];
          // Guard against a race where a refetch already landed these rows.
          const existing = new Set(base.map((m) => m.id));
          const next = [...base];
          if (!existing.has(userRow.id)) next.push(userRow);
          if (!existing.has(assistantRow.id)) next.push(assistantRow);
          return next;
        },
      );

      // Only refresh the "Past chats" list when a new conversation was
      // created this turn — otherwise the list is unchanged and a refetch
      // is wasted work.
      if (res.isNewConversation) {
        void qc.invalidateQueries({
          queryKey: ["will-ai-conversations", ownerId],
        });
      }
    },
  });
}

// -------------------- delete --------------------

/**
 * Delete a conversation (messages cascade via ON DELETE CASCADE).
 * Owner-scoped delete permitted by RLS on will_ai_conversations.
 */
export function useDeleteWillAiConversation(ownerId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (conversationId: string) => {
      const { error } = await supabase
        .from("will_ai_conversations")
        .delete()
        .eq("id", conversationId);
      if (error) throw error;
      return conversationId;
    },
    onSuccess: (conversationId) => {
      qc.setQueryData<Array<WillAiConversation & { title: string | null }>>(
        ["will-ai-conversations", ownerId],
        (prev) => (prev ?? []).filter((c) => c.id !== conversationId),
      );
      qc.removeQueries({ queryKey: ["will-ai-messages", conversationId] });
    },
  });
}


