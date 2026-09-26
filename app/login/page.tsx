'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn, useSession } from 'next-auth/react'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (status === 'authenticated' && session?.user) router.replace('/')
    if (searchParams.get('registered') === 'true') {
      setMessage('Account created. You can now sign in.')
    }
  }, [status, session, router, searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const result = await signIn('credentials', {
        username: username.trim().toLowerCase(),
        password,
        redirect: false,
      })

      if (result?.error) {
        setError(result.error)
        return
      }

      router.replace('/')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 p-8 rounded-lg shadow">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Login</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Username/password or continue with OAuth</p>
        </div>

        {message && (
          <div className="mb-4 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 p-3 rounded text-sm">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded text-sm">
            {error}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            autoComplete="username"
            required
            className="w-full px-3 py-3 border rounded bg-white dark:bg-gray-700"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete="current-password"
            required
            className="w-full px-3 py-3 border rounded bg-white dark:bg-gray-700"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
          <span className="text-xs text-gray-500">OR</span>
          <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => signIn('google', { callbackUrl: '/' })}
            className="w-full px-4 py-3 border rounded hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
          >
            Continue with Google
          </button>
          <button
            type="button"
            onClick={() => signIn('github', { callbackUrl: '/' })}
            className="w-full px-4 py-3 border rounded hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
          >
            Continue with GitHub
          </button>
        </div>

        <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-300">
          New here? <Link href="/register" className="text-blue-600 dark:text-blue-400 hover:underline">Create an account</Link>
        </p>
      </div>
    </div>
  )
}
