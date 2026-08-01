import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/discussions/questions/[id]/replies - Get all replies for a question
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: questionId } = await params;

    // Check if question exists and user is enrolled in the course
    const question = await prisma.discussionQuestion.findUnique({
      where: { id: questionId },
      include: {
        video: {
          include: { course: true },
        },
      },
    });

    if (!question) {
      return NextResponse.json(
        { success: false, error: 'Question not found' },
        { status: 404 }
      );
    }

    const enrollment = await prisma.enrollment.findFirst({
      where: {
        userId: session.user.id,
        courseId: question.video.courseId,
      },
    });

    if (!enrollment) {
      return NextResponse.json(
        { success: false, error: 'You must be enrolled in this course to view replies' },
        { status: 403 }
      );
    }

    const replies = await prisma.discussionReply.findMany({
      where: {
        questionId,
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
        votes: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const repliesWithVotes = replies.map((reply) => {
      const voteScore = reply.votes.reduce((sum, vote) => sum + vote.vote, 0);
      const userVote = reply.votes.find((vote) => vote.userId === session.user.id);
      return {
        ...reply,
        voteScore,
        userVote: userVote ? userVote.vote : 0,
        votes: undefined,
      };
    });

    return NextResponse.json({
      success: true,
      data: repliesWithVotes,
    });
  } catch (error) {
    console.error('Error fetching discussion replies:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch discussion replies' },
      { status: 500 }
    );
  }
}

// POST /api/discussions/questions/[id]/replies - Create a new reply
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: questionId } = await params;
    const body = await request.json();
    const { content } = body;

    if (!content) {
      return NextResponse.json(
        { success: false, error: 'Content is required' },
        { status: 400 }
      );
    }

    // Check if question exists and user is enrolled in the course
    const question = await prisma.discussionQuestion.findUnique({
      where: { id: questionId },
      include: {
        video: {
          include: { course: true },
        },
      },
    });

    if (!question) {
      return NextResponse.json(
        { success: false, error: 'Question not found' },
        { status: 404 }
      );
    }

    const enrollment = await prisma.enrollment.findFirst({
      where: {
        userId: session.user.id,
        courseId: question.video.courseId,
      },
    });

    if (!enrollment) {
      return NextResponse.json(
        { success: false, error: 'You must be enrolled in this course to post replies' },
        { status: 403 }
      );
    }

    const isInstructorReply = session.user.role === 'INSTRUCTOR' || session.user.role === 'ADMIN';

    const reply = await prisma.discussionReply.create({
      data: {
        questionId,
        userId: session.user.id,
        content,
        isInstructorReply,
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
      data: reply,
    });
  } catch (error) {
    console.error('Error creating discussion reply:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create discussion reply' },
      { status: 500 }
    );
  }
}