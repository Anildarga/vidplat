import { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import HeroSection from '@/components/homepage/HeroSection'
import StatsSection from '@/components/homepage/StatsSection'
import FeaturesSection from '@/components/homepage/FeaturesSection'
import CoursesSection from '@/components/homepage/CoursesSection'
import HowItWorks from '@/components/homepage/HowItWorks'
import CTASection from '@/components/homepage/CTASection'

export const metadata: Metadata = {
  title: 'EduPlat — Learn Without Limits',
  description: 'Access expert-led courses in technology, design, and business. Learn at your own pace with HD videos, quizzes, and certificates.',
  keywords: 'online learning, courses, certificates, e-learning, EduPlat',
  openGraph: {
    title: 'EduPlat — Learn Without Limits',
    description: 'Expert-led online courses with certificates.',
    type: 'website',
  },
}

export default async function HomePage() {
  // Fetch stats in parallel
  const [coursesCount, usersCount, enrollmentsCount, completedEnrollmentsCount, avgRatingResult] = await Promise.all([
    prisma.course.count({ where: { isPublished: true } }),
    prisma.user.count(),
    prisma.enrollment.count(),
    prisma.enrollment.count({ where: { completedAt: { not: null } } }),
    prisma.review.aggregate({
      _avg: { rating: true },
    }),
  ])

  // Calculate completion rate
  const completionRate = enrollmentsCount > 0
    ? Math.round((completedEnrollmentsCount / enrollmentsCount) * 100)
    : 0

  // Fetch top 3 published courses ordered by enrollment count
  const featuredCourses = await prisma.course.findMany({
    where: { isPublished: true },
    include: {
      instructor: { select: { name: true, image: true } },
      _count: { select: { enrollments: true, videos: true } },
    },
    orderBy: { enrollments: { _count: 'desc' } },
    take: 3,
  })

  const stats = {
    courses: coursesCount,
    users: usersCount,
    enrollments: enrollmentsCount,
    completedEnrollments: completedEnrollmentsCount,
    avgRating: avgRatingResult._avg.rating ? parseFloat(avgRatingResult._avg.rating.toFixed(1)) : 4.8,
    completionRate,
  }

  return (
    <div className="min-h-screen">
      <HeroSection />
      <StatsSection stats={stats} />
      <FeaturesSection />
      <CoursesSection courses={featuredCourses} />
      <HowItWorks />
      <CTASection />
    </div>
  )
}
