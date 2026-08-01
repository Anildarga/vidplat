'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import CouponInput from './CouponInput';
import { loadStripe } from '@stripe/stripe-js';

interface Props {
  courseId: string;
}

interface CourseDetails {
  id: string;
  title: string;
  price: number;
  currency: string;
  isFree: boolean;
}

export default function EnrollButton({ courseId }: Props) {
  const { data: session, status } = useSession();
  const [enrolled, setEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [couponValid, setCouponValid] = useState(false);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [courseDetails, setCourseDetails] = useState<CourseDetails | null>(null);
  const [finalPrice, setFinalPrice] = useState<number>(0);

  useEffect(() => {
    if (status === 'authenticated') {
      checkEnrollment();
      fetchCourseDetails();
    } else if (status === 'unauthenticated') {
      setLoading(false);
    }
  }, [courseId, status]);

  const checkEnrollment = async () => {
    try {
      const res = await fetch(`/api/enrollments/${courseId}`, {
        cache: 'no-store',
      });
      const data = await res.json();
      if (res.ok) {
        setEnrolled(data.data?.enrolled ?? false);
      }
    } catch (error) {
      console.error('Failed to check enrollment:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourseDetails = async () => {
    try {
      const res = await fetch(`/api/courses/${courseId}`, {
        cache: 'no-store',
      });
      const data = await res.json();
      if (res.ok && data.data) {
        const course = data.data;
        setCourseDetails({
          id: course.id,
          title: course.title,
          price: course.price || 0,
          currency: course.currency || 'USD',
          isFree: course.isFree || course.price === 0,
        });
        setFinalPrice(course.price || 0);
      }
    } catch (error) {
      console.error('Failed to fetch course details:', error);
    }
  };

  const handleCouponApplied = (valid: boolean, discount?: number, message?: string, code?: string) => {
    setCouponValid(valid);
    setDiscountAmount(discount || 0);
    if (valid && code) {
      setCouponCode(code);
      // Update final price based on discount
      if (courseDetails) {
        const newPrice = Math.max(0, (courseDetails.price || 0) - (discount || 0));
        setFinalPrice(newPrice);
      }
    } else {
      setCouponCode(null);
      // Reset to original price
      if (courseDetails) {
        setFinalPrice(courseDetails.price || 0);
      }
    }
  };


  const handleEnroll = async () => {
    setEnrolling(true);
    try {
      const body: any = {};
      if (couponCode) {
        body.couponCode = couponCode;
      }

      const res = await fetch(`/api/enrollments/${courseId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setEnrolled(true);
        // Show success message with discount if applied
        if (data.discountApplied > 0) {
          alert(`Successfully enrolled! Discount applied: $${data.discountApplied}`);
        } else {
          alert('Successfully enrolled!');
        }
      } else {
        alert(data.error || 'Failed to enroll');
      }
    } catch (error) {
      alert('An error occurred');
    } finally {
      setEnrolling(false);
    }
  };

  const handleUnenroll = async () => {
    if (!confirm('Are you sure you want to unenroll from this course?')) {
      return;
    }
    setEnrolling(true);
    try {
      const res = await fetch(`/api/enrollments/${courseId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setEnrolled(false);
      } else {
        alert(data.error || 'Failed to unenroll');
      }
    } catch (error) {
      alert('An error occurred');
    } finally {
      setEnrolling(false);
    }
  };

  // Not authenticated
  if (status === 'unauthenticated') {
    return (
      <a
        href="/login"
        className="w-full px-6 py-3 bg-blue-600 text-white text-center rounded hover:bg-blue-700"
      >
        Sign in to enroll
      </a>
    );
  }

  // Instructors and admins don't enroll
  if (session?.user?.role === 'INSTRUCTOR' || session?.user?.role === 'ADMIN') {
    return null;
  }

  if (loading) {
    return (
      <button disabled className="w-full px-6 py-3 bg-gray-400 text-white rounded">
        Loading...
      </button>
    );
  }

  if (enrolled) {
    return (
      <div className="flex gap-2">
        <a
          href={`/learn/${courseId}`}
          className="flex-1 px-6 py-3 bg-green-600 text-white text-center rounded hover:bg-green-700"
        >
          Continue Learning
        </a>
        <button
          onClick={handleUnenroll}
          disabled={enrolling}
          className="px-6 py-3 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
        >
          {enrolling ? 'Unenrolling...' : 'Unenroll'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <CouponInput
        courseId={courseId}
        onCouponApplied={handleCouponApplied}
        disabled={enrolling}
      />
      
      <button
        onClick={handleEnroll}
        disabled={enrolling}
        className="w-full px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {enrolling ? 'Enrolling...' : couponValid ? `Enroll with Discount` : 'Enroll for Free'}
      </button>
      
      {couponValid && discountAmount > 0 && (
        <div className="text-sm text-green-600 dark:text-green-400 text-center">
          You'll save ${discountAmount} with this coupon!
        </div>
      )}
    </div>
  );
}
