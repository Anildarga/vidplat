import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { buildDisplayName, generateUniqueIdentityId } from '@/lib/user-identity';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : '';
    const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : '';
    const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const role = body.role;

    if (!firstName || !lastName || !username || !password || !role) {
      return NextResponse.json(
        { success: false, error: 'First name, last name, username, password and role are required' },
        { status: 400 }
      );
    }

    if (!['STUDENT', 'INSTRUCTOR', 'ADMIN'].includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user role' },
        { status: 400 }
      );
    }

    if (!/^[a-z0-9_]{3,24}$/.test(username)) {
      return NextResponse.json(
        { success: false, error: 'Username must be 3-24 characters using letters, numbers or underscores' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Username is already taken' },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const identityId = await generateUniqueIdentityId(role);
    const internalEmail = username + '@local.eduplat.invalid';

    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        name: buildDisplayName(firstName, lastName),
        username,
        email: internalEmail,
        password: hashedPassword,
        role,
        identityId,
        onboardingCompleted: true,
        isEmailVerified: true,
        isActive: true,
      },
      select: {
        id: true,
        identityId: true,
        firstName: true,
        lastName: true,
        name: true,
        username: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: user,
        message: 'User account created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[users POST]', error instanceof Error ? error.message : error);

    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { success: false, error: 'Username is already taken' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create user account' },
      { status: 500 }
    );
  }
}

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
