/**
 * Admin-only server functions for Sales Content Review.
 *
 * Every function MUST:
 *   1. Use `requireSupabaseAuth` (caller signed in).
 *   2. Re-check the `admin` role via has_role().
 *   3. Load the admin client INSIDE the handler with await import().
 *
 * AI drafting is admin-triggered (button only). Drafts are stored as
 * content_review_notes rows with source='ai_suggestion' and status='draft'.
 * Owners never see drafts (RLS blocks unpublished notes).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  CONTENT_CATEGORIES,
  CONTENT_FEEDBACK_STYLE,
  CONTENT_RUBRICS,
  CONTENT_STORAGE_BUCKET,
} from "./config";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error) throw new Error("Failed to verify admin role");
  if (!data) throw new Error("Forbidden");
}

async function assertElevated(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("is_elevated", { _user_id: userId });
  if (error) throw new Error("Failed to verify role");
  if (!data) throw new Error("Forbidden");
}


export const getReviewAsset = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ assetId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertElevated(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: asset, error } = await supabaseAdmin
      .from("content_review_assets")
      .select("*")
      .eq("id", data.assetId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!asset) throw new Error("Asset not found");

    const { data: notes, error: nErr } = await supabaseAdmin
      .from("content_review_notes")
      .select("id, asset_id, owner_id, body, source, status, author_id, created_at, updated_at")
      .eq("asset_id", data.assetId)
      .order("created_at", { ascending: true });
    if (nErr) throw new Error(nErr.message);

    const { data: owner } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name")
      .eq("id", asset.owner_id)
      .maybeSingle();

    let signedUrl: string | null = null;
    if (asset.storage_path) {
      const { data: s } = await supabaseAdmin.storage
        .from(CONTENT_STORAGE_BUCKET)
        .createSignedUrl(asset.storage_path, 600);
      signedUrl = s?.signedUrl ?? null;
    }

    return {
      asset,
      notes: notes ?? [],
      owner_email: (owner?.email as string | undefined) ?? "—",
      owner_name: (owner?.full_name as string | null | undefined) ?? null,
      signedUrl,
    };
  });

export const createReviewNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        assetId: z.string().uuid(),
        body: z.string().trim().min(1).max(20000),
        source: z.enum(["coach", "ai_suggestion"]).default("coach"),
        status: z.enum(["draft", "published"]).default("draft"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: asset, error: aErr } = await supabaseAdmin
      .from("content_review_assets")
      .select("owner_id")
      .eq("id", data.assetId)
      .maybeSingle();
    if (aErr) throw new Error(aErr.message);
    if (!asset) throw new Error("Asset not found");

    const { data: note, error } = await supabaseAdmin
      .from("content_review_notes")
      .insert({
        asset_id: data.assetId,
        owner_id: asset.owner_id,
        author_id: context.userId,
        body: data.body,
        source: data.source,
        status: data.status,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return note;
  });

export const updateReviewNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        noteId: z.string().uuid(),
        body: z.string().trim().min(1).max(20000).optional(),
        status: z.enum(["draft", "published"]).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const patch: { body?: string; status?: "draft" | "published" } = {};
    if (data.body !== undefined) patch.body = data.body;
    if (data.status !== undefined) patch.status = data.status;
    if (Object.keys(patch).length === 0) return { ok: true };

    const { error } = await supabaseAdmin
      .from("content_review_notes")
      .update(patch)
      .eq("id", data.noteId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });


export const deleteReviewNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ noteId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("content_review_notes")
      .delete()
      .eq("id", data.noteId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Admin-triggered AI draft. Never auto-runs.
 * Pulls the asset's content (text or file), sends to Lovable AI Gateway
 * with the category rubric + global feedback-style rule, and stores the
 * result as a DRAFT note (source='ai_suggestion'). Admin reviews, edits,
 * then publishes — owner only sees published notes.
 */
export const generateAiDraftNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ assetId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: asset, error } = await supabaseAdmin
      .from("content_review_assets")
      .select("*")
      .eq("id", data.assetId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!asset) throw new Error("Asset not found");

    const category = CONTENT_CATEGORIES.find((c) => c.key === asset.category);
    const rubric = CONTENT_RUBRICS[asset.category]?.criteria ?? [];

    const system = [
      `You are a senior sales coach reviewing a piece of "${category?.label ?? asset.category}".`,
      `Rubric:`,
      ...rubric.map((c) => `- ${c}`),
      ``,
      CONTENT_FEEDBACK_STYLE,
    ].join("\n");

    // Build Gemini "parts" array. Text/md → inline text. PDF/image → inlineData base64.
    const parts: any[] = [{ text: `Title: ${asset.title}` }];

    if (asset.input_type === "text" || asset.input_type === "md") {
      const body =
        asset.body_text ??
        (asset.storage_path ? await downloadAsText(asset.storage_path) : "");
      parts.push({ text: body || "(empty)" });
    } else if (asset.input_type === "pdf" && asset.storage_path) {
      const { base64 } = await downloadAsBase64(asset.storage_path);
      parts.push({
        inlineData: { mimeType: "application/pdf", data: base64 },
      });
    } else if (asset.input_type === "image" && asset.storage_path) {
      const { base64, contentType } = await downloadAsBase64(asset.storage_path);
      parts.push({
        inlineData: { mimeType: contentType || "image/png", data: base64 },
      });
    }

    // Call Google Gemini API directly with the user's own API key.
    const model = "gemini-2.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts }],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      if (res.status === 429) throw new Error("Gemini rate limit exceeded. Try again shortly.");
      throw new Error(`AI draft failed (${res.status}): ${text.slice(0, 300)}`);
    }

    const json: any = await res.json();
    const draftBody: string =
      (json?.candidates?.[0]?.content?.parts ?? [])
        .map((p: any) => p?.text ?? "")
        .join("")
        .trim();
    if (!draftBody) throw new Error("AI returned an empty draft.");

    const { data: note, error: nErr } = await supabaseAdmin
      .from("content_review_notes")
      .insert({
        asset_id: asset.id,
        owner_id: asset.owner_id,
        author_id: context.userId,
        body: draftBody,
        source: "ai_suggestion",
        status: "draft",
      })
      .select("*")
      .single();
    if (nErr) throw new Error(nErr.message);
    return note;
  });

async function downloadAsBase64(
  storagePath: string,
): Promise<{ base64: string; contentType: string }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.storage
    .from(CONTENT_STORAGE_BUCKET)
    .download(storagePath);
  if (error || !data) throw new Error(error?.message ?? "Could not download asset");
  const buf = new Uint8Array(await data.arrayBuffer());
  // Avoid call-stack overflow on large files.
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < buf.length; i += chunk) {
    bin += String.fromCharCode(...buf.subarray(i, i + chunk));
  }
  return { base64: btoa(bin), contentType: data.type || "application/octet-stream" };
}

async function downloadAsText(storagePath: string): Promise<string> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.storage
    .from(CONTENT_STORAGE_BUCKET)
    .download(storagePath);
  if (error || !data) return "";
  return await data.text();
}
