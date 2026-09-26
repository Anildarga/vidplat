import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({
    success: false,
    error: 'Password reset is temporarily disabled. Please use your username and password.',
  }, { status: 410 });
}
