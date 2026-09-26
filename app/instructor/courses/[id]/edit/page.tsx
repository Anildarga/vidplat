'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface CourseData {
  id: string;
  title: string;
  description: string | null;
  thumbnail: string | null;
  isPublished: boolean;
  adminApproved: boolean;
  approvedAt: string | null;
}

interface Quiz {
  id: string;
  title: string;
  _count: {
    questions: number;
  };
}

export default function EditCoursePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;

  const [course, setCourse] = useState<CourseData | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [thumbnail, setThumbnail] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [adminApproved, setAdminApproved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

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

  // Fetch course data when courseId is available
  useEffect(() => {
    if (!courseId) return;

    const fetchCourse = async () => {
      try {
        // Use absolute URL to avoid parsing issues
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
        const res = await fetch(`${baseUrl}/api/courses/${courseId}`, { cache: 'no-store' });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Failed to fetch course');
        }

        setCourse(data.data);
        setTitle(data.data.title);
        setDescription(data.data.description || '');
        setThumbnail(data.data.thumbnail || '');
        setIsPublished(data.data.isPublished);
        setAdminApproved(data.data.adminApproved);

        // Fetch quizzes for this course
        const quizzesRes = await fetch(`${baseUrl}/api/courses/${courseId}/quizzes`, { cache: 'no-store' });
        if (quizzesRes.ok) {
          const quizzesData = await quizzesRes.json();
          if (quizzesData.success) {
            setQuizzes(quizzesData.data);
          }
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCourse();
  }, [courseId]);

  const handleSave = async (publishOverride?: boolean) => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const res = await fetch(`${baseUrl}/api/courses/${courseId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          thumbnail: thumbnail.trim() || null,
          isPublished: publishOverride ?? isPublished,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save course');
      }

      setSuccess(
        (publishOverride ?? isPublished) && !adminApproved
          ? 'Course published and sent for admin approval.'
          : 'Course saved successfully!'
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

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

      // Redirect to courses list
      router.push('/instructor/courses');
    } catch (err: any) {
      setError(err.message);
      setIsDeleting(false);
    }
  };

  // Thumbnail preview effect
  useEffect(() => {
    if (thumbnail && thumbnail.trim() !== '') {
      setShowPreview(true);
    } else {
      setShowPreview(false);
    }
  }, [thumbnail]);

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

  if (error && !course) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="p-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded mb-4">
          {error}
        </div>
        <Link href="/instructor/courses" className="text-blue-600 dark:text-blue-400 hover:underline">
          ← Back to My Courses
        </Link>
      </div>
    );
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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Course</h1>
          <div className="flex items-center gap-2 text-sm">
            {!isPublished && <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700">Draft</span>}
            {isPublished && !adminApproved && <span className="px-3 py-1 rounded-full bg-yellow-100 text-yellow-800">Awaiting Admin Approval</span>}
            {isPublished && adminApproved && <span className="px-3 py-1 rounded-full bg-green-100 text-green-800">Live</span>}
          </div>
        </div>

        <div className="mb-8 relative">
          <details className="group">
            <summary className="list-none cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">
              Add Content
              <span>▾</span>
            </summary>
            <div className="absolute z-30 mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2">
              <Link href={"/instructor/courses/" + courseId + "/videos/new"} className="block px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700">Add Video</Link>
              <Link href={"/instructor/courses/" + courseId + "/notes"} className="block px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700">Add Notes</Link>
              <Link href={"/instructor/courses/" + courseId + "/quizzes/new"} className="block px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700">Add Quiz</Link>
              <Link href={"/instructor/courses/" + courseId + "/documents"} className="block px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700">Add Documents</Link>
            </div>
          </details>
        </div>

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

          {/* Thumbnail */}
          <div>
            <label htmlFor="thumbnail" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Thumbnail URL
            </label>
            <input
              type="url"
              id="thumbnail"
              value={thumbnail}
              onChange={(e) => setThumbnail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://example.com/image.jpg"
            />
            {showPreview && (
              <div className="mt-3">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Preview:</p>
                <img
                  src={thumbnail}
                  alt="Thumbnail preview"
                  className="w-48 h-32 object-cover rounded border border-gray-300 dark:border-gray-600"
                />
              </div>
            )}
          </div>

          {/* Published Toggle */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isPublished"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="w-5 h-5 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
            />
            <label htmlFor="isPublished" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Published by author (admin approval may still be required)
            </label>
            {!isPublished && (
              <span className="text-xs text-yellow-600 dark:text-yellow-400">(Draft)</span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            {!isPublished && (
              <button
                type="button"
                onClick={() => {
                  setIsPublished(true);
                  handleSave(true);
                }}
                disabled={isSaving}
                className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 transition"
              >
                {isSaving ? 'Publishing...' : adminApproved ? 'Publish Course' : 'Publish for Review'}
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className={`px-6 py-2 rounded hover:opacity-90 transition ${
                isPublished
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-600 text-white hover:bg-gray-700'
              }`}
            >
              {isSaving ? 'Saving...' : isPublished ? 'Save Changes' : 'Save Draft'}
            </button>
          </div>
        </div>

        {/* Quizzes Section */}
        <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Quizzes ({quizzes.length})
            </h2>
            <Link
              href={`/instructor/courses/${courseId}/quizzes/new`}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
            >
              + Create Quiz
            </Link>
          </div>

          {quizzes.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                No quizzes created yet. Create quizzes to test student knowledge.
              </p>
              <Link
                href={`/instructor/courses/${courseId}/quizzes/new`}
                className="inline-block px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
              >
                Create Your First Quiz
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {quizzes.map((quiz) => (
                <div
                  key={quiz.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex justify-between items-center"
                >
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {quiz.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {quiz._count.questions} question{quiz._count.questions !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/instructor/courses/${courseId}/quizzes/${quiz.id}/edit`}
                      className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                    >
                      Edit Questions
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
