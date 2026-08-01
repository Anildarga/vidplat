import { Video, BarChart2, Award, FileText, Users, Smartphone } from 'lucide-react'

const features = [
  {
    icon: Video,
    title: 'HD Video Lessons',
    description: 'Watch high-quality video lessons at your own pace with resume support.',
  },
  {
    icon: BarChart2,
    title: 'Track Your Progress',
    description: 'Visual progress bars and completion tracking keep you motivated every step.',
  },
  {
    icon: Award,
    title: 'Earn Certificates',
    description: 'Get a verified certificate when you complete a course to showcase your achievement.',
  },
  {
    icon: FileText,
    title: 'Quizzes & Assessments',
    description: 'Test your knowledge with quizzes after each module to reinforce learning.',
  },
  {
    icon: Users,
    title: 'Expert Instructors',
    description: 'Learn from industry professionals with real-world experience.',
  },
  {
    icon: Smartphone,
    title: 'Learn Anywhere',
    description: 'Access all your courses from any device, anytime you want.',
  },
]

export default function FeaturesSection() {
  return (
    <section className="py-20 bg-white dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Everything you need to learn effectively
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            Built for modern learners and world-class instructors
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-6 hover:shadow-md transition-shadow duration-300 group"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mb-4 group-hover:scale-110 transition-transform">
                <feature.icon size={24} />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}