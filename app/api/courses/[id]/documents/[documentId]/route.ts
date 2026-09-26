import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { archiveTrash } from '@/lib/trash';

async function canManage(courseId: string, userId: string, role: string) {
  if (role === 'ADMIN') return true;
  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { instructorId: true } });
  return !!course && course.instructorId === userId;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; documentId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  const { id: courseId, documentId } = await params;

  if (!(await canManage(courseId, session.user.id, session.user.role))) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const document = await prisma.courseDocument.findUnique({ where: { id: documentId } });
  if (!document || document.courseId !== courseId) return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });

  const body = await req.json();
  const title = typeof body.title === 'string' ? body.title.trim() : document.title;
  const updated = await prisma.courseDocument.update({ where: { id: documentId }, data: { title } });
  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; documentId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  const { id: courseId, documentId } = await params;

  if (!(await canManage(courseId, session.user.id, session.user.role))) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const document = await prisma.courseDocument.findUnique({ where: { id: documentId } });
  if (!document || document.courseId !== courseId) return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });

  await archiveTrash({
    entityType: 'COURSE_DOCUMENT',
    entityId: document.id,
    courseId,
    deletedById: session.user.id,
    payload: document,
  });
  await prisma.courseDocument.delete({ where: { id: documentId } });

  return NextResponse.json({ success: true, message: 'Document moved to trash' });
}
