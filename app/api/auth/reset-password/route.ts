import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validatePasswordStrength } from '@/lib/password-utils';
import { checkPasswordResetCode } from '@/lib/tokens';
import bcrypt from 'bcryptjs';

/**
 * POST /api/auth/reset-password
 * Reset password using a 6-digit OTP code sent to the user's email
 */
export async function POST(req: NextRequest) {
  try {
    const { email, code, password, confirmPassword } = await req.json();

    if (!email || !code || !password || !confirmPassword) {
      return NextResponse.json(
        { success: false, error: 'All fields are required' },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { success: false, error: 'Passwords do not match' },
        { status: 400 }
      );
    }

    // Validate password strength
    const validation = validatePasswordStrength(password);
    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, errors: validation.errors },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedCode = String(code).trim();

    // Verify the OTP code (tracks attempts, checks expiry)
    const codeCheck = await checkPasswordResetCode(normalizedEmail, normalizedCode);
    if (!codeCheck.success) {
      return NextResponse.json(
        { success: false, error: codeCheck.error || 'Invalid code' },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user password
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // Delete all reset codes for this user (consume)
    await prisma.passwordResetToken.deleteMany({
      where: { email: normalizedEmail },
    });

    // Delete all sessions for this user (force re-login)
    await prisma.session.deleteMany({
      where: { userId: user.id },
    });

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully. Please log in with your new password.',
    });
  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred during password reset' },
      { status: 500 }
    );
  }
}
