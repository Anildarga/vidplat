'use client';

import { useState } from 'react';

interface CouponInputProps {
  courseId: string;
  onCouponApplied?: (valid: boolean, discount?: number, message?: string, code?: string) => void;
  disabled?: boolean;
}

export default function CouponInput({ courseId, onCouponApplied, disabled }: CouponInputProps) {
  const [couponCode, setCouponCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    message?: string;
    discount?: number;
    discountType?: 'PERCENTAGE' | 'FIXED';
    discountValue?: number;
  } | null>(null);

  const validateCoupon = async () => {
    if (!couponCode.trim()) {
      setValidationResult({ valid: false, message: 'Please enter a coupon code' });
      onCouponApplied?.(false, undefined, 'Please enter a coupon code');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode, courseId }),
      });

      const data = await res.json();

      if (data.success) {
        setValidationResult({
          valid: true,
          message: 'Coupon applied successfully!',
          discount: data.data.discountAmount,
          discountType: data.data.coupon.discountType,
          discountValue: data.data.coupon.discountValue,
        });
        onCouponApplied?.(true, data.data.discountAmount, 'Coupon applied successfully!', couponCode);
      } else {
        setValidationResult({ valid: false, message: data.error });
        onCouponApplied?.(false, undefined, data.error);
      }
    } catch (error) {
      console.error('Failed to validate coupon:', error);
      setValidationResult({ valid: false, message: 'Failed to validate coupon' });
      onCouponApplied?.(false, undefined, 'Failed to validate coupon');
    } finally {
      setLoading(false);
    }
  };

  const clearCoupon = () => {
    setCouponCode('');
    setValidationResult(null);
    onCouponApplied?.(false, undefined, undefined, '');
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={couponCode}
          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
          placeholder="Enter coupon code"
          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
          disabled={disabled || loading}
        />
        {validationResult?.valid ? (
          <button
            onClick={clearCoupon}
            className="px-4 py-2 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-md hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
            disabled={disabled}
          >
            Remove
          </button>
        ) : (
          <button
            onClick={validateCoupon}
            className="px-4 py-2 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={disabled || loading || !couponCode.trim()}
          >
            {loading ? 'Validating...' : 'Apply'}
          </button>
        )}
      </div>

      {validationResult && (
        <div
          className={`p-3 rounded-md text-sm ${
            validationResult.valid
              ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span>{validationResult.message}</span>
            {validationResult.valid && validationResult.discount && (
              <span className="font-semibold">
                -{validationResult.discountType === 'PERCENTAGE' ? `${validationResult.discountValue}%` : `$${validationResult.discount}`}
              </span>
            )}
          </div>
        </div>
      )}

      {validationResult?.valid && (
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Coupon will be applied when you enroll in the course.
        </div>
      )}
    </div>
  );
}