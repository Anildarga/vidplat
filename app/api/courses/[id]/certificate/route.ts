import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { calculateCourseProgress } from '@/lib/progress-calculator';
import { generateCertificatePDF, generateCertificateNumber } from '@/lib/certificate';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/courses/[id]/certificate
 * Download the certificate PDF for a completed course
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id: courseId } = await params;

    // Fetch the certificate
    const certificate = await prisma.completionCertificate.findUnique({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId,
        },
      },
      include: {
        course: true,
        user: true,
      },
    });

    if (!certificate) {
      return NextResponse.json(
        { success: false, error: 'Certificate not found' },
        { status: 404 }
      );
    }

    // Generate the PDF
    const pdfBuffer = await generateCertificatePDF({
      studentName: certificate.user.name || certificate.user.email,
      courseName: certificate.course.title,
      certificateNumber: certificate.certificateNumber,
      issuedDate: certificate.issuedAt,
      instructorName: 'EduPlat Team',
    });

    // Return as PDF file
    return new NextResponse(
      new Blob([new Uint8Array(pdfBuffer)], { type: 'application/pdf' }),
      {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="certificate-${certificate.certificateNumber}.pdf"`,
        },
      }
    );
  } catch (error) {
    console.error('[certificate GET]', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/courses/[id]/certificate
 * Generate or get certificate for 100% completed course
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id: courseId } = await params;

    // Verify course exists and user is enrolled
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId,
        },
      },
      include: {
        course: true,
      },
    });

    if (enrollment.paymentStatus !== 'COMPLETED') {
      return NextResponse.json(
        { success: false, error: 'Course access requires completed payment' },
        { status: 403 }
      );
    }

    // Calculate progress
    const progress = await calculateCourseProgress(session.user.id, courseId);

    if (progress.percentComplete < 100) {
      return NextResponse.json(
        {
          success: false,
          error: `Course not completed. Progress: ${progress.percentComplete}%`,
          progress: progress.percentComplete,
        },
        { status: 400 }
      );
    }

    // Check if user has passed any quiz in this course
    const courseQuizzes = await prisma.quiz.findMany({
      where: { courseId },
      select: { id: true, passingScore: true },
    });

    if (courseQuizzes.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No quizzes in this course' },
        { status: 400 }
      );
    }

    const attempts = await prisma.quizAttempt.findMany({
      where: {
        userId: session.user.id,
        quizId: {
          in: courseQuizzes.map((q) => q.id),
        },
      },
    });

    let hasPassed = false;
    for (const attempt of attempts) {
      const quiz = courseQuizzes.find((q) => q.id === attempt.quizId);
      if (!quiz) continue;
      const total = attempt.totalScore;
      if (total === 0) continue;
      const percentage = Math.round((attempt.score / total) * 100);
      const passing = quiz.passingScore ?? 60;
      if (percentage >= passing) {
        hasPassed = true;
        break;
      }
    }

    if (!hasPassed) {
      return NextResponse.json(
        { success: false, error: 'You must pass a quiz with at least the required score to earn a certificate.' },
        { status: 400 }
      );
    }

    // Check if certificate already exists
    let certificate = await prisma.completionCertificate.findUnique({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId,
        },
      },
    });

    // If not, create one
    if (!certificate) {
      certificate = await prisma.completionCertificate.create({
        data: {
          userId: session.user.id,
          courseId,
          certificateNumber: generateCertificateNumber(),
          issuedAt: new Date(),
        },
      });

      // Update enrollment completion date (in case not already set)
      await prisma.enrollment.update({
        where: {
          userId_courseId: {
            userId: session.user.id,
            courseId,
          },
        },
        data: {
          completedAt: new Date(),
        },
      }).catch(() => {}); // Ignore if not found
    }

    return NextResponse.json({
      success: true,
      data: {
        id: certificate.id,
        certificateNumber: certificate.certificateNumber,
        issuedAt: certificate.issuedAt,
        courseName: enrollment.course.title,
      },
    });
  } catch (error) {
    console.error('[certificate POST]', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
