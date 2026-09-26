import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET — get overall progress for a student in a course
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: courseId } = await params;

    const isInstructorOrAdmin =
      session.user.role === 'INSTRUCTOR' || session.user.role === 'ADMIN';

    if (!isInstructorOrAdmin) {
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

    // Fetch all videos in the course
    const videos = await prisma.video.findMany({
      where: { courseId },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        duration: true,
      },
    });

    const totalVideos = videos.length;

    if (totalVideos === 0) {
      return NextResponse.json({
        success: true,
        data: {
          totalVideos: 0,
          completedVideos: 0,
          percentComplete: 0,
          videosProgress: [],
        },
      });
    }

    // Fetch progress records for this user in this course
    const videoIds = videos.map((v) => v.id);
    const progressRecords = await prisma.videoProgress.findMany({
      where: {
        userId: session.user.id,
        videoId: {
          in: videoIds,
        },
      },
      select: {
        videoId: true,
        watchedSeconds: true,
        completed: true,
      },
    });

    // Calculate completed videos
    const completedVideos = progressRecords.filter((p) => p.completed).length;
    const percentComplete = Math.round((completedVideos / totalVideos) * 100);

    // Map progress for each video
    const videosProgress = videos.map((video) => {
      const progress = progressRecords.find((p) => p.videoId === video.id);
      return {
        videoId: video.id,
        watchedSeconds: progress?.watchedSeconds ?? 0,
        completed: progress?.completed ?? false,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        totalVideos,
        completedVideos,
        percentComplete,
        videosProgress,
      },
    });
  } catch (error) {
    console.error('Error fetching course progress:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
