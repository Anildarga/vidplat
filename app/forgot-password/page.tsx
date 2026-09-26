import Link from 'next/link';

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Password reset is paused</h1>
        <p className="mt-3 text-gray-600 dark:text-gray-300">
          Email OTP password reset is temporarily disabled. Please use your username and password login.
        </p>
        <Link href="/login" className="inline-block mt-6 px-5 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          Back to login
        </Link>
      </div>
    </div>
  );
}
