'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatDuration } from '@/lib/utils';
import { getYouTubeEmbedUrl, isYouTubeUrl } from '@/lib/video-utils';

interface Video {
  id: string;
  title: string;
  description: string | null;
  url: string;
  thumbnail: string | null;
  duration: number | null;
  order: number;
  courseId: string;
  unlockType: 'IMMEDIATE' | 'DAYS_AFTER_ENROLLMENT' | 'SPECIFIC_DATE';
  unlockDays: number | null;
  unlockDate: string | null;
}

interface Course {
  id: string;
  title: string;
}

export default function VideosPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [playingVideo, setPlayingVideo] = useState<Video | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Helper function to format unlock schedule
  const formatUnlockSchedule = (video: Video): string => {
    switch (video.unlockType) {
      case 'IMMEDIATE':
        return 'Available immediately';
      case 'DAYS_AFTER_ENROLLMENT':
        return `Unlocks ${video.unlockDays} day${video.unlockDays !== 1 ? 's' : ''} after enrollment`;
      case 'SPECIFIC_DATE':
        if (video.unlockDate) {
          const date = new Date(video.unlockDate);
          return `Unlocks on ${date.toLocaleDateString()} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        }
        return 'Unlocks on specific date (date not set)';
      default:
        return 'Available immediately';
    }
  };

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

  // Fetch course and videos
  useEffect(() => {
    if (!courseId) return;

    const fetchData = async () => {
      try {
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
        const res = await fetch(`${baseUrl}/api/courses/${courseId}`, { cache: 'no-store' });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to fetch course');
        }
        const courseData = await res.json();
        setCourse(courseData.data);

        // Fetch videos
        const videosRes = await fetch(`${baseUrl}/api/courses/${courseId}/videos`, { cache: 'no-store' });
        const videosData = await videosRes.json();
        if (!videosRes.ok) {
          throw new Error(videosData.error || 'Failed to fetch videos');
        }
        setVideos(videosData.data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [courseId]);

  const moveVideo = async (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;

    const newVideos = [...videos];
    const [movedVideo] = newVideos.splice(fromIndex, 1);
    newVideos.splice(toIndex, 0, movedVideo);

    // Update local order values based on new positions
    const updatedVideos = newVideos.map((video, index) => ({
      ...video,
      order: index + 1,
    }));

    setVideos(updatedVideos);

    try {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const res = await fetch(`${baseUrl}/api/courses/${courseId}/videos/reorder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videos: updatedVideos.map((v) => ({ id: v.id, order: v.order })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage('Failed to reorder');
        // Revert on error
        setVideos(videos);
      } else {
        setMessage('Videos reordered!');
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (err: any) {
      setMessage('Failed to reorder');
      setVideos(videos); // revert on error
    }
  };

  const handleDelete = async (videoId: string) => {
    if (!confirm('Are you sure you want to delete this video?')) return;

    try {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const res = await fetch(`${baseUrl}/api/courses/${courseId}/videos/${videoId}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete video');
      }

      // Remove from local state
      setVideos(videos.filter((v) => v.id !== videoId));
      setMessage('Video deleted');
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      alert('Failed to delete video: ' + err.message);
    }
  };

  const openVideoModal = (video: Video) => {
    setPlayingVideo(video);
    setShowModal(true);
  };

  const closeVideoModal = () => {
    setShowModal(false);
    setPlayingVideo(null);
  };

  if (status === 'loading' || loading) {
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
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link href="/instructor/courses" className="text-blue-600 dark:text-blue-400 hover:underline">
          My Courses
        </Link>
        <span className="mx-2 text-gray-500">→</span>
        <Link href={`/instructor/courses/${courseId}/edit`} className="text-blue-600 dark:text-blue-400 hover:underline">
          {course?.title || 'Course'}
        </Link>
        <span className="mx-2 text-gray-500">→</span>
        <span className="text-gray-900 dark:text-white font-medium">Videos</span>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Manage Videos</h1>
        <Link
          href={`/instructor/courses/${courseId}/videos/new`}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Add New Video
        </Link>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded">
          {error}
        </div>
      )}

      {message && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded">
          {message}
        </div>
      )}

      {videos.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
          <p className="text-gray-600 dark:text-gray-400 text-lg mb-4">No videos yet. Add your first video.</p>
          <Link
            href={`/instructor/courses/${courseId}/videos/new`}
            className="inline-block px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Add Video
          </Link>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {videos.map((video, index) => (
              <li key={video.id} className="p-4 flex items-center gap-4">
                {/* Order number */}
                <div className="text-lg font-bold text-gray-500 dark:text-gray-400 w-8 h-8 flex items-center justify-center">
                  {video.order}
                </div>

                {/* Thumbnail with play button */}
                <div className="w-32 h-20 bg-gray-200 dark:bg-gray-700 rounded flex-shrink-0 overflow-hidden relative group cursor-pointer" onClick={() => openVideoModal(video)}>
                  {video.thumbnail ? (
                    <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  )}
                  {/* Play button overlay */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center">
                    <svg className="w-10 h-10 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-gray-900 dark:text-white font-medium truncate">{video.title}</h3>
                  {video.duration && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">{formatDuration(video.duration)}</p>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {formatUnlockSchedule(video)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {/* Up/Down buttons */}
                  {index > 0 && (
                    <button
                      onClick={() => moveVideo(index, index - 1)}
                      className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                      title="Move up"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                  )}
                  {index < videos.length - 1 && (
                    <button
                      onClick={() => moveVideo(index, index + 1)}
                      className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                      title="Move down"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  )}

                  {/* Edit button */}
                  <Link
                    href={`/instructor/courses/${courseId}/videos/${video.id}/edit`}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                  >
                    Edit
                  </Link>

                  {/* Delete button */}
                  <button
                    onClick={() => handleDelete(video.id)}
                    className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Back to course edit */}
      <div className="mt-6">
        <Link
          href={`/instructor/courses/${courseId}/edit`}
          className="text-blue-600 dark:text-blue-400 hover:underline"
        >
          ← Back to Course
        </Link>
      </div>

      {/* Video Player Modal */}
      {showModal && playingVideo && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={closeVideoModal}>
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-5xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate pr-4">
                {playingVideo.title}
              </h3>
              <button
                onClick={closeVideoModal}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition"
                aria-label="Close video player"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 flex items-center justify-center bg-black">
              {isYouTubeUrl(playingVideo.url) && getYouTubeEmbedUrl(playingVideo.url) ? (
                <iframe
                  src={getYouTubeEmbedUrl(playingVideo.url)!}
                  className="w-full aspect-video max-h-[70vh]"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video src={playingVideo.url} controls className="w-full aspect-video max-h-[70vh]" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
