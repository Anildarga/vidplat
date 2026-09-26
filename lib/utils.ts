/**
 * Format duration in seconds to MM:SS string
 */
export function formatDuration(seconds: number): string {
  if (!seconds) return '';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Extract a YouTube video ID from common URL formats.
 */
export function getYouTubeVideoId(url: string): string | null {
  const value = url.trim();
  if (!value) return null;

  try {
    const parsed = new URL(value.includes('://') ? value : 'https://' + value);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '').replace(/^m\./, '');

    if (host === 'youtu.be') {
      const id = parsed.pathname.split('/').filter(Boolean)[0];
      return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }

    if (host === 'youtube.com') {
      const watchId = parsed.searchParams.get('v');
      if (watchId && /^[a-zA-Z0-9_-]{11}$/.test(watchId)) return watchId;

      const segments = parsed.pathname.split('/').filter(Boolean);
      const candidate = segments[1];
      if (['embed', 'shorts', 'live', 'v'].includes(segments[0]) && candidate && /^[a-zA-Z0-9_-]{11}$/.test(candidate)) {
        return candidate;
      }
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Convert a YouTube URL into an embeddable URL.
 */
export function getYouTubeEmbedUrl(url: string): string | null {
  const id = getYouTubeVideoId(url);
  return id ? 'https://www.youtube.com/embed/' + id + '?enablejsapi=1&rel=0' : null;
}

/**
 * Check if a string is a valid URL
 */
export function isValidVideoUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
