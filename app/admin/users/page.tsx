'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import type { UserRole } from '@/lib/types'

interface AdminUser {
  id: string
  identityId: string | null
  firstName: string | null
  lastName: string | null
  name: string | null
  username: string | null
  email: string | null
  role: UserRole
  isActive: boolean
  isEmailVerified: boolean
  createdAt: string
}

export default function AdminUsersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [identityId, setIdentityId] = useState('')
  const [user, setUser] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  if (status === 'loading') {
    return <div className="p-8 text-center">Loading...</div>
  }

  if (!session || session.user.role !== 'ADMIN') {
    router.replace('/')
    return null
  }

  const searchUser = async () => {
    setError(null)
    setMessage(null)
    setUser(null)

    const normalized = identityId.trim().toLowerCase()
    if (!/^(stud|inst|admin)\d{8}$/.test(normalized)) {
      setError('Enter a valid ID such as stud12345678, inst12345678 or admin12345678')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/users?identityId=' + encodeURIComponent(normalized), { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'User not found')
      setUser(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'User lookup failed')
    } finally {
      setLoading(false)
    }
  }

  const updateUser = async (patch: Record<string, unknown>) => {
    if (!user) return
    setError(null)
    setMessage(null)

    try {
      const res = await fetch('/api/users/' + user.id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update user')
      setUser(data.data)
      setMessage('User updated successfully')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user')
    }
  }

  const deleteUser = async () => {
    if (!user || !confirm('Move this user out of the active platform account? This cannot be undone here.')) return

    setLoading(true)
    try {
      const res = await fetch('/api/users/' + user.id, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to delete user')
      setUser(null)
      setMessage('User deleted')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <button onClick={() => router.push('/admin')} className="text-blue-600 hover:underline">← Back to Admin</button>
      </div>

      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">User Lookup</h1>
      <p className="mt-2 text-gray-600 dark:text-gray-300">
        Search by the user's unique identity ID. The directory is not listed publicly.
      </p>

      <div className="mt-6 flex gap-3">
        <input
          value={identityId}
          onChange={(e) => setIdentityId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && searchUser()}
          placeholder="stud12345678 / inst12345678 / admin12345678"
          className="flex-1 px-4 py-3 border rounded-lg bg-white dark:bg-gray-800"
        />
        <button onClick={searchUser} disabled={loading} className="px-5 py-3 bg-blue-600 text-white rounded-lg disabled:opacity-50">
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {error && <div className="mt-4 p-3 bg-red-50 text-red-700 rounded">{error}</div>}
      {message && <div className="mt-4 p-3 bg-green-50 text-green-700 rounded">{message}</div>}

      {user && (
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-gray-500">Identity ID</p>
              <p className="text-xl font-mono font-bold">{user.identityId}</p>
            </div>
            <span className="px-3 py-1 rounded bg-gray-100 dark:bg-gray-700">{user.role}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div><span className="text-gray-500">Name</span><p>{user.name || [user.firstName, user.lastName].filter(Boolean).join(' ') || '—'}</p></div>
            <div><span className="text-gray-500">Username</span><p>{user.username || '—'}</p></div>
            <div><span className="text-gray-500">Email</span><p>{user.email || '—'}</p></div>
            <div><span className="text-gray-500">Status</span><p>{user.isActive ? 'Active' : 'Inactive'}</p></div>
            <div><span className="text-gray-500">Created</span><p>{new Date(user.createdAt).toLocaleString()}</p></div>
            <div><span className="text-gray-500">ID / internal record</span><p className="font-mono">{user.id}</p></div>
          </div>

          <div className="flex flex-wrap gap-3 pt-4 border-t">
            <select value={user.role} onChange={(e) => updateUser({ role: e.target.value })} className="px-3 py-2 border rounded bg-white dark:bg-gray-700">
              <option value="STUDENT">Student</option>
              <option value="INSTRUCTOR">Instructor</option>
              <option value="ADMIN">Admin</option>
            </select>
            <button onClick={() => updateUser({ isActive: !user.isActive })} className="px-4 py-2 border rounded">
              {user.isActive ? 'Deactivate' : 'Activate'}
            </button>
            <button onClick={deleteUser} className="px-4 py-2 bg-red-600 text-white rounded">
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
