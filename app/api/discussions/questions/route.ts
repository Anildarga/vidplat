import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/discussions/questions?videoId=... - Get all questions for a video
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
        { success: false, error: 'You must be enrolled in this course to view discussions' },
        { status: 403 }
      );
    }

    // Fetch questions with user details, reply count, and vote count
    const questions = await prisma.discussionQuestion.findMany({
      where: {
        videoId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
          },
        },
        replies: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
                role: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        votes: true,
      },
      orderBy: [
        { pinned: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    // Calculate vote scores and user's vote
    const questionsWithVotes = questions.map((question) => {
      const voteScore = question.votes.reduce((sum, vote) => sum + vote.vote, 0);
      const userVote = question.votes.find((vote) => vote.userId === session.user.id);
      return {
        ...question,
        voteScore,
        userVote: userVote ? userVote.vote : 0,
        replyCount: question.replies.length,
        replies: question.replies.map((reply) => ({
          ...reply,
          voteScore: 0, // will calculate if we have votes on replies
        })),
        votes: undefined, // remove raw votes array
      };
    });

    return NextResponse.json({
      success: true,
      data: questionsWithVotes,
    });
  } catch (error) {
    console.error('Error fetching discussion questions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch discussion questions' },
      { status: 500 }
    );
  }
}

// POST /api/discussions/questions - Create a new question
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
    const { videoId, content } = body;

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
        { success: false, error: 'You must be enrolled in this course to post questions' },
        { status: 403 }
      );
    }

    const question = await prisma.discussionQuestion.create({
      data: {
        videoId,
        userId: session.user.id,
        content,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: question,
    });
  } catch (error) {
    console.error('Error creating discussion question:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create discussion question' },
      { status: 500 }
    );
  }
}