// Throwaway POC — fetch YouTube captions from Supabase Edge Function (Deno) runtime.
// Runs the same mechanism the real pipeline would use, from the actual runtime it would live in.
// Reports title, duration, first 20 caption segments, or a structured failure signature.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

async function tryLibrary(videoId: string) {
  try {
    // Dynamic import so a resolution failure doesn't kill the whole function.
    const mod: any = await import("npm:youtube-transcript-api-js@3.0.3");
    const api = new mod.YouTubeTranscriptApi();
    const list = await api.list(videoId);
    const langs: any[] = [];
    for (const t of list) langs.push({ languageCode: t.languageCode, isGenerated: t.isGenerated });
    const t = await list.findTranscript(["en"]);
    const fetched = await t.fetch();
    const snippets = fetched.snippets || fetched;
    return {
      ok: true,
      method: "library",
      languages: langs,
      segments: snippets.slice(0, 20).map((s: any) => ({
        start: s.start,
        duration: s.duration,
        text: s.text,
      })),
      totalSegments: snippets.length,
    };
  } catch (e) {
    return {
      ok: false,
      method: "library",
      errorName: (e as any)?.constructor?.name,
      errorMessage: (e as Error)?.message?.slice(0, 800),
    };
  }
}

async function tryRaw(videoId: string) {
  // Same mechanism the POC used on Node: scrape ytInitialPlayerResponse, fetch caption baseUrl.
  const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9" },
  });
  const html = await pageRes.text();
  const consent = html.includes("consent.youtube.com") || html.includes("Before you continue");
  const m = html.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\})\s*;/s);
  if (!m) {
    return {
      ok: false,
      method: "raw",
      stage: "scrape-player-response",
      pageStatus: pageRes.status,
      consentInterstitial: consent,
      htmlLen: html.length,
      htmlHead: html.slice(0, 400),
    };
  }
  let pr: any;
  try {
    pr = JSON.parse(m[1]);
  } catch (e) {
    return {
      ok: false,
      method: "raw",
      stage: "parse-player-response",
      error: (e as Error).message,
    };
  }
  const details = pr.videoDetails;
  const tracks = pr.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
  if (tracks.length === 0) {
    return {
      ok: false,
      method: "raw",
      stage: "no-caption-tracks",
      playability: pr.playabilityStatus,
      captionsKeyPresent: !!pr.captions,
      title: details?.title,
      lengthSeconds: details?.lengthSeconds,
    };
  }
  const track = tracks.find((t: any) => t.languageCode === "en") ?? tracks[0];
  const capRes = await fetch(track.baseUrl + "&fmt=json3", {
    headers: { "User-Agent": UA },
  });
  const capText = await capRes.text();
  if (!capText.length) {
    return {
      ok: false,
      method: "raw",
      stage: "empty-caption-body",
      captionStatus: capRes.status,
      captionHeaders: Object.fromEntries(capRes.headers.entries()),
      title: details?.title,
      lengthSeconds: details?.lengthSeconds,
      trackKind: track.kind ?? "manual",
      trackLang: track.languageCode,
    };
  }
  let capJson: any;
  try {
    capJson = JSON.parse(capText);
  } catch (e) {
    return {
      ok: false,
      method: "raw",
      stage: "parse-caption-json",
      error: (e as Error).message,
      head: capText.slice(0, 300),
    };
  }
  const events = (capJson.events ?? []).filter((e: any) => e.segs);
  return {
    ok: true,
    method: "raw",
    title: details?.title,
    author: details?.author,
    lengthSeconds: details?.lengthSeconds,
    trackKind: track.kind ?? "manual",
    trackLang: track.languageCode,
    totalSegments: events.length,
    segments: events.slice(0, 20).map((e: any) => ({
      start: (e.tStartMs / 1000),
      text: e.segs.map((s: any) => s.utf8).join("").replace(/\n/g, " ").trim(),
    })),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  const url = new URL(req.url);
  const videoId = url.searchParams.get("v") ?? "lf5JpYadExM";

  const raw = await tryRaw(videoId).catch((e) => ({
    ok: false,
    method: "raw",
    stage: "threw",
    error: (e as Error).message,
  }));
  const library = await tryLibrary(videoId);

  return new Response(
    JSON.stringify({ runtime: `Deno ${Deno.version.deno}`, videoId, raw, library }, null, 2),
    { headers: { "Content-Type": "application/json", ...CORS } },
  );
});
