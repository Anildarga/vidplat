'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';

export default function OnboardingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If not authenticated, redirect to login
  if (status === 'loading') {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-center text-gray-900 dark:text-white">Loading...</div>
      </div>
    );
  }

  if (!session) {
    if (typeof window !== 'undefined') {
      router.push('/login');
    }
    return null;
  }

  // If already completed onboarding, redirect to dashboard
  if (session.user.onboardingCompleted) {
    if (typeof window !== 'undefined') {
      const role = session.user.role as string;
      router.push(`/${role.toLowerCase()}`);
    }
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    setLoading(true);
    try {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const res = await fetch(`${baseUrl}/api/auth/onboarding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'STUDENT' }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to complete onboarding');
      }

      // The account role is assigned server-side; onboarding only completes setup.
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-gray-800 p-8 rounded-lg shadow">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold text-gray-900 dark:text-white">Welcome to Eduplat!</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Complete your account setup
          </p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Signed in as {session.user.email}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded text-sm">
              {error}
            </div>
          )}

          <div className="rounded-lg border border-gray-200 dark:border-gray-600 p-4">
            <p className="text-sm font-medium text-gray-900 dark:text-white">Account type</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              New accounts start as Student. Instructor access is granted through administrative approval.
            </p>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Completing setup...' : 'Continue'}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/' })}
              className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              Sign out
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
