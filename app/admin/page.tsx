'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export const dynamic = 'force-dynamic'

export default function AdminDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const isAuthenticated = status === 'authenticated'
  const user = session?.user

  useEffect(() => {
    if (status !== 'loading' && (!isAuthenticated || user?.role !== 'ADMIN')) {
      router.push('/')
    }
  }, [status, isAuthenticated, user, router])

  if (status === 'loading' || status === 'unauthenticated' && !user) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  if (!isAuthenticated || user?.role !== 'ADMIN') {
    return null
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow p-8">
        <h1 className="text-3xl font-bold text-gray-900">Welcome to Admin Section</h1>
        <p className="mt-4 text-gray-600">
          This is the admin dashboard. Future features: user management, platform settings, analytics.
        </p>
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div
            className="p-6 border rounded-lg cursor-pointer hover:bg-gray-50 transition"
            onClick={() => router.push('/admin/users')}
          >
            <h3 className="font-semibold text-lg text-blue-600">User Management</h3>
            <p className="text-gray-500">Manage all platform users</p>
            <p className="mt-2 text-sm text-blue-500">Click to open →</p>
          </div>
          <div
            className="p-6 border rounded-lg cursor-pointer hover:bg-gray-50 transition"
            onClick={() => router.push('/admin/courses')}
          >
            <h3 className="font-semibold text-lg text-purple-600">Course Approvals</h3>
            <p className="text-gray-500">Review instructor-published courses</p>
            <p className="mt-2 text-sm text-purple-500">Click to open →</p>
          </div>
          <div className="p-6 border rounded-lg">
            <h3 className="font-semibold text-lg">Platform Settings</h3>
            <p className="text-gray-500">Configure system settings</p>
          </div>
          <div className="p-6 border rounded-lg">
            <h3 className="font-semibold text-lg">Analytics</h3>
            <p className="text-gray-500">View platform statistics</p>
          </div>
        </div>
      </div>
    </div>
  )
}
