import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

type VideoAccess = {
  duration: number | null;
  courseId: string;
  unlockType: string;
  unlockDays: number | null;
  unlockDate: Date | null;
};

async function getAccessibleVideo(
  videoId: string,
  userId: string,
  role?: string
): Promise<{ video: VideoAccess; forbidden?: string } | null> {
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    select: {
      duration: true,
      courseId: true,
      unlockType: true,
      unlockDays: true,
      unlockDate: true,
    },
  });

  if (!video) return null;

  const isInstructorOrAdmin = role === 'INSTRUCTOR' || role === 'ADMIN';
  if (isInstructorOrAdmin) return { video };

  const enrollment = await prisma.enrollment.findUnique({
    where: {
      userId_courseId: {
        userId,
        courseId: video.courseId,
      },
    },
    select: {
      paymentStatus: true,
      enrolledAt: true,
    },
  });

  if (!enrollment || enrollment.paymentStatus !== 'COMPLETED') {
    return { video, forbidden: 'You must be enrolled in this course to track progress' };
  }

  const now = new Date();

  switch (video.unlockType) {
    case 'DAYS_AFTER_ENROLLMENT': {
      if (video.unlockDays === null) {
        return { video, forbidden: 'This video is not currently unlocked' };
      }

      const unlockDate = new Date(enrollment.enrolledAt);
      unlockDate.setDate(unlockDate.getDate() + video.unlockDays);

      if (now < unlockDate) {
        return { video, forbidden: 'This video is not currently unlocked' };
      }
      break;
    }
    case 'SPECIFIC_DATE':
      if (!video.unlockDate || now < new Date(video.unlockDate)) {
        return { video, forbidden: 'This video is not currently unlocked' };
      }
      break;
    case 'IMMEDIATE':
      break;
    default:
      return { video, forbidden: 'This video is not currently unlocked' };
  }

  return { video };
}

// GET — fetch saved progress for a video
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { videoId } = await params;
    const access = await getAccessibleVideo(videoId, session.user.id, session.user.role);

    if (!access) {
      return NextResponse.json(
        { success: false, error: 'Video not found' },
        { status: 404 }
      );
    }

    if (access.forbidden) {
      return NextResponse.json(
        { success: false, error: access.forbidden },
        { status: 403 }
      );
    }

    const progress = await prisma.videoProgress.findUnique({
      where: {
        userId_videoId: {
          userId: session.user.id,
          videoId,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        watchedSeconds: progress?.watchedSeconds ?? 0,
        completed: progress?.completed ?? false,
      },
    });
  } catch (error) {
    console.error('Error fetching progress:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST — save progress for a video
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { videoId } = await params;
    const access = await getAccessibleVideo(videoId, session.user.id, session.user.role);

    if (!access) {
      return NextResponse.json(
        { success: false, error: 'Video not found' },
        { status: 404 }
      );
    }

    if (access.forbidden) {
      return NextResponse.json(
        { success: false, error: access.forbidden },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { watchedSeconds } = body;

    if (
      typeof watchedSeconds !== 'number' ||
      !Number.isFinite(watchedSeconds) ||
      watchedSeconds < 0
    ) {
      return NextResponse.json(
        { success: false, error: 'Invalid watchedSeconds' },
        { status: 400 }
      );
    }

    const duration = access.video.duration;

    if (!duration || duration <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Video duration is required before completion can be recorded',
        },
        { status: 400 }
      );
    }

    const normalizedWatchedSeconds = Math.min(
      Math.floor(watchedSeconds),
      Math.floor(duration)
    );

    // Completion is decided exclusively by the server.
    const isCompleted = normalizedWatchedSeconds >= duration * 0.9;

    const existingProgress = await prisma.videoProgress.findUnique({
      where: {
        userId_videoId: {
          userId: session.user.id,
          videoId,
        },
      },
      select: {
        watchedSeconds: true,
        completed: true,
      },
    });

    // Progress cannot move backwards and completion cannot be undone.
    const finalWatchedSeconds = Math.max(
      existingProgress?.watchedSeconds ?? 0,
      normalizedWatchedSeconds
    );
    const finalCompleted = Boolean(existingProgress?.completed) || isCompleted;

    const progress = await prisma.videoProgress.upsert({
      where: {
        userId_videoId: {
          userId: session.user.id,
          videoId,
        },
      },
      update: {
        watchedSeconds: finalWatchedSeconds,
        completed: finalCompleted,
      },
      create: {
        userId: session.user.id,
        videoId,
        watchedSeconds: finalWatchedSeconds,
        completed: finalCompleted,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        watchedSeconds: progress.watchedSeconds,
        completed: progress.completed,
      },
    });
  } catch (error) {
    console.error('Error saving progress:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
