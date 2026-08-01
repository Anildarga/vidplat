import AnimatedCounter from './AnimatedCounter'

interface StatsSectionProps {
  stats: {
    courses: number
    users: number
    enrollments: number
    completedEnrollments: number
    avgRating: number
    completionRate: number
  }
}

export default function StatsSection({ stats }: StatsSectionProps) {
  const statItems = [
    {
      label: 'Courses Available',
      value: stats.courses,
      suffix: '+',
      description: 'Expert‑led courses across technology, design, and business',
    },
    {
      label: 'Students Enrolled',
      value: stats.users,
      suffix: '+',
      description: 'Learners building skills for their careers',
    },
    {
      label: 'Completion Rate',
      value: stats.completionRate,
      suffix: '%',
      description: 'Students who successfully finish courses',
    },
    {
      label: 'Avg Rating',
      value: stats.avgRating,
      suffix: '★',
      description: 'Average student satisfaction score',
    },
  ]

  return (
    <section className="py-16 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {statItems.map((item, index) => (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 text-center border border-gray-100 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-500 transition-colors group"
            >
              <div className="text-4xl md:text-5xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                <AnimatedCounter end={item.value} suffix={item.suffix} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                {item.label}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {item.description}
              </p>
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 group-hover:border-blue-300 dark:group-hover:border-blue-500 transition-colors" />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}