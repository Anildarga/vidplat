import { Resend } from 'resend';
import nodemailer from 'nodemailer';

let transporter: any = null;

/**
 * Initialize email transporter
 * Uses Ethereal Email for development testing (no API keys needed)
 * Uses Resend for production if API key is provided
 */
async function getTransporter() {
  if (transporter) return transporter;

  // Production: Use Resend if API key is provided
  if (process.env.RESEND_API_KEY && process.env.NODE_ENV === 'production') {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    transporter = resend;
    return transporter;
  }

  // Development: Use Ethereal Email (free, no signup needed)
  try {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    return transporter;
  } catch (error) {
    console.error('Failed to create email transporter:', error);
    throw error;
  }
}

/**
 * Send email verification with token
 */
export async function sendVerificationEmail(
  email: string,
  name: string,
  token: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const verifyUrl = `${process.env.NEXTAUTH_URL}/api/auth/verify-email?token=${token}`;

    const transporter = await getTransporter();

    if (transporter.emails) {
      const result = await transporter.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'noreply@eduplat.com',
        to: email,
        subject: 'Verify your Eduplat email address',
        html: getVerificationEmailHtml(verifyUrl, name),
      });

      if (result.error) {
        console.error('Resend error:', result.error);
        return { success: false, error: 'Failed to send verification email' };
      }

      return { success: true };
    }

    const info = await transporter.sendMail({
      from: 'noreply@eduplat.com',
      to: email,
      subject: 'Verify your Eduplat email address',
      html: getVerificationEmailHtml(verifyUrl, name),
    });

    if (process.env.NODE_ENV !== 'production') {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      console.log('\n✉️  Verification email sent!');
      console.log('Preview URL (development):', previewUrl);
      console.log('(This URL will be valid for 24 hours)\n');
    }

    return { success: true };
  } catch (error) {
    console.error('Verification email error:', error);
    return {
      success: false,
      error: 'An error occurred while sending the verification email',
    };
  }
}

/**
 * Send password reset email with token
 */
export async function sendPasswordResetEmail(
  email: string,
  token: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

    const transporter = await getTransporter();

    // Production with Resend
    if (transporter.emails) {
      const result = await transporter.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'noreply@eduplat.com',
        to: email,
        subject: 'Reset Your Eduplat Password',
        html: getEmailHtml(resetUrl),
      });

      if (result.error) {
        console.error('Resend error:', result.error);
        return { success: false, error: 'Failed to send reset email' };
      }

      return { success: true };
    }

    // Development with Ethereal/Nodemailer
    const info = await transporter.sendMail({
      from: 'noreply@eduplat.com',
      to: email,
      subject: 'Reset Your Eduplat Password',
      html: getEmailHtml(resetUrl),
    });

    // Log preview URL for Ethereal (development only)
    if (process.env.NODE_ENV !== 'production') {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      console.log('\n✉️  Password reset email sent!');
      console.log('Preview URL (development):', previewUrl);
      console.log('(This URL will be valid for 24 hours)\n');
    }

    return { success: true };
  } catch (error) {
    console.error('Email send error:', error);
    return {
      success: false,
      error: 'An error occurred while sending the email',
    };
  }
}

/**
 * Generate email HTML template
 */
function getEmailHtml(resetUrl: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #3B82F6;">Password Reset Request</h2>
      <p>You requested to reset your password for your Eduplat account.</p>
      <p>Click the link below to reset your password:</p>
      <a href="${resetUrl}" style="display: inline-block; background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
        Reset Password
      </a>
      <p style="color: #666; font-size: 14px;">Or copy and paste this link in your browser:</p>
      <p style="color: #666; font-size: 12px; word-break: break-all;">${resetUrl}</p>
      <p style="color: #666; font-size: 14px;">This link expires in 1 hour.</p>
      <p style="color: #666; font-size: 14px;">If you didn't request this, please ignore this email.</p>
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;" />
      <p style="color: #999; font-size: 12px; text-align: center;">© 2024 Eduplat. All rights reserved.</p>
    </div>
  `;
}

function getVerificationEmailHtml(verifyUrl: string, name: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #3B82F6;">Welcome to Eduplat, ${name}!</h2>
      <p>Please verify your email address to get started.</p>
      <p>
        <a href="${verifyUrl}" style="display: inline-block; background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
          Verify Email Address
        </a>
      </p>
      <p style="color: #666; font-size: 14px;">This link expires in 24 hours.</p>
      <p style="color: #666; font-size: 14px;">If you didn't create an account, ignore this email.</p>
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;" />
      <p style="color: #999; font-size: 12px; text-align: center;">© 2024 Eduplat. All rights reserved.</p>
    </div>
  `;
}
