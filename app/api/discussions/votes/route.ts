import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// POST /api/discussions/votes - Create or update a vote
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
    const { questionId, replyId, vote } = body;

    if ((!questionId && !replyId) || vote === undefined) {
      return NextResponse.json(
        { success: false, error: 'Either questionId or replyId and vote are required' },
        { status: 400 }
      );
    }

    // Validate vote value
    if (vote !== 1 && vote !== -1 && vote !== 0) {
      return NextResponse.json(
        { success: false, error: 'Vote must be 1 (upvote), -1 (downvote), or 0 (remove)' },
        { status: 400 }
      );
    }

    // Check if user is enrolled in the relevant course
    let courseId: string | null = null;
    if (questionId) {
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
      courseId = question.video.courseId;
    } else if (replyId) {
      const reply = await prisma.discussionReply.findUnique({
        where: { id: replyId },
        include: {
          question: {
            include: {
              video: {
                include: { course: true },
              },
            },
          },
        },
      });
      if (!reply) {
        return NextResponse.json(
          { success: false, error: 'Reply not found' },
          { status: 404 }
        );
      }
      courseId = reply.question.video.courseId;
    }

    if (!courseId) {
      return NextResponse.json(
        { success: false, error: 'Course not found' },
        { status: 404 }
      );
    }

    const enrollment = await prisma.enrollment.findFirst({
      where: {
        userId: session.user.id,
        courseId,
      },
    });

    if (!enrollment) {
      return NextResponse.json(
        { success: false, error: 'You must be enrolled in this course to vote' },
        { status: 403 }
      );
    }

    // Check if vote already exists
    const existingVote = await prisma.discussionVote.findFirst({
      where: {
        userId: session.user.id,
        OR: [
          { questionId: questionId || null },
          { replyId: replyId || null },
        ],
      },
    });

    if (vote === 0) {
      // Remove vote
      if (existingVote) {
        await prisma.discussionVote.delete({
          where: { id: existingVote.id },
        });
      }
      return NextResponse.json({
        success: true,
        data: { removed: true },
      });
    }

    // Upsert vote
    const voteData = {
      userId: session.user.id,
      questionId: questionId || null,
      replyId: replyId || null,
      vote,
    };

    const updatedVote = existingVote
      ? await prisma.discussionVote.update({
          where: { id: existingVote.id },
          data: { vote },
        })
      : await prisma.discussionVote.create({
          data: voteData,
        });

    return NextResponse.json({
      success: true,
      data: updatedVote,
    });
  } catch (error) {
    console.error('Error processing vote:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process vote' },
      { status: 500 }
    );
  }
}