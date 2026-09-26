import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import cloudinary from '@/lib/cloudinary';

const KIND_CONFIG = {
  video: { folder: 'eduplat/videos', resourceType: 'video' as const },
  image: { folder: 'eduplat/images', resourceType: 'image' as const },
  document: { folder: 'eduplat/documents', resourceType: 'raw' as const },
};

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  }

  if (session.user.role !== 'INSTRUCTOR' && session.user.role !== 'ADMIN') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    return NextResponse.json({ success: false, error: 'Cloud storage is not configured' }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  const kind = body?.kind as keyof typeof KIND_CONFIG;
  const config = KIND_CONFIG[kind];

  if (!config) {
    return NextResponse.json({ success: false, error: 'Invalid upload kind' }, { status: 400 });
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const signature = cloudinary.utils.api_sign_request(
    {
      timestamp,
      folder: config.folder,
    },
    process.env.CLOUDINARY_API_SECRET
  );

  return NextResponse.json({
    success: true,
    data: {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      timestamp,
      signature,
      folder: config.folder,
      resourceType: config.resourceType,
    },
  });
}
