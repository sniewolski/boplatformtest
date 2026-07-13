// Throwaway POC — youtube-transcript.io API from Supabase Edge Function (Deno).
// POST /api/transcripts with Authorization: Basic <token>, body {ids:[videoId]}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  const url = new URL(req.url);
  const videoId = url.searchParams.get("v") ?? "lf5JpYadExM";
  const token = Deno.env.get("YOUTUBE_TRANSCRIPT_IO_API_KEY");
  if (!token) {
    return new Response(JSON.stringify({ ok: false, error: "missing key" }), {
      headers: { "Content-Type": "application/json", ...CORS },
      status: 500,
    });
  }

  const t0 = Date.now();
  const res = await fetch("https://www.youtube-transcript.io/api/transcripts", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ids: [videoId] }),
  });
  const elapsedMs = Date.now() - t0;
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch { /* keep raw */ }

  if (!res.ok) {
    return new Response(JSON.stringify({
      ok: false,
      status: res.status,
      elapsedMs,
      retryAfter: res.headers.get("retry-after"),
      body: json ?? text.slice(0, 800),
    }, null, 2), { headers: { "Content-Type": "application/json", ...CORS } });
  }

  // Shape unknown from docs — return the raw payload plus a best-effort summary.
  const entry = Array.isArray(json) ? json[0] : json;
  const tracks = entry?.tracks ?? entry?.transcripts ?? [];
  const track = Array.isArray(tracks) ? tracks[0] : tracks;
  const segments = track?.transcript ?? track?.segments ?? track?.cues ?? [];

  return new Response(JSON.stringify({
    ok: true,
    runtime: `Deno ${Deno.version.deno}`,
    elapsedMs,
    videoId,
    summary: {
      title: entry?.title ?? entry?.videoTitle ?? entry?.microformat?.playerMicroformatRenderer?.title?.simpleText,
      author: entry?.author ?? entry?.channel ?? entry?.microformat?.playerMicroformatRenderer?.ownerChannelName,
      lengthSeconds: entry?.lengthSeconds ?? entry?.duration ?? entry?.microformat?.playerMicroformatRenderer?.lengthSeconds,
      trackLang: track?.language ?? track?.languageCode,
      totalSegments: Array.isArray(segments) ? segments.length : null,
      first20: Array.isArray(segments) ? segments.slice(0, 20) : null,
    },
    rawKeys: entry && typeof entry === "object" ? Object.keys(entry) : null,
    trackKeys: track && typeof track === "object" ? Object.keys(track) : null,
    firstSegmentKeys: Array.isArray(segments) && segments[0] && typeof segments[0] === "object" ? Object.keys(segments[0]) : null,
  }, null, 2), { headers: { "Content-Type": "application/json", ...CORS } });
});
