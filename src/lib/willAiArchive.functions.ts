/**
 * Admin-only read access to the permanent Will AI conversation archive.
 *
 * The archive lives in `will_ai_conversations_archive` /
 * `will_ai_messages_archive` and is populated by SECURITY DEFINER triggers
 * on the live tables. Rows survive owner deletion and are immutable from
 * app code (no INSERT/UPDATE/DELETE RLS policies — triggers are the only
 * write path). Every function here re-checks the admin role.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error) throw new Error("Failed to verify admin role");
  if (!data) throw new Error("Forbidden");
}

export type ArchivedOwnerSummary = {
  ownerId: string;
  ownerName: string | null;
  ownerEmail: string | null;
  conversationCount: number;
  lastActivityAt: string;
};

export type ArchivedConversationSummary = {
  id: string;
  createdAt: string;
  archivedAt: string;
  title: string | null;
  messageCount: number;
};

export type ArchivedConversationMeta = {
  id: string;
  ownerId: string;
  ownerName: string | null;
  ownerEmail: string | null;
  title: string | null;
  createdAt: string;
  archivedAt: string;
};

export type ArchivedMessage = {
  id: string;
  conversation_id: string;
  owner_id: string;
  role: "user" | "assistant";
  content: string;
  cited_chunk_ids: string[];
  used_fallback: boolean;
  created_at: string;
};

export const listArchivedOwnersSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ArchivedOwnerSummary[]> => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data, error } = await supabaseAdmin
      .from("will_ai_conversations_archive")
      .select("id, owner_id, owner_name, owner_email, archived_at, created_at")
      .order("archived_at", { ascending: false });
    if (error) throw new Error(error.message);

    const byOwner = new Map<string, ArchivedOwnerSummary>();
    for (const row of (data ?? []) as any[]) {
      const key = row.owner_id as string;
      const existing = byOwner.get(key);
      if (existing) {
        existing.conversationCount += 1;
        if (row.archived_at > existing.lastActivityAt) {
          existing.lastActivityAt = row.archived_at;
        }
        // Prefer a non-null name/email if a later row has one.
        existing.ownerName = existing.ownerName ?? row.owner_name ?? null;
        existing.ownerEmail = existing.ownerEmail ?? row.owner_email ?? null;
      } else {
        byOwner.set(key, {
          ownerId: key,
          ownerName: row.owner_name ?? null,
          ownerEmail: row.owner_email ?? null,
          conversationCount: 1,
          lastActivityAt: row.archived_at,
        });
      }
    }

    return Array.from(byOwner.values()).sort((a, b) =>
      a.lastActivityAt < b.lastActivityAt ? 1 : -1,
    );
  });

export const listArchivedConversationsForOwner = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ ownerId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<ArchivedConversationSummary[]> => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: convs, error } = await supabaseAdmin
      .from("will_ai_conversations_archive")
      .select("id, created_at, archived_at")
      .eq("owner_id", data.ownerId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const rows = (convs ?? []) as any[];
    if (rows.length === 0) return [];

    const ids = rows.map((r) => r.id as string);
    const { data: msgs, error: mErr } = await supabaseAdmin
      .from("will_ai_messages_archive")
      .select("conversation_id, content, role, created_at")
      .in("conversation_id", ids)
      .order("created_at", { ascending: true });
    if (mErr) throw new Error(mErr.message);

    const titleByConv = new Map<string, string>();
    const countByConv = new Map<string, number>();
    for (const m of (msgs ?? []) as any[]) {
      countByConv.set(
        m.conversation_id,
        (countByConv.get(m.conversation_id) ?? 0) + 1,
      );
      if (m.role === "user" && !titleByConv.has(m.conversation_id)) {
        titleByConv.set(m.conversation_id, m.content);
      }
    }

    const truncate = (s: string) => (s.length > 60 ? s.slice(0, 57) + "…" : s);

    return rows.map((r) => ({
      id: r.id as string,
      createdAt: r.created_at as string,
      archivedAt: r.archived_at as string,
      title: titleByConv.has(r.id)
        ? truncate(titleByConv.get(r.id)!)
        : null,
      messageCount: countByConv.get(r.id) ?? 0,
    }));
  });

export const getArchivedConversationThread = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ conversationId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<ArchivedMessage[]> => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: msgs, error } = await supabaseAdmin
      .from("will_ai_messages_archive")
      .select(
        "id, conversation_id, owner_id, role, content, cited_chunk_ids, used_fallback, created_at",
      )
      .eq("conversation_id", data.conversationId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    return ((msgs ?? []) as any[]).map((r) => ({
      id: r.id,
      conversation_id: r.conversation_id,
      owner_id: r.owner_id,
      role: r.role,
      content: r.content,
      cited_chunk_ids: Array.isArray(r.cited_chunk_ids)
        ? (r.cited_chunk_ids as string[])
        : [],
      used_fallback: !!r.used_fallback,
      created_at: r.created_at,
    }));
  });

/**
 * Look up a single archived conversation by id, returning owner identity +
 * derived title (matching listArchivedConversationsForOwner's derivation:
 * first user message, truncated to 60 chars). Used to hydrate the archive
 * thread view when the admin lands via a direct URL and doesn't have the
 * owner metadata / title in hand. Returns null if the conversation is not
 * in the archive.
 */
export const getArchivedConversationById = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ conversationId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<ArchivedConversationMeta | null> => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: conv, error } = await supabaseAdmin
      .from("will_ai_conversations_archive")
      .select("id, owner_id, owner_name, owner_email, created_at, archived_at")
      .eq("id", data.conversationId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!conv) return null;

    const { data: firstUser, error: mErr } = await supabaseAdmin
      .from("will_ai_messages_archive")
      .select("content")
      .eq("conversation_id", data.conversationId)
      .eq("role", "user")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (mErr) throw new Error(mErr.message);

    const truncate = (s: string) => (s.length > 60 ? s.slice(0, 57) + "…" : s);

    return {
      id: conv.id as string,
      ownerId: conv.owner_id as string,
      ownerName: (conv.owner_name as string | null) ?? null,
      ownerEmail: (conv.owner_email as string | null) ?? null,
      title: firstUser?.content ? truncate(firstUser.content as string) : null,
      createdAt: conv.created_at as string,
      archivedAt: conv.archived_at as string,
    };
  });
