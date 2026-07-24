// Admin-only Tracker: resolve a YouTube video_id to a title + thumbnail via
// YouTube's public oembed endpoint, cache into public.tracked_videos.
// Idempotent: once resolved_at is set, we return the cached row and never
// refetch (including for private/deleted videos, which resolve to nulls).

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const JSON_HEADERS = { "Content-Type": "application/json", ...CORS };

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") {
    return json({ ok: false, error: "Method not allowed" }, 405);
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json({ ok: false, error: "Server not configured" }, 500);
  }

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "Invalid JSON body" }, 400);
  }
  const videoId = typeof body?.video_id === "string" ? body.video_id.trim() : "";
  if (!videoId) {
    return json({ ok: false, error: "Missing video_id" }, 400);
  }

  const restBase = `${SUPABASE_URL}/rest/v1/tracked_videos`;
  const authHeaders = {
    "apikey": SUPABASE_SERVICE_ROLE_KEY,
    "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  };

  // 1) Look up existing row.
  const lookupUrl =
    `${restBase}?video_id=eq.${encodeURIComponent(videoId)}&select=*`;
  const lookupRes = await fetch(lookupUrl, { headers: authHeaders });
  if (!lookupRes.ok) {
    const text = await lookupRes.text();
    return json(
      { ok: false, error: `Lookup failed: ${lookupRes.status} ${text}` },
      500,
    );
  }
  const existing = (await lookupRes.json()) as any[];
  const existingRow = Array.isArray(existing) && existing.length > 0 ? existing[0] : null;
  if (existingRow && existingRow.resolved_at) {
    return json({ ok: true, row: existingRow, cached: true });
  }

  // 2) Fetch oembed metadata. Never let a bad video crash the function.
  let title: string | null = null;
  let thumbnail_url: string | null = null;
  try {
    const oembedUrl =
      `https://www.youtube.com/oembed?url=${encodeURIComponent(
        `https://www.youtube.com/watch?v=${videoId}`,
      )}&format=json`;
    const oembedRes = await fetch(oembedUrl);
    if (oembedRes.ok) {
      const meta = await oembedRes.json();
      title = typeof meta?.title === "string" ? meta.title : null;
      thumbnail_url =
        typeof meta?.thumbnail_url === "string" ? meta.thumbnail_url : null;
    }
  } catch {
    // swallow — we still mark resolved below so we don't retry forever
  }

  // 3) Upsert (video_id PK) with resolved_at = now().
  const upsertRow = {
    video_id: videoId,
    title,
    thumbnail_url,
    resolved_at: new Date().toISOString(),
  };
  const upsertRes = await fetch(restBase, {
    method: "POST",
    headers: {
      ...authHeaders,
      "Content-Type": "application/json",
      "Prefer": "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify(upsertRow),
  });
  if (!upsertRes.ok) {
    const text = await upsertRes.text();
    return json(
      { ok: false, error: `Upsert failed: ${upsertRes.status} ${text}` },
      500,
    );
  }
  const upserted = (await upsertRes.json()) as any[];
  const row = Array.isArray(upserted) && upserted.length > 0 ? upserted[0] : upsertRow;
  return json({ ok: true, row, cached: false });
});
