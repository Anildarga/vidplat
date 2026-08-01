export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 md:p-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Privacy Policy
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <div className="prose prose-lg dark:prose-invert max-w-none">
            <p>
              Eduplat ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our online learning platform.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
              1. Information We Collect
            </h2>
            <p>
              We collect information you provide directly to us, such as when you create an account, enroll in a course, or contact support. This may include:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Name, email address, phone number, and profile picture</li>
              <li>Educational background and professional details</li>
              <li>Payment information (processed securely via third‑party providers)</li>
              <li>Course progress, quiz scores, and completion certificates</li>
              <li>Communications with instructors and support staff</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
              2. How We Use Your Information
            </h2>
            <p>
              We use the collected information to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide, operate, and improve the Eduplat platform</li>
              <li>Personalize your learning experience and recommend relevant courses</li>
              <li>Process payments and send transaction notifications</li>
              <li>Communicate with you about platform updates, new features, and promotional offers</li>
              <li>Monitor and analyze usage trends to enhance security and performance</li>
              <li>Comply with legal obligations and enforce our Terms of Service</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
              3. Data Sharing and Disclosure
            </h2>
            <p>
              We do not sell your personal data. We may share information in the following circumstances:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>With Instructors:</strong> Your name, course progress, and quiz results may be shared with the instructor of a course you are enrolled in.
              </li>
              <li>
                <strong>Service Providers:</strong> We engage trusted third‑party vendors to assist with payment processing, email delivery, analytics, and hosting.
              </li>
              <li>
                <strong>Legal Requirements:</strong> We may disclose information if required by law, court order, or governmental authority.
              </li>
              <li>
                <strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets, your information may be transferred as part of the transaction.
              </li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
              4. Data Security
            </h2>
            <p>
              We implement industry‑standard technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet or electronic storage is 100% secure.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
              5. Your Rights
            </h2>
            <p>
              Depending on your location, you may have the right to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Access, correct, or delete your personal information</li>
              <li>Object to or restrict certain processing activities</li>
              <li>Data portability</li>
              <li>Withdraw consent where processing is based on consent</li>
            </ul>
            <p>
              To exercise these rights, please contact us at{' '}
              <a href="mailto:privacy@eduplat.com" className="text-blue-600 dark:text-blue-400 hover:underline">
                privacy@eduplat.com
              </a>.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
              6. Cookies and Tracking Technologies
            </h2>
            <p>
              We use cookies and similar tracking technologies to enhance user experience, analyze platform traffic, and personalize content. You can manage your cookie preferences through your browser settings.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
              7. Changes to This Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. The revised version will be posted on this page with an updated "Last updated" date. We encourage you to review this policy periodically.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
              8. Contact Us
            </h2>
            <p>
              If you have any questions or concerns about this Privacy Policy, please reach out to our Data Protection Officer at:
            </p>
            <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
              <p className="font-medium">Eduplat Team</p>
              <p>Email: <a href="mailto:anildarga3777@gmail.com" className="text-blue-600 dark:text-blue-400 hover:underline">privacy@eduplat.com</a></p>
              <p>Address: mailasandra, bengaluru, Karnataka 560059</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}