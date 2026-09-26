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

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; noteId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  const { id: courseId, noteId } = await params;

  if (!(await canManage(courseId, session.user.id, session.user.role))) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const note = await prisma.courseNote.findUnique({ where: { id: noteId } });
  if (!note || note.courseId !== courseId) return NextResponse.json({ success: false, error: 'Note not found' }, { status: 404 });

  const body = await req.json();
  const data: { title?: string; content?: string } = {};
  if (body.title !== undefined) {
    if (typeof body.title !== 'string' || !body.title.trim()) return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 });
    data.title = body.title.trim();
  }
  if (body.content !== undefined) {
    if (typeof body.content !== 'string' || !body.content.trim()) return NextResponse.json({ success: false, error: 'Content is required' }, { status: 400 });
    data.content = body.content.trim();
  }

  const updated = await prisma.courseNote.update({ where: { id: noteId }, data });
  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; noteId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  const { id: courseId, noteId } = await params;

  if (!(await canManage(courseId, session.user.id, session.user.role))) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const note = await prisma.courseNote.findUnique({ where: { id: noteId } });
  if (!note || note.courseId !== courseId) return NextResponse.json({ success: false, error: 'Note not found' }, { status: 404 });

  await archiveTrash({
    entityType: 'COURSE_NOTE',
    entityId: note.id,
    courseId,
    deletedById: session.user.id,
    payload: note,
  });
  await prisma.courseNote.delete({ where: { id: noteId } });

  return NextResponse.json({ success: true, message: 'Note moved to trash' });
}
