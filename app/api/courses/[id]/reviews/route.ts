import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/courses/[id]/reviews - Get all reviews for a course
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    // Check if course exists
    const course = await prisma.course.findUnique({
      where: { id },
      select: { id: true, isPublished: true, instructorId: true },
    });

    if (!course) {
      return NextResponse.json(
        { success: false, error: 'Course not found' },
        { status: 404 }
      );
    }

    // If course is not published, only allow access to the course instructor or admin
    if (!course.isPublished) {
      if (!session) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }
      const isInstructor = session.user.id === course.instructorId;
      const isAdmin = session.user.role === 'ADMIN';
      if (!isInstructor && !isAdmin) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 403 }
        );
      }
    }

    // Get reviews with user details
    const reviews = await (prisma as any).review.findMany({
      where: { courseId: id },
      include: {
        user: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Calculate average rating
    const averageRating = (reviews as any[]).length > 0
      ? (reviews as any[]).reduce((sum: number, review: any) => sum + review.rating, 0) / (reviews as any[]).length
      : 0;

    // Get user's own review if logged in
    let userReview = null;
    if (session?.user?.id) {
      userReview = await (prisma as any).review.findUnique({
        where: {
          userId_courseId: {
            userId: session.user.id,
            courseId: id,
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        reviews,
        averageRating: parseFloat(averageRating.toFixed(1)),
        totalReviews: reviews.length,
        userReview,
      },
    });
  } catch (error: any) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}

// POST /api/courses/[id]/reviews - Create or update a review
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session || !session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user is enrolled in the course
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId: id,
        },
      },
    });

    if (enrollment?.paymentStatus !== 'COMPLETED') {
      return NextResponse.json(
        { success: false, error: 'You must have completed enrollment to leave a review' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { rating, comment } = body;

    // Validate rating
    if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, error: 'Rating must be a number between 1 and 5' },
        { status: 400 }
      );
    }

    // Create or update review (upsert)
    const review = await (prisma as any).review.upsert({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId: id,
        },
      },
      update: {
        rating,
        comment: comment || null,
        updatedAt: new Date(),
      },
      create: {
        userId: session.user.id,
        courseId: id,
        rating,
        comment: comment || null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: review,
      message: 'Review submitted successfully',
    });
  } catch (error: any) {
    console.error('Error submitting review:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to submit review' },
      { status: 500 }
    );
  }
}

// DELETE /api/courses/[id]/reviews - Delete user's review
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session || !session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Delete the review
    await (prisma as any).review.delete({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId: id,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Review deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting review:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete review' },
      { status: 500 }
    );
  }
}