'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { formatDuration } from '@/lib/utils';
import { getYouTubeEmbedUrl, isYouTubeUrl, isCloudinaryUrl, getOptimizedCloudinaryUrl } from '@/lib/video-utils';
import { Video, Course } from '@prisma/client';
import NotesSidebar from '@/components/notes/NotesSidebar';
import DiscussionSidebar from '@/components/discussions/DiscussionSidebar';

interface VideoWithProgress extends Video {
  progress?: {
    watchedSeconds: number;
    completed: boolean;
  };
}

interface CourseWithVideos extends Course {
  videos: Video[];
}

export default function VideoPlayerPage() {
  const { courseId, videoId } = useParams<{
    courseId: string;
    videoId: string;
  }>();
  const { data: session, status } = useSession();
  const router = useRouter();

  const [course, setCourse] = useState<CourseWithVideos | null>(null);
  const [video, setVideo] = useState<VideoWithProgress | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [videosProgress, setVideosProgress] = useState<Record<string, { watchedSeconds: number; completed: boolean }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [savedSeconds, setSavedSeconds] = useState(0);
  const [showResumeToast, setShowResumeToast] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showNotesSidebar, setShowNotesSidebar] = useState(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState<'notes' | 'discussions'>('notes');

  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const saveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasResumedRef = useRef(false);

  // Fetch all data on mount
  useEffect(() => {
    async function fetchData() {
      if (!session?.user || !courseId || !videoId) return;

      try {
        setLoading(true);
        setError(null);

        // Fetch course + videos
        const courseRes = await fetch(
          `/api/courses/${courseId}`,
          {
            cache: 'no-store',
          }
        );

        if (!courseRes.ok) {
          if (courseRes.status === 403) {
            router.push(`/courses/${courseId}?message=Please enroll to access this course`);
            return;
          }
          throw new Error('Failed to fetch course');
        }

        const courseData = await courseRes.json();
        setCourse(courseData.data);
        setVideos(courseData.data.videos);

        // Find current video
        const currentVideo = courseData.data.videos.find((v: Video) => v.id === videoId);
        if (!currentVideo) {
          setError('Video not found');
          setLoading(false);
          return;
        }
        setVideo(currentVideo);

        // Fetch progress for current video
        const progressRes = await fetch(
          `/api/progress/${videoId}`,
          {
            cache: 'no-store',
          }
        );

        if (progressRes.ok) {
          const progressData = await progressRes.json();
          if (progressData.success) {
            setSavedSeconds(progressData.data.watchedSeconds);
          }
        }

        // Fetch overall course progress
        const courseProgressRes = await fetch(
          `/api/courses/${courseId}/progress`,
          {
            cache: 'no-store',
          }
        );

        if (courseProgressRes.ok) {
          const progressData = await courseProgressRes.json();
          if (progressData.success) {
            const progressMap: Record<string, { watchedSeconds: number; completed: boolean }> = {};
            progressData.data.videosProgress.forEach((vp: { videoId: string; watchedSeconds: number; completed: boolean }) => {
              progressMap[vp.videoId] = vp;
            });
            setVideosProgress(progressMap);
          }
        }

        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load video');
        setLoading(false);
      }
    }

    fetchData();
  }, [session, courseId, videoId, router]);

  // Resume video from saved position
  useEffect(() => {
    if (!video || !savedSeconds || hasResumedRef.current) return;

    if (savedSeconds > 10) {
      setShowResumeToast(true);
      setTimeout(() => setShowResumeToast(false), 4000);
    }

    if (isYouTubeUrl(video.url)) {
      // YouTube iframe resume handled via postMessage (simplified here)
      // In production, you'd want a full YouTube IFrame API implementation
      // For now, we'll show a toast and let user manually seek
      hasResumedRef.current = true;
    } else {
      // HTML5 video resume
      if (videoRef.current) {
        videoRef.current.currentTime = savedSeconds;
        hasResumedRef.current = true;
      }
    }
  }, [video, savedSeconds]);

  // Save progress interval
  useEffect(() => {
    if (!video || !session?.user || !isPlaying) return;

    saveIntervalRef.current = setInterval(() => {
      if (videoRef.current && !isYouTubeUrl(video.url)) {
        saveProgress(videoRef.current.currentTime);
        setCurrentTime(videoRef.current.currentTime);
      }
      // For YouTube, you'd need to track time differently
    }, 10000);

    return () => {
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
      }
    };
  }, [video, session?.user, isPlaying]);

  // Save progress on unmount/pause
  useEffect(() => {
    return () => {
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
      }
      // Save final progress on unmount
      if (videoRef.current && video && !isYouTubeUrl(video.url)) {
        saveProgress(videoRef.current.currentTime);
      }
    };
  }, [video]);

  const saveProgress = async (seconds: number) => {
    if (!session?.user || !videoId || seconds < 1) return;

    try {
      await fetch(`/api/progress/${videoId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          watchedSeconds: Math.floor(seconds),
          completed: false,
        }),
      });
    } catch (error) {
      console.error('Failed to save progress:', error);
    }
  };

  const markAsComplete = async () => {
    if (!session?.user || !videoId) return;

    try {
      await fetch(`/api/progress/${videoId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          watchedSeconds: currentTime,
          completed: true,
        }),
      });

      // Refresh progress
      const updatedProgress = { ...videosProgress };
      if (updatedProgress[videoId]) {
        updatedProgress[videoId] = {
          ...updatedProgress[videoId],
          completed: true,
        };
        setVideosProgress(updatedProgress);
      }
    } catch (error) {
      console.error('Failed to mark complete:', error);
    }
  };

  const handleVideoEnd = () => {
    if (video) {
      const duration = video.duration || 0;
      if (currentTime >= duration * 0.9) {
        markAsComplete();
      }
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => setIsPlaying(false);

  // Check if current video is the last one
  const isLastVideo = () => {
    if (!video || videos.length === 0) return false;
    const lastVideo = videos[videos.length - 1];
    return lastVideo.id === video.id;
  };

  // Check if current video is the first one
  const isFirstVideo = () => {
    if (!video || videos.length === 0) return false;
    const firstVideo = videos[0];
    return firstVideo.id === video.id;
  };

  // Check if all videos are completed
  const areAllVideosCompleted = () => {
    if (videos.length === 0) return false;
    return videos.every(v => videosProgress[v.id]?.completed === true);
  };

  // Get current video index (0-based)
  const getCurrentVideoIndex = () => {
    if (!video || videos.length === 0) return -1;
    return videos.findIndex(v => v.id === video.id);
  };

  // Get previous video ID
  const getPreviousVideoId = () => {
    const currentIndex = getCurrentVideoIndex();
    if (currentIndex <= 0) return null;
    return videos[currentIndex - 1].id;
  };

  // Get next video ID
  const getNextVideoId = () => {
    const currentIndex = getCurrentVideoIndex();
    if (currentIndex === -1 || currentIndex >= videos.length - 1) return null;
    return videos[currentIndex + 1].id;
  };

  // Function to save final progress and unlock quiz
  const handleNextVideo = async () => {
    if (!session?.user || !videoId || !courseId) return;
    
    const nextVideoId = getNextVideoId();
    if (!nextVideoId) return;

    try {
      // Calculate watched seconds - use at least 90% of video duration to ensure completion
      const videoDuration = video?.duration || 0;
      const watchedSeconds = Math.max(
        currentTime,
        videoDuration * 0.9
      );

      // Mark current video as completed before navigating
      await fetch(`/api/progress/${videoId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          watchedSeconds,
          completed: true,
        }),
      });

      // Refresh progress
      const updatedProgress = { ...videosProgress };
      if (updatedProgress[videoId]) {
        updatedProgress[videoId] = {
          ...updatedProgress[videoId],
          completed: true,
        };
        setVideosProgress(updatedProgress);
      }

      // Navigate to next video
      router.push(`/learn/${courseId}/${nextVideoId}`);
    } catch (error) {
      console.error('Failed to mark complete and navigate:', error);
      alert('Failed to save progress. Please try again.');
    }
  };

  const saveFinalProgressAndUnlockQuiz = async () => {
    if (!session?.user || !videoId || !courseId) return;

    try {
      // Calculate watched seconds - use at least 90% of video duration to ensure completion
      const videoDuration = video?.duration || 0;
      const watchedSeconds = Math.max(
        currentTime,
        videoDuration * 0.9
      );

      // Mark current video as completed
      await fetch(`/api/progress/${videoId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          watchedSeconds,
          completed: true,
        }),
      });

      // Refresh progress
      const updatedProgress = { ...videosProgress };
      if (updatedProgress[videoId]) {
        updatedProgress[videoId] = {
          ...updatedProgress[videoId],
          completed: true,
        };
        setVideosProgress(updatedProgress);
      }

      // Show success message
      alert('Congratulations! You have completed all videos. You can now take the quiz.');
      
      // Redirect to the course learning page
      router.push(`/learn/${courseId}`);
    } catch (error) {
      console.error('Failed to save final progress:', error);
      alert('Failed to save progress. Please try again.');
    }
  };

  const getEmbedUrl = (): string => {
    if (!video) return '';
    if (isYouTubeUrl(video.url)) {
      const embed = getYouTubeEmbedUrl(video.url);
      return embed ?? '';
    }
    return video.url;
  };

  const getVideoUrl = (): string => {
    if (!video) return '';
    // Optimize Cloudinary URLs for better streaming
    if (isCloudinaryUrl(video.url)) {
      return getOptimizedCloudinaryUrl(video.url, {
        width: 1280,
        height: 720,
        quality: 'auto',
        format: 'mp4'
      });
    }
    return video.url;
  };

  const isYouTube = video ? isYouTubeUrl(video.url) : false;
  const videoUrl = video ? getVideoUrl() : '';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !course || !video) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400">{error || 'Video not found'}</p>
          <Link
            href={`/courses/${courseId}`}
            className="mt-4 inline-block text-blue-600 hover:underline"
          >
            Back to Course
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Navigation */}
      <div className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href={`/learn/${courseId}`}
            className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Curriculum
          </Link>

          <div className="flex items-center gap-4">
            {videosProgress[videoId]?.completed && (
              <span className="text-green-600 dark:text-green-400 text-sm font-medium flex items-center gap-1">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Completed
              </span>
            )}
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {currentTime > 0 && `${formatDuration(Math.floor(currentTime))} / `}
              {formatDuration(video.duration ?? 0)}
            </span>
          </div>
        </div>
      </div>

      {/* Video Player */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main Video Area */}
          <div className="lg:w-2/3">
            <div className="bg-black rounded-lg overflow-hidden shadow-lg">
              {isYouTube ? (
                <iframe
                  ref={iframeRef}
                  src={getEmbedUrl()}
                  className="w-full aspect-video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={video.title}
                />
              ) : (
                <video
                  ref={videoRef}
                  src={videoUrl}
                  className="w-full aspect-video"
                  controls
                  autoPlay
                  onTimeUpdate={handleTimeUpdate}
                  onPlay={handlePlay}
                  onPause={handlePause}
                  onEnded={handleVideoEnd}
                  poster={video.thumbnail || undefined}
                >
                  <source src={videoUrl} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              )}
            </div>

            {/* Video Info */}
            <div className="mt-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {video.title}
              </h1>
              {video.description && (
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  {video.description}
                </p>
              )}
              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                <span>Duration: {formatDuration(video.duration ?? 0)}</span>
              </div>

              {/* Navigation Buttons */}
              <div className="mt-6 flex justify-between items-center">
                {/* Left side: Previous Button or empty div for spacing */}
                <div>
                  {!isFirstVideo() ? (
                    <Link
                      href={`/learn/${courseId}/${getPreviousVideoId()}`}
                      className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold py-3 px-6 rounded-lg transition-colors flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Previous Video
                    </Link>
                  ) : (
                    <div className="invisible">
                      {/* Placeholder to maintain layout */}
                      <div className="py-3 px-6">Previous Video</div>
                    </div>
                  )}
                </div>
                
                {/* Right side: Next Button or Save Progress Button */}
                <div className="flex gap-3">
                  {!isLastVideo() && getNextVideoId() && (
                    <button
                      onClick={handleNextVideo}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center gap-2"
                    >
                      Next Video
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  )}
                  
                  {isLastVideo() && !areAllVideosCompleted() && (
                    <div className="flex gap-3">
                      {!isFirstVideo() && (
                        <Link
                          href={`/learn/${courseId}/${getPreviousVideoId()}`}
                          className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold py-3 px-6 rounded-lg transition-colors flex items-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                          Previous Video
                        </Link>
                      )}
                      <button
                        onClick={saveFinalProgressAndUnlockQuiz}
                        className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Save Progress & Take Quiz
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Save Progress Info for final video */}
              {isLastVideo() && !areAllVideosCompleted() && (
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-300 mb-2">
                    Final Step: Save Progress & Unlock Quiz
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300">
                    You've reached the final video! Click the "Save Progress & Take Quiz" button above to save your progress and unlock the course quiz.
                  </p>
                </div>
              )}

              {/* Quiz Access Message */}
              {areAllVideosCompleted() && (
                <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <h3 className="text-lg font-semibold text-green-800 dark:text-green-300 mb-2 flex items-center gap-2">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    All Videos Completed!
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300 mb-4">
                    You have completed all videos in this course. Return to the course learning page.
                  </p>
                  <button
                    onClick={() => router.push(`/learn/${courseId}`)}
                    className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                  >
                    Return to Course
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Sidebars */}
          <div className="lg:w-1/3 flex flex-col gap-6">
            {/* Notes & Discussions Sidebar */}
            {showNotesSidebar && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setActiveSidebarTab('notes')}
                      className={`px-3 py-1 rounded-lg font-medium transition-colors ${activeSidebarTab === 'notes' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    >
                      Notes
                    </button>
                    <button
                      onClick={() => setActiveSidebarTab('discussions')}
                      className={`px-3 py-1 rounded-lg font-medium transition-colors ${activeSidebarTab === 'discussions' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    >
                      Discussions
                    </button>
                  </div>
                  <button
                    onClick={() => setShowNotesSidebar(false)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="h-96 overflow-y-auto">
                  {activeSidebarTab === 'notes' ? (
                    <NotesSidebar
                      videoId={videoId}
                      currentTime={currentTime}
                      onAddNote={(timestamp, content) => {
                        console.log('Note added:', { timestamp, content });
                      }}
                      onEditNote={(noteId, content) => {
                        console.log('Note edited:', { noteId, content });
                      }}
                      onDeleteNote={(noteId) => {
                        console.log('Note deleted:', noteId);
                      }}
                    />
                  ) : (
                    <DiscussionSidebar videoId={videoId} />
                  )}
                </div>
              </div>
            )}

            {/* Video List Sidebar */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Course Videos
                </h3>
                <button
                  onClick={() => setShowNotesSidebar(!showNotesSidebar)}
                  className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {showNotesSidebar ? 'Hide Sidebar' : 'Show Sidebar'}
                </button>
              </div>
              <ul className="space-y-2">
                {videos.map((v, index) => {
                  const progress = videosProgress[v.id];
                  const isCompleted = progress?.completed ?? false;
                  const isCurrentVideo = v.id === videoId;

                  return (
                    <li key={v.id}>
                      <Link
                        href={`/learn/${courseId}/${v.id}`}
                        className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                          isCurrentVideo
                            ? 'bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-500'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        <span className="text-gray-500 dark:text-gray-400 font-mono w-6 text-center text-sm">
                          {index + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${isCurrentVideo ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
                            {v.title}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDuration(v.duration ?? 0)}
                          </p>
                        </div>
                        {isCompleted && (
                          <svg
                            className="w-5 h-5 text-green-500 shrink-0"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Resume Toast */}
      {showResumeToast && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-pulse">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <div>
              <p className="font-medium">Resuming from last position</p>
              <p className="text-sm opacity-90">
                Jumped to {formatDuration(Math.floor(savedSeconds))}
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
