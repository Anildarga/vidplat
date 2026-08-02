import crypto from 'crypto';
import prisma from './prisma';

const MAX_ATTEMPTS = 5;
const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate a 6-digit numeric OTP code
 */
export function generateOtp(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

export async function createVerificationToken(
  email: string
): Promise<string> {
  const token = generateOtp();
  const expires = new Date(Date.now() + OTP_EXPIRY_MS);

  // Delete any existing token for this email first
  await prisma.verificationToken.deleteMany({
    where: { identifier: email }
  });

  // Create new token
  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token,
      expires
    }
  });

  return token;
}

export async function createPasswordResetToken(
  email: string
): Promise<string> {
  const token = generateOtp();
  const expires = new Date(Date.now() + OTP_EXPIRY_MS);

  await prisma.passwordResetToken.deleteMany({
    where: { email }
  });

  await prisma.passwordResetToken.create({
    data: { email, token, expires }
  });

  return token;
}

/**
 * Verify and consume an email verification OTP code.
 * Tracks failed attempts per-email to prevent brute-forcing a 6-digit code.
 */
export async function verifyAndConsumeVerificationToken(
  email: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const record = await prisma.verificationToken.findFirst({
      where: { identifier: email },
    });

    if (!record) {
      return { success: false, error: 'No verification code found. Please request a new one.' };
    }

    if (record.expires < new Date()) {
      await prisma.verificationToken.deleteMany({ where: { identifier: email } });
      return { success: false, error: 'Code has expired. Please request a new one.' };
    }

    if (record.token !== code) {
      const attempts = record.attempts + 1;
      if (attempts >= MAX_ATTEMPTS) {
        await prisma.verificationToken.deleteMany({ where: { identifier: email } });
        return { success: false, error: 'Too many incorrect attempts. Please request a new code.' };
      }
      await prisma.verificationToken.update({
        where: { id: record.id },
        data: { attempts },
      });
      return { success: false, error: `Incorrect code. ${MAX_ATTEMPTS - attempts} attempt(s) remaining.` };
    }

    // Code is correct — consume it and mark user as verified
    await prisma.$transaction([
      prisma.verificationToken.deleteMany({ where: { identifier: email } }),
      prisma.user.update({
        where: { email },
        data: {
          emailVerified: new Date(),
          isEmailVerified: true,
        },
      }),
    ]);

    return { success: true };
  } catch (error) {
    console.error('Error verifying verification code:', error);
    return { success: false, error: 'An error occurred. Please try again.' };
  }
}

/**
 * Verify a password reset OTP code (does NOT consume it — reset-password route
 * consumes it atomically together with the password update).
 */
export async function checkPasswordResetCode(
  email: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const record = await prisma.passwordResetToken.findFirst({
      where: { email },
    });

    if (!record) {
      return { success: false, error: 'No reset code found. Please request a new one.' };
    }

    if (record.expires < new Date()) {
      await prisma.passwordResetToken.deleteMany({ where: { email } });
      return { success: false, error: 'Code has expired. Please request a new one.' };
    }

    if (record.token !== code) {
      const attempts = record.attempts + 1;
      if (attempts >= MAX_ATTEMPTS) {
        await prisma.passwordResetToken.deleteMany({ where: { email } });
        return { success: false, error: 'Too many incorrect attempts. Please request a new code.' };
      }
      await prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { attempts },
      });
      return { success: false, error: `Incorrect code. ${MAX_ATTEMPTS - attempts} attempt(s) remaining.` };
    }

    return { success: true };
  } catch (error) {
    console.error('Error checking password reset code:', error);
    return { success: false, error: 'An error occurred. Please try again.' };
  }
}

export async function hasValidVerificationToken(email: string): Promise<boolean> {
  try {
    const token = await prisma.verificationToken.findFirst({
      where: {
        identifier: email,
        expires: {
          gt: new Date()
        }
      }
    });

    return !!token;
  } catch (error) {
    console.error('Error checking for valid verification token:', error);
    return false;
  }
}
