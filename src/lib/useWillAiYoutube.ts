/**
 * Client parsing + hooks for the YouTube import panel.
 *
 * Parsing is intentionally client-side so the admin gets instant feedback on
 * malformed lines before the server call. Recognised shapes:
 *   - Full watch URLs: youtube.com/watch?v=<id>[&…]
 *   - Short URLs: youtu.be/<id>[?…]
 *   - Shorts: youtube.com/shorts/<id>[?…]
 *   - Embed URLs: youtube.com/embed/<id>[?…]
 *   - Channels: youtube.com/@handle, /channel/UC…, /c/name, /user/name
 *   - Playlists: youtube.com/playlist?list=<id>
 *
 * A watch URL that ALSO carries a `list=` query param is treated as a
 * single video (spec says "queue every video in a playlist URL", meaning
 * the /playlist?list= form — a /watch?…&list= reflects an in-progress
 * playback session, not a bulk-import intent).
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getYouTubeQuota,
  importYouTubeSources,
} from "@/lib/willAiYoutube.functions";

const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;

export type ParsedYouTubeInput = {
  videoIds: string[];
  channelUrls: string[];
  playlistUrls: string[];
  invalid: string[];
};

function extractVideoIdFromUrl(u: URL): string | null {
  const host = u.hostname.replace(/^www\./, "").toLowerCase();
  if (host === "youtu.be") {
    const id = u.pathname.slice(1).split("/")[0];
    return VIDEO_ID_RE.test(id) ? id : null;
  }
  if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
    if (u.pathname === "/watch") {
      const v = u.searchParams.get("v");
      return v && VIDEO_ID_RE.test(v) ? v : null;
    }
    const shortsMatch = u.pathname.match(/^\/shorts\/([A-Za-z0-9_-]{11})/);
    if (shortsMatch) return shortsMatch[1];
    const embedMatch = u.pathname.match(/^\/embed\/([A-Za-z0-9_-]{11})/);
    if (embedMatch) return embedMatch[1];
  }
  return null;
}

function isYouTubeHost(u: URL): boolean {
  const host = u.hostname.replace(/^www\./, "").toLowerCase();
  return (
    host === "youtube.com" ||
    host === "m.youtube.com" ||
    host === "music.youtube.com" ||
    host === "youtu.be"
  );
}

function isChannelPath(pathname: string): boolean {
  return (
    /^\/@[^/]+/.test(pathname) ||
    /^\/channel\/UC[A-Za-z0-9_-]{10,}/.test(pathname) ||
    /^\/c\/[^/]+/.test(pathname) ||
    /^\/user\/[^/]+/.test(pathname)
  );
}

export function parseYouTubeInput(raw: string): ParsedYouTubeInput {
  const out: ParsedYouTubeInput = {
    videoIds: [],
    channelUrls: [],
    playlistUrls: [],
    invalid: [],
  };
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const seenVideo = new Set<string>();
  const seenChannel = new Set<string>();
  const seenPlaylist = new Set<string>();

  for (const line of lines) {
    let u: URL;
    try {
      // Accept both bare `youtube.com/…` and full https URLs.
      u = new URL(/^https?:\/\//i.test(line) ? line : `https://${line}`);
    } catch {
      out.invalid.push(line);
      continue;
    }
    if (!isYouTubeHost(u)) {
      out.invalid.push(line);
      continue;
    }

    // Playlist page.
    if (u.pathname === "/playlist" && u.searchParams.get("list")) {
      const key = `list:${u.searchParams.get("list")}`;
      if (!seenPlaylist.has(key)) {
        seenPlaylist.add(key);
        // Normalise: strip other params.
        const list = u.searchParams.get("list")!;
        out.playlistUrls.push(`https://www.youtube.com/playlist?list=${encodeURIComponent(list)}`);
      }
      continue;
    }

    // Single video.
    const videoId = extractVideoIdFromUrl(u);
    if (videoId) {
      if (!seenVideo.has(videoId)) {
        seenVideo.add(videoId);
        out.videoIds.push(videoId);
      }
      continue;
    }

    // Channel.
    if (isChannelPath(u.pathname)) {
      const key = `chan:${u.hostname}${u.pathname}`;
      if (!seenChannel.has(key)) {
        seenChannel.add(key);
        out.channelUrls.push(`https://www.youtube.com${u.pathname}`);
      }
      continue;
    }

    out.invalid.push(line);
  }
  return out;
}

export function useYouTubeQuota() {
  const get = useServerFn(getYouTubeQuota);
  return useQuery({
    queryKey: ["will-ai-youtube-quota"],
    queryFn: async () => await get(),
    refetchInterval: 15000,
  });
}

export function useImportYouTubeSources() {
  const qc = useQueryClient();
  const importFn = useServerFn(importYouTubeSources);
  return useMutation({
    mutationFn: async (parsed: ParsedYouTubeInput) => {
      return await importFn({
        data: {
          videoIds: parsed.videoIds,
          channelUrls: parsed.channelUrls,
          playlistUrls: parsed.playlistUrls,
        },
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["will-ai-sources"] });
      void qc.invalidateQueries({ queryKey: ["will-ai-chunk-counts"] });
      void qc.invalidateQueries({ queryKey: ["will-ai-youtube-quota"] });
    },
  });
}
