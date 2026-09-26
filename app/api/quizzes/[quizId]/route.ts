import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { calculateCourseProgress } from '@/lib/progress-calculator';

// GET /api/quizzes/[quizId] - Get quiz with questions
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const { quizId } = await params;
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          orderBy: {
            order: 'asc',
          },
        },
        course: {
          select: {
            id: true,
            title: true,
            instructorId: true,
          },
        },
      },
    });

    if (!quiz) {
      return NextResponse.json(
        { success: false, error: 'Quiz not found' },
        { status: 404 }
      );
    }

    // Check if user can access this quiz
    const isInstructor = quiz.course.instructorId === session.user.id;
    const isAdmin = session.user.role === 'ADMIN';
    const isEnrolled = await prisma.enrollment.findFirst({
      where: {
        userId: session.user.id,
        courseId: quiz.courseId,
      },
    });

    if (!isInstructor && !isAdmin && !isEnrolled) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You must be enrolled in this course to view this quiz' },
        { status: 403 }
      );
    }

    // For non-instructors/admins: require all videos to be completed to access quiz (unless it's a supplemental? but same rule)
    if (!isInstructor && !isAdmin) {
      const progress = await calculateCourseProgress(session.user.id, quiz.courseId);
      if (progress.percentComplete < 100) {
        return NextResponse.json(
          { success: false, error: 'You must complete all videos before accessing this quiz' },
          { status: 403 }
        );
      }
    }

    // Never expose correct answers to students before they submit the quiz.
    // Instructors/admins need the answer key for quiz management, so they receive
    // the full question objects. Students receive only the fields required to take
    // the quiz.
    const responseQuiz = (isInstructor || isAdmin)
      ? quiz
      : {
          id: quiz.id,
          title: quiz.title,
          description: quiz.description,
          courseId: quiz.courseId,
          passingScore: quiz.passingScore,
          type: quiz.type,
          createdAt: quiz.createdAt,
          questions: quiz.questions.map(({ correctAnswer: _correctAnswer, ...question }) => question),
        };

    return NextResponse.json({ success: true, data: responseQuiz });
  } catch (error) {
    console.error('[quizzes/[quizId] GET]', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/quizzes/[quizId] - Update quiz
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { quizId } = await params;

    // Get quiz to check permissions
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        course: {
          select: {
            instructorId: true,
          },
        },
      },
    });

    if (!quiz) {
      return NextResponse.json(
        { success: false, error: 'Quiz not found' },
        { status: 404 }
      );
    }

    const isOwner = quiz.course.instructorId === session.user.id;
    const isAdmin = session.user.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You can only edit quizzes in your own courses' },
        { status: 403 }
      );
    }

    const { title, description } = await req.json();

    const updateData: Record<string, unknown> = {};

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

    const updatedQuiz = await prisma.quiz.update({
      where: { id: quizId },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: updatedQuiz });
  } catch (error) {
    console.error('[quizzes/[quizId] PATCH]', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/quizzes/[quizId] - Delete quiz
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { quizId } = await params;

    // Get quiz to check permissions
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        course: {
          select: {
            instructorId: true,
          },
        },
      },
    });

    if (!quiz) {
      return NextResponse.json(
        { success: false, error: 'Quiz not found' },
        { status: 404 }
      );
    }

    const isOwner = quiz.course.instructorId === session.user.id;
    const isAdmin = session.user.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You can only delete quizzes from your own courses' },
        { status: 403 }
      );
    }

    // Delete quiz (questions will be cascade deleted)
    await prisma.quiz.delete({
      where: { id: quizId },
    });

    return NextResponse.json({
      success: true,
      message: 'Quiz deleted successfully',
    });
  } catch (error) {
    console.error('[quizzes/[quizId] DELETE]', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
