import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import DeleteButton from './DeleteButton';
import { formatDuration } from '@/lib/utils';
import EnrollButton from '@/components/courses/EnrollButton';
import ReviewsSection from '@/components/courses/ReviewsSection';
import RatingStars from '@/components/RatingStars';
import BookmarkButton from '@/components/courses/BookmarkButton';

// This is a SERVER component
export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  // Fetch course from database
  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      instructor: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
      videos: {
        orderBy: {
          order: 'asc',
        },
      },
      quizzes: true,
      _count: {
        select: {
          enrollments: true,
          videos: true,
        },
      },
    },
  });

  // Show all courses, even if not published
  if (!course) {
    notFound();
  }

  // Fetch reviews for this course separately
  const reviews = await (prisma as any).review.findMany({
    where: { courseId: id },
    select: {
      id: true,
      rating: true,
    },
  });
  
  // Calculate average rating
  const averageRating = reviews.length > 0
    ? parseFloat((reviews.reduce((sum: number, review: any) => sum + (review.rating || 0), 0) / reviews.length).toFixed(1))
    : 0;
  const totalReviews = reviews.length;
  
  const courseWithDetails = course as any;

  const isOwner = session?.user?.id === courseWithDetails.instructorId;
  const isAdmin = session?.user?.role === 'ADMIN';
  const canEdit = isOwner || isAdmin;

  // Check if user is enrolled (for video access and button state)
  let isEnrolled = false;
  if (session?.user) {
    try {
      const enrollRes = await fetch(
        `${process.env.NEXTAUTH_URL}/api/enrollments/${id}`,
        {
          cache: 'no-store',
          headers: {
            Cookie: (await cookies()).toString(),
          },
        }
      );
      const enrollData = await enrollRes.json();
      if (enrollRes.ok) {
        isEnrolled = enrollData.data?.enrolled ?? false;
      }
    } catch (error) {
      console.error('Failed to check enrollment:', error);
      isEnrolled = false;
    }
  }

  const canAccessVideos = isEnrolled || isAdmin || isOwner;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Back link */}
      <Link
        href="/courses"
        className="text-blue-600 dark:text-blue-400 hover:underline mb-6 inline-block"
      >
        ← Back to Courses
      </Link>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        {/* Header with thumbnail and actions */}
        <div className="md:flex">
          {/* Thumbnail */}
          <div className="md:w-1/3 aspect-video md:aspect-auto bg-gray-200 dark:bg-gray-700">
            {course.thumbnail ? (
              <img
                src={course.thumbnail}
                alt={course.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center min-h-[200px]">
                <svg
                  className="w-24 h-24 text-gray-400"
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
          </div>

          {/* Details */}
          <div className="md:w-2/3 p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {courseWithDetails.title}
                </h1>
                <p className="text-gray-600 dark:text-gray-300 mt-2">
                  by {courseWithDetails.instructor?.name || 'Unknown Instructor'}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                {canEdit && (
                  <>
                    <Link
                      href={`/instructor/courses/${courseWithDetails.id}/edit`}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-center"
                    >
                      Edit
                    </Link>
                    <DeleteButton courseId={courseWithDetails.id} />
                  </>
                )}
              </div>
            </div>

            {courseWithDetails.description && (
              <p className="text-gray-700 dark:text-gray-300 mb-6">{courseWithDetails.description}</p>
            )}

            <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400 mb-6">
              <span className="flex items-center gap-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                {courseWithDetails._count?.videos || 0} videos
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                {courseWithDetails.quizzes?.length || 0} quizzes
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                {courseWithDetails._count?.enrollments || 0} enrolled
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                </svg>
                {averageRating > 0 ? (
                  <>
                    <span className="font-medium">{averageRating.toFixed(1)}</span>
                    <span className="text-gray-400">({totalReviews})</span>
                  </>
                ) : (
                  <span className="text-gray-400">No ratings</span>
                )}
              </span>
            </div>

            {/* Enrollment / Sign in section */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <EnrollButton courseId={courseWithDetails.id} />
                </div>
                <div className="flex-1">
                  <BookmarkButton courseId={courseWithDetails.id} size="md" showText />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Videos Section */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Course Content
        </h2>
        {courseWithDetails.videos?.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400">No videos added yet.</p>
        ) : (
          <ul className="space-y-3">
            {courseWithDetails.videos?.map((video: any, index: number) => (
              <li
                key={video.id}
                className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow flex items-center gap-4"
              >
                <span className="text-gray-500 dark:text-gray-400 font-mono w-8">
                  {(index + 1).toString().padStart(2, '0')}
                </span>
                <div className="flex-1 flex items-center gap-2">
                  {!canAccessVideos && (
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  )}
                  <h3 className="text-gray-900 dark:text-white font-medium">
                    {video.title}
                  </h3>
                </div>
                {video.duration && (
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {formatDuration(video.duration)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Quizzes Section */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Quizzes
        </h2>
        {courseWithDetails.quizzes?.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400">No quizzes added yet.</p>
        ) : (
          <ul className="space-y-3">
            {courseWithDetails.quizzes?.map((quiz: any) => (
              <li
                key={quiz.id}
                className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow"
              >
                <h3 className="text-gray-900 dark:text-white font-medium">
                  {quiz.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Quiz
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Reviews Section */}
      <ReviewsSection courseId={courseWithDetails.id} />
    </div>
  );
}
