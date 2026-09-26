import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { buildDisplayName, generateUniqueIdentityId } from '@/lib/user-identity';

export async function POST(req: NextRequest) {
  try {
    const { firstName, lastName, username: rawUsername, password } = await req.json();

    if (!firstName || !lastName || !rawUsername || !password) {
      return NextResponse.json(
        { success: false, error: 'First name, last name, username and password are required' },
        { status: 400 }
      );
    }

    const username = String(rawUsername).trim().toLowerCase();

    if (!/^[a-z0-9_]{3,24}$/.test(username)) {
      return NextResponse.json(
        { success: false, error: 'Username must be 3-24 characters using letters, numbers or underscores' },
        { status: 400 }
      );
    }

    if (String(password).length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Username is already taken' },
        { status: 409 }
      );
    }

    const identityId = await generateUniqueIdentityId('STUDENT');
    const hashedPassword = await bcrypt.hash(String(password), 12);
    const name = buildDisplayName(String(firstName), String(lastName));

    const user = await prisma.user.create({
      data: {
        firstName: String(firstName).trim(),
        lastName: String(lastName).trim(),
        name,
        username,
        identityId,
        password: hashedPassword,
        role: 'STUDENT',
        onboardingCompleted: true,
        isEmailVerified: true,
      },
      select: {
        id: true,
        identityId: true,
        firstName: true,
        lastName: true,
        name: true,
        username: true,
        role: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: { user },
        message: 'Account created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[auth/register]', error instanceof Error ? error.message : error);

    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { success: false, error: 'Username is already taken' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Registration failed' },
      { status: 500 }
    );
  }
}
