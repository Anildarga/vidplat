'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface CourseApproval {
  id: string
  title: string
  description: string | null
  thumbnail: string | null
  createdAt: string
  instructor: {
    identityId: string | null
    name: string | null
    username: string | null
  }
  _count: {
    videos: number
    quizzes: number
    enrollments: number
  }
}

export default function AdminCoursesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [courses, setCourses] = useState<CourseApproval[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [approvingId, setApprovingId] = useState<string | null>(null)

  const loadCourses = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/courses', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load approvals')
      setCourses(data.data || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load approvals')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login')
      return
    }
    if (status === 'authenticated' && session.user.role !== 'ADMIN') {
      router.replace('/')
      return
    }
    if (status === 'authenticated') {
      loadCourses()
    }
  }, [status, session, router])

  const approve = async (id: string) => {
    setApprovingId(id)
    try {
      const res = await fetch('/api/admin/courses/' + id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Approval failed')
      setCourses((items) => items.filter((item) => item.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approval failed')
    } finally {
      setApprovingId(null)
    }
  }

  if (status === 'loading' || loading) {
    return <div className="p-8 text-center">Loading...</div>
  }

  if (!session || session.user.role !== 'ADMIN') return null

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <button onClick={() => router.push('/admin')} className="text-blue-600 hover:underline">
        ← Back to Admin
      </button>

      <div className="mt-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Course Approvals</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Instructor-published courses appear here before becoming visible to students.
          </p>
        </div>
        <button onClick={loadCourses} className="px-4 py-2 border rounded-lg">Refresh</button>
      </div>

      {error && <div className="mt-4 p-3 bg-red-50 text-red-700 rounded">{error}</div>}

      {courses.length === 0 ? (
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center text-gray-500">
          No courses are waiting for approval.
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {courses.map((course) => (
            <div key={course.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex flex-col md:flex-row gap-5">
                {course.thumbnail ? (
                  <img src={course.thumbnail} alt={course.title} className="w-full md:w-48 aspect-video object-cover rounded-lg" />
                ) : (
                  <div className="w-full md:w-48 aspect-video bg-gray-100 dark:bg-gray-700 rounded-lg" />
                )}

                <div className="flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{course.title}</h2>
                      <p className="mt-1 text-sm text-gray-500">
                        Author: {course.instructor.name || 'Unknown'} · {course.instructor.identityId || 'ID pending'}
                      </p>
                    </div>
                    <button
                      onClick={() => approve(course.id)}
                      disabled={approvingId === course.id}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg disabled:opacity-50"
                    >
                      {approvingId === course.id ? 'Approving...' : 'Approve'}
                    </button>
                  </div>

                  {course.description && (
                    <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">{course.description}</p>
                  )}

                  <div className="mt-4 text-sm text-gray-500 flex flex-wrap gap-4">
                    <span>{course._count.videos} videos</span>
                    <span>{course._count.quizzes} quizzes</span>
                    <span>{course._count.enrollments} enrollments</span>
                    <span>Published {new Date(course.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
