'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { getThumbnailUrl } from '@/lib/image-upload';

export default function NewCoursePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string>('');
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

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setThumbnailFile(file);

    if (file) {
      // Create preview URL
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setThumbnailUrl(''); // Clear any manual URL
    } else {
      setPreviewUrl(null);
    }
  };

  // Handle manual URL input (optional alternative)
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setThumbnailUrl(url);
    if (url) {
      setPreviewUrl(url);
      setThumbnailFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } else {
      setPreviewUrl(null);
    }
  };

  const handleSubmit = async (isPublished: boolean) => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      let thumbnailValue: string | null = null;

      // If there's a file, upload it first
      if (thumbnailFile) {
        const formData = new FormData();
        formData.append('file', thumbnailFile);
        formData.append('type', 'cloudinary');

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
      }

      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const res = await fetch(`${baseUrl}/api/courses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          thumbnail: thumbnailValue,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create course');
      }

      // Redirect to edit page for the new course
      router.push(`/instructor/courses/${data.data.id}/edit`);
    } catch (err: any) {
      setError(err.message);
    } finally {
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
        <Link
          href="/instructor/courses"
          className="text-blue-600 dark:text-blue-400 hover:underline"
        >
          ← Back to My Courses
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 max-w-3xl">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Create New Course
        </h1>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded">
            {error}
          </div>
        )}

        <div className="space-y-6">
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
              placeholder="Enter course title"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter course description (optional)"
            />
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
                onChange={handleFileChange}
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
                onChange={handleUrlChange}
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
        </div>

        {/* Buttons */}
        <div className="mt-8 flex gap-4">
          <button
            type="button"
            onClick={() => handleSubmit(false)}
            disabled={isSubmitting}
            className="flex-1 px-6 py-3 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Save as Draft'}
          </button>
          <button
            type="button"
            onClick={() => handleSubmit(true)}
            disabled={isSubmitting}
            className="flex-1 px-6 py-3 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Publishing...' : 'Publish Now'}
          </button>
        </div>
      </div>
    </div>
  );
}
