import nodemailer from 'nodemailer';

let transporter: any = null;

type BrevoSendResult = { success: boolean; error?: string };

/**
 * Send an email via the Brevo (Sendinblue) transactional email REST API.
 * Docs: https://developers.brevo.com/reference/sendtransacemail
 * No SDK dependency needed — Brevo's API is a plain JSON POST.
 */
export async function sendViaBrevo(params: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<BrevoSendResult> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    return { success: false, error: 'BREVO_API_KEY is not set' };
  }

  const fromEmail = process.env.BREVO_FROM_EMAIL || 'noreply@eduplat.com';
  const fromName = process.env.BREVO_FROM_NAME || 'Eduplat';

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        sender: { email: fromEmail, name: fromName },
        to: [{ email: params.to }],
        subject: params.subject,
        htmlContent: params.html,
        ...(params.replyTo ? { replyTo: { email: params.replyTo } } : {}),
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error('Brevo error:', res.status, errBody);
      return { success: false, error: 'Failed to send email via Brevo' };
    }

    return { success: true };
  } catch (error) {
    console.error('Brevo request failed:', error);
    return { success: false, error: 'An error occurred while sending the email' };
  }
}

/**
 * Initialize email transporter
 * Uses Ethereal Email for development testing (no API keys needed)
 * Uses Brevo for production if an API key is provided
 */
async function getTransporter() {
  if (transporter) return transporter;

  // Production: Use Brevo if API key is provided
  if (process.env.BREVO_API_KEY && process.env.NODE_ENV === 'production') {
    // Mark as a Brevo-backed transporter; `.brevo` flag lets callers
    // distinguish this from the Ethereal/nodemailer fallback below.
    transporter = { brevo: true };
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
 * Send email verification OTP code
 */
export async function sendVerificationEmail(
  email: string,
  name: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = await getTransporter();

    if (transporter.brevo) {
      const result = await sendViaBrevo({
        to: email,
        subject: `${code} is your Eduplat verification code`,
        html: getVerificationEmailHtml(code, name),
      });

      if (!result.success) {
        return { success: false, error: result.error || 'Failed to send verification email' };
      }

      return { success: true };
    }

    const info = await transporter.sendMail({
      from: 'noreply@eduplat.com',
      to: email,
      subject: `${code} is your Eduplat verification code`,
      html: getVerificationEmailHtml(code, name),
    });

    if (process.env.NODE_ENV !== 'production') {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      console.log('\n✉️  Verification email sent!');
      console.log('Preview URL (development):', previewUrl);
      console.log('(Code expires in 10 minutes)\n');
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
 * Send password reset OTP code
 */
export async function sendPasswordResetEmail(
  email: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = await getTransporter();

    // Production with Brevo
    if (transporter.brevo) {
      const result = await sendViaBrevo({
        to: email,
        subject: `${code} is your Eduplat password reset code`,
        html: getPasswordResetEmailHtml(code),
      });

      if (!result.success) {
        return { success: false, error: result.error || 'Failed to send reset email' };
      }

      return { success: true };
    }

    // Development with Ethereal/Nodemailer
    const info = await transporter.sendMail({
      from: 'noreply@eduplat.com',
      to: email,
      subject: `${code} is your Eduplat password reset code`,
      html: getPasswordResetEmailHtml(code),
    });

    // Log preview URL for Ethereal (development only)
    if (process.env.NODE_ENV !== 'production') {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      console.log('\n✉️  Password reset email sent!');
      console.log('Preview URL (development):', previewUrl);
      console.log('(Code expires in 10 minutes)\n');
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
 * Send a welcome email (used for new Google/GitHub OAuth sign-ups)
 */
export async function sendWelcomeEmail(
  email: string,
  name: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = await getTransporter();
    const html = getWelcomeEmailHtml(name);

    if (transporter.brevo) {
      const result = await sendViaBrevo({
        to: email,
        subject: 'Welcome to Eduplat!',
        html,
      });

      if (!result.success) {
        return { success: false, error: result.error || 'Failed to send welcome email' };
      }

      return { success: true };
    }

    const info = await transporter.sendMail({
      from: 'noreply@eduplat.com',
      to: email,
      subject: 'Welcome to Eduplat!',
      html,
    });

    if (process.env.NODE_ENV !== 'production') {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      console.log('\n✉️  Welcome email sent!');
      console.log('Preview URL (development):', previewUrl);
    }

    return { success: true };
  } catch (error) {
    console.error('Welcome email error:', error);
    return {
      success: false,
      error: 'An error occurred while sending the welcome email',
    };
  }
}

/**
 * Generate password reset OTP email HTML
 */
function getPasswordResetEmailHtml(code: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #3B82F6;">Password Reset Request</h2>
      <p>You requested to reset your password for your Eduplat account.</p>
      <p>Enter this code to reset your password:</p>
      <div style="text-align: center; margin: 30px 0;">
        <span style="display: inline-block; background-color: #F3F4F6; color: #111827; font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 16px 24px; border-radius: 8px;">
          ${code}
        </span>
      </div>
      <p style="color: #666; font-size: 14px;">This code expires in 10 minutes.</p>
      <p style="color: #666; font-size: 14px;">If you didn't request this, please ignore this email.</p>
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;" />
      <p style="color: #999; font-size: 12px; text-align: center;">© 2026 Eduplat. All rights reserved.</p>
    </div>
  `;
}

function getVerificationEmailHtml(code: string, name: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #3B82F6;">Welcome to Eduplat, ${name}!</h2>
      <p>Enter this code to verify your email address and get started:</p>
      <div style="text-align: center; margin: 30px 0;">
        <span style="display: inline-block; background-color: #F3F4F6; color: #111827; font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 16px 24px; border-radius: 8px;">
          ${code}
        </span>
      </div>
      <p style="color: #666; font-size: 14px;">This code expires in 10 minutes.</p>
      <p style="color: #666; font-size: 14px;">If you didn't create an account, ignore this email.</p>
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;" />
      <p style="color: #999; font-size: 12px; text-align: center;">© 2026 Eduplat. All rights reserved.</p>
    </div>
  `;
}

function getWelcomeEmailHtml(name: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #3B82F6;">Welcome to Eduplat, ${name}!</h2>
      <p>Your account is all set up and ready to go.</p>
      <p>Browse our course catalog, start learning, and track your progress right from your dashboard.</p>
      <p style="margin-top: 24px;">
        <a href="${process.env.NEXTAUTH_URL}/courses" style="display: inline-block; background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
          Browse Courses
        </a>
      </p>
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;" />
      <p style="color: #999; font-size: 12px; text-align: center;">© 2026 Eduplat. All rights reserved.</p>
    </div>
  `;
}