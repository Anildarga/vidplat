'use client'

import { useSession } from 'next-auth/react'
import Link from 'next/link'

export default function CTASection() {
  const { data: session } = useSession()
  const isLoggedIn = !!session?.user

  return (
    <section className="py-20 bg-blue-600 dark:bg-blue-800">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {isLoggedIn ? (
          <>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Welcome back!
            </h2>
            <p className="text-xl text-blue-100 mb-10 max-w-3xl mx-auto">
              Continue where you left off and keep advancing your skills.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Link
                href="/student"
                className="inline-flex items-center justify-center px-10 py-4 text-lg font-semibold text-blue-600 bg-white rounded-lg hover:bg-gray-100 transition-colors"
              >
                Go to My Dashboard
              </Link>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to Start Learning?
            </h2>
            <p className="text-xl text-blue-100 mb-10 max-w-3xl mx-auto">
              Join thousands of learners and take the next step in your career today.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-10 py-4 text-lg font-semibold text-blue-600 bg-white rounded-lg hover:bg-gray-100 transition-colors"
              >
                Get Started for Free
              </Link>
              <Link
                href="/courses"
                className="inline-flex items-center justify-center px-10 py-4 text-lg font-semibold text-white border-2 border-white rounded-lg hover:bg-white/10 transition-colors"
              >
                Browse Courses
              </Link>
            </div>
            <p className="mt-8 text-blue-200 text-sm">
              No credit card required • 14‑day free trial • Cancel anytime
            </p>
          </>
        )}
      </div>
    </section>
  )
}