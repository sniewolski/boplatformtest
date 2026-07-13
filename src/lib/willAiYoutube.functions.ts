/**
 * Admin-only server functions for YouTube ingestion into the Will AI library.
 *
 * Responsibilities:
 *   - `importYouTubeSources`: given parsed video URLs, channel URLs, and
 *     playlist URLs, expand channels/playlists to a flat set of video IDs,
 *     de-dupe against existing `will_ai_sources.external_id`, bulk-insert
 *     one `will_ai_sources` row per new video (source_type='youtube',
 *     status='pending'), and enqueue one message per source on the EXISTING
 *     `will_ai_ingestion` queue.
 *   - `getYouTubeQuota`: reads the single-row `will_ai_youtube_quota` counter
 *     for the admin display.
 *
 * Channel/playlist expansion strategy:
 *   - Fetch the public HTML for the page (`/@handle/videos`, `/channel/UC…/videos`,
 *     or `/playlist?list=…`) and regex-extract every `"videoId":"XXXXXXXXXXX"`
 *     token, preserving order and de-duplicating within the page. This
 *     captures whatever YouTube renders in the initial payload (typically
 *     ~30 videos for a channel /videos tab, up to ~100 for a playlist).
 *   - Deliberately does NOT paginate via the private innertube API. If a
 *     larger channel needs full uploads coverage later, we'll swap in the
 *     paginated approach then — for now, spec is to get the pipeline
 *     working end-to-end and let the admin re-run to pick up more.
 *   - Any URL we can't parse is returned in `errors[]` — the admin sees
 *     exactly what didn't work.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const QUEUE = "will_ai_ingestion";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error) throw new Error("Failed to verify admin role");
  if (!data) throw new Error("Forbidden");
}

const YT_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

async function fetchYtHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": YT_UA,
      "Accept-Language": "en-US,en;q=0.9",
    },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`Fetch ${url} → HTTP ${res.status}`);
  return await res.text();
}

const VIDEO_ID_RE = /"videoId":"([A-Za-z0-9_-]{11})"/g;

function extractVideoIds(html: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of html.matchAll(VIDEO_ID_RE)) {
    const id = m[1];
    if (!seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

/**
 * Extract a plausible page/channel title from the HTML `<title>` tag for
 * display in error messages when nothing was found. Best-effort.
 */
function extractPageTitle(html: string): string | null {
  const m = html.match(/<title>([^<]{1,300})<\/title>/i);
  if (!m) return null;
  return m[1].replace(/\s*-\s*YouTube\s*$/i, "").trim() || null;
}

async function expandChannelUrl(channelUrl: string): Promise<string[]> {
  // Normalise: ensure we hit the /videos tab, which lists uploads.
  let url = channelUrl.replace(/\/+$/, "");
  if (!/\/videos(?:\?|$)/.test(url)) url = `${url}/videos`;
  const html = await fetchYtHtml(url);
  const ids = extractVideoIds(html);
  if (ids.length === 0) {
    const title = extractPageTitle(html);
    throw new Error(
      `No videos found on channel page${title ? ` "${title}"` : ""}`,
    );
  }
  return ids;
}

async function expandPlaylistUrl(playlistUrl: string): Promise<string[]> {
  const html = await fetchYtHtml(playlistUrl);
  const ids = extractVideoIds(html);
  if (ids.length === 0) {
    const title = extractPageTitle(html);
    throw new Error(
      `No videos found in playlist${title ? ` "${title}"` : ""}`,
    );
  }
  return ids;
}

export const importYouTubeSources = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        videoIds: z.array(z.string().regex(/^[A-Za-z0-9_-]{11}$/)).max(500),
        channelUrls: z.array(z.string().url()).max(50),
        playlistUrls: z.array(z.string().url()).max(50),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const errors: string[] = [];
    const gathered = new Set<string>();
    // Preserve input order: direct video IDs first, then channels, then playlists.
    const orderedIds: string[] = [];
    const push = (id: string) => {
      if (!gathered.has(id)) {
        gathered.add(id);
        orderedIds.push(id);
      }
    };
    for (const id of data.videoIds) push(id);

    // Expand channels + playlists sequentially so error messages line up with
    // the offending URL; each call is a single fetch, so latency is bounded.
    for (const url of data.channelUrls) {
      try {
        const ids = await expandChannelUrl(url);
        for (const id of ids) push(id);
      } catch (e) {
        errors.push(`${url}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    for (const url of data.playlistUrls) {
      try {
        const ids = await expandPlaylistUrl(url);
        for (const id of ids) push(id);
      } catch (e) {
        errors.push(`${url}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    if (orderedIds.length === 0) {
      return { queued: 0, skipped: 0, errors };
    }

    // De-dupe against existing YouTube sources.
    const { data: existing, error: exErr } = await supabaseAdmin
      .from("will_ai_sources")
      .select("external_id")
      .eq("source_type", "youtube")
      .in("external_id", orderedIds);
    if (exErr) throw new Error(`Dedup lookup failed: ${exErr.message}`);
    const already = new Set(
      (existing ?? []).map((r: any) => r.external_id).filter(Boolean),
    );

    const fresh = orderedIds.filter((id) => !already.has(id));
    const skipped = orderedIds.length - fresh.length;
    if (fresh.length === 0) {
      return { queued: 0, skipped, errors };
    }

    // Bulk insert pending rows. Title is a placeholder — the ingestion
    // worker overwrites it with the real title once the transcript API
    // returns it. Using the video ID keeps the row identifiable in the
    // admin list before processing lands.
    const rowsToInsert = fresh.map((id) => ({
      source_type: "youtube" as const,
      title: `YouTube ${id}`,
      external_id: id,
      external_url: `https://youtu.be/${id}`,
      status: "pending" as const,
    }));
    const { data: inserted, error: insErr } = await supabaseAdmin
      .from("will_ai_sources")
      .insert(rowsToInsert)
      .select("id, external_id");
    if (insErr) throw new Error(`Insert failed: ${insErr.message}`);

    // Enqueue one message per new source, same queue as PDFs — the wake
    // trigger on will_ai_ingestion arms the cron dispatcher if needed.
    let queued = 0;
    for (const row of inserted ?? []) {
      const { error: qErr } = await supabaseAdmin.rpc("enqueue_email", {
        queue_name: QUEUE,
        payload: { source_id: (row as any).id } as any,
      });
      if (qErr) {
        errors.push(
          `Enqueue failed for ${(row as any).external_id}: ${qErr.message}`,
        );
      } else {
        queued++;
      }
    }

    return { queued, skipped, errors };
  });

export const getYouTubeQuota = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    // Admin RLS policy allows SELECT; use the caller's authenticated client.
    const { data, error } = await context.supabase
      .from("will_ai_youtube_quota")
      .select("cycle_start, used, monthly_limit, updated_at")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return { cycle_start: null, used: 0, monthly_limit: 1000, updated_at: null };
    return data as {
      cycle_start: string;
      used: number;
      monthly_limit: number;
      updated_at: string;
    };
  });
