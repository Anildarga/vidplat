'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn, useSession } from 'next-auth/react'

export const dynamic = 'force-dynamic'

export default function RegisterPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      router.replace('/')
    }
  }, [status, session, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          username: username.trim().toLowerCase(),
          password,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Registration failed')
      }

      const login = await signIn('credentials', {
        username: username.trim().toLowerCase(),
        password,
        redirect: false,
      })

      if (login?.error) {
        router.push('/login?registered=true')
        return
      }

      router.replace('/')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 p-8 rounded-lg shadow">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Create Account</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Sign up with a username and password
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded text-sm">
            {error}
          </div>
        )}

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First name"
              required
              className="w-full px-3 py-2 border rounded bg-white dark:bg-gray-700"
            />
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last name"
              required
              className="w-full px-3 py-2 border rounded bg-white dark:bg-gray-700"
            />
          </div>

          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            autoComplete="username"
            required
            minLength={3}
            maxLength={24}
            className="w-full px-3 py-2 border rounded bg-white dark:bg-gray-700"
          />

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete="new-password"
            required
            minLength={8}
            className="w-full px-3 py-2 border rounded bg-white dark:bg-gray-700"
          />

          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm password"
            autoComplete="new-password"
            required
            minLength={8}
            className="w-full px-3 py-2 border rounded bg-white dark:bg-gray-700"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-300">
          Already have an account?{' '}
          <a href="/login" className="text-blue-600 dark:text-blue-400 hover:underline">Sign in</a>
        </p>
      </div>
    </div>
  )
}
