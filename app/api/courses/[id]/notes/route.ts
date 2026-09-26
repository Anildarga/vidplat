import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

async function authorize(courseId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { session: null, forbidden: 401 };

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { instructorId: true, isPublished: true, adminApproved: true },
  });

  if (!course) return { session, forbidden: 404 };

  const isAdmin = session.user.role === 'ADMIN';
  const isOwner = session.user.role === 'INSTRUCTOR' && course.instructorId === session.user.id;

  if (isAdmin || isOwner) return { session, course };

  if (!course.isPublished || !course.adminApproved) return { session, forbidden: 404 };

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: session.user.id, courseId } },
    select: { paymentStatus: true },
  });

  return enrollment?.paymentStatus === 'COMPLETED'
    ? { session, course }
    : { session, forbidden: 403 };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: courseId } = await params;
  try {
    const access = await authorize(courseId);
    if ('forbidden' in access) {
      return NextResponse.json({ success: false, error: access.forbidden === 404 ? 'Course not found' : 'Course access requires completed payment' }, { status: access.forbidden });
    }

    const notes = await prisma.courseNote.findMany({
      where: { courseId },
      orderBy: { order: 'asc' },
    });

    const isManager = access.session.user.role === 'ADMIN'
      || (access.session.user.role === 'INSTRUCTOR' && access.course.instructorId === access.session.user.id);

    return NextResponse.json({
      success: true,
      data: isManager ? notes : notes.map(({ content: _content, ...note }) => note),
    });
  } catch (error) {
    console.error('[course notes GET]', error instanceof Error ? error.message : error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: courseId } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });

    const course = await prisma.course.findUnique({ where: { id: courseId }, select: { instructorId: true } });
    if (!course) return NextResponse.json({ success: false, error: 'Course not found' }, { status: 404 });

    if (session.user.role !== 'ADMIN' && !(session.user.role === 'INSTRUCTOR' && course.instructorId === session.user.id)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const content = typeof body.content === 'string' ? body.content.trim() : '';

    if (!title || !content) {
      return NextResponse.json({ success: false, error: 'Title and content are required' }, { status: 400 });
    }

    const count = await prisma.courseNote.count({ where: { courseId } });
    const note = await prisma.courseNote.create({
      data: { title, content, order: count + 1, courseId },
    });

    return NextResponse.json({ success: true, data: note }, { status: 201 });
  } catch (error) {
    console.error('[course notes POST]', error instanceof Error ? error.message : error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
