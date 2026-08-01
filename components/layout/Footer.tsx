'use client'

import Link from 'next/link'
import { useState } from 'react'
import ContactModal from '@/components/ContactModal'

export default function Footer() {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false)

  const openContactModal = () => setIsContactModalOpen(true)
  const closeContactModal = () => setIsContactModalOpen(false)

  return (
    <>
      <footer className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* <div className="space-y-4">
              <h3 className="text-xl font-bold text-blue-600 dark:text-blue-400">Eduplat</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Transform your learning journey with interactive courses, expert instructors, and hands‑on projects.
              </p>
            </div> */}

            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Platform</h4>
              <ul className="space-y-2">
                <li>
                  <Link href="/courses" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
                    Browse Courses
                  </Link>
                </li>
                <li>
                  <Link href="/instructor" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
                    Become an Instructor
                  </Link>
                </li>
                <li>
                  <Link href="/student" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
                    Student Dashboard
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Support</h4>
              <ul className="space-y-2">
                <li>
                  <Link href="/help" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
                    Help Center
                  </Link>
                </li>
                <li>
                  <button
                    onClick={openContactModal}
                    className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    Contact Us
                  </button>
                </li>
                <li>
                  <Link href="/privacy" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Connect</h4>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Get in touch with the developer for inquiries, collaborations, or support.
              </p>
              <div className="flex space-x-6">
                <a href="mailto:anildarga3777@gmail.com" className="text-gray-500 hover:text-blue-600 dark:hover:text-blue-400" title="Email">
                  <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </a>
                <a href="https://linkedin.com/in/anild3777" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-blue-600 dark:hover:text-blue-400" title="LinkedIn">
                  <svg className="h-7 w-7" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 3H4a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1zM8.339 18.337H5.667v-8.59h2.672v8.59zM7.003 8.574a1.548 1.548 0 1 1 0-3.096 1.548 1.548 0 0 1 0 3.096zm11.335 9.763h-2.669V14.16c0-.996-.018-2.277-1.388-2.277-1.39 0-1.601 1.086-1.601 2.207v4.248h-2.667v-8.59h2.56v1.174h.037c.355-.675 1.227-1.387 2.524-1.387 2.704 0 3.203 1.778 3.203 4.092v4.711z" />
                  </svg>
                </a>
                <a href="https://github.com/Anildarga" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-blue-600 dark:hover:text-blue-400" title="GitHub">
                  <svg className="h-7 w-7" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                  </svg>
                </a>
                <a href="tel:+917411041580" className="text-gray-500 hover:text-blue-600 dark:hover:text-blue-400" title="Phone">
                  <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </a>
              </div>
            </div>
  
            {/* Contact Info */}
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Contact</h4>
              <ul className="space-y-3 text-gray-600 dark:text-gray-400">
                <li className="flex items-start">
                  <span className="mr-3">📧</span>
                  <span>support@eduplat.com</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-3">📍</span>
                  <span>Bengaluru, Karnataka, India</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-3">🕐</span>
                  <span>Available Mon–Fri, 9am–6pm</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-300 dark:border-gray-700 text-center text-gray-500 dark:text-gray-400">
            <p>&copy; {new Date().getFullYear()} Eduplat. All rights reserved.</p>
          </div>
        </div>
      </footer>

      <ContactModal isOpen={isContactModalOpen} onClose={closeContactModal} />
    </>
  )
}