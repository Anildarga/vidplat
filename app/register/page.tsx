'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { signIn } from 'next-auth/react'

export const dynamic = 'force-dynamic'

function RegisterForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { data: session, status } = useSession()

  const roleParam = searchParams.get('role')
  const defaultRole = roleParam && ['STUDENT', 'INSTRUCTOR'].includes(roleParam) ? roleParam : 'STUDENT'

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [role, setRole] = useState<'STUDENT' | 'INSTRUCTOR'>(defaultRole as any)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false)

  useEffect(() => {
    if (roleParam && ['STUDENT', 'INSTRUCTOR'].includes(roleParam)) {
      setRole(roleParam as any)
    }
  }, [roleParam])

  // If already authenticated, redirect to home
useEffect(() => {
  if (status === 'authenticated' && session?.user) {
    router.push('/')
  }
}, [status, session, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!acceptedTerms || !acceptedPrivacy) {
      setError('You must accept the Terms of Service and Privacy Policy to register')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    try {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email: email.trim().toLowerCase(), password, role, acceptedTerms, acceptedPrivacy }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed')
      }

      // Redirect to email verification page
      router.push(`/verify-email?email=${encodeURIComponent(email)}`)
    } catch (err: any) {
      setError(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-gray-800 p-8 rounded-lg shadow">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold text-gray-900 dark:text-white">Create Account</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Join Eduplat as a {role.toLowerCase()}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded text-sm">
              {error}
            </div>
          )}

          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label htmlFor="name" className="sr-only">Full name</label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Full name"
              />
            </div>
            <div>
              <label htmlFor="email" className="sr-only">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Email address"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Password (min 8 characters)"
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="sr-only">Confirm password</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Confirm password"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Role</label>
              <div className="mt-2 space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="role"
                    value="STUDENT"
                    checked={role === 'STUDENT'}
                    onChange={() => setRole('STUDENT')}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600"
                  />
                  <span className="ml-2 text-gray-700 dark:text-gray-300">Student</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="role"
                    value="INSTRUCTOR"
                    checked={role === 'INSTRUCTOR'}
                    onChange={() => setRole('INSTRUCTOR')}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600"
                  />
                  <span className="ml-2 text-gray-700 dark:text-gray-300">Instructor</span>
                </label>
                {/* Admin role is hidden from registration */}
              </div>
            </div>
          </div>
    
          {/* Terms and Privacy Checkboxes */}
          <div className="space-y-3">
            <label className="flex items-start">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="h-4 w-4 mt-1 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                required
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                I agree to the{' '}
                <a href="/terms" target="_blank" className="text-blue-600 dark:text-blue-400 hover:underline">
                  Terms of Service
                </a>
              </span>
            </label>
            <label className="flex items-start">
              <input
                type="checkbox"
                checked={acceptedPrivacy}
                onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                className="h-4 w-4 mt-1 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                required
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                I agree to the{' '}
                <a href="/privacy" target="_blank" className="text-blue-600 dark:text-blue-400 hover:underline">
                  Privacy Policy
                </a>
              </span>
            </label>
          </div>
    
          <div>
            <button
              type="submit"
              disabled={loading || !acceptedTerms || !acceptedPrivacy}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account...' : 'Sign up'}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => router.push('/login')}
                className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300"
              >
                Login
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-center text-gray-900 dark:text-white">Loading...</div>
      </div>
    }>
      <RegisterForm />
    </Suspense>
  )
}
