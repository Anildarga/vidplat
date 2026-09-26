import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { uploadToCloudinary } from '@/lib/cloudinary';

// Allowed types: images and videos
const ALLOWED_MIME_TYPES = [
  // Images
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
  // Videos
  'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo', 'video/mpeg'
];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500MB for videos

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (session.user.role !== 'INSTRUCTOR' && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only instructors or admins can upload files' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const uploadType = formData.get('type') as string || 'auto'; // 'local' or 'cloudinary'

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Allowed: JPEG, PNG, GIF, WebP, MP4, WebM, OGG, MOV, AVI, MPEG' },
        { status: 400 }
      );
    }

    const isVideo = file.type.startsWith('video/');
    const maxFileSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;

    // Reject oversized requests before reading the full file into memory when
    // the client supplies a Content-Length header.
    const contentLength = request.headers.get('content-length');
    if (contentLength) {
      const requestSize = Number(contentLength);
      if (Number.isFinite(requestSize) && requestSize > maxFileSize + 1024 * 1024) {
        return NextResponse.json(
          { success: false, error: isVideo ? 'Video file too large. Maximum 500MB.' : 'Image file too large. Maximum 10MB.' },
          { status: 413 }
        );
      }
    }

    if (file.size > maxFileSize) {
      return NextResponse.json(
        { success: false, error: isVideo ? 'Video file too large. Maximum 500MB.' : 'Image file too large. Maximum 10MB.' },
        { status: 413 }
      );
    }
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let result: {
      url: string;
      filename?: string;
      public_id?: string;
      thumbnail_url?: string;
      duration?: number;
      width?: number;
      height?: number;
    };

    // Use Cloudinary for videos if configured, otherwise fallback to local
    const useCloudinary = uploadType === 'cloudinary' || (isVideo && process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud_name');
    
    if (useCloudinary && process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud_name') {
      try {
        // Upload to Cloudinary
        const folder = isVideo ? 'eduplat/videos' : 'eduplat/images';
        const resourceType = isVideo ? 'video' as const : 'image' as const;
        
        const uploadResult = await uploadToCloudinary(buffer, {
          folder,
          resource_type: resourceType,
        });

        result = {
          url: uploadResult.url,
          public_id: uploadResult.public_id,
          thumbnail_url: uploadResult.thumbnail_url,
          duration: uploadResult.duration,
          width: uploadResult.width,
          height: uploadResult.height,
        };
      } catch (cloudinaryError) {
        console.error('Cloudinary upload failed:', cloudinaryError);
        if (process.env.NODE_ENV === 'production') {
          return NextResponse.json(
            { success: false, error: 'Cloud storage upload failed. Please try again later.' },
            { status: 502 }
          );
        }

        const localResult = await uploadToLocal(file, buffer);
        return NextResponse.json({
          success: true,
          data: localResult,
        });
      }
    } else {
      // Local storage
      result = await uploadToLocal(file, buffer);
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}

async function uploadToLocal(file: File, buffer: Buffer): Promise<{
  url: string;
  filename: string;
}> {
  // Generate unique filename
  const ext = path.extname(file.name) || (file.type.startsWith('video/') ? '.mp4' : '.jpg');
  const filename = `${randomUUID()}${ext}`;
  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  const filepath = path.join(uploadDir, filename);

  // Ensure upload directory exists
  await mkdir(uploadDir, { recursive: true });

  // Save file
  await writeFile(filepath, buffer);

  // Return public URL
  const publicUrl = `/uploads/${filename}`;

  return {
    url: publicUrl,
    filename,
  };
}
