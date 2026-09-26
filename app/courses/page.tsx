import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { CourseWithDetails } from '@/types/course';
import Link from 'next/link';
import RatingStars from '@/components/RatingStars';
import BookmarkButton from '@/components/courses/BookmarkButton';

// This page is a server component that receives searchParams automatically
interface CoursesPageProps {
  searchParams: Promise<{ search?: string }>;
}

export default async function CoursesPage({ searchParams }: CoursesPageProps) {
  const { search } = await searchParams;

  // Public catalog contains only author-published and admin-approved courses.
  const where: any = {
    isPublished: true,
    adminApproved: true,
  };

  // Add search filter if provided
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
    ];
  }

  // Fetch courses directly from database
  const courses = await prisma.course.findMany({
    where,
    include: {
      instructor: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
      videos: true,
      quizzes: {
        select: {
          id: true,
        },
      },
      _count: {
        select: {
          enrollments: true,
          videos: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Fetch reviews for all courses separately
  const courseIds = courses.map(course => course.id);
  const reviewsByCourseId: Record<string, any[]> = {};
  
  if (courseIds.length > 0) {
    const reviews = await (prisma as any).review.findMany({
      where: {
        courseId: {
          in: courseIds,
        },
      },
      select: {
        id: true,
        rating: true,
        courseId: true,
      },
    });
    
    // Group reviews by courseId
    reviews.forEach((review: any) => {
      if (!reviewsByCourseId[review.courseId]) {
        reviewsByCourseId[review.courseId] = [];
      }
      reviewsByCourseId[review.courseId].push(review);
    });
  }

  // Calculate average rating for each course
  const typedCourses: CourseWithDetails[] = courses.map(course => {
    const reviews = reviewsByCourseId[course.id] || [];
    const avgRating = reviews.length > 0
      ? reviews.reduce((sum: number, review: any) => sum + (review.rating || 0), 0) / reviews.length
      : 0;
    
    return {
      ...course,
      reviews,
      averageRating: parseFloat(avgRating.toFixed(1)), // Round to 1 decimal
      _count: {
        ...course._count,
        reviews: reviews.length,
      },
    } as CourseWithDetails;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Browse Courses
        </h1>

        {/* Search Form */}
        <form method="get" className="w-full sm:w-auto">
          <div className="relative">
            <input
              type="text"
              name="search"
              defaultValue={search || ''}
              placeholder="Search courses..."
              className="w-full sm:w-80 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
            >
              Search
            </button>
          </div>
        </form>
      </div>

      {typedCourses.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            {search ? `No courses found for "${search}"` : 'No courses available yet'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {typedCourses.map((course) => (
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
                {/* Published Badge */}
                {course.isPublished && (
                  <div className="absolute top-2 left-2">
                    <span className="bg-green-500 text-white text-xs px-2 py-1 rounded">
                      Published
                    </span>
                  </div>
                )}
                {/* Bookmark button */}
                <div className="absolute top-2 right-2">
                  <BookmarkButton courseId={course.id} size="sm" />
                </div>
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
                  <span>{course.quizzes.length} quizzes</span>
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

                <Link
                  href={`/courses/${course.id}`}
                  className="block w-full text-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  View Course
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
