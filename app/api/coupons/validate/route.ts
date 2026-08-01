import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * POST /api/coupons/validate
 * Validate a coupon code for a course
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { code, courseId } = body;

    if (!code || !courseId) {
      return NextResponse.json(
        { success: false, error: 'Missing coupon code or course ID' },
        { status: 400 }
      );
    }

    // Find the coupon
    const coupon = await prisma.coupon.findUnique({
      where: { code },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            price: true,
            currency: true,
          },
        },
        _count: {
          select: {
            usages: true,
          },
        },
      },
    });

    if (!coupon) {
      return NextResponse.json(
        { success: false, error: 'Invalid coupon code' },
        { status: 404 }
      );
    }

    // Check if coupon is active
    if (!coupon.isActive) {
      return NextResponse.json(
        { success: false, error: 'Coupon is inactive' },
        { status: 400 }
      );
    }

    // Check expiry
    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      return NextResponse.json(
        { success: false, error: 'Coupon has expired' },
        { status: 400 }
      );
    }

    // Check if coupon is for this course (or global)
    if (coupon.courseId && coupon.courseId !== courseId) {
      return NextResponse.json(
        { success: false, error: 'This coupon is not valid for the selected course' },
        { status: 400 }
      );
    }

    // Check usage limits
    if (coupon.maxUses !== null && coupon._count.usages >= coupon.maxUses) {
      return NextResponse.json(
        { success: false, error: 'Coupon usage limit reached' },
        { status: 400 }
      );
    }

    // Check if user has already used this coupon for this course
    const existingUsage = await prisma.couponUsage.findUnique({
      where: {
        couponId_userId_courseId: {
          couponId: coupon.id,
          userId: session.user.id,
          courseId,
        },
      },
    });

    if (existingUsage) {
      return NextResponse.json(
        { success: false, error: 'You have already used this coupon for this course' },
        { status: 400 }
      );
    }

    // Get course price
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { price: true, currency: true },
    });

    if (!course) {
      return NextResponse.json(
        { success: false, error: 'Course not found' },
        { status: 404 }
      );
    }

    // Calculate discounted price
    let discountAmount = 0;
    let finalPrice = course.price;

    if (coupon.discountType === 'PERCENTAGE') {
      discountAmount = (course.price * coupon.discountValue) / 100;
      finalPrice = course.price - discountAmount;
    } else if (coupon.discountType === 'FIXED_AMOUNT') {
      discountAmount = coupon.discountValue;
      finalPrice = Math.max(0, course.price - discountAmount);
    }

    return NextResponse.json({
      success: true,
      data: {
        coupon: {
          id: coupon.id,
          code: coupon.code,
          description: coupon.description,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          expiresAt: coupon.expiresAt,
        },
        originalPrice: course.price,
        currency: course.currency,
        discountAmount,
        finalPrice,
        isValid: true,
      },
    });
  } catch (error) {
    console.error('[coupons validate POST]', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}