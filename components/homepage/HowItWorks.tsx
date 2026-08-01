import { UserPlus, Search, Award } from 'lucide-react'

const steps = [
  {
    number: 1,
    icon: UserPlus,
    title: 'Create Account',
    description: 'Sign up for free in seconds. No credit card required.',
  },
  {
    number: 2,
    icon: Search,
    title: 'Browse & Enroll',
    description: 'Explore courses from expert instructors and enroll in what interests you.',
  },
  {
    number: 3,
    icon: Award,
    title: 'Learn & Earn',
    description: 'Complete lessons at your pace and earn a verified certificate.',
  },
]

export default function HowItWorks() {
  return (
    <section className="py-20 bg-white dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            How EduPlat Works
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            Get started in 3 simple steps
          </p>
        </div>

        <div className="relative">
          {/* Connecting line for desktop */}
          <div className="hidden lg:block absolute top-12 left-1/4 right-1/4 h-0.5 border-t-2 border-dashed border-gray-300 dark:border-gray-700" />
          <div className="hidden lg:block absolute top-12 left-3/4 right-1/4 h-0.5 border-t-2 border-dashed border-gray-300 dark:border-gray-700" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {steps.map((step) => (
              <div key={step.number} className="relative text-center">
                {/* Number circle */}
                <div className="relative z-10 inline-flex items-center justify-center w-24 h-24 rounded-full bg-blue-600 text-white text-4xl font-bold mb-6 mx-auto">
                  {step.number}
                  <div className="absolute inset-0 rounded-full border-4 border-blue-200 animate-ping opacity-20" />
                </div>

                {/* Icon */}
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mb-4">
                  <step.icon size={28} />
                </div>

                <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
                  {step.title}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xs mx-auto">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Callout */}
        {/* <div className="mt-20 text-center">
          <div className="inline-block bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl px-8 py-6">
            <p className="text-lg text-gray-700 dark:text-gray-300">
              <span className="font-semibold">Ready to start?</span> Join thousands of learners who have transformed their careers with EduPlat.
            </p>
          </div>
        </div> */}
      </div>
    </section>
  )
}