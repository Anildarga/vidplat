import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/bookmarks - Get all bookmarked courses for the logged-in user
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Fetch bookmarks for the current user with course details
    const bookmarks = await prisma.bookmark.findMany({
      where: {
        userId: session.user.id,
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
            videos: {
              select: {
                id: true,
              },
            },
            quizzes: {
              select: {
                id: true,
              },
            },
            _count: {
              select: {
                enrollments: true,
                videos: true,
                reviews: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Transform to include average rating
    const coursesWithRating = await Promise.all(
      bookmarks.map(async (bookmark) => {
        const reviews = await prisma.review.findMany({
          where: { courseId: bookmark.course.id },
          select: { rating: true },
        });
        const avgRating =
          reviews.length > 0
            ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
            : 0;

        return {
          ...bookmark.course,
          averageRating: parseFloat(avgRating.toFixed(1)),
          _count: {
            ...bookmark.course._count,
            reviews: reviews.length,
          },
          bookmarkedAt: bookmark.createdAt,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: coursesWithRating,
    });
  } catch (error) {
    console.error('Error fetching bookmarks:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch bookmarks' },
      { status: 500 }
    );
  }
}

// POST /api/bookmarks - Toggle bookmark for a course
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { courseId } = await req.json();

    if (!courseId) {
      return NextResponse.json(
        { success: false, error: 'Course ID is required' },
        { status: 400 }
      );
    }

    // Check if course exists
    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      return NextResponse.json(
        { success: false, error: 'Course not found' },
        { status: 404 }
      );
    }

    // Check if already bookmarked
    const existingBookmark = await prisma.bookmark.findUnique({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId,
        },
      },
    });

    if (existingBookmark) {
      // Remove bookmark
      await prisma.bookmark.delete({
        where: {
          id: existingBookmark.id,
        },
      });

      return NextResponse.json({
        success: true,
        action: 'removed',
        message: 'Course removed from bookmarks',
      });
    } else {
      // Add bookmark
      await prisma.bookmark.create({
        data: {
          userId: session.user.id,
          courseId,
        },
      });

      return NextResponse.json({
        success: true,
        action: 'added',
        message: 'Course added to bookmarks',
      });
    }
  } catch (error) {
    console.error('Error toggling bookmark:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to toggle bookmark' },
      { status: 500 }
    );
  }
}

// DELETE /api/bookmarks/[courseId] - Remove bookmark for a course
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Extract courseId from URL
    const url = new URL(req.url);
    const courseId = url.pathname.split('/').pop();

    if (!courseId) {
      return NextResponse.json(
        { success: false, error: 'Course ID is required' },
        { status: 400 }
      );
    }

    // Delete bookmark if exists
    const deleted = await prisma.bookmark.deleteMany({
      where: {
        userId: session.user.id,
        courseId,
      },
    });

    if (deleted.count === 0) {
      return NextResponse.json(
        { success: false, error: 'Bookmark not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Bookmark removed successfully',
    });
  } catch (error) {
    console.error('Error deleting bookmark:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete bookmark' },
      { status: 500 }
    );
  }
}