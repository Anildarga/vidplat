import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { createCheckoutSession } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { courseId, couponCode } = await req.json();

    if (!courseId) {
      return NextResponse.json(
        { success: false, error: 'Course ID is required' },
        { status: 400 }
      );
    }

    // Check if course exists and is published
    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      return NextResponse.json(
        { success: false, error: 'Course not found' },
        { status: 404 }
      );
    }

    if (!course.isPublished) {
      return NextResponse.json(
        { success: false, error: 'Course is not available' },
        { status: 400 }
      );
    }

    // Check if already enrolled
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId,
        },
      },
    });

    if (existingEnrollment) {
      return NextResponse.json(
        { success: false, error: 'Already enrolled in this course' },
        { status: 409 }
      );
    }

    // Calculate price with coupon if provided
    let finalPrice = course.price || 0;
    let discountApplied = 0;
    let validCouponId: string | null = null;

    if (couponCode) {
      const coupon = await prisma.coupon.findUnique({
        where: { code: couponCode },
        include: {
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
          { status: 400 }
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

      validCouponId = coupon.id;

      // Calculate discount
      if (coupon.discountType === 'PERCENTAGE') {
        discountApplied = Math.round((course.price || 0) * (coupon.discountValue / 100));
      } else {
        discountApplied = coupon.discountValue;
      }

      // Ensure discount doesn't exceed price
      discountApplied = Math.min(discountApplied, course.price || 0);
      finalPrice = Math.max(0, (course.price || 0) - discountApplied);
    }

    // If course is free, create enrollment directly without payment
    if (course.isFree || finalPrice <= 0) {
      const enrollment = await prisma.enrollment.create({
        data: {
          userId: session.user.id,
          courseId,
          couponId: validCouponId,
          discountApplied,
          finalPrice,
          paymentStatus: 'COMPLETED',
          paidAt: new Date(),
        },
        include: {
          course: {
            include: {
              instructor: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                },
              },
            },
          },
        },
      });

      // Create coupon usage record if coupon was used
      if (validCouponId) {
        await prisma.couponUsage.create({
          data: {
            couponId: validCouponId,
            userId: session.user.id,
            courseId,
            discountApplied,
          },
        });
      }

      return NextResponse.json({
        success: true,
        data: {
          enrollment,
          freeEnrollment: true,
          message: 'Successfully enrolled in free course',
        },
      });
    }

    // Create Stripe checkout session for paid course
    const checkoutSession = await createCheckoutSession({
      courseId,
      courseTitle: course.title,
      amount: finalPrice,
      currency: course.currency || 'USD',
      userId: session.user.id,
      userEmail: session.user.email || undefined,
      successUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/courses/${courseId}?payment=success`,
      cancelUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/courses/${courseId}?payment=cancelled`,
      couponCode: couponCode || undefined,
    });

    // Create pending enrollment record
    const enrollment = await prisma.enrollment.create({
      data: {
        userId: session.user.id,
        courseId,
        couponId: validCouponId,
        discountApplied,
        finalPrice,
        paymentStatus: 'PENDING',
        stripeSessionId: checkoutSession.id,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        sessionId: checkoutSession.id,
        url: checkoutSession.url,
        enrollmentId: enrollment.id,
      },
    });
  } catch (error) {
    console.error('[stripe/checkout POST]', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}