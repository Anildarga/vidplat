import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createVerificationToken } from '@/lib/tokens';
import { sendVerificationEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const { email: rawEmail } = await req.json();

    if (!rawEmail) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    const email = String(rawEmail).trim().toLowerCase();

    // Check if user exists and is not already verified
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, isEmailVerified: true }
    });

    if (!user || user.isEmailVerified) {
      return NextResponse.json({
        success: true,
        message: 'A verification code will be sent if this account requires email verification.',
      });
    }

    // Rate limit: check if a token was created in the last 2 minutes
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    const recentToken = await prisma.verificationToken.findFirst({
      where: {
        identifier: email,
        createdAt: {
          gt: twoMinutesAgo
        }
      }
    });
    if (recentToken) {
      return NextResponse.json({
        success: true,
        message: 'A verification code will be sent if this account requires email verification.',
      });
    }

    // Generate new verification code and send email
    const verificationToken = await createVerificationToken(email);
    const emailResult = await sendVerificationEmail(email, user.name || 'User', verificationToken);

    if (!emailResult.success) {
      console.error('Failed to send verification email:', emailResult.error);
      return NextResponse.json(
        { success: false, error: 'Failed to send verification code. Please try again later.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'A new verification code has been sent to your email.'
    });
  } catch (error) {
    console.error('[resend-verification]', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}