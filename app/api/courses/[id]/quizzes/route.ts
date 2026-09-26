import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/courses/[id]/quizzes - Get all quizzes for a course
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;
    const session = await getServerSession(authOptions);

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { isPublished: true, adminApproved: true, instructorId: true },
    });

    if (!course) {
      return NextResponse.json(
        { success: false, error: 'Course not found' },
        { status: 404 }
      );
    }

    const isAdmin = session?.user?.role === 'ADMIN';
    const isOwner = session?.user?.id === course.instructorId;

    if (!isAdmin && !isOwner) {
      if (!course.isPublished || !course.adminApproved) {
        return NextResponse.json(
          { success: false, error: 'Course is not available' },
          { status: 404 }
        );
      }

      if (!session?.user?.id) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        );
      }

      const enrollment = await prisma.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId: session.user.id,
            courseId,
          },
        },
        select: { paymentStatus: true },
      });

      if (enrollment?.paymentStatus !== 'COMPLETED') {
        return NextResponse.json(
          { success: false, error: 'Course access requires completed payment' },
          { status: 403 }
        );
      }
    }

    const quizzes = await prisma.quiz.findMany({
      where: {
        courseId,
      },
      select: {
        id: true,
        title: true,
        description: true,
        passingScore: true,
        type: true,
        _count: {
          select: {
            questions: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return NextResponse.json({ success: true, data: quizzes });
  } catch (error) {
    console.error('[courses/[id]/quizzes GET]', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
