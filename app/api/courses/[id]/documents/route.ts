import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

async function getAccess(courseId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { session: null, status: 401 };

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { instructorId: true, isPublished: true, adminApproved: true },
  });
  if (!course) return { session, status: 404 };

  const manager = session.user.role === 'ADMIN' || (session.user.role === 'INSTRUCTOR' && course.instructorId === session.user.id);
  if (manager) return { session, course };

  if (!course.isPublished || !course.adminApproved) return { session, status: 404 };

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: session.user.id, courseId } },
    select: { paymentStatus: true },
  });
  if (enrollment?.paymentStatus !== 'COMPLETED') return { session, status: 403 };

  return { session, course };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: courseId } = await params;
  try {
    const access = await getAccess(courseId);
    if ('status' in access) {
      return NextResponse.json({ success: false, error: access.status === 404 ? 'Course not found' : 'Course access requires completed payment' }, { status: access.status });
    }

    const documents = await prisma.courseDocument.findMany({
      where: { courseId },
      orderBy: { order: 'asc' },
    });

    const manager = access.session.user.role === 'ADMIN' || (access.session.user.role === 'INSTRUCTOR' && access.course.instructorId === access.session.user.id);

    return NextResponse.json({
      success: true,
      data: manager ? documents : documents.map(({ url: _url, ...document }) => document),
    });
  } catch (error) {
    console.error('[course documents GET]', error instanceof Error ? error.message : error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: courseId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });

  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { instructorId: true } });
  if (!course) return NextResponse.json({ success: false, error: 'Course not found' }, { status: 404 });

  if (session.user.role !== 'ADMIN' && !(session.user.role === 'INSTRUCTOR' && course.instructorId === session.user.id)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const url = typeof body.url === 'string' ? body.url.trim() : '';
  const fileName = typeof body.fileName === 'string' ? body.fileName.trim() : '';
  const mimeType = typeof body.mimeType === 'string' ? body.mimeType.trim() : 'application/octet-stream';
  const size = Number(body.size);

  if (!title || !url || !fileName || !Number.isFinite(size) || size <= 0) {
    return NextResponse.json({ success: false, error: 'Title and uploaded document metadata are required' }, { status: 400 });
  }

  const count = await prisma.courseDocument.count({ where: { courseId } });
  const document = await prisma.courseDocument.create({
    data: {
      title,
      url,
      fileName,
      mimeType,
      size: Math.floor(size),
      resourceType: typeof body.resourceType === 'string' ? body.resourceType : 'raw',
      order: count + 1,
      courseId,
    },
  });

  return NextResponse.json({ success: true, data: document }, { status: 201 });
}
