'use client'

import { useState } from 'react'

interface RatingStarsProps {
  rating: number
  onRatingChange?: (rating: number) => void
  size?: 'sm' | 'md' | 'lg'
  readOnly?: boolean
  showLabel?: boolean
}

export default function RatingStars({
  rating,
  onRatingChange,
  size = 'md',
  readOnly = false,
  showLabel = false,
}: RatingStarsProps) {
  const [hoverRating, setHoverRating] = useState(0)

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  }

  const handleClick = (value: number) => {
    if (!readOnly && onRatingChange) {
      onRatingChange(value)
    }
  }

  const handleMouseEnter = (value: number) => {
    if (!readOnly) {
      setHoverRating(value)
    }
  }

  const handleMouseLeave = () => {
    if (!readOnly) {
      setHoverRating(0)
    }
  }

  const displayRating = hoverRating || rating

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={`${sizeClasses[size]} ${!readOnly ? 'cursor-pointer' : 'cursor-default'}`}
            onClick={() => handleClick(star)}
            onMouseEnter={() => handleMouseEnter(star)}
            onMouseLeave={handleMouseLeave}
            disabled={readOnly}
            aria-label={`Rate ${star} out of 5 stars`}
          >
            <svg
              className={`${sizeClasses[size]} ${star <= displayRating ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
        ))}
        {showLabel && (
          <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
            {rating.toFixed(1)} out of 5
          </span>
        )}
      </div>
      {!readOnly && (
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Click to rate
        </div>
      )}
    </div>
  )
}