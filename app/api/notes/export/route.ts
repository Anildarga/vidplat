import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/notes/export?videoId=... - Export notes as PDF
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const videoId = searchParams.get('videoId');

    if (!videoId) {
      return NextResponse.json(
        { success: false, error: 'Video ID is required' },
        { status: 400 }
      );
    }

    // Fetch video details
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: { course: true },
    });

    if (!video) {
      return NextResponse.json(
        { success: false, error: 'Video not found' },
        { status: 404 }
      );
    }

    // Fetch notes for this video
    const notes = await prisma.note.findMany({
      where: {
        userId: session.user.id,
        videoId,
      },
      orderBy: {
        timestamp: 'asc',
      },
    });

    // Return notes data for client-side PDF generation
    return NextResponse.json({
      success: true,
      data: {
        notes,
        video: {
          title: video.title,
          courseTitle: video.course.title,
          duration: video.duration,
        },
        exportDate: new Date().toISOString(),
        noteCount: notes.length,
      },
    });
  } catch (error) {
    console.error('Error exporting notes:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to export notes' },
      { status: 500 }
    );
  }
}