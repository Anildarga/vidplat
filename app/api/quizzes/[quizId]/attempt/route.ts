import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { calculateCourseProgress } from '@/lib/progress-calculator';

// POST /api/quizzes/[quizId]/attempt - Submit quiz attempt
export async function POST(
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

    // Get quiz with questions (include passingScore and type automatically)
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

    // Check if user is enrolled in the course (or is instructor/admin)
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        userId: session.user.id,
        courseId: quiz.courseId,
      },
    });
    const isInstructor = quiz.course.instructorId === session.user.id;
    const isAdmin = session.user.role === 'ADMIN';

    if (enrollment?.paymentStatus !== 'COMPLETED' && !isInstructor && !isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You must be enrolled in this course to take this quiz' },
        { status: 403 }
      );
    }

    // For non-instructors/admins: Check video completion requirement
    if (!isInstructor && !isAdmin) {
      const progress = await calculateCourseProgress(session.user.id, quiz.courseId);
      if (progress.percentComplete < 100) {
        return NextResponse.json(
          { success: false, error: 'You must complete all videos before attempting this quiz' },
          { status: 403 }
        );
      }
    }

    const { answers } = await req.json();

    if (!answers || !Array.isArray(answers)) {
      return NextResponse.json(
        { success: false, error: 'Answers array is required' },
        { status: 400 }
      );
    }

    // Validate all questions are answered
    if (answers.length !== quiz.questions.length) {
      return NextResponse.json(
        { success: false, error: `You must answer all ${quiz.questions.length} questions` },
        { status: 400 }
      );
    }

    // Calculate weighted score using each question's configured marks.
    let score = 0;
    const totalScore = quiz.questions.reduce((sum, question) => sum + Math.max(1, question.marks ?? 1), 0);
    const answerDetails = quiz.questions.map((question) => {
      const userAnswer = answers.find((a: { questionId: string }) => a.questionId === question.id);
      const selectedOption = userAnswer?.selectedOption ?? -1;
      const isCorrect = selectedOption === question.correctAnswer;

      if (isCorrect) {
        score += Math.max(1, question.marks ?? 1);
      }

      return {
        questionId: question.id,
        questionText: question.text,
        userAnswer: selectedOption,
        correctAnswer: question.correctAnswer,
        options: question.options,
        isCorrect,
      };
    });

    const percentage = Math.round((score / totalScore) * 100);
    const passingScore = quiz.passingScore ?? 60; // Default to 60 if not set
    const passed = percentage >= passingScore;

    // Check if user already has an attempt for THIS quiz
    const existingAttempt = await prisma.quizAttempt.findFirst({
      where: {
        userId: session.user.id,
        quizId,
      },
    });

    // Determine quiz type with default MAIN for missing type
    const isMainQuiz = !quiz.type || quiz.type === 'MAIN';
    const isSupplementalQuiz = quiz.type === 'SUPPLEMENTAL';

    // Enforce: MAIN quiz can only be taken once
    if (existingAttempt && isMainQuiz) {
      return NextResponse.json(
        { success: false, error: 'Main quiz can only be taken once' },
        { status: 403 }
      );
    }

    if (existingAttempt) {
      // For SUPPLEMENTAL: allow updating attempt
      await prisma.quizAttempt.update({
        where: { id: existingAttempt.id },
        data: {
          score,
          totalScore,
          answers,
          completedAt: new Date(),
        },
      });
    } else {
      // Create new attempt
      await prisma.quizAttempt.create({
        data: {
          userId: session.user.id,
          quizId,
          score,
          totalScore,
          answers,
          completedAt: new Date(),
        },
      });
    }

    // If passed, mark the course enrollment as completed
    if (passed) {
      await prisma.enrollment.update({
        where: {
          userId_courseId: {
            userId: session.user.id,
            courseId: quiz.courseId,
          },
        },
        data: {
          completedAt: new Date(),
        },
      }).catch(() => {
        // Enrollment might not exist for instructors/admins? They may not be enrolled. Ignore.
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        score,
        totalScore,
        percentage,
        passed,
        answers: answerDetails,
        completedAt: new Date().toISOString(),
        quizType: quiz.type || 'MAIN',
        passingScore: quiz.passingScore,
      },
    });
  } catch (error) {
    console.error('[quizzes/[quizId]/attempt POST]', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
