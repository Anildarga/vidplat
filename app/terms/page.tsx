export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 md:p-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Terms of Service
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Effective date: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <div className="prose prose-lg dark:prose-invert max-w-none">
            <p>
              Welcome to Eduplat. By accessing or using our online learning platform, you agree to be bound by these Terms of Service ("Terms"). If you do not agree with any part of these Terms, you may not use our services.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
              1. Acceptance of Terms
            </h2>
            <p>
              By creating an account, enrolling in a course, or otherwise using Eduplat, you acknowledge that you have read, understood, and agree to be bound by these Terms, our Privacy Policy, and any additional guidelines or rules posted on the platform.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
              2. User Accounts
            </h2>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must provide accurate and complete information during registration and keep it updated. You may not share your account with others or use another user's account.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
              3. Course Enrollment and Access
            </h2>
            <p>
              Upon enrollment, you are granted a limited, non‑exclusive, non‑transferable license to access the course materials for your personal, non‑commercial use. Course access may be subject to a fee, and payment must be made in accordance with our pricing and payment terms.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
              4. User Conduct
            </h2>
            <p>
              You agree not to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Upload, post, or transmit any content that is unlawful, harmful, defamatory, or infringes on intellectual property rights</li>
              <li>Attempt to disrupt or interfere with the platform's security, functionality, or availability</li>
              <li>Use automated systems (bots, scrapers, etc.) to access or collect data from Eduplat without our prior written consent</li>
              <li>Impersonate any person or entity, or falsely state your affiliation with a person or entity</li>
              <li>Engage in any activity that could damage, disable, or overburden the platform</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
              5. Intellectual Property
            </h2>
            <p>
              All content on Eduplat, including but not limited to text, graphics, logos, videos, quizzes, and software, is the property of Eduplat or its licensors and is protected by copyright and other intellectual property laws. You may not reproduce, distribute, modify, or create derivative works without explicit permission.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
              6. Payments and Refunds
            </h2>
            <p>
              Course fees are clearly displayed before enrollment. All payments are processed through secure third‑party payment gateways. Refund policies are course‑specific and will be disclosed at the time of purchase. Generally, refunds may be requested within 14 days of enrollment if you have not completed more than 20% of the course content.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
              7. Termination
            </h2>
            <p>
              We reserve the right to suspend or terminate your account and access to the platform at our sole discretion, with or without cause, and with or without notice. Upon termination, you must cease all use of the platform and any downloaded materials.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
              8. Disclaimer of Warranties
            </h2>
            <p>
              Eduplat is provided "as is" and "as available" without warranties of any kind, either express or implied. We do not guarantee that the platform will be uninterrupted, error‑free, or free from viruses or other harmful components.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
              9. Limitation of Liability
            </h2>
            <p>
              To the fullest extent permitted by law, Eduplat and its affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or related to your use of the platform, even if advised of the possibility of such damages.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
              10. Governing Law
            </h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the State of Delaware, without regard to its conflict of law principles. Any legal action or proceeding arising under these Terms shall be brought exclusively in the courts located in Delaware.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
              11. Changes to Terms
            </h2>
            <p>
              We may modify these Terms at any time. The updated version will be posted on this page with a revised effective date. Your continued use of Eduplat after such changes constitutes your acceptance of the new Terms.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
              12. Contact Information
            </h2>
            <p>
              If you have any questions about these Terms, please contact us at:
            </p>
            <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
              <p className="font-medium">Eduplat Legal Team</p>
              <p>Email: <a href="mailto:anildarga3777@gmail.com" className="text-blue-600 dark:text-blue-400 hover:underline">anildarga3777@gmail.com</a></p>
              <p>Address: mailasandra, bengaluru, Karnataka 560059</p>
            </div>
    
          </div>
        </div>
      </div>
    </div>
  )
}