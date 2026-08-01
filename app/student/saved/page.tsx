import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import RatingStars from '@/components/RatingStars';
import BookmarkButton from '@/components/courses/BookmarkButton';

export default async function SavedCoursesPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Saved Courses
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Please sign in to view your saved courses.
        </p>
      </div>
    );
  }

  // Fetch bookmarks for the current user with course details
  const bookmarks = await prisma.bookmark.findMany({
    where: {
      userId: session.user.id,
    },
    include: {
      course: {
        include: {
          instructor: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
          videos: {
            select: {
              id: true,
            },
          },
          quizzes: {
            select: {
              id: true,
            },
          },
          _count: {
            select: {
              enrollments: true,
              videos: true,
              reviews: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Fetch reviews for average rating
  const coursesWithRating = await Promise.all(
    bookmarks.map(async (bookmark) => {
      const reviews = await prisma.review.findMany({
        where: { courseId: bookmark.course.id },
        select: { rating: true },
      });
      const avgRating =
        reviews.length > 0
          ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
          : 0;

      return {
        ...bookmark.course,
        averageRating: parseFloat(avgRating.toFixed(1)),
        _count: {
          ...bookmark.course._count,
          reviews: reviews.length,
        },
        bookmarkedAt: bookmark.createdAt,
      };
    })
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Saved Courses
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {coursesWithRating.length} course{coursesWithRating.length !== 1 ? 's' : ''} saved
        </p>
      </div>

      {coursesWithRating.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 text-gray-300 dark:text-gray-700 mb-4">
            <svg
              className="w-full h-full"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No saved courses yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-6">
            Bookmark courses you’re interested in by clicking the heart icon on any course card.
            They’ll appear here for easy access later.
          </p>
          <Link
            href="/courses"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Browse Courses
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {coursesWithRating.map((course) => (
            <div
              key={course.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
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
                      className="w-16 h-16 text-gray-400"
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
                {/* Bookmark button overlay */}
                <div className="absolute top-2 right-2">
                  <BookmarkButton courseId={course.id} size="sm" />
                </div>
                {course.isPublished && (
                  <div className="absolute top-2 left-2">
                    <span className="bg-green-500 text-white text-xs px-2 py-1 rounded">
                      Published
                    </span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
                  {course.title}
                </h2>

                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                  By {course.instructor.name || 'Unknown Instructor'}
                </p>

                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
                  <span>{course._count.videos} videos</span>
                  <span>{course.quizzes?.length || 0} quizzes</span>
                  <span>{course._count.enrollments} enrollments</span>
                  <div className="flex items-center gap-1">
                    {course.averageRating > 0 ? (
                      <>
                        <RatingStars rating={course.averageRating} size="sm" />
                        <span className="ml-1 font-medium">
                          {course.averageRating.toFixed(1)}
                        </span>
                        <span className="text-gray-400">
                          ({course._count.reviews})
                        </span>
                      </>
                    ) : (
                      <span className="text-gray-400">No ratings yet</span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Link
                    href={`/courses/${course.id}`}
                    className="flex-1 text-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    View Course
                  </Link>
                  <button
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    onClick={() => {
                      // This will be handled by BookmarkButton, but we can add a direct remove option
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}