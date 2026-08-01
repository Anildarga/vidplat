'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';

interface Props {
  courseId: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export default function BookmarkButton({ courseId, size = 'md', showText = false }: Props) {
  const { data: session, status } = useSession();
  const [bookmarked, setBookmarked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') {
      checkBookmark();
    } else if (status === 'unauthenticated') {
      setLoading(false);
    }
  }, [courseId, status]);

  const checkBookmark = async () => {
    try {
      const res = await fetch(`/api/bookmarks`, {
        cache: 'no-store',
      });
      const data = await res.json();
      if (res.ok) {
        // Check if this course is in the list
        const isBookmarked = data.data?.some((course: any) => course.id === courseId);
        setBookmarked(isBookmarked);
      }
    } catch (error) {
      console.error('Failed to check bookmark:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async () => {
    if (!session) {
      // Optionally redirect to login
      return;
    }
    setToggling(true);
    try {
      const res = await fetch(`/api/bookmarks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId }),
      });
      const data = await res.json();
      if (data.success) {
        setBookmarked(data.action === 'added');
      } else {
        alert(data.error || 'Failed to toggle bookmark');
      }
    } catch (error) {
      console.error('Failed to toggle bookmark:', error);
      alert('An error occurred');
    } finally {
      setToggling(false);
    }
  };

  const sizeClasses = {
    sm: 'p-1 text-sm',
    md: 'p-2 text-base',
    lg: 'p-3 text-lg',
  };

  if (loading) {
    return (
      <button
        className={`${sizeClasses[size]} border border-gray-300 dark:border-gray-600 rounded-full bg-transparent text-gray-400 cursor-not-allowed`}
        disabled
      >
        <Heart className="w-4 h-4 animate-pulse" />
      </button>
    );
  }

  return (
    <button
      onClick={handleToggle}
      disabled={toggling}
      className={`${sizeClasses[size]} border ${
        bookmarked
          ? 'border-red-300 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
          : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400'
      } rounded-full hover:shadow-md transition-all duration-200 flex items-center gap-2`}
      title={bookmarked ? 'Remove from bookmarks' : 'Save for later'}
    >
      <Heart className={`w-4 h-4 ${bookmarked ? 'fill-current' : ''}`} />
      {showText && (
        <span className="font-medium">
          {bookmarked ? 'Saved' : 'Save'}
        </span>
      )}
    </button>
  );
}