import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { archiveTrash } from '@/lib/trash';

// Helper function to check if user can manage quiz
async function canManageQuiz(quizId: string, userId: string, userRole: string): Promise<boolean> {
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

  if (!quiz) return false;

  const isOwner = userRole === 'INSTRUCTOR' && quiz.course.instructorId === userId;
  const isAdmin = userRole === 'ADMIN';

  return isOwner || isAdmin;
}

// PATCH /api/quizzes/[quizId]/questions/[questionId] - Update question
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ quizId: string; questionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { quizId, questionId } = await params;

    // Check if user can manage this quiz
    const canManage = await canManageQuiz(quizId, session.user.id, session.user.role);
    if (!canManage) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You can only update questions in your own quizzes' },
        { status: 403 }
      );
    }

    const { text, options, correctAnswer } = await req.json();

    const updateData: any = {};

    if (text !== undefined) {
      if (typeof text !== 'string' || text.trim() === '') {
        return NextResponse.json(
          { success: false, error: 'Question text cannot be empty' },
          { status: 400 }
        );
      }
      updateData.text = text.trim();
    }

    if (options !== undefined) {
      if (!Array.isArray(options) || options.length < 2) {
        return NextResponse.json(
          { success: false, error: 'At least 2 options are required' },
          { status: 400 }
        );
      }
      updateData.options = options;
    }

    if (correctAnswer !== undefined) {
      if (correctAnswer < 0) {
        return NextResponse.json(
          { success: false, error: 'Valid correct answer index is required' },
          { status: 400 }
        );
      }
      // Validate correctAnswer is within options range if options are being updated
      if (options) {
        if (correctAnswer >= options.length) {
          return NextResponse.json(
            { success: false, error: 'Correct answer index must be within options range' },
            { status: 400 }
          );
        }
      } else {
        // If only correctAnswer is being updated, need to check against existing options
        const existingQuestion = await prisma.question.findUnique({
          where: { id: questionId },
        });
        if (existingQuestion && correctAnswer >= existingQuestion.options.length) {
          return NextResponse.json(
            { success: false, error: 'Correct answer index must be within current options range' },
            { status: 400 }
          );
        }
      }
      updateData.correctAnswer = correctAnswer;
    }

    const updatedQuestion = await prisma.question.update({
      where: { id: questionId },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: updatedQuestion });
  } catch (error) {
    console.error('[quizzes/[quizId]/questions/[questionId] PATCH]', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/quizzes/[quizId]/questions/[questionId] - Delete question
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ quizId: string; questionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { quizId, questionId } = await params;

    // Check if user can manage this quiz
    const canManage = await canManageQuiz(quizId, session.user.id, session.user.role);
    if (!canManage) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You can only delete questions from your own quizzes' },
        { status: 403 }
      );
    }

    // Get the question to get its order before deleting
    const question = await prisma.question.findUnique({
      where: { id: questionId },
    });

    if (!question || question.quizId !== quizId) {
      return NextResponse.json(
        { success: false, error: 'Question not found' },
        { status: 404 }
      );
    }

    const deletedOrder = question.order;

    await archiveTrash({
      entityType: 'QUESTION',
      entityId: question.id,
      courseId: undefined,
      deletedById: session.user.id,
      payload: question,
    });

    await prisma.question.delete({
      where: { id: questionId },
    });

    // Reorder remaining questions
    await prisma.question.updateMany({
      where: {
        quizId,
        order: {
          gt: deletedOrder,
        },
      },
      data: {
        order: {
          decrement: 1,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Question deleted successfully',
    });
  } catch (error) {
    console.error('[quizzes/[quizId]/questions/[questionId] DELETE]', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
