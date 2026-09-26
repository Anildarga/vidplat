import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: 'Email verification is temporarily disabled.',
    },
    { status: 410 }
  );
}
