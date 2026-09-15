/**
 * Resolves whatever Wistia gives the admin (full embed snippet, script tag,
 * media URL, or a bare hashed id) into the canonical iframe embed URL.
 *
 * A Wistia media ID is a 10-character alphanumeric hashed id.
 */

const MEDIA_ID_RE = /[A-Za-z0-9]{10}/;

function embedUrl(mediaId: string): string {
  return `https://fast.wistia.net/embed/iframe/${mediaId}?videoFoam=true`;
}

export function resolveWistiaEmbed(input: string): string | null {
  const raw = (input ?? "").trim();
  if (!raw) return null;

  // 1. Full embed snippet — media-id="0257h0a74p" wins when present.
  let match = raw.match(/media-id=["']([A-Za-z0-9]{10})["']/);
  if (match) return embedUrl(match[1]);

  // 2. The snippet's script src, e.g. https://fast.wistia.com/assets/.../embed/0257h0a74p.js
  match = raw.match(/\/embed\/([A-Za-z0-9]{10})\.js/);
  if (match) return embedUrl(match[1]);

  // 3. Any fast.wistia.com / fast.wistia.net URL with /medias/<id> or /embed/iframe/<id>
  match = raw.match(
    /fast\.wistia\.(?:com|net)\/(?:medias|embed\/iframe)\/([A-Za-z0-9]{10})/,
  );
  if (match) return embedUrl(match[1]);

  // 4. A bare id on its own, e.g. 0257h0a74p
  if (MEDIA_ID_RE.test(raw)) return embedUrl(raw);

  // Nothing matched — do not guess.
  return null;
}
