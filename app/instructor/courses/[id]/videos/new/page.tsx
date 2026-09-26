'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { isValidVideoUrl } from '@/lib/utils';
import { getYouTubeEmbedUrl, isYouTubeUrl } from '@/lib/video-utils';
import { uploadToCloudinaryBrowser } from '@/lib/cloudinary-browser';
import DragDropUpload from '@/components/upload/DragDropUpload';

export default function NewVideoPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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

  // Video file selection handler
  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setVideoFile(file);

    if (file) {
      setUrl('');
      setDuration('');
    }
  };

  // URL input handler for video
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const urlValue = e.target.value;
    setUrl(urlValue);

    if (urlValue) {
      setVideoFile(null);
    }
  };

  // Automatically detect duration for direct video URLs when the source exposes metadata.
  useEffect(() => {
    if (!url || isYouTubeUrl(url) || videoFile || duration) return;

    const probe = document.createElement('video');
    probe.preload = 'metadata';
    probe.onloadedmetadata = () => {
      if (Number.isFinite(probe.duration) && probe.duration > 0) {
        setDuration(String(Math.round(probe.duration)));
      }
      probe.removeAttribute('src');
      probe.load();
    };
    probe.onerror = () => {
      probe.removeAttribute('src');
      probe.load();
    };
    probe.src = url;

    return () => {
      probe.removeAttribute('src');
      probe.load();
    };
  }, [url, videoFile, duration]);

  // Thumbnail file selection handler
  const handleThumbnailFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setThumbnailFile(file);

    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setThumbnailUrl('');
    } else {
      setPreviewUrl(null);
    }
  };

  // Thumbnail URL input handler
  const handleThumbnailUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const urlValue = e.target.value;
    setThumbnailUrl(urlValue);
    if (urlValue) {
      setPreviewUrl(urlValue);
      setThumbnailFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } else {
      setPreviewUrl(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    let videoUrl: string;
    let thumbnailValue: string | null = null;
    let videoDuration: number | null = duration ? parseInt(duration, 10) : null;

    if (videoFile) {
      // Upload video file first
      setVideoUploadProgress(true);
      try {
        const uploadData = await uploadToCloudinaryBrowser(videoFile, 'video');
        videoUrl = uploadData.url;

        if (uploadData.duration && uploadData.duration > 0) {
          videoDuration = Math.round(uploadData.duration);
          setDuration(String(videoDuration));
        }

        if (uploadData.public_id) {
          thumbnailValue = uploadData.url.replace('/video/upload/', '/video/upload/so_1,e_thumb/');
        }
      } catch (err: any) {
        setError('Video upload failed: ' + err.message);
        setVideoUploadProgress(false);
        return;
      }
    } else if (url.trim()) {
      videoUrl = url.trim();
      // Validate URL if it's not an uploaded file (upload returns valid URL)
      if (!isValidVideoUrl(videoUrl)) {
        setError('Invalid video URL');
        setVideoUploadProgress(false);
        return;
      }
    } else {
      setError('Video URL or file is required');
      setVideoUploadProgress(false);
      return;
    }

    // Upload thumbnail if file is selected (only if not already set by Cloudinary)
    if (!thumbnailValue && thumbnailFile) {
      const formData = new FormData();
      const uploadData = await uploadToCloudinaryBrowser(thumbnailFile, 'image');
      thumbnailValue = uploadData.url;
    } else if (!thumbnailValue && thumbnailUrl.trim()) {
      thumbnailValue = thumbnailUrl.trim();
    }

    setVideoUploadProgress(false);
    setIsSubmitting(true);

    try {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const res = await fetch(`${baseUrl}/api/courses/${courseId}/videos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          url: videoUrl,
          thumbnail: thumbnailValue,
          duration: videoDuration,
          unlockType,
          unlockDays: unlockType === 'DAYS_AFTER_ENROLLMENT' && unlockDays ? parseInt(unlockDays, 10) : null,
          unlockDate: unlockType === 'SPECIFIC_DATE' && unlockDate ? unlockDate : null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create video');
      }

      // Redirect to videos list
      router.push(`/instructor/courses/${courseId}/videos`);
    } catch (err: any) {
      setError(err.message);
      setIsSubmitting(false);
    }
  };

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!session || (session.user?.role !== 'INSTRUCTOR' && session.user?.role !== 'ADMIN')) {
    return null;
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
          Add New Video
        </h1>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
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

            {/* Drag & Drop Upload Component */}
            {!url && (
              <div className="mb-6">
                <DragDropUpload
                  onFileSelect={(file) => {
                    setVideoFile(file);
                    setUrl('');
                    setDuration('');
                  }}
                  acceptedTypes="video/mp4,video/webm,video/ogg,video/quicktime,video/x-msvideo,video/mpeg"
                  maxSize={500}
                  label="Upload Video File"
                  description="Drag & drop a video file here, or click to browse"
                  preview={true}
                />
              </div>
            )}

            {/* OR separator */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white dark:bg-gray-800 text-gray-500 font-medium">OR</span>
              </div>
            </div>

            {/* Manual URL input */}
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Paste a YouTube, Vimeo, or direct video URL
              </p>
              <input
                type="url"
                id="url"
                value={url}
                onChange={handleUrlChange}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://www.youtube.com/watch?v=... or https://example.com/video.mp4"
              />
              {isYouTubeUrl(url) && getYouTubeEmbedUrl(url) && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Preview:</p>
                  <div className="aspect-video w-full max-w-2xl rounded-lg overflow-hidden bg-black shadow-lg">
                    <iframe
                      src={getYouTubeEmbedUrl(url)!}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title="YouTube preview"
                    />
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
                ref={fileInputRef}
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
            {previewUrl && (
              <div className="mt-3">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Preview:</p>
                <img
                  src={previewUrl}
                  alt="Thumbnail preview"
                  className="w-48 h-32 object-cover rounded border border-gray-300 dark:border-gray-600"
                />
              </div>
            )}
          </div>

          {/* Duration is detected automatically for uploaded video files. */}
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Video Duration</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {duration ? 'Detected duration: ' + duration + ' seconds' : 'Duration will be detected automatically after upload.'}
            </p>
          </div>

          {/* Content Scheduling */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Content Scheduling</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Control when this video becomes available to students.
            </p>

            <div className="space-y-4">
              {/* Unlock Type */}
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
              </div>

              {/* Days after enrollment */}
              {unlockType === 'DAYS_AFTER_ENROLLMENT' && (
                <div>
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
                <div>
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
              disabled={isSubmitting || videoUploadProgress}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Adding...' : videoUploadProgress ? 'Uploading Video...' : 'Add Video'}
            </button>
            <Link
              href={`/instructor/courses/${courseId}/videos`}
              className="px-6 py-3 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white rounded hover:bg-gray-400 dark:hover:bg-gray-500 text-center"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
