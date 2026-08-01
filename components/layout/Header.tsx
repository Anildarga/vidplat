'use client'

import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import SearchBar from '@/components/SearchBar'
import ProfileMenu from './ProfileMenu'

export default function Header() {
  const { data: session, status } = useSession()
  const isAuthenticated = status === 'authenticated'

  const logout = () => signOut({ callbackUrl: '/' })

  return (
    <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-16">
          {/* Left section: Home + Logo */}
          <div className="flex items-center gap-4 flex-shrink-0">
            {/* Home button - always visible */}
            <Link
              href="/"
              className="p-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition"
              title="Go to Home"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
            </Link>
            {/* Logo */}
            <Link href="/" className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              Eduplat
            </Link>
          </div>

          {/* Middle section: Search Bar */}
          <div className="flex-1 flex justify-center px-4">
            <SearchBar />
          </div>

          {/* Right section: Nav & Theme */}
          <div className="flex items-center gap-4 flex-shrink-0">
            <nav className="flex items-center gap-4">
              <Link
                href="/courses"
                className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
              >
                Browse Courses
              </Link>
              
              {/* Our Services Dropdown */}
              <div className="relative group">
                <button className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1">
                  Our Services
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div className="absolute left-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="p-4">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">What We Offer</h4>
                    <ul className="space-y-2">
                      <li>
                        <Link href="/courses" className="block text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700">
                          <span className="font-medium">Online Courses</span>
                          <p className="text-sm"></p>
                        </Link>
                      </li>
                      <li>
                        <Link href="/instructor" className="block text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700">
                          <span className="font-medium">Instructor Platform</span>
                          <p className="text-sm"></p>
                        </Link>
                      </li>
                      <li>
                        <Link href="/student" className="block text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700">
                          <span className="font-medium">Learning Dashboard</span>
                          <p className="text-sm"></p>
                        </Link>
                      </li>
                      <li>
                        <Link href="/help" className="block text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700">
                          <span className="font-medium">24/7 Support</span>
                          <p className="text-sm"></p>
                        </Link>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
              {isAuthenticated && session?.user ? (
                <ProfileMenu user={session.user} onLogout={logout} />
              ) : (
                <>
                  <Link
                    href="/register"
                    className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Sign Up
                  </Link>
                  <Link
                    href="/login"
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Login
                  </Link>
                </>
              )}
            </nav>
          </div>
        </div> {/* Close flex container */}
      </div> {/* Close max-w-7xl container */}
    </header>
  )
}
