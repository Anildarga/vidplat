'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { getYouTubeEmbedUrl, isValidVideoUrl } from '@/lib/utils';

interface VideoData {
  id: string;
  title: string;
  description: string | null;
  url: string;
  thumbnail: string | null;
  duration: number | null;
  order: number;
  unlockType: 'IMMEDIATE' | 'DAYS_AFTER_ENROLLMENT' | 'SPECIFIC_DATE';
  unlockDays: number | null;
  unlockDate: string | null;
}

export default function EditVideoPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;
  const videoId = params.videoId as string;
  const videoFileInputRef = useRef<HTMLInputElement>(null);
  const videoObjectUrlRef = useRef<string | null>(null);
  const thumbnailObjectUrlRef = useRef<string | null>(null);

  const [video, setVideo] = useState<VideoData | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUploadProgress, setVideoUploadProgress] = useState(false);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string>('');
  const [duration, setDuration] = useState('');
  const [unlockType, setUnlockType] = useState<'IMMEDIATE' | 'DAYS_AFTER_ENROLLMENT' | 'SPECIFIC_DATE'>('IMMEDIATE');
  const [unlockDays, setUnlockDays] = useState<string>('');
  const [unlockDate, setUnlockDate] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState<string | null>(null);

  // Redirect if not authenticated or not instructor/admin
  useEffect(() => {
    if (status !== 'loading') {
      const isAuthenticated = status === 'authenticated';
      const hasRole = session?.user?.role === 'INSTRUCTOR' || session?.user?.role === 'ADMIN';

      if (!isAuthenticated) {
        router.push('/login');
      } else if (!hasRole) {
        router.push('/');
      }
    }
  }, [status, session, router]);

  // Fetch video data
  useEffect(() => {
    if (!videoId) return;

    const fetchVideo = async () => {
      try {
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
        const res = await fetch(`${baseUrl}/api/courses/${courseId}/videos/${videoId}`, {
          cache: 'no-store',
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Failed to fetch video');
        }

        setVideo(data.data);
        setTitle(data.data.title);
        setDescription(data.data.description || '');
        setUrl(data.data.url);
        setThumbnailUrl(data.data.thumbnail || '');
        setDuration(data.data.duration ? String(data.data.duration) : '');
        setUnlockType(data.data.unlockType || 'IMMEDIATE');
        setUnlockDays(data.data.unlockDays ? String(data.data.unlockDays) : '');
        setUnlockDate(data.data.unlockDate ? new Date(data.data.unlockDate).toISOString().slice(0, 16) : '');
        setVideoPreviewUrl(data.data.url);
        setThumbnailPreviewUrl(data.data.thumbnail || null);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVideo();
  }, [videoId, courseId]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (videoObjectUrlRef.current) {
        URL.revokeObjectURL(videoObjectUrlRef.current);
      }
      if (thumbnailObjectUrlRef.current) {
        URL.revokeObjectURL(thumbnailObjectUrlRef.current);
      }
    };
  }, []);

  // Video file selection handler
  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setVideoFile(file);

    if (file) {
      // Clear URL field when file is selected
      setUrl('');
      // Revoke previous object URL if exists
      if (videoObjectUrlRef.current) {
        URL.revokeObjectURL(videoObjectUrlRef.current);
      }
      // Create preview URL for the video file
      const url = URL.createObjectURL(file);
      videoObjectUrlRef.current = url;
      setVideoPreviewUrl(url);
    } else {
      // If no file, revoke any existing object URL
      if (videoObjectUrlRef.current) {
        URL.revokeObjectURL(videoObjectUrlRef.current);
        videoObjectUrlRef.current = null;
      }
      setVideoPreviewUrl(video?.url || null);
    }
  };

  // URL input handler for video
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const urlValue = e.target.value;
    setUrl(urlValue);
    if (urlValue) {
      // Clear file selection when URL is entered
      setVideoFile(null);
      if (videoFileInputRef.current) {
        videoFileInputRef.current.value = '';
      }
      // Revoke any existing video object URL
      if (videoObjectUrlRef.current) {
        URL.revokeObjectURL(videoObjectUrlRef.current);
        videoObjectUrlRef.current = null;
      }
      // Show preview for YouTube links or direct video URLs
      const embedUrl = getYouTubeEmbedUrl(urlValue);
      if (embedUrl) {
        setVideoPreviewUrl(embedUrl);
      } else {
        setVideoPreviewUrl(urlValue);
      }
    } else {
      // If URL is cleared, revoke any object URL and revert to original video URL
      if (videoObjectUrlRef.current) {
        URL.revokeObjectURL(videoObjectUrlRef.current);
        videoObjectUrlRef.current = null;
      }
      setVideoPreviewUrl(video?.url || null);
    }
  };

  // Thumbnail file selection handler
  const handleThumbnailFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setThumbnailFile(file);

    if (file) {
      // Revoke previous object URL if exists
      if (thumbnailObjectUrlRef.current) {
        URL.revokeObjectURL(thumbnailObjectUrlRef.current);
      }
      const url = URL.createObjectURL(file);
      thumbnailObjectUrlRef.current = url;
      setThumbnailPreviewUrl(url);
      setThumbnailUrl('');
    } else {
      // If no file, revoke any existing object URL
      if (thumbnailObjectUrlRef.current) {
        URL.revokeObjectURL(thumbnailObjectUrlRef.current);
        thumbnailObjectUrlRef.current = null;
      }
      setThumbnailPreviewUrl(thumbnailUrl || null);
    }
  };

  // Thumbnail URL input handler
  const handleThumbnailUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const urlValue = e.target.value;
    setThumbnailUrl(urlValue);
    if (urlValue) {
      // Revoke any existing thumbnail object URL
      if (thumbnailObjectUrlRef.current) {
        URL.revokeObjectURL(thumbnailObjectUrlRef.current);
        thumbnailObjectUrlRef.current = null;
      }
      setThumbnailPreviewUrl(urlValue);
      setThumbnailFile(null);
    } else {
      // If URL is cleared, revoke any object URL and revert to original thumbnail
      if (thumbnailObjectUrlRef.current) {
        URL.revokeObjectURL(thumbnailObjectUrlRef.current);
        thumbnailObjectUrlRef.current = null;
      }
      setThumbnailPreviewUrl(thumbnailUrl || video?.thumbnail || null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    let videoUrlValue: string;
    if (videoFile) {
      // Upload video file first
      setVideoUploadProgress(true);
      const formData = new FormData();
      formData.append('file', videoFile);

      try {
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const uploadData = await uploadRes.json();

        if (!uploadRes.ok) {
          throw new Error(uploadData.error || 'Failed to upload video');
        }

        videoUrlValue = uploadData.data.url;
      } catch (err: any) {
        setError('Video upload failed: ' + err.message);
        setVideoUploadProgress(false);
        return;
      }
    } else if (url.trim()) {
      videoUrlValue = url.trim();
      if (!isValidVideoUrl(videoUrlValue)) {
        setError('Invalid video URL');
        setVideoUploadProgress(false);
        return;
      }
    } else {
      setError('Video URL or file is required');
      setVideoUploadProgress(false);
      return;
    }

    // Handle thumbnail
    let thumbnailValue: string | null = null;
    if (thumbnailFile) {
      const formData = new FormData();
      formData.append('file', thumbnailFile);

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const uploadData = await uploadRes.json();

      if (!uploadRes.ok) {
        throw new Error(uploadData.error || 'Failed to upload thumbnail');
      }

      thumbnailValue = uploadData.data.url;
    } else if (thumbnailUrl.trim()) {
      thumbnailValue = thumbnailUrl.trim();
    } else if (video?.thumbnail) {
      // Keep existing thumbnail
      thumbnailValue = video.thumbnail;
    }

    setVideoUploadProgress(false);
    setIsSaving(true);

    try {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const res = await fetch(`${baseUrl}/api/courses/${courseId}/videos/${videoId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          url: videoUrlValue,
          thumbnail: thumbnailValue,
          duration: duration ? parseInt(duration, 10) : null,
          unlockType,
          unlockDays: unlockType === 'DAYS_AFTER_ENROLLMENT' && unlockDays ? parseInt(unlockDays, 10) : null,
          unlockDate: unlockType === 'SPECIFIC_DATE' && unlockDate ? unlockDate : null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save video');
      }

      setSuccess('Video saved successfully!');
      setUrl(videoUrlValue);
      if (thumbnailValue) {
        setThumbnailUrl(thumbnailValue);
        setThumbnailPreviewUrl(thumbnailValue);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this video?')) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const res = await fetch(`${baseUrl}/api/courses/${courseId}/videos/${videoId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete video');
      }

      // Redirect to videos list
      router.push(`/instructor/courses/${courseId}/videos`);
    } catch (err: any) {
      setError(err.message);
      setIsDeleting(false);
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!session || (session.user?.role !== 'INSTRUCTOR' && session.user?.role !== 'ADMIN')) {
    return null;
  }

  if (error && !video) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="p-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded mb-4">
          {error}
        </div>
        <Link href={`/instructor/courses/${courseId}/videos`} className="text-blue-600 dark:text-blue-400 hover:underline">
          ← Back to Videos
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href={`/instructor/courses/${courseId}/videos`} className="text-blue-600 dark:text-blue-400 hover:underline">
          ← Back to Videos
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 max-w-3xl">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Edit Video
        </h1>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded">
            {success}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter video title"
              required
            />
          </div>

          {/* Video URL OR File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Video <span className="text-red-500">*</span>
            </label>

            {/* File upload */}
            <div className="mb-3">
              <input
                ref={videoFileInputRef}
                type="file"
                id="videoFile"
                accept="video/mp4,video/webm,video/ogg,video/quicktime,video/x-msvideo"
                onChange={handleVideoFileChange}
                className="block w-full text-sm text-gray-500 dark:text-gray-400
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-lg file:border-0
                  file:text-sm file:font-medium
                  file:bg-blue-50 file:text-blue-700
                  dark:file:bg-blue-900/30 dark:file:text-blue-400
                  hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50
                "
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Upload a video file (MP4, WebM, OGG, MOV, AVI) • Max 500MB
              </p>
            </div>

            {/* OR separator */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">OR</span>
              </div>
            </div>

            {/* Manual URL input */}
            <div>
              <input
                type="url"
                id="url"
                value={url}
                onChange={handleUrlChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Or paste a video URL (YouTube, Vimeo, direct video link)..."
              />
              {videoPreviewUrl && (
                <div className="mt-3">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Preview:</p>
                  <div className="aspect-video w-full max-w-lg rounded overflow-hidden bg-black">
                    {url && (url.includes('youtube.com') || url.includes('youtu.be')) ? (
                      <iframe
                        src={videoPreviewUrl}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <video src={videoPreviewUrl} controls className="w-full h-full" />
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Thumbnail - Optional (Upload or URL) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Thumbnail Image (optional)
            </label>

            {/* File upload */}
            <div className="mb-3">
              <input
                type="file"
                id="thumbnailFile"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                onChange={handleThumbnailFileChange}
                className="block w-full text-sm text-gray-500 dark:text-gray-400
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-lg file:border-0
                  file:text-sm file:font-medium
                  file:bg-blue-50 file:text-blue-700
                  dark:file:bg-blue-900/30 dark:file:text-blue-400
                  hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50
                "
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Upload an image (JPG, PNG, GIF, WebP) • Max 5MB
              </p>
            </div>

            {/* OR separator */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">OR</span>
              </div>
            </div>

            {/* Manual URL input */}
            <div>
              <input
                type="url"
                id="thumbnailUrl"
                value={thumbnailUrl}
                onChange={handleThumbnailUrlChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Or paste an image URL here..."
              />
            </div>

            {/* Preview */}
            {thumbnailPreviewUrl && (
              <div className="mt-3">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Preview:</p>
                <img
                  src={thumbnailPreviewUrl}
                  alt="Thumbnail preview"
                  className="w-48 h-32 object-cover rounded border border-gray-300 dark:border-gray-600"
                />
              </div>
            )}
          </div>

          {/* Duration */}
          <div>
            <label htmlFor="duration" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Duration (seconds, optional)
            </label>
            <input
              type="number"
              id="duration"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              min="0"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. 300 for a 5 minute video"
            />
          </div>

          {/* Unlock Schedule */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Unlock Schedule
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="unlockType"
                  value="IMMEDIATE"
                  checked={unlockType === 'IMMEDIATE'}
                  onChange={(e) => setUnlockType(e.target.value as any)}
                  className="mr-2"
                />
                <span className="text-gray-700 dark:text-gray-300">Immediately available</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="unlockType"
                  value="DAYS_AFTER_ENROLLMENT"
                  checked={unlockType === 'DAYS_AFTER_ENROLLMENT'}
                  onChange={(e) => setUnlockType(e.target.value as any)}
                  className="mr-2"
                />
                <span className="text-gray-700 dark:text-gray-300">Days after enrollment</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="unlockType"
                  value="SPECIFIC_DATE"
                  checked={unlockType === 'SPECIFIC_DATE'}
                  onChange={(e) => setUnlockType(e.target.value as any)}
                  className="mr-2"
                />
                <span className="text-gray-700 dark:text-gray-300">Specific date</span>
              </label>
            </div>

            {/* Days after enrollment */}
            {unlockType === 'DAYS_AFTER_ENROLLMENT' && (
              <div className="mt-4">
                <label htmlFor="unlockDays" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Days after enrollment
                </label>
                <input
                  type="number"
                  id="unlockDays"
                  value={unlockDays}
                  onChange={(e) => setUnlockDays(e.target.value)}
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 7 for one week"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Video will unlock this many days after the student enrolls.
                </p>
              </div>
            )}

            {/* Specific date */}
            {unlockType === 'SPECIFIC_DATE' && (
              <div className="mt-4">
                <label htmlFor="unlockDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Unlock date
                </label>
                <input
                  type="datetime-local"
                  id="unlockDate"
                  value={unlockDate}
                  onChange={(e) => setUnlockDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Video will unlock at this date and time (UTC).
                </p>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description (optional)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Brief description of the video"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={isSaving || videoUploadProgress}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : videoUploadProgress ? 'Uploading Video...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-6 py-3 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
