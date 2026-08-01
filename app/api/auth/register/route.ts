import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { createVerificationToken } from '@/lib/tokens';
import { sendVerificationEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const { name, email: rawEmail, password, role, acceptedTerms, acceptedPrivacy } = await req.json();

if (!name || !rawEmail || !password) {
  return NextResponse.json(
    { success: false, error: 'Name, email and password are required' },
    { status: 400 }
  );
}

const email = String(rawEmail).trim().toLowerCase();
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!EMAIL_REGEX.test(email)) {
  return NextResponse.json(
    { success: false, error: 'Please enter a valid email address' },
    { status: 400 }
  );
}

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    if (!acceptedTerms || !acceptedPrivacy) {
      return NextResponse.json(
        { success: false, error: 'You must accept the Terms of Service and Privacy Policy' },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role === 'INSTRUCTOR' ? 'INSTRUCTOR' : 'STUDENT',
        onboardingCompleted: true, // Credentials users complete onboarding via role selection in form
        emailVerified: null, // They need to verify email
        acceptedTermsAt: new Date(),
        acceptedPrivacyAt: new Date(),
      },
      select: { id: true, name: true, email: true, role: true, onboardingCompleted: true },
    });

    // Generate verification token and send email
    const verificationToken = await createVerificationToken(email);
    const emailResult = await sendVerificationEmail(email, name, verificationToken);

    if (!emailResult.success) {
      console.error('Failed to send verification email:', emailResult.error);
      // Don't fail registration if email fails, but log it
    }

    return NextResponse.json({
      success: true,
      data: {
        user,
        requiresVerification: true,
        message: 'Account created successfully. Please check your email to verify your account.'
      }
    }, { status: 201 });
  } catch (error) {
    console.error('[register]', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
