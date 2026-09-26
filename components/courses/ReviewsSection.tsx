'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import RatingStars from '@/components/RatingStars'
import ReviewForm from './ReviewForm'

interface Review {
  id: string
  rating: number
  comment: string | null
  createdAt: string
  user: {
    name: string | null
  }
}

interface ReviewsSectionProps {
  courseId: string
  initialReviews?: Review[]
  initialAverageRating?: number
  initialTotalReviews?: number
}

export default function ReviewsSection({
  courseId,
  initialReviews = [],
  initialAverageRating = 0,
  initialTotalReviews = 0,
}: ReviewsSectionProps) {
  const { data: session } = useSession()
  const [reviews, setReviews] = useState<Review[]>(initialReviews)
  const [averageRating, setAverageRating] = useState(initialAverageRating)
  const [totalReviews, setTotalReviews] = useState(initialTotalReviews)
  const [loading, setLoading] = useState(false)
  const [userReview, setUserReview] = useState<Review | null>(null)

  const fetchReviews = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/courses/${courseId}/reviews`)
      const data = await response.json()
      
      if (data.success) {
        setReviews(data.data.reviews)
        setAverageRating(data.data.averageRating)
        setTotalReviews(data.data.totalReviews)
        setUserReview(data.data.userReview)
      }
    } catch (error) {
      console.error('Error fetching reviews:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReviews()
  }, [courseId])

  const handleReviewSubmitted = () => {
    fetchReviews()
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="mt-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Reviews & Ratings
        </h2>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {averageRating.toFixed(1)}
            </div>
            <div className="flex justify-center">
              <RatingStars rating={averageRating} readOnly size="sm" />
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {totalReviews} review{totalReviews !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </div>

      {/* Review Form */}
      <div className="mb-8">
        <ReviewForm
          courseId={courseId}
          userReview={userReview}
          onReviewSubmitted={handleReviewSubmitted}
        />
      </div>

      {/* Reviews List */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Student Reviews
        </h3>
        
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Loading reviews...</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              No reviews yet. Be the first to review this course!
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                      <span className="text-gray-600 dark:text-gray-300 font-medium">
                        {review.user.name?.charAt(0) || 'U'}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {review.user.name || 'Anonymous'}
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(review.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <RatingStars rating={review.rating} readOnly size="sm" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {review.rating}.0
                    </span>
                  </div>
                </div>
                
                {review.comment && (
                  <p className="text-gray-700 dark:text-gray-300 mt-3">
                    {review.comment}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}