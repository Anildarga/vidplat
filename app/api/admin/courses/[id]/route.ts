import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  if (body.approved !== true) {
    return NextResponse.json(
      { success: false, error: 'Only approval is supported by this action' },
      { status: 400 }
    );
  }

  const course = await prisma.course.findUnique({
    where: { id },
    select: { id: true, isPublished: true, adminApproved: true },
  });

  if (!course) {
    return NextResponse.json({ success: false, error: 'Course not found' }, { status: 404 });
  }

  if (!course.isPublished) {
    return NextResponse.json(
      { success: false, error: 'Course must be published by its author before approval' },
      { status: 400 }
    );
  }

  const updated = await prisma.course.update({
    where: { id },
    data: {
      adminApproved: true,
      approvedAt: course.adminApproved ? undefined : new Date(),
    },
    select: {
      id: true,
      title: true,
      isPublished: true,
      adminApproved: true,
      approvedAt: true,
    },
  });

  return NextResponse.json({ success: true, data: updated });
}
