import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { CourseWithDetails } from '@/types/course';
import { normalizeMoney } from '@/lib/money';
import { archiveTrash } from '@/lib/trash';

// GET /api/courses/[id] - Get single course (published for public, all for authorized instructor/admin)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        instructor: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        videos: {
          orderBy: {
            order: 'asc',
          },
        },
        quizzes: true,
        courseNotes: { orderBy: { order: 'asc' } },
        documents: { orderBy: { order: 'asc' } },
        _count: {
          select: {
            enrollments: true,
            videos: true,
          },
        },
      },
    });

    if (!course) {
      return NextResponse.json(
        { success: false, error: 'Course not found' },
        { status: 404 }
      );
    }

    // Students only see courses after author publishing + admin approval.
    if (!course.isPublished || !course.adminApproved) {
      if (!session) {
        return NextResponse.json(
          { success: false, error: 'Course not found' },
          { status: 404 }
        );
      }
      const isOwner = course.instructorId === session.user.id;
      const isAdmin = session.user.role === 'ADMIN';
      if (!isOwner && !isAdmin) {
        return NextResponse.json(
          { success: false, error: 'Course not found' },
          { status: 404 }
        );
      }
    }

    const isOwner = session?.user?.id === course.instructorId;
    const isAdmin = session?.user?.role === 'ADMIN';
    const isInstructor = session?.user?.role === 'INSTRUCTOR' && isOwner;

    let hasCompletedEnrollment = false;
    if (session?.user?.id && !isOwner && !isAdmin) {
      const enrollment = await prisma.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId: session.user.id,
            courseId: id,
          },
        },
        select: { paymentStatus: true },
      });
      hasCompletedEnrollment = enrollment?.paymentStatus === 'COMPLETED';
    }

    const canAccessCourseContent =
      isOwner || isInstructor || isAdmin || hasCompletedEnrollment;

    // Do not expose paid video URLs or quiz answer data through this endpoint.
    // Public/pending-payment users still receive course metadata.
    const responseCourse = canAccessCourseContent
      ? course
      : {
          ...course,
          videos: course.videos.map(({ url: _url, ...video }) => ({
            ...video,
            url: '',
          })),
          quizzes: course.quizzes.map((quiz) => ({
            id: quiz.id,
            title: quiz.title,
            description: quiz.description,
            courseId: quiz.courseId,
            createdAt: quiz.createdAt,
            passingScore: quiz.passingScore,
            type: quiz.type,
          })),
          courseNotes: course.courseNotes.map(({ content: _content, ...note }) => note),
          documents: course.documents.map(({ url: _url, ...document }) => document),
        };

    // Fetch reviews for this course separately
    const reviews = await (prisma as any).review.findMany({
      where: { courseId: id },
      select: {
        id: true,
        rating: true,
      },
    });
    
    // Calculate average rating
    const averageRating = reviews.length > 0
      ? parseFloat((reviews.reduce((sum: number, review: any) => sum + (review.rating || 0), 0) / reviews.length).toFixed(1))
      : 0;
    
    const typedCourse: CourseWithDetails = {
      ...responseCourse,
      reviews,
      averageRating,
      _count: {
        ...course._count,
        reviews: reviews.length,
      },
    } as CourseWithDetails;

    return NextResponse.json({ success: true, data: typedCourse });
  } catch (error) {
    console.error('[courses/[id] GET]', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/courses/[id] - Update course (owner or ADMIN only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // First fetch the course to check ownership
    const existingCourse = await prisma.course.findUnique({
      where: { id },
    });

    if (!existingCourse) {
      return NextResponse.json(
        { success: false, error: 'Course not found' },
        { status: 404 }
      );
    }

    // Check ownership: instructor must own the course or be ADMIN
    const isOwner = existingCourse.instructorId === session.user.id;
    const isAdmin = session.user.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You can only edit your own courses' },
        { status: 403 }
      );
    }

    const { title, description, thumbnail, isPublished, price, currency, isFree } = await req.json();

    const updateData: Record<string, unknown> = {};
    let nextPrice = existingCourse.price;
    let nextIsFree = existingCourse.isFree;

    if (price !== undefined) {
      const priceValue = normalizeMoney(price);
      if (priceValue === null) {
        return NextResponse.json(
          { success: false, error: 'Price must be a non-negative number' },
          { status: 400 }
        );
      }
      nextPrice = priceValue;
    }

    if (isFree !== undefined) {
      const requestedIsFree = Boolean(isFree);
      if (requestedIsFree && nextPrice > 0) {
        return NextResponse.json(
          { success: false, error: 'A free course must have a zero price' },
          { status: 400 }
        );
      }
      if (!requestedIsFree && nextPrice === 0) {
        return NextResponse.json(
          { success: false, error: 'A zero-price course must be free' },
          { status: 400 }
        );
      }
      nextIsFree = requestedIsFree;
    }

    if (nextPrice === 0) {
      nextIsFree = true;
    }

    updateData.price = nextPrice;
    updateData.isFree = nextIsFree;

    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim() === '') {
        return NextResponse.json(
          { success: false, error: 'Title cannot be empty' },
          { status: 400 }
        );
      }
      updateData.title = title.trim();
    }

    if (description !== undefined) {
      updateData.description = description ? description.trim() : null;
    }

    if (thumbnail !== undefined) {
      updateData.thumbnail = thumbnail ? thumbnail.trim() : null;
    }

    if (isPublished !== undefined) {
      updateData.isPublished = Boolean(isPublished);
    }

    if (currency !== undefined) {
      updateData.currency = currency.trim();
    }

    const updatedCourse = await prisma.course.update({
      where: { id },
      data: updateData,
      include: {
        instructor: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        videos: true,
        quizzes: {
          select: {
            id: true,
          },
        },
        _count: {
          select: {
            enrollments: true,
            videos: true,
          },
        },
      },
    });

    const typedCourse: CourseWithDetails = updatedCourse as CourseWithDetails;

    return NextResponse.json({ success: true, data: typedCourse });
  } catch (error) {
    console.error('[courses/[id] PATCH]', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/courses/[id] - Delete course (owner or ADMIN only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // First fetch the course to check ownership
    const existingCourse = await prisma.course.findUnique({
      where: { id },
    });

    if (!existingCourse) {
      return NextResponse.json(
        { success: false, error: 'Course not found' },
        { status: 404 }
      );
    }

    // Check ownership: instructor must own the course or be ADMIN
    const isOwner = existingCourse.instructorId === session.user.id;
    const isAdmin = session.user.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You can only delete your own courses' },
        { status: 403 }
      );
    }

    const courseSnapshot = await prisma.course.findUnique({
      where: { id },
      include: {
        videos: true,
        quizzes: { include: { questions: true } },
        courseNotes: true,
        documents: true,
      },
    });

    if (!courseSnapshot) {
      return NextResponse.json(
        { success: false, error: 'Course not found' },
        { status: 404 }
      );
    }

    await archiveTrash({
      entityType: 'COURSE',
      entityId: id,
      courseId: id,
      deletedById: session.user.id,
      payload: courseSnapshot,
    });

    await prisma.course.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Course deleted successfully',
    });
  } catch (error) {
    console.error('[courses/[id] DELETE]', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
