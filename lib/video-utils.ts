/**
 * Extract a YouTube video ID from common URL formats.
 */
export function getYouTubeVideoId(rawUrl: string): string | null {
  const value = rawUrl.trim();
  if (!value) return null;

  if (/^[a-zA-Z0-9_-]{11}$/.test(value)) {
    return value;
  }

  try {
    const url = new URL(value.includes('://') ? value : 'https://' + value);
    const host = url.hostname.toLowerCase().replace(/^www\./, '').replace(/^m\./, '');

    if (host === 'youtu.be') {
      const id = url.pathname.split('/').filter(Boolean)[0];
      return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }

    if (host === 'youtube.com') {
      const watchId = url.searchParams.get('v');
      if (watchId && /^[a-zA-Z0-9_-]{11}$/.test(watchId)) return watchId;

      const segments = url.pathname.split('/').filter(Boolean);
      const kind = segments[0];
      const candidate = segments[1];
      if (['embed', 'shorts', 'live', 'v'].includes(kind) && candidate && /^[a-zA-Z0-9_-]{11}$/.test(candidate)) {
        return candidate;
      }
    }
  } catch {
    return null;
  }

  return null;
}

export function getYouTubeEmbedUrl(url: string): string | null {
  const videoId = getYouTubeVideoId(url);
  return videoId
    ? 'https://www.youtube.com/embed/' + videoId + '?enablejsapi=1&rel=0'
    : null;
}

export function isYouTubeUrl(url: string): boolean {
  return getYouTubeVideoId(url) !== null;
}

/**
 * Return a browser-friendly video URL while preserving the original source.
 */
export function getPlayableVideoUrl(url: string): string {
  return getYouTubeEmbedUrl(url) ?? url;
}

export function isCloudinaryUrl(url: string): boolean {
  return url.includes('cloudinary.com') && (url.includes('/video/') || url.includes('/upload/'));
}

export function getOptimizedCloudinaryUrl(url: string, options?: {
  width?: number;
  height?: number;
  quality?: string;
  format?: string;
}): string {
  if (!isCloudinaryUrl(url)) return url;

  const { width, height, quality = 'auto', format = 'mp4' } = options || {};
  const urlObj = new URL(url);
  const pathParts = urlObj.pathname.split('/');
  const uploadIndex = pathParts.findIndex(part => part === 'upload');
  if (uploadIndex === -1) return url;

  const transformations: string[] = [];
  if (width || height) {
    const size: string[] = [];
    if (width) size.push('w_' + width);
    if (height) size.push('h_' + height);
    size.push('c_fill');
    transformations.push(size.join(','));
  }
  if (quality) transformations.push('q_' + quality);
  if (format) transformations.push('f_' + format);

  if (transformations.length > 0) {
    pathParts.splice(uploadIndex + 1, 0, transformations.join(','));
  }

  urlObj.pathname = pathParts.join('/');
  return urlObj.toString();
}

export function getCloudinaryThumbnailUrl(videoUrl: string, options?: {
  width?: number;
  height?: number;
  timestamp?: number;
}): string | null {
  if (!isCloudinaryUrl(videoUrl)) return null;

  const { width = 640, height = 360, timestamp = 1 } = options || {};
  try {
    const urlObj = new URL(videoUrl);
    const parts = urlObj.pathname.split('/');
    const uploadIndex = parts.findIndex(part => part === 'upload');

    if (uploadIndex === -1) return null;

    const transformations = [
      'w_' + width,
      'h_' + height,
      'c_fill',
      'so_' + timestamp,
      'e_thumb',
    ];
    parts.splice(uploadIndex + 1, 0, transformations.join(','));
    parts[parts.length - 1] = parts[parts.length - 1].replace(
      /\.(mp4|webm|ogg|mov|avi|mpeg|mpg)$/i,
      '.jpg'
    );
    urlObj.pathname = parts.join('/');
    return urlObj.toString();
  } catch {
    return null;
  }
}

export function isDirectVideoUrl(url: string): boolean {
  if (!url) return false;
  if (isCloudinaryUrl(url)) return true;

  const lower = url.toLowerCase();
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.ogv', '.mov', '.avi', '.m3u8', '.mpeg', '.mpg'];
  return videoExtensions.some(ext => lower.includes(ext)) || lower.includes('video/');
}

export function getVideoSourceType(url: string): string {
  const lower = url.toLowerCase();
  if (lower.endsWith('.webm')) return 'video/webm';
  if (lower.endsWith('.ogg') || lower.endsWith('.ogv')) return 'video/ogg';
  if (lower.endsWith('.mov')) return 'video/quicktime';
  if (lower.endsWith('.avi')) return 'video/x-msvideo';
  if (lower.endsWith('.m3u8')) return 'application/x-mpegURL';
  return 'video/mp4';
}
