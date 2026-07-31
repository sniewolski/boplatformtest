// Admin-only Tracker: windowed YouTube view counts via the YouTube Analytics
// API v2. Exchanges a stored OAuth refresh token for an access token, then
// queries reports for views per video across a date window.
// Failures are always surfaced as HTTP 500 with ok:false — never as zeros.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const JSON_HEADERS = { "Content-Type": "application/json", ...CORS };

const BATCH_SIZE = 500;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") {
    return json({ ok: false, error: "Method not allowed" }, 405);
  }

  try {
    const CLIENT_ID = Deno.env.get("YOUTUBE_OAUTH_CLIENT_ID");
    const CLIENT_SECRET = Deno.env.get("YOUTUBE_OAUTH_CLIENT_SECRET");
    const REFRESH_TOKEN = Deno.env.get("YOUTUBE_OAUTH_REFRESH_TOKEN");
    if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
      console.error("[yt-analytics] missing OAuth secrets");
      return json(
        { ok: false, error: "YouTube OAuth secrets are not configured" },
        500,
      );
    }

    let body: any = null;
    try {
      body = await req.json();
    } catch {
      return json({ ok: false, error: "Invalid JSON body" }, 400);
    }

    const videoIds: string[] = Array.isArray(body?.video_ids)
      ? body.video_ids.filter((v: unknown) => typeof v === "string" && v.trim())
      : [];
    const startDate: string | undefined = body?.start_date;
    const endDate: string | undefined = body?.end_date;

    if (videoIds.length === 0) {
      return json({ ok: false, error: "video_ids is required" }, 400);
    }
    if (!startDate || !endDate) {
      return json(
        { ok: false, error: "start_date and end_date are required" },
        400,
      );
    }

    // Step 1 — refresh token -> access token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: REFRESH_TOKEN,
        grant_type: "refresh_token",
      }).toString(),
    });
    console.log("[yt-analytics] token exchange status", tokenRes.status);

    const tokenText = await tokenRes.text();
    if (!tokenRes.ok) {
      console.error("[yt-analytics] token exchange failed body:", tokenText);
      return json(
        {
          ok: false,
          error: `Token exchange failed (${tokenRes.status}): ${tokenText}`,
        },
        500,
      );
    }

    let accessToken: string | undefined;
    try {
      accessToken = JSON.parse(tokenText)?.access_token;
    } catch {
      accessToken = undefined;
    }
    if (!accessToken) {
      console.error("[yt-analytics] no access_token in body:", tokenText);
      return json(
        {
          ok: false,
          error: `Token exchange returned no access_token (${tokenRes.status}): ${tokenText}`,
        },
        500,
      );
    }

    // Step 2 — query Analytics API in batches of 500 ids
    const views: Record<string, number> = {};
    for (const id of videoIds) views[id] = 0;

    let totalRows = 0;
    for (let i = 0; i < videoIds.length; i += BATCH_SIZE) {
      const batch = videoIds.slice(i, i + BATCH_SIZE);
      const url = new URL("https://youtubeanalytics.googleapis.com/v2/reports");
      url.searchParams.set("ids", "channel==MINE");
      url.searchParams.set("startDate", startDate);
      url.searchParams.set("endDate", endDate);
      url.searchParams.set("metrics", "views");
      url.searchParams.set("dimensions", "video");
      url.searchParams.set("filters", `video==${batch.join(",")}`);
      url.searchParams.set("maxResults", "200");

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      console.log(
        "[yt-analytics] analytics request status",
        res.status,
        "batch size",
        batch.length,
      );

      const text = await res.text();
      if (!res.ok) {
        console.error("[yt-analytics] analytics request failed body:", text);
        return json(
          {
            ok: false,
            error: `YouTube Analytics request failed (${res.status}): ${text}`,
          },
          500,
        );
      }

      let payload: any;
      try {
        payload = JSON.parse(text);
      } catch {
        console.error("[yt-analytics] unparseable analytics body:", text);
        return json(
          { ok: false, error: `Unparseable analytics response: ${text}` },
          500,
        );
      }

      const rows: any[] = Array.isArray(payload?.rows) ? payload.rows : [];
      totalRows += rows.length;
      for (const row of rows) {
        const videoId = row?.[0];
        const count = Number(row?.[1]);
        if (typeof videoId === "string" && Number.isFinite(count)) {
          views[videoId] = (views[videoId] ?? 0) + count;
        }
      }
    }

    console.log(
      "[yt-analytics] videos requested",
      videoIds.length,
      "rows returned",
      totalRows,
    );

    return json({
      ok: true,
      views,
      start_date: startDate,
      end_date: endDate,
    });
  } catch (err) {
    console.error("[yt-analytics] thrown error:", err);
    return json({ ok: false, error: String(err) }, 500);
  }
});
