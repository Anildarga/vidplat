import { NextRequest, NextResponse } from 'next/server'
import { sendViaBrevo } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const { name, email, phone, message } = await req.json()

    // Validate required fields (message is optional)
    if (!name || !email || !phone) {
      return NextResponse.json(
        { success: false, error: 'Name, email, and phone number are required' },
        { status: 400 }
      )
    }

    // Send email to admin
    const result = await sendViaBrevo({
      to: 'anildarga3777@gmail.com',
      subject: `Eduplat Contact Form Submission from ${name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3B82F6; margin-bottom: 20px;">New Contact Form Submission</h2>
          <p style="margin-bottom: 10px;"><strong>Name:</strong> ${name}</p>
          <p style="margin-bottom: 10px;"><strong>Email:</strong> ${email}</p>
          <p style="margin-bottom: 10px;"><strong>Phone:</strong> ${phone}</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
          <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 0; color: #374151; white-space: pre-wrap;">${message || '(No message provided)'}</p>
          </div>
          <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
            This message was sent via the Eduplat contact form.
          </p>
        </div>
      `,
      replyTo: email,
    })

    if (!result.success) {
      console.error('[contact] Failed to send email:', result.error)
      return NextResponse.json(
        { success: false, error: 'Failed to send message. Please try again later.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Message sent successfully',
    })
  } catch (error) {
    console.error('[contact]', error instanceof Error ? error.message : error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}