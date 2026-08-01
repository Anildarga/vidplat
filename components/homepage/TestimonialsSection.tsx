import { Star } from 'lucide-react'

const testimonials = [
  {
    quote: 'EduPlat completely changed how I approach learning. The video quality and instructor support is outstanding.',
    name: 'Priya S.',
    role: 'Software Engineer',
    initials: 'PS',
    rating: 5,
  },
  {
    quote: 'I earned my certificate in just 3 weeks. The course structure is clear and the quizzes really helped me retain knowledge.',
    name: 'Rahul M.',
    role: 'Data Analyst',
    initials: 'RM',
    rating: 5,
  },
  {
    quote: 'As an instructor, the platform tools are incredible. My students are more engaged than ever before.',
    name: 'Dr. Anitha K.',
    role: 'Instructor',
    initials: 'AK',
    rating: 5,
  },
]

export default function TestimonialsSection() {
  return (
    <section className="py-20 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            What Our Learners Say
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            Join thousands of satisfied students
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 rounded-xl p-8 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Quote mark */}
              <div className="text-6xl text-blue-100 dark:text-blue-900/30 mb-4">"</div>

              {/* Rating */}
              <div className="flex text-yellow-400 mb-4">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star key={i} size={20} fill="currentColor" />
                ))}
              </div>

              {/* Quote */}
              <blockquote className="text-gray-600 dark:text-gray-400 italic text-lg mb-6">
                {testimonial.quote}
              </blockquote>

              {/* Author */}
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold text-lg mr-4">
                  {testimonial.initials}
                </div>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {testimonial.name}
                  </div>
                  <div className="text-gray-500 dark:text-gray-400 text-sm">
                    {testimonial.role}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Trust indicators */}
        <div className="mt-16 pt-12 border-t border-gray-200 dark:border-gray-800">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">4.8/5</div>
              <div className="text-gray-500 dark:text-gray-400">Average Rating</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">98%</div>
              <div className="text-gray-500 dark:text-gray-400">Completion Rate</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">24/7</div>
              <div className="text-gray-500 dark:text-gray-400">Support Available</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">10k+</div>
              <div className="text-gray-500 dark:text-gray-400">Happy Learners</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}