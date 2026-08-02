'use client'

import { Suspense, useState, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'

function VerifyEmailForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const emailParam = searchParams.get('email') || ''

  const [email] = useState(emailParam)
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [verified, setVerified] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const code = digits.join('')

  const handleDigitChange = (index: number, value: string) => {
    const clean = value.replace(/[^0-9]/g, '')
    if (!clean) {
      const next = [...digits]
      next[index] = ''
      setDigits(next)
      return
    }
    // Handle paste of full code into one box
    if (clean.length > 1) {
      const chars = clean.slice(0, 6).split('')
      const next = [...digits]
      chars.forEach((c, i) => {
        if (index + i < 6) next[index + i] = c
      })
      setDigits(next)
      const lastIndex = Math.min(index + chars.length, 5)
      inputRefs.current[lastIndex]?.focus()
      return
    }
    const next = [...digits]
    next[index] = clean
    setDigits(next)
    if (index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (code.length !== 6) {
      setError('Please enter the full 6-digit code')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        setError(data.error || 'Invalid code')
        return
      }

      setVerified(true)
      setTimeout(() => {
        router.push('/login?verified=true&message=' + encodeURIComponent('Your email has been verified. You can now log in.'))
      }, 1500)
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setError('')
    setMessage('')
    setResending(true)
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()

      if (res.ok) {
        setMessage('A new code has been sent to your email.')
        setDigits(['', '', '', '', '', ''])
        inputRefs.current[0]?.focus()
      } else {
        setError(data.error || 'Failed to resend code')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setResending(false)
    }
  }

  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  if (!email) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full space-y-4 bg-white dark:bg-gray-800 p-8 rounded-lg shadow text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Missing email</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            We couldn't find an email address to verify. Please register or log in again.
          </p>
          <Link href="/register" className="block text-blue-600 dark:text-blue-400 hover:underline text-sm">
            Back to sign up
          </Link>
        </div>
      </div>
    )
  }

  if (verified) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full space-y-8 bg-white dark:bg-gray-800 p-8 rounded-lg shadow text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 dark:bg-green-900">
            <svg className="h-8 w-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900 dark:text-white">Email verified!</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Redirecting you to login...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-gray-800 p-8 rounded-lg shadow">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900">
            <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900 dark:text-white">Verify your email</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Enter the 6-digit code sent to{' '}
            <span className="font-medium text-gray-900 dark:text-white">{email}</span>
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-6">
          <div className="flex justify-center gap-2">
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(el) => { inputRefs.current[index] = el }}
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={digit}
                onChange={(e) => handleDigitChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="w-12 h-14 text-center text-2xl font-bold border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            ))}
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded text-sm text-center">
              {error}
            </div>
          )}

          {message && (
            <div className="bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 p-3 rounded text-sm text-center">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Verifying...' : 'Verify email'}
          </button>

          <div className="text-center text-sm">
            <span className="text-gray-500 dark:text-gray-400">Didn't get a code? </span>
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
            >
              {resending ? 'Sending...' : 'Resend code'}
            </button>
          </div>

          <div className="text-center">
            <Link
              href="/login"
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300"
            >
              ← Back to sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyEmailForm />
    </Suspense>
  )
}
