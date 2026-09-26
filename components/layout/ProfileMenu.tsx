'use client'

import { useState, useEffect, useRef } from 'react'
import { signOut } from 'next-auth/react'
import Link from 'next/link'

interface User {
  name?: string | null
  role?: string
  identityId?: string | null
  username?: string | null
}

interface ProfileMenuProps {
  user: User
  onLogout: () => void
}

export default function ProfileMenu({ user, onLogout }: ProfileMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Generate initials from name (first 2 letters, uppercase)
  const getInitials = (name: string | null | undefined): string => {
    if (!name) return '??'
    const parts = name.trim().split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [isOpen])

  // Close on ESC key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const toggleMenu = () => {
    setIsOpen(!isOpen)
  }

  const role = user.role?.toLowerCase() || 'user'

  return (
    <div className="relative" ref={menuRef}>
      <button
        ref={buttonRef}
        onClick={toggleMenu}
        className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 font-medium hover:bg-blue-200 dark:hover:bg-blue-800 transition focus:outline-none focus:ring-2 focus:ring-blue-500"
        title={`${user.name || 'User'} (${user.role})`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {getInitials(user.name)}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
          {/* User info header */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <p className="font-medium text-gray-900 dark:text-white truncate">
              {user.name || 'User'}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {user.role || 'Unknown'}
            </p>
            {user.identityId && (
              <p className="text-xs font-mono text-gray-400 dark:text-gray-500 mt-1">
                {user.identityId}
              </p>
            )}
          </div>

          <div className="py-1">
            {/* Dashboard link */}
            <Link
              href={`/${role}`}
              className="block px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              onClick={() => setIsOpen(false)}
            >
              Dashboard
            </Link>

            {/* Role-specific link */}
            {(role === 'student' || role === 'instructor' || role === 'admin') && (
              <Link
                href={
                  role === 'student'
                    ? '/student/courses'
                    : '/instructor/courses'
                }
                className="block px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                onClick={() => setIsOpen(false)}
              >
                {role === 'student' ? 'My Learning' : 'My Courses'}
              </Link>
            )}

            {/* Divider */}
            <div className="border-t border-gray-200 dark:border-gray-700 my-1" />

            {/* Logout button */}
            <button
              onClick={() => {
                onLogout()
                setIsOpen(false)
              }}
              className="w-full text-left px-4 py-2 text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
