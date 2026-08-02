import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAndConsumeVerificationToken } from '@/lib/tokens';
import { sendWelcomeEmail } from '@/lib/email';

/**
 * POST /api/auth/verify-email
 * Verify a 6-digit OTP code sent to the user's email
 */
export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json();

    if (!email || !code) {
      return NextResponse.json(
        { success: false, error: 'Email and code are required' },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedCode = String(code).trim();

    const result = await verifyAndConsumeVerificationToken(normalizedEmail, normalizedCode);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Invalid code' },
        { status: 400 }
      );
    }

    // Send welcome email now that the account is verified
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { name: true },
    });
    sendWelcomeEmail(normalizedEmail, user?.name || 'there').catch((err) =>
      console.error('Failed to send welcome email:', err)
    );

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully!',
    });
  } catch (error) {
    console.error('[verify-email POST]', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
