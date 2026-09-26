import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { ensureUserIdentityId } from '@/lib/user-identity';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const identityId = new URL(req.url).searchParams.get('identityId')?.trim().toLowerCase();

  if (!identityId) {
    return NextResponse.json(
      { success: false, error: 'Search by unique identity ID' },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { identityId },
    select: {
      id: true,
      identityId: true,
      firstName: true,
      lastName: true,
      name: true,
      username: true,
      email: true,
      role: true,
      isActive: true,
      isEmailVerified: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    return NextResponse.json(
      { success: false, error: 'User not found for this identity ID' },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data: user });
}
