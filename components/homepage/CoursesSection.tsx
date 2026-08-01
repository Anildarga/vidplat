import Link from 'next/link'
import Image from 'next/image'
import { Play, Users, Video } from 'lucide-react'

interface Instructor {
  name: string | null
  image: string | null
}

interface Course {
  id: string
  title: string
  description: string | null
  thumbnail: string | null
  instructor: Instructor
  _count: {
    enrollments: number
    videos: number
  }
}

interface CoursesSectionProps {
  courses: Course[]
}

export default function CoursesSection({ courses }: CoursesSectionProps) {
  return (
    <section className="py-20 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Most Popular Courses
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            Join thousands of learners already enrolled
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {courses.map((course) => {
            const instructorInitials = course.instructor.name
              ?.split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2) || 'AI'

            return (
              <div
                key={course.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden hover:shadow-xl hover:scale-[1.02] transition-all duration-300 group"
              >
                {/* Thumbnail */}
                <div className="relative h-48 bg-gradient-to-br from-blue-400 to-blue-600">
                  {course.thumbnail ? (
                    <Image
                      src={course.thumbnail}
                      alt={course.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-white text-4xl font-bold">
                        {course.title
                          .split(' ')
                          .map((word) => word[0])
                          .join('')
                          .slice(0, 3)}
                      </div>
                    </div>
                  )}
                  <div className="absolute top-4 right-4 bg-white/90 dark:bg-gray-900/90 text-gray-900 dark:text-white text-xs font-bold px-3 py-1 rounded-full">
                    <Play size={12} className="inline mr-1" /> Course
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
                    {course.title}
                  </h3>

                  {/* Instructor */}
                  <div className="flex items-center mb-4">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold text-sm mr-3">
                      {course.instructor.image ? (
                        <Image
                          src={course.instructor.image}
                          alt={course.instructor.name || 'Instructor'}
                          width={32}
                          height={32}
                          className="rounded-full"
                        />
                      ) : (
                        instructorInitials
                      )}
                    </div>
                    <span className="text-gray-600 dark:text-gray-400 text-sm">
                      {course.instructor.name || 'Anonymous Instructor'}
                    </span>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-6">
                    <div className="flex items-center mr-4">
                      <Video size={16} className="mr-1" />
                      <span>{course._count.videos} videos</span>
                    </div>
                    <div className="flex items-center">
                      <Users size={16} className="mr-1" />
                      <span>{course._count.enrollments} students</span>
                    </div>
                  </div>

                  {/* Enroll button */}
                  <Link
                    href={`/courses/${course.id}`}
                    className="block w-full text-center py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    Enroll Now
                  </Link>
                </div>
              </div>
            )
          })}
        </div>

        {/* View All Courses button */}
        <div className="text-center mt-12">
          <Link
            href="/courses"
            className="inline-flex items-center justify-center px-8 py-3 text-lg font-semibold text-blue-600 bg-white dark:bg-gray-800 border border-blue-600 dark:border-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors"
          >
            View All Courses
          </Link>
        </div>
      </div>
    </section>
  )
}