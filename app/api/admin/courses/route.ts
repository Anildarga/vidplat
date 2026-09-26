import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const courses = await prisma.course.findMany({
    where: {
      isPublished: true,
      adminApproved: false,
    },
    select: {
      id: true,
      title: true,
      description: true,
      thumbnail: true,
      isPublished: true,
      adminApproved: true,
      createdAt: true,
      updatedAt: true,
      instructor: {
        select: {
          id: true,
          identityId: true,
          name: true,
          username: true,
        },
      },
      _count: {
        select: {
          videos: true,
          quizzes: true,
          enrollments: true,
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return NextResponse.json({ success: true, data: courses });
}
