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

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>('STUDENT')
  const [creating, setCreating] = useState(false)
  const [createdIdentityId, setCreatedIdentityId] = useState<string | null>(null)

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
    if (!/^(stud|inst|admin)d{8}$/.test(normalized)) {
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

  const createUser = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setMessage(null)
    setCreatedIdentityId(null)

    if (!firstName.trim() || !lastName.trim() || !username.trim() || !password) {
      setError('First name, last name, username and password are required')
      return
    }

    setCreating(true)

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          username: username.trim().toLowerCase(),
          password,
          role,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create user')

      setCreatedIdentityId(data.data.identityId)
      setMessage('User account created successfully')
      setFirstName('')
      setLastName('')
      setUsername('')
      setPassword('')
      setRole('STUDENT')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user')
    } finally {
      setCreating(false)
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
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <div>
        <button onClick={() => router.push('/admin')} className="text-blue-600 hover:underline">
          ← Back to Admin
        </button>
      </div>

      <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Create User Account</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          Admin creates accounts manually and assigns the role at creation time. Roles cannot be changed later.
        </p>

        <form onSubmit={createUser} className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="First name"
            required
            className="px-4 py-3 border rounded-lg bg-white dark:bg-gray-700"
          />
          <input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Last name"
            required
            className="px-4 py-3 border rounded-lg bg-white dark:bg-gray-700"
          />
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            autoComplete="off"
            minLength={3}
            maxLength={24}
            required
            className="px-4 py-3 border rounded-lg bg-white dark:bg-gray-700"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (minimum 8 characters)"
            autoComplete="new-password"
            minLength={8}
            required
            className="px-4 py-3 border rounded-lg bg-white dark:bg-gray-700"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="px-4 py-3 border rounded-lg bg-white dark:bg-gray-700"
          >
            <option value="STUDENT">Student</option>
            <option value="INSTRUCTOR">Instructor</option>
            <option value="ADMIN">Admin</option>
          </select>
          <button
            type="submit"
            disabled={creating}
            className="px-5 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {creating ? 'Creating account...' : 'Create User'}
          </button>
        </form>

        {createdIdentityId && (
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg">
            <p className="text-sm">Account created. Give the user their login credentials and keep this identity ID for administration:</p>
            <p className="mt-1 font-mono font-bold text-lg">{createdIdentityId}</p>
          </div>
        )}
      </section>

      <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">User Lookup</h2>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          Search by the user's unique identity ID. The directory is not listed.
        </p>

        <div className="mt-6 flex gap-3">
          <input
            value={identityId}
            onChange={(e) => setIdentityId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && searchUser()}
            placeholder="stud12345678 / inst12345678 / admin12345678"
            className="flex-1 px-4 py-3 border rounded-lg bg-white dark:bg-gray-700"
          />
          <button onClick={searchUser} disabled={loading} className="px-5 py-3 bg-blue-600 text-white rounded-lg disabled:opacity-50">
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>

        {error && <div className="mt-4 p-3 bg-red-50 text-red-700 rounded">{error}</div>}
        {message && <div className="mt-4 p-3 bg-green-50 text-green-700 rounded">{message}</div>}

        {user && (
          <div className="mt-8 border border-gray-200 dark:border-gray-700 rounded-lg p-6 space-y-4">
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
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm text-gray-500 mb-3">
                Role is fixed after account creation.
              </p>
              <button
                onClick={() => updateUser({ isActive: !user.isActive })}
                className="px-4 py-2 border rounded"
              >
                {user.isActive ? 'Deactivate' : 'Activate'}
              </button>
              <button onClick={deleteUser} className="ml-3 px-4 py-2 bg-red-600 text-white rounded">
                Delete
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
