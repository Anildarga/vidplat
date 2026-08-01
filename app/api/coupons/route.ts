import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/coupons
 * List coupons for the authenticated instructor
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Only instructors can view coupons
    if (session.user.role !== 'INSTRUCTOR' && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const coupons = await prisma.coupon.findMany({
      where: {
        instructorId: session.user.id,
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
          },
        },
        _count: {
          select: {
            usages: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      data: coupons,
    });
  } catch (error) {
    console.error('[coupons GET]', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/coupons
 * Create a new coupon
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

    if (session.user.role !== 'INSTRUCTOR' && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      code,
      description,
      discountType,
      discountValue,
      maxUses,
      courseId,
      expiresAt,
    } = body;

    // Validate required fields
    if (!code || !discountType || discountValue === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate discount value
    if (discountType === 'PERCENTAGE' && (discountValue < 0 || discountValue > 100)) {
      return NextResponse.json(
        { success: false, error: 'Percentage discount must be between 0 and 100' },
        { status: 400 }
      );
    }

    if (discountType === 'FIXED_AMOUNT' && discountValue < 0) {
      return NextResponse.json(
        { success: false, error: 'Fixed discount must be positive' },
        { status: 400 }
      );
    }

    // If courseId is provided, verify the course belongs to the instructor
    if (courseId) {
      const course = await prisma.course.findUnique({
        where: { id: courseId },
      });

      if (!course) {
        return NextResponse.json(
          { success: false, error: 'Course not found' },
          { status: 404 }
        );
      }

      if (course.instructorId !== session.user.id) {
        return NextResponse.json(
          { success: false, error: 'You can only create coupons for your own courses' },
          { status: 403 }
        );
      }
    }

    // Check if coupon code already exists
    const existing = await prisma.coupon.findUnique({
      where: { code },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Coupon code already exists' },
        { status: 409 }
      );
    }

    const coupon = await prisma.coupon.create({
      data: {
        code,
        description,
        discountType,
        discountValue,
        maxUses,
        courseId,
        instructorId: session.user.id,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive: true,
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: coupon,
    }, { status: 201 });
  } catch (error) {
    console.error('[coupons POST]', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}