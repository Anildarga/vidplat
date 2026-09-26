import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function numberValue(value: unknown, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function dateValue(value: unknown) {
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

async function ensureCourse(courseId: string) {
  return prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true },
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  }

  const { id } = await params;
  const trash = await prisma.trashItem.findUnique({ where: { id } });

  if (!trash) {
    return NextResponse.json({ success: false, error: 'Trash item not found' }, { status: 404 });
  }

  if (session.user.role !== 'ADMIN' && trash.deletedById !== session.user.id) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  if (!isRecord(trash.payload)) {
    return NextResponse.json({ success: false, error: 'Invalid trash payload' }, { status: 400 });
  }

  const payload = trash.payload;

  try {
    if (trash.entityType === 'VIDEO') {
      const courseId = stringValue(payload.courseId, trash.courseId || '');
      if (!(await ensureCourse(courseId))) {
        return NextResponse.json({ success: false, error: 'Original course no longer exists' }, { status: 409 });
      }

      await prisma.video.create({
        data: {
          id: trash.entityId,
          title: stringValue(payload.title, 'Restored video'),
          description: typeof payload.description === 'string' ? payload.description : null,
          url: stringValue(payload.url),
          thumbnail: typeof payload.thumbnail === 'string' ? payload.thumbnail : null,
          duration: payload.duration == null ? null : Math.max(0, Math.floor(numberValue(payload.duration))),
          order: Math.max(0, Math.floor(numberValue(payload.order))),
          unlockType: stringValue(payload.unlockType, 'IMMEDIATE') as any,
          unlockDays: payload.unlockDays == null ? null : Math.max(0, Math.floor(numberValue(payload.unlockDays))),
          unlockDate: dateValue(payload.unlockDate),
          courseId,
        },
      });
    } else if (trash.entityType === 'COURSE_NOTE') {
      const courseId = stringValue(payload.courseId, trash.courseId || '');
      if (!(await ensureCourse(courseId))) {
        return NextResponse.json({ success: false, error: 'Original course no longer exists' }, { status: 409 });
      }

      await prisma.courseNote.create({
        data: {
          id: trash.entityId,
          title: stringValue(payload.title, 'Restored note'),
          content: stringValue(payload.content),
          order: Math.floor(numberValue(payload.order)),
          courseId,
          createdAt: dateValue(payload.createdAt) ?? new Date(),
        },
      });
    } else if (trash.entityType === 'COURSE_DOCUMENT') {
      const courseId = stringValue(payload.courseId, trash.courseId || '');
      if (!(await ensureCourse(courseId))) {
        return NextResponse.json({ success: false, error: 'Original course no longer exists' }, { status: 409 });
      }

      await prisma.courseDocument.create({
        data: {
          id: trash.entityId,
          title: stringValue(payload.title, 'Restored document'),
          url: stringValue(payload.url),
          fileName: stringValue(payload.fileName, 'restored-file'),
          mimeType: stringValue(payload.mimeType, 'application/octet-stream'),
          size: Math.max(1, Math.floor(numberValue(payload.size, 1))),
          resourceType: stringValue(payload.resourceType, 'raw'),
          order: Math.floor(numberValue(payload.order)),
          courseId,
          createdAt: dateValue(payload.createdAt) ?? new Date(),
        },
      });
    } else if (trash.entityType === 'QUESTION') {
      const quizId = stringValue(payload.quizId);
      const quiz = await prisma.quiz.findUnique({ where: { id: quizId }, select: { id: true } });
      if (!quiz) return NextResponse.json({ success: false, error: 'Original quiz no longer exists' }, { status: 409 });

      await prisma.question.create({
        data: {
          id: trash.entityId,
          text: stringValue(payload.text, 'Restored question'),
          options: Array.isArray(payload.options) ? payload.options.map((value) => stringValue(value)) : [],
          correctAnswer: Math.max(0, Math.floor(numberValue(payload.correctAnswer))),
          quizId,
          order: Math.floor(numberValue(payload.order)),
          marks: Math.max(1, Math.floor(numberValue(payload.marks, 1))),
        },
      });
    } else if (trash.entityType === 'QUIZ') {
      const courseId = stringValue(payload.courseId, trash.courseId || '');
      if (!(await ensureCourse(courseId))) {
        return NextResponse.json({ success: false, error: 'Original course no longer exists' }, { status: 409 });
      }

      const questions = Array.isArray(payload.questions)
        ? payload.questions.filter(isRecord)
        : [];

      await prisma.quiz.create({
        data: {
          id: trash.entityId,
          title: stringValue(payload.title, 'Restored quiz'),
          description: typeof payload.description === 'string' ? payload.description : null,
          courseId,
          createdAt: dateValue(payload.createdAt) ?? new Date(),
          passingScore: Math.max(0, Math.min(100, Math.floor(numberValue(payload.passingScore, 60)))),
          type: stringValue(payload.type, 'MAIN') as any,
          questions: {
            create: questions.map((question) => ({
              id: stringValue(question.id),
              text: stringValue(question.text, 'Restored question'),
              options: Array.isArray(question.options) ? question.options.map((value) => stringValue(value)) : [],
              correctAnswer: Math.max(0, Math.floor(numberValue(question.correctAnswer))),
              order: Math.floor(numberValue(question.order)),
              marks: Math.max(1, Math.floor(numberValue(question.marks, 1))),
            })),
          },
        },
      });
    } else if (trash.entityType === 'COURSE') {
      const existing = await prisma.course.findUnique({ where: { id: trash.entityId }, select: { id: true } });
      if (existing) return NextResponse.json({ success: false, error: 'Course ID is already in use' }, { status: 409 });

      const videos = Array.isArray(payload.videos) ? payload.videos.filter(isRecord) : [];
      const quizzes = Array.isArray(payload.quizzes) ? payload.quizzes.filter(isRecord) : [];
      const notes = Array.isArray(payload.courseNotes) ? payload.courseNotes.filter(isRecord) : [];
      const documents = Array.isArray(payload.documents) ? payload.documents.filter(isRecord) : [];

      await prisma.course.create({
        data: {
          id: trash.entityId,
          title: stringValue(payload.title, 'Restored course'),
          description: typeof payload.description === 'string' ? payload.description : null,
          thumbnail: typeof payload.thumbnail === 'string' ? payload.thumbnail : null,
          instructorId: stringValue(payload.instructorId),
          isPublished: Boolean(payload.isPublished),
          adminApproved: Boolean(payload.adminApproved),
          approvedAt: dateValue(payload.approvedAt),
          price: Math.max(0, numberValue(payload.price)),
          currency: stringValue(payload.currency, 'USD'),
          isFree: Boolean(payload.isFree),
          createdAt: dateValue(payload.createdAt) ?? new Date(),
          videos: {
            create: videos.map((video) => ({
              id: stringValue(video.id),
              title: stringValue(video.title, 'Restored video'),
              description: typeof video.description === 'string' ? video.description : null,
              url: stringValue(video.url),
              thumbnail: typeof video.thumbnail === 'string' ? video.thumbnail : null,
              duration: video.duration == null ? null : Math.max(0, Math.floor(numberValue(video.duration))),
              order: Math.floor(numberValue(video.order)),
              unlockType: stringValue(video.unlockType, 'IMMEDIATE') as any,
              unlockDays: video.unlockDays == null ? null : Math.max(0, Math.floor(numberValue(video.unlockDays))),
              unlockDate: dateValue(video.unlockDate),
            })),
          },
          courseNotes: {
            create: notes.map((note) => ({
              id: stringValue(note.id),
              title: stringValue(note.title, 'Restored note'),
              content: stringValue(note.content),
              order: Math.floor(numberValue(note.order)),
              createdAt: dateValue(note.createdAt) ?? new Date(),
            })),
          },
          documents: {
            create: documents.map((document) => ({
              id: stringValue(document.id),
              title: stringValue(document.title, 'Restored document'),
              url: stringValue(document.url),
              fileName: stringValue(document.fileName, 'restored-file'),
              mimeType: stringValue(document.mimeType, 'application/octet-stream'),
              size: Math.max(1, Math.floor(numberValue(document.size, 1))),
              resourceType: stringValue(document.resourceType, 'raw'),
              order: Math.floor(numberValue(document.order)),
              createdAt: dateValue(document.createdAt) ?? new Date(),
            })),
          },
          quizzes: {
            create: quizzes.map((quiz) => ({
              id: stringValue(quiz.id),
              title: stringValue(quiz.title, 'Restored quiz'),
              description: typeof quiz.description === 'string' ? quiz.description : null,
              createdAt: dateValue(quiz.createdAt) ?? new Date(),
              passingScore: Math.max(0, Math.min(100, Math.floor(numberValue(quiz.passingScore, 60)))),
              type: stringValue(quiz.type, 'MAIN') as any,
              questions: {
                create: Array.isArray(quiz.questions) ? quiz.questions.filter(isRecord).map((question) => ({
                  id: stringValue(question.id),
                  text: stringValue(question.text, 'Restored question'),
                  options: Array.isArray(question.options) ? question.options.map((value) => stringValue(value)) : [],
                  correctAnswer: Math.max(0, Math.floor(numberValue(question.correctAnswer))),
                  order: Math.floor(numberValue(question.order)),
                  marks: Math.max(1, Math.floor(numberValue(question.marks, 1))),
                })) : [],
              },
            })),
          },
        },
      });
    } else {
      return NextResponse.json({ success: false, error: 'Unsupported trash entity' }, { status: 400 });
    }

    await prisma.trashItem.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: trash.entityType + ' restored successfully',
    });
  } catch (error) {
    console.error('[trash restore]', error instanceof Error ? error.message : error);
    return NextResponse.json({ success: false, error: 'Restore failed' }, { status: 500 });
  }
}
