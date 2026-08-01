'use client'

import { useState } from 'react'
import Link from 'next/link'
import ContactModal from '@/components/ContactModal'

export default function HelpPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const [isContactModalOpen, setIsContactModalOpen] = useState(false)

  const openContactModal = () => setIsContactModalOpen(true)
  const closeContactModal = () => setIsContactModalOpen(false)

  const faqs = [
    {
      question: 'How do I enroll in a course?',
      answer: 'To enroll in a course, navigate to the "Courses" page, browse the available courses, and click on the course you\'re interested in. On the course details page, click the "Enroll Now" button. If you\'re not logged in, you\'ll be prompted to sign in or create an account. Once enrolled, you can access the course from your Student Dashboard.'
    },
    {
      question: 'Can I access courses on mobile devices?',
      answer: 'Yes, Eduplat is fully responsive and works on all devices including smartphones, tablets, and desktops. You can download our mobile app (coming soon) for an optimized learning experience on the go.'
    },
    {
      question: 'How do I reset my password?',
      answer: 'If you\'ve forgotten your password, go to the login page and click "Forgot Password". Enter your email address and you\'ll receive a link to reset your password. Make sure to check your spam folder if you don\'t see the email within a few minutes.'
    },
    {
      question: 'Are certificates provided upon course completion?',
      answer: 'Yes, certificates are automatically generated when you complete all required modules and pass the final assessment with a score of 70% or higher. You can download your certificate from the course completion page or from your Student Dashboard under "Certificates".'
    },
    {
      question: 'How can I become an instructor?',
      answer: 'If you\'re interested in teaching on Eduplat, visit the "Become an Instructor" page from the footer or navigate to /instructor. You\'ll need to submit an application with your credentials and sample course material. Our team will review your application and get back to you within 5-7 business days.'
    },
    {
      question: 'What payment methods are accepted?',
      answer: 'We accept major credit/debit cards (Visa, MasterCard, American Express), PayPal, and bank transfers for certain regions. All payments are processed securely through our encrypted payment gateway.'
    },
    {
      question: 'How do I contact support?',
      answer: 'You can reach our support team by clicking "Contact Us" in the footer of any page, which opens a contact form. Alternatively, you can email us directly at support@eduplat.com or call our helpline at +1-800-EDUPLAT during business hours (9 AM - 6 PM EST).'
    }
  ]

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Help Center
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            Find answers to common questions about using Eduplat. Can't find what you're looking for?{' '}
            <button
              onClick={openContactModal}
              className="text-blue-600 dark:text-blue-400 hover:underline focus:outline-none"
            >
              Contact our support team
            </button>
            .
          </p>
        </div>

        {/* FAQ Section */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden"
              >
                <button
                  className="w-full text-left p-6 flex justify-between items-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onClick={() => toggleFAQ(index)}
                  aria-expanded={openIndex === index}
                >
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white pr-4">
                    {faq.question}
                  </h3>
                  <span className="flex-shrink-0 ml-2">
                    <svg
                      className={`w-6 h-6 text-blue-600 dark:text-blue-400 transform transition-transform ${openIndex === index ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </button>
                {openIndex === index && (
                  <div className="px-6 pb-6">
                    <p className="text-gray-700 dark:text-gray-300">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Additional Help */}
        <div className="mt-16 max-w-4xl mx-auto">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800 border border-blue-200 dark:border-gray-700 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Still need help?
            </h3>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              Our support team is here to assist you with any questions or issues you may have.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={openContactModal}
                className="inline-flex items-center justify-center px-6 py-3 text-lg font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors focus:outline-none"
              >
                Contact Support
              </button>
              <a
                href="mailto:anildarga3777@gmail.com"
                className="inline-flex items-center justify-center px-6 py-3 text-lg font-semibold text-blue-600 bg-white dark:bg-gray-800 dark:text-blue-400 border border-blue-600 dark:border-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors"
              >
                Email Us
              </a>
            </div>
          </div>
        </div>
        <ContactModal isOpen={isContactModalOpen} onClose={closeContactModal} />
      </div>
    </div>
  )
}