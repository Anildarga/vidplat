/**
 * Extract YouTube video ID from various URL formats
 */
export function getYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

/**
 * Get YouTube embed URL from regular YouTube URL
 */
export function getYouTubeEmbedUrl(url: string): string | null {
  const videoId = getYouTubeVideoId(url);
  if (!videoId) {
    return null;
  }
  return `https://www.youtube.com/embed/${videoId}?enablejsapi=1&rel=0`;
}

/**
 * Check if a URL is a YouTube URL
 */
export function isYouTubeUrl(url: string): boolean {
  return (
    url.includes('youtube.com') ||
    url.includes('youtu.be') ||
    /^([a-zA-Z0-9_-]{11})$/.test(url)
  );
}

/**
 * Check if a URL is a Cloudinary video URL
 */
export function isCloudinaryUrl(url: string): boolean {
  return url.includes('cloudinary.com') && (url.includes('/video/') || url.includes('/upload/'));
}

/**
 * Get Cloudinary video optimization URL
 */
export function getOptimizedCloudinaryUrl(url: string, options?: {
  width?: number;
  height?: number;
  quality?: string;
  format?: string;
}): string {
  if (!isCloudinaryUrl(url)) return url;
  
  const { width, height, quality = 'auto', format = 'mp4' } = options || {};
  
  // Parse the Cloudinary URL to insert transformations
  const urlObj = new URL(url);
  const pathParts = urlObj.pathname.split('/');
  
  // Find the upload index
  const uploadIndex = pathParts.findIndex(part => part === 'upload');
  if (uploadIndex === -1) return url;
  
  // Build transformation parameters
  const transformations: string[] = [];
  
  if (width || height) {
    const size = [];
    if (width) size.push(`w_${width}`);
    if (height) size.push(`h_${height}`);
    size.push('c_fill');
    transformations.push(size.join(','));
  }
  
  if (quality) {
    transformations.push(`q_${quality}`);
  }
  
  if (format) {
    transformations.push(`f_${format}`);
  }
  
  // Insert transformations after 'upload'
  if (transformations.length > 0) {
    pathParts.splice(uploadIndex + 1, 0, transformations.join(','));
  }
  
  urlObj.pathname = pathParts.join('/');
  return urlObj.toString();
}

/**
 * Get video thumbnail from Cloudinary URL
 */
export function getCloudinaryThumbnailUrl(videoUrl: string, options?: {
  width?: number;
  height?: number;
  timestamp?: number;
}): string | null {
  if (!isCloudinaryUrl(videoUrl)) return null;
  
  const { width = 640, height = 360, timestamp = 1 } = options || {};
  
  // Replace video with image transformation
  const url = videoUrl.replace('/video/upload/', '/video/upload/');
  
  // Add thumbnail transformation
  const urlObj = new URL(url);
  const pathname = urlObj.pathname;
  
  // Insert thumbnail transformation
  const parts = pathname.split('/');
  const uploadIndex = parts.findIndex(part => part === 'upload');
  
  if (uploadIndex !== -1) {
    const transformations = [`w_${width}`, `h_${height}`, 'c_fill', `so_${timestamp}`, 'e_thumb'];
    parts.splice(uploadIndex + 1, 0, transformations.join(','));
    
    // Change to jpg format
    const newPathname = parts.join('/').replace(/\.(mp4|webm|ogg|mov|avi)$/, '.jpg');
    urlObj.pathname = newPathname;
    return urlObj.toString();
  }
  
  return null;
}

/**
 * Check if a URL is a direct video file (MP4, WebM, etc.)
 */
export function isDirectVideoUrl(url: string): boolean {
  if (!url) return false;
  
  // Check for Cloudinary URLs
  if (isCloudinaryUrl(url)) return true;
  
  // Check for direct video file extensions
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.m3u8', '.mpeg', '.mpg'];
  const urlLower = url.toLowerCase();
  
  return videoExtensions.some(ext => urlLower.endsWith(ext)) ||
         urlLower.includes('video/') ||
         urlLower.includes('.m3u8');
}

/**
 * Get appropriate video source type for HTML5 video element
 */
export function getVideoSourceType(url: string): string {
  if (!url) return 'video/mp4';
  
  const urlLower = url.toLowerCase();
  
  if (urlLower.endsWith('.webm')) return 'video/webm';
  if (urlLower.endsWith('.ogg') || urlLower.endsWith('.ogv')) return 'video/ogg';
  if (urlLower.endsWith('.mov')) return 'video/quicktime';
  if (urlLower.endsWith('.avi')) return 'video/x-msvideo';
  if (urlLower.endsWith('.m3u8')) return 'application/x-mpegURL';
  
  // Default to mp4
  return 'video/mp4';
}
