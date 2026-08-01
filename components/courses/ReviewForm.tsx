'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import RatingStars from '@/components/RatingStars'

interface ReviewFormProps {
  courseId: string
  userReview?: {
    id: string
    rating: number
    comment: string | null
  } | null
  onReviewSubmitted?: () => void
}

export default function ReviewForm({ courseId, userReview, onReviewSubmitted }: ReviewFormProps) {
  const { data: session } = useSession()
  const [rating, setRating] = useState(userReview?.rating || 0)
  const [comment, setComment] = useState(userReview?.comment || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  if (!session) {
    return (
      <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-blue-700 dark:text-blue-300">
          Please sign in to leave a review.
        </p>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (rating === 0) {
      setError('Please select a rating')
      setLoading(false)
      return
    }

    try {
      const response = await fetch(`/api/courses/${courseId}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rating, comment }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit review')
      }

      setSuccess(true)
      if (onReviewSubmitted) {
        onReviewSubmitted()
      }
      
      // Reset form if it was a new review (not editing)
      if (!userReview) {
        setComment('')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit review')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete your review?')) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/courses/${courseId}/reviews`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete review')
      }

      setRating(0)
      setComment('')
      setSuccess(true)
      if (onReviewSubmitted) {
        onReviewSubmitted()
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete review')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {userReview ? 'Edit Your Review' : 'Leave a Review'}
      </h3>
      
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded text-sm mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 p-3 rounded text-sm mb-4">
          Review {userReview ? 'updated' : 'submitted'} successfully!
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Your Rating
          </label>
          <RatingStars
            rating={rating}
            onRatingChange={setRating}
            readOnly={false}
            size="lg"
          />
        </div>

        <div className="mb-4">
          <label htmlFor="comment" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Your Review (Optional)
          </label>
          <textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Share your experience with this course..."
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading || rating === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Submitting...' : userReview ? 'Update Review' : 'Submit Review'}
          </button>
          
          {userReview && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Delete Review
            </button>
          )}
        </div>
      </form>
    </div>
  )
}