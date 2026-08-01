'use client'

import { useSession } from 'next-auth/react'
import Link from 'next/link'

export default function HeroSection() {
  const { data: session } = useSession()
  const isLoggedIn = !!session?.user

  return (
    <section className="relative bg-white overflow-hidden">
      {/* Dot grid background */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: 'radial-gradient(#e5e7eb 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left column */}
          <div className="space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-600 text-white text-sm font-medium">
              🎓 Trusted by 10,000+ learners
            </div>

            {/* Headline */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight">
              Learn New Skills.
              <br />
              Advance Your Career.
            </h1>

            {/* Subheadline */}
            <p className="text-xl text-gray-600 max-w-2xl">
              Access expert-led courses in technology, design, and business. Learn at your own pace, anytime, anywhere.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              {isLoggedIn ? (
                <>
                  <Link
                    href="/student/courses"
                    className="inline-flex items-center justify-center px-8 py-3 text-lg font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Continue Learning
                  </Link>
                  <Link
                    href="/student"
                    className="inline-flex items-center justify-center px-8 py-3 text-lg font-semibold text-blue-600 bg-white border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    My Dashboard
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/courses"
                    className="inline-flex items-center justify-center px-8 py-3 text-lg font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Explore Courses
                  </Link>
                  <Link
                    href="/register?role=INSTRUCTOR"
                    className="inline-flex items-center justify-center px-8 py-3 text-lg font-semibold text-blue-600 bg-white border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    Start Teaching
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Right column - Hero illustration */}
          <div className="relative flex justify-center lg:justify-end">
            <div className="relative w-full max-w-md">
              {/* Card */}
              <div className="bg-white rounded-2xl shadow-2xl p-6 transform rotate-2 border border-gray-100">
                {/* Thumbnail placeholder */}
                <div className="h-40 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl mb-4 flex items-center justify-center">
                  <span className="text-white text-2xl font-bold">Introduction to React</span>
                </div>

                {/* Course details */}
                <h3 className="text-xl font-bold text-gray-900 mb-2">Introduction to React</h3>
                <p className="text-gray-500 text-sm mb-4">By John Doe • 12 hours</p>

                {/* Rating */}
                <div className="flex items-center mb-4">
                  <div className="flex text-yellow-400">
                    {'★★★★★'.split('').map((_, i) => (
                      <span key={i}>★</span>
                    ))}
                  </div>
                  <span className="ml-2 text-gray-700 font-medium">4.8 (1,234 reviews)</span>
                </div>

                {/* Progress bar */}
                <div className="mb-6">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Progress</span>
                    <span>65%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full" style={{ width: '65%' }} />
                  </div>
                </div>

                {/* Floating badges */}
                <div className="absolute -top-3 -right-3 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                  ✓ Certificate Included
                </div>
                <div className="absolute -bottom-3 -left-3 bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                  4.8 ★ Rating
                </div>
              </div>

              {/* Decorative elements */}
              <div className="absolute -z-10 top-6 -right-6 w-64 h-64 bg-blue-100 rounded-3xl blur-2xl opacity-50" />
              <div className="absolute -z-10 bottom-6 -left-6 w-48 h-48 bg-purple-100 rounded-3xl blur-2xl opacity-30" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}