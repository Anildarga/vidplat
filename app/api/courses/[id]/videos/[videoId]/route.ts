import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { archiveTrash } from '@/lib/trash';

// Helper to check if user can manage course videos
async function canManageVideo(
  courseId: string,
  userId: string,
  userRole: string
): Promise<boolean> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
  });

  if (!course) return false;

  const isOwner = course.instructorId === userId;
  const isAdmin = userRole === 'ADMIN';

  return isOwner || isAdmin;
}

// GET /api/courses/[id]/videos/[videoId] - Get single authorized video
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; videoId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id: courseId, videoId } = await params;

    const video = await prisma.video.findUnique({
      where: { id: videoId },
    });

    if (!video || video.courseId !== courseId) {
      return NextResponse.json(
        { success: false, error: 'Video not found' },
        { status: 404 }
      );
    }

    const isAdmin = session?.user?.role === 'ADMIN';
    const isOwner = session?.user?.id === (
      await prisma.course.findUnique({
        where: { id: courseId },
        select: { instructorId: true },
      })
    )?.instructorId;

    if (!isAdmin && !isOwner) {
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
        select: {
          paymentStatus: true,
          enrolledAt: true,
        },
      });

      if (enrollment?.paymentStatus !== 'COMPLETED') {
        return NextResponse.json(
          { success: false, error: 'Course access requires completed payment' },
          { status: 403 }
        );
      }

      const now = new Date();
      let isUnlocked = false;

      switch (video.unlockType) {
        case 'IMMEDIATE':
          isUnlocked = true;
          break;
        case 'DAYS_AFTER_ENROLLMENT': {
          if (video.unlockDays !== null) {
            const unlockDate = new Date(enrollment.enrolledAt);
            unlockDate.setDate(unlockDate.getDate() + video.unlockDays);
            isUnlocked = now >= unlockDate;
          }
          break;
        }
        case 'SPECIFIC_DATE':
          isUnlocked = !!video.unlockDate && now >= new Date(video.unlockDate);
          break;
      }

      if (!isUnlocked) {
        return NextResponse.json(
          { success: false, error: 'Video is not unlocked yet' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({ success: true, data: video });
  } catch (error) {
    console.error('[courses/[id]/videos/[videoId] GET]', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/courses/[id]/videos/[videoId] - Update video
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; videoId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id: courseId, videoId } = await params;

    // Check if user can manage this course's videos
    const canManage = await canManageVideo(courseId, session.user.id, session.user.role);
    if (!canManage) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You can only edit videos in your own courses' },
        { status: 403 }
      );
    }

    const { title, description, url, thumbnail, duration, order, unlockType, unlockDays, unlockDate } = await req.json();

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

    if (url !== undefined) {
      if (typeof url !== 'string' || url.trim() === '') {
        return NextResponse.json(
          { success: false, error: 'Video URL cannot be empty' },
          { status: 400 }
        );
      }
      updateData.url = url.trim();
    }

    if (thumbnail !== undefined) {
      updateData.thumbnail = thumbnail ? thumbnail.trim() : null;
    }

    if (duration !== undefined) {
      updateData.duration = duration ? Number(duration) : null;
    }

    if (order !== undefined) {
      updateData.order = Number(order);
    }

    // Handle unlockType
    if (unlockType !== undefined) {
      const validUnlockTypes = ['IMMEDIATE', 'DAYS_AFTER_ENROLLMENT', 'SPECIFIC_DATE'];
      if (validUnlockTypes.includes(unlockType)) {
        updateData.unlockType = unlockType;
      } else {
        return NextResponse.json(
          { success: false, error: 'Invalid unlockType' },
          { status: 400 }
        );
      }
    }

    // Handle unlockDays
    if (unlockDays !== undefined) {
      if (unlockDays === null) {
        updateData.unlockDays = null;
      } else {
        const days = Number(unlockDays);
        if (!isNaN(days) && days >= 0) {
          updateData.unlockDays = days;
        } else {
          return NextResponse.json(
            { success: false, error: 'unlockDays must be a non-negative number' },
            { status: 400 }
          );
        }
      }
    }

    // Handle unlockDate
    if (unlockDate !== undefined) {
      if (unlockDate === null) {
        updateData.unlockDate = null;
      } else {
        const date = new Date(unlockDate);
        if (!isNaN(date.getTime())) {
          updateData.unlockDate = date;
        } else {
          return NextResponse.json(
            { success: false, error: 'Invalid unlockDate' },
            { status: 400 }
          );
        }
      }
    }

    const video = await prisma.video.update({
      where: { id: videoId },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: video });
  } catch (error) {
    console.error('[courses/[id]/videos/[videoId] PATCH]', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/courses/[id]/videos/[videoId] - Delete video
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; videoId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id: courseId, videoId } = await params;

    // Check if user can manage this course's videos
    const canManage = await canManageVideo(courseId, session.user.id, session.user.role);
    if (!canManage) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You can only delete videos from your own courses' },
        { status: 403 }
      );
    }

    // First check if video exists and belongs to this course
    const existingVideo = await prisma.video.findUnique({
      where: { id: videoId },
    });

    if (!existingVideo || existingVideo.courseId !== courseId) {
      return NextResponse.json(
        { success: false, error: 'Video not found' },
        { status: 404 }
      );
    }

    await archiveTrash({
      entityType: 'VIDEO',
      entityId: existingVideo.id,
      courseId,
      deletedById: session.user.id,
      payload: existingVideo,
    });

    await prisma.video.delete({
      where: { id: videoId },
    });

    // Reorder remaining videos to maintain sequential order
    const remainingVideos = await prisma.video.findMany({
      where: { courseId },
      orderBy: {
        order: 'asc',
      },
    });

    await Promise.all(
      remainingVideos.map((video, index) =>
        prisma.video.update({
          where: { id: video.id },
          data: { order: index + 1 },
        })
      )
    );

    return NextResponse.json({
      success: true,
      message: 'Video deleted successfully',
    });
  } catch (error) {
    console.error('[courses/[id]/videos/[videoId] DELETE]', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
