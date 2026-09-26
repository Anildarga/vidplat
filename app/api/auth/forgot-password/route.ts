import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createPasswordResetToken } from '@/lib/tokens';
import { sendPasswordResetEmail } from '@/lib/email';

/**
 * POST /api/auth/forgot-password
 * Request a password reset token
 * Rate limited: max 3 requests per email per hour
 */
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Always return success for security (don't reveal if email exists)
    if (!user) {
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a password reset code will be sent',
      });
    }

    // Check for recent reset requests (rate limiting)
    const recentTokens = await prisma.passwordResetToken.findMany({
      where: {
        email: normalizedEmail,
        createdAt: {
          gte: new Date(Date.now() - 3600000), // Last 1 hour
        },
      },
    });

    // Allow max 3 requests per hour
    if (recentTokens.length >= 3) {
      // Keep the response indistinguishable from a normal request so the
      // endpoint cannot be used to enumerate registered email addresses.
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a password reset code will be sent',
      });
    }

    // Generate and save reset token using the tokens library
    const token = await createPasswordResetToken(normalizedEmail);

    // Send email
    const emailResult = await sendPasswordResetEmail(normalizedEmail, token);

    if (!emailResult.success) {
      // Clean up token if email failed
      await prisma.passwordResetToken.deleteMany({
        where: { email: normalizedEmail },
      }).catch(() => {});

      return NextResponse.json(
        { success: false, error: emailResult.error || 'Failed to send email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, a password reset code will be sent',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
