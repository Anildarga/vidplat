import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  const where = session.user.role === 'ADMIN'
    ? {}
    : { deletedById: session.user.id };

  const items = await prisma.trashItem.findMany({
    where,
    orderBy: { deletedAt: 'desc' },
    select: {
      id: true,
      entityType: true,
      entityId: true,
      courseId: true,
      deletedById: true,
      deletedAt: true,
      payload: true,
    },
  });

  return NextResponse.json({ success: true, data: items });
}
