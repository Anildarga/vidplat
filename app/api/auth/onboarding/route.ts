import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const requestedRole = body?.role;

    // Onboarding must never grant a privileged role. Keep STUDENT as the only
    // self-service role; instructors/admins require an existing trusted role.
    if (requestedRole !== undefined && requestedRole !== null && requestedRole !== '' && requestedRole !== 'STUDENT') {
      return NextResponse.json(
        { success: false, error: 'Privileged roles require administrative approval' },
        { status: 403 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        onboardingCompleted: true,
      },
    });

    if (!existingUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const user = existingUser.onboardingCompleted
      ? existingUser
      : await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            onboardingCompleted: true,
          },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            onboardingCompleted: true,
          },
        });

    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('[onboarding]', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
