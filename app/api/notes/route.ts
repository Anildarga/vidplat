import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/notes?videoId=... - Get all notes for a video
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

    const notes = await prisma.note.findMany({
      where: {
        userId: session.user.id,
        videoId,
      },
      orderBy: {
        timestamp: 'asc',
      },
    });

    return NextResponse.json({
      success: true,
      data: notes,
    });
  } catch (error) {
    console.error('Error fetching notes:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch notes' },
      { status: 500 }
    );
  }
}

// POST /api/notes - Create a new note
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { videoId, timestamp, content } = body;

    if (!videoId || !content) {
      return NextResponse.json(
        { success: false, error: 'Video ID and content are required' },
        { status: 400 }
      );
    }

    // Check if user is enrolled in the course containing this video
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

    const enrollment = await prisma.enrollment.findFirst({
      where: {
        userId: session.user.id,
        courseId: video.courseId,
      },
    });

    if (!enrollment) {
      return NextResponse.json(
        { success: false, error: 'You must be enrolled in this course to take notes' },
        { status: 403 }
      );
    }

    // Create or update note (if note exists for same timestamp)
    const existingNote = await prisma.note.findFirst({
      where: {
        userId: session.user.id,
        videoId,
        timestamp: timestamp || 0,
      },
    });

    let note;
    if (existingNote) {
      note = await prisma.note.update({
        where: { id: existingNote.id },
        data: { content, updatedAt: new Date() },
      });
    } else {
      note = await prisma.note.create({
        data: {
          userId: session.user.id,
          videoId,
          timestamp: timestamp || 0,
          content,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: note,
    }, { status: existingNote ? 200 : 201 });
  } catch (error) {
    console.error('Error creating note:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create note' },
      { status: 500 }
    );
  }
}