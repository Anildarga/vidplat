import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/courses/[id]/videos - List all videos for a course (public)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const userRole = session?.user?.role;

    const isInstructorOrAdmin = userRole === 'INSTRUCTOR' || userRole === 'ADMIN';

    if (!isInstructorOrAdmin) {
      if (!userId) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        );
      }

      const enrollment = await prisma.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId,
            courseId: id,
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

    // Fetch all videos for the course
    const videos = await prisma.video.findMany({
      where: { courseId: id },
      orderBy: {
        order: 'asc',
      },
    });

    // Determine enrollment for the user in this course
    let enrollment = null;
    if (userId && !isInstructorOrAdmin) {
      enrollment = await prisma.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId,
            courseId: id,
          },
        },
      });
    }

    const now = new Date();
    const enrichedVideos = videos.map(video => {
      let isUnlocked = false;
      let unlockReason = '';

      // If instructor/admin, everything is unlocked
      if (isInstructorOrAdmin) {
        isUnlocked = true;
        unlockReason = 'instructor';
      } else {
        switch (video.unlockType) {
          case 'IMMEDIATE':
            isUnlocked = true;
            unlockReason = 'immediate';
            break;
          case 'DAYS_AFTER_ENROLLMENT':
            if (enrollment && video.unlockDays !== null) {
              const unlockDate = new Date(enrollment.enrolledAt);
              unlockDate.setDate(unlockDate.getDate() + video.unlockDays);
              isUnlocked = now >= unlockDate;
              unlockReason = isUnlocked ? 'days_after_enrollment_passed' : 'days_after_enrollment_pending';
            } else {
              isUnlocked = false;
              unlockReason = 'not_enrolled_or_no_days';
            }
            break;
          case 'SPECIFIC_DATE':
            if (video.unlockDate) {
              isUnlocked = now >= new Date(video.unlockDate);
              unlockReason = isUnlocked ? 'specific_date_passed' : 'specific_date_pending';
            } else {
              // No date set, treat as unlocked? Default to locked for safety.
              isUnlocked = false;
              unlockReason = 'no_date_set';
            }
            break;
          default:
            // Default to immediate if unknown
            isUnlocked = true;
            unlockReason = 'default';
        }
      }

      return {
        ...video,
        isUnlocked,
        unlockReason,
      };
    });

    return NextResponse.json({ success: true, data: enrichedVideos });
  } catch (error) {
    console.error('[courses/[id]/videos GET]', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/courses/[id]/videos - Add a new video to a course (instructor/admin only)
export async function POST(
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

    if (!['INSTRUCTOR', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Requires instructor or admin role' },
        { status: 403 }
      );
    }

    const { id: courseId } = await params;
    const { title, description, url, thumbnail, duration, unlockType, unlockDays, unlockDate } = await req.json();

    // Validate required fields
    if (!title || typeof title !== 'string' || title.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Title is required' },
        { status: 400 }
      );
    }

    if (!url || typeof url !== 'string' || url.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Video URL is required' },
        { status: 400 }
      );
    }

    // Fetch the course to check ownership
    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      return NextResponse.json(
        { success: false, error: 'Course not found' },
        { status: 404 }
      );
    }

    // Check ownership: instructor must own the course or be ADMIN
    const isOwner = course.instructorId === session.user.id;
    const isAdmin = session.user.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You can only add videos to your own courses' },
        { status: 403 }
      );
    }

    // Get current video count to set order
    const videoCount = await prisma.video.count({
      where: { courseId },
    });

    // Validate unlockType
    const validUnlockTypes = ['IMMEDIATE', 'DAYS_AFTER_ENROLLMENT', 'SPECIFIC_DATE'];
    const finalUnlockType = unlockType && validUnlockTypes.includes(unlockType) ? unlockType : 'IMMEDIATE';
    
    // Validate unlockDays
    let finalUnlockDays = null;
    if (unlockDays !== undefined && unlockDays !== null) {
      const days = Number(unlockDays);
      if (!isNaN(days) && days >= 0) {
        finalUnlockDays = days;
      }
    }
    
    // Validate unlockDate
    let finalUnlockDate = null;
    if (unlockDate) {
      const date = new Date(unlockDate);
      if (!isNaN(date.getTime())) {
        finalUnlockDate = date;
      }
    }

    const video = await prisma.video.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        url: url.trim(),
        thumbnail: thumbnail?.trim() || null,
        duration: duration ? Number(duration) : null,
        order: videoCount + 1,
        courseId,
        unlockType: finalUnlockType,
        unlockDays: finalUnlockDays,
        unlockDate: finalUnlockDate,
      },
    });

    return NextResponse.json(
      { success: true, data: video },
      { status: 201 }
    );
  } catch (error) {
    console.error('[courses/[id]/videos POST]', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
