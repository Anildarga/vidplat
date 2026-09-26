import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { createCheckoutSession } from '@/lib/stripe';

// GET /api/enrollments/[courseId] - Check if current user is enrolled
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { courseId } = await params;

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        enrolled: enrollment?.paymentStatus === 'COMPLETED',
        paymentStatus: enrollment?.paymentStatus ?? null,
      },
    });
  } catch (error) {
    console.error('[enrollments/[courseId] GET]', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/enrollments/[courseId] - Enroll in a course
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Only STUDENT role can enroll
    if (session.user.role !== 'STUDENT') {
      return NextResponse.json(
        { success: false, error: 'Only students can enroll in courses' },
        { status: 403 }
      );
    }

    const { courseId } = await params;
    const body = await req.json();
    const { couponCode } = body;

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

    if (!course.isPublished || !course.adminApproved) {
      return NextResponse.json(
        { success: false, error: 'Course is not available' },
        { status: 404 }
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

    let couponId: string | null = null;
    let discountApplied = 0;
    let finalPrice = course.price || 0;

    // Validate coupon if provided
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

      couponId = coupon.id;

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

    // Check if course is free or price is 0
    if (course.isFree || finalPrice <= 0) {
      // Create enrollment directly for free courses
      const enrollment = await prisma.enrollment.create({
        data: {
          userId: session.user.id,
          courseId,
          couponId,
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
      if (couponId) {
        await prisma.couponUsage.create({
          data: {
            couponId,
            userId: session.user.id,
            courseId,
            discountApplied,
          },
        });
      }

      return NextResponse.json(
        {
          success: true,
          data: enrollment,
          discountApplied,
          finalPrice,
          couponUsed: !!couponId,
          freeEnrollment: true,
        },
        { status: 201 }
      );
    } else {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

      const checkoutSession = await createCheckoutSession({
        courseId,
        courseTitle: course.title,
        amount: finalPrice,
        currency: course.currency || 'USD',
        userId: session.user.id,
        userEmail: session.user.email || undefined,
        successUrl: frontendUrl + '/courses/' + courseId + '?payment=success',
        cancelUrl: frontendUrl + '/courses/' + courseId + '?payment=cancelled',
        couponCode: couponCode || undefined,
      });

      // Persist the Stripe session ID so the webhook can reconcile payment.
      const enrollment = await prisma.enrollment.create({
        data: {
          userId: session.user.id,
          courseId,
          couponId,
          discountApplied,
          finalPrice,
          paymentStatus: 'PENDING',
          stripeSessionId: checkoutSession.id,
        },
      });

      return NextResponse.json(
        {
          success: true,
          data: {
            enrollmentId: enrollment.id,
            sessionId: checkoutSession.id,
            url: checkoutSession.url,
            requiresPayment: true,
            finalPrice,
            discountApplied,
            couponUsed: !!couponId,
            message: 'Payment required for this course',
          },
          redirectToCheckout: true,
        },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error('[enrollments/[courseId] POST]', error instanceof Error ? error.message : error);

    // Handle unique constraint violation
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { success: false, error: 'Already enrolled in this course' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/enrollments/[courseId] - Unenroll from a course
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { courseId } = await params;

    // Find and delete the enrollment
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId,
        },
      },
    });

    if (!enrollment) {
      return NextResponse.json(
        { success: false, error: 'Not enrolled in this course' },
        { status: 404 }
      );
    }

    await prisma.enrollment.delete({
      where: {
        id: enrollment.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Unenrolled successfully',
    });
  } catch (error) {
    console.error('[enrollments/[courseId] DELETE]', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
