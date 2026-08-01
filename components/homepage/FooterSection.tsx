import Link from 'next/link'

export default function FooterSection() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="space-y-4">
            <h2 className="text-3xl font-bold">EduPlat</h2>
            <p className="text-gray-400">
              Learn without limits.
            </p>
            <div className="flex space-x-4">
              <a href="#" aria-label="Facebook" className="text-gray-400 hover:text-white">
                <span className="text-xl">f</span>
              </a>
              <a href="#" aria-label="Twitter" className="text-gray-400 hover:text-white">
                <span className="text-xl">𝕏</span>
              </a>
              <a href="#" aria-label="Instagram" className="text-gray-400 hover:text-white">
                <span className="text-xl">📷</span>
              </a>
              <a href="#" aria-label="LinkedIn" className="text-gray-400 hover:text-white">
                <span className="text-xl">in</span>
              </a>
            </div>
          </div>

          {/* Platform */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Platform</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/courses" className="text-gray-400 hover:text-white">
                  Browse Courses
                </Link>
              </li>
              <li>
                <Link href="/register?role=INSTRUCTOR" className="text-gray-400 hover:text-white">
                  Become Instructor
                </Link>
              </li>
              <li>
                <Link href="/student/courses" className="text-gray-400 hover:text-white">
                  My Learning
                </Link>
              </li>
              <li>
                <Link href="/student" className="text-gray-400 hover:text-white">
                  Certificates
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Support</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/help" className="text-gray-400 hover:text-white">
                  Help Center
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-gray-400 hover:text-white">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-gray-400 hover:text-white">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-gray-400 hover:text-white">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact</h3>
            <ul className="space-y-3 text-gray-400">
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

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-gray-800 text-center text-gray-500 text-sm">
          <p>© 2026 EduPlat. All rights reserved.</p>
          <p className="mt-2">Built with ❤️ for learners worldwide.</p>
        </div>
      </div>
    </footer>
  )
}