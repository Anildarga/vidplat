import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/quizzes/[quizId]/results - Get quiz results
export async function GET(
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

    // Get quiz and course info with questions
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

    const isInstructor = session.user.role === 'INSTRUCTOR' && quiz.course.instructorId === session.user.id;
    const isAdmin = session.user.role === 'ADMIN';

    // If instructor or admin, return all attempts summary
    if (isInstructor || isAdmin) {
      const attempts = await prisma.quizAttempt.findMany({
        where: {
          quizId,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          completedAt: 'desc',
        },
      });

      const totalPossibleScore = quiz.questions.reduce((sum, question) => sum + Math.max(1, question.marks ?? 1), 0);

      const attemptsWithDetails = attempts.map((attempt) => ({
        id: attempt.id,
        userId: attempt.user.id,
        userName: attempt.user.name || 'Anonymous',
        userEmail: attempt.user.email,
        score: attempt.score,
        totalScore: attempt.totalScore,
        percentage: attempt.totalScore > 0 ? Math.round((attempt.score / attempt.totalScore) * 100) : 0,
        completedAt: attempt.completedAt,
      }));

      return NextResponse.json({
        success: true,
        data: {
          quizTitle: quiz.title,
          totalQuestions: totalPossibleScore,
          attempts: attemptsWithDetails,
        },
      });
    }

    // Students must have completed payment/enrollment to access quiz results.
    if (!isInstructor && !isAdmin) {
      const enrollment = await prisma.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId: session.user.id,
            courseId: quiz.courseId,
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

    // For students, return their own attempt with detailed breakdown
    const userAttempt = await prisma.quizAttempt.findFirst({
      where: {
        userId: session.user.id,
        quizId,
      },
    });

    if (!userAttempt) {
      return NextResponse.json({
        success: true,
        data: null,
      });
    }

    // Build answer details from stored answers and questions
    const answerDetails = quiz.questions.map((question) => {
      const userAnswer = userAttempt.answers
        ? (userAttempt.answers as Array<{ questionId: string; selectedOption: number }>).find(
            (a) => a.questionId === question.id
          )
        : null;

      const selectedOption = userAnswer?.selectedOption ?? -1;
      const isCorrect = selectedOption === question.correctAnswer;

      return {
        questionId: question.id,
        questionText: question.text,
        userAnswer: selectedOption,
        correctAnswer: question.correctAnswer,
        options: question.options,
        isCorrect,
      };
    });

    const totalQuestions = quiz.questions.length;
    const percentage = userAttempt.totalScore > 0
      ? Math.round((userAttempt.score / userAttempt.totalScore) * 100)
      : 0;
    const passingScore = quiz.passingScore ?? 60;
    const passed = percentage >= passingScore;

    // If this is MAIN quiz (default if type missing) and the student failed, check if a supplemental quiz exists for the course
    let supplementalQuiz: any = null;
    const isMainQuiz = !quiz.type || quiz.type === 'MAIN';
    if (isMainQuiz && !passed) {
      supplementalQuiz = await prisma.quiz.findFirst({
        where: {
          courseId: quiz.courseId,
          type: 'SUPPLEMENTAL',
        },
        select: {
          id: true,
          title: true,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: userAttempt.id,
        score: userAttempt.score,
        totalScore: userAttempt.totalScore,
        percentage,
        passed,
        completedAt: userAttempt.completedAt,
        answers: answerDetails,
        quizTitle: quiz.title,
        quizType: quiz.type,
        passingScore: quiz.passingScore,
        supplementalQuiz, // { id, title } if exists, else null
      },
    });
  } catch (error) {
    console.error('[quizzes/[quizId]/results GET]', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
