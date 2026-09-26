'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface Course {
  id: string;
  title: string;
  description: string | null;
  thumbnail: string | null;
  isPublished: boolean;
  adminApproved: boolean;
  approvedAt: string | null;
  createdAt: string;
  videos: any[];
  quizzes: any[];
  _count: {
    enrollments: number;
    videos: number;
  };
}

export default function InstructorCoursesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // Fetch courses
  useEffect(() => {
    if (session && (session.user?.role === 'INSTRUCTOR' || session.user?.role === 'ADMIN')) {
      const fetchCourses = async () => {
        try {
          const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
          const res = await fetch(`${baseUrl}/api/courses/my`, { cache: 'no-store' });
          const data = await res.json();

          if (!res.ok) {
            throw new Error(data.error || 'Failed to fetch courses');
          }

          setCourses(data.data);
        } catch (err: any) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };

      fetchCourses();
    }
  }, [session]);

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
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          My Courses
        </h1>
        <div className="flex gap-2">
          <Link
            href="/trash"
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition"
          >
            Trash
          </Link>
          <Link
            href="/instructor/courses/new"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            Create New Course
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded">
          {error}
        </div>
      )}

      {courses.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
          <p className="text-gray-600 dark:text-gray-400 text-lg mb-4">
            You haven't created any courses yet.
          </p>
          <Link
            href="/instructor/courses/new"
            className="inline-block px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            Create Your First Course
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <div
              key={course.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden"
            >
              {/* Thumbnail */}
              <div className="aspect-video bg-gray-200 dark:bg-gray-700 relative">
                {course.thumbnail ? (
                  <img
                    src={course.thumbnail}
                    alt={course.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg
                      className="w-12 h-12 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                )}
                {/* Status Badge */}
                <div className="absolute top-2 right-2">
                  {course.isPublished ? (
                    course.adminApproved ? (
                      <span className="bg-green-500 text-white text-xs px-2 py-1 rounded">Live</span>
                    ) : (
                      <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded">Awaiting Approval</span>
                    )
                  ) : (
                    <span className="bg-gray-500 text-white text-xs px-2 py-1 rounded">Draft</span>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
                  {course.title}
                </h2>

                {/* Summary stat */}
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                  {course._count.enrollments} students · {course._count.videos} videos ·{' '}
                  {!course.isPublished ? 'Draft' : course.adminApproved ? 'Live' : 'Awaiting Admin Approval'}
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Link
                    href={`/instructor/courses/${course.id}/analytics`}
                    className="flex-1 px-3 py-2 bg-green-600 text-white text-center rounded hover:bg-green-700 text-sm transition"
                  >
                    View Analytics
                  </Link>
                  <Link
                    href={`/instructor/courses/${course.id}/videos`}
                    className="flex-1 px-3 py-2 bg-purple-600 text-white text-center rounded hover:bg-purple-700 text-sm transition"
                  >
                    Manage Videos
                  </Link>
                </div>
                <div className="flex gap-2 flex-wrap mt-2">
                  <Link
                    href={`/instructor/courses/${course.id}/edit`}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white text-center rounded hover:bg-blue-700 text-sm transition"
                  >
                    Edit
                  </Link>
                  <DeleteButton courseId={course.id} onDelete={() => {
                    // Remove course from state after deletion
                    setCourses(prev => prev.filter(c => c.id !== course.id));
                  }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Client component for delete button
function DeleteButton({ courseId, onDelete }: { courseId: string; onDelete: () => void }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const res = await fetch(`${baseUrl}/api/courses/${courseId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete course');
      }

      onDelete();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <button
        onClick={handleDelete}
        disabled={isDeleting}
        className="flex-1 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 text-sm transition"
      >
        {isDeleting ? 'Deleting...' : 'Delete'}
      </button>
      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </>
  );
}
