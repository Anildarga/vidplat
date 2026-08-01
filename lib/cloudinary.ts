import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export interface UploadResult {
  url: string;
  public_id: string;
  format: string;
  resource_type: string;
  duration?: number;
  width?: number;
  height?: number;
  thumbnail_url?: string;
}

/**
 * Upload a file to Cloudinary
 * @param file Buffer or file path
 * @param options Upload options
 */
export async function uploadToCloudinary(
  file: Buffer | string,
  options: {
    folder?: string;
    resource_type?: 'image' | 'video' | 'raw' | 'auto';
    public_id?: string;
    transformation?: any[];
  } = {}
): Promise<UploadResult> {
  const {
    folder = 'eduplat/videos',
    resource_type = 'auto',
    public_id,
    transformation = [],
  } = options;

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type,
        public_id,
        transformation,
        chunk_size: 6000000, // 6MB chunks for large videos
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else if (result) {
          const uploadResult: UploadResult = {
            url: result.secure_url,
            public_id: result.public_id,
            format: result.format,
            resource_type: result.resource_type,
            duration: result.duration,
            width: result.width,
            height: result.height,
          };

          // If it's a video, generate a thumbnail URL
          if (result.resource_type === 'video') {
            uploadResult.thumbnail_url = cloudinary.url(result.public_id, {
              resource_type: 'video',
              format: 'jpg',
              transformation: [
                { width: 640, height: 360, crop: 'fill' },
                { quality: 'auto' },
              ],
            });
          }

          resolve(uploadResult);
        } else {
          reject(new Error('Upload failed with no result'));
        }
      }
    );

    if (typeof file === 'string') {
      // File path
      uploadStream.end(Buffer.from(file));
    } else {
      // Buffer
      uploadStream.end(file);
    }
  });
}

/**
 * Generate a thumbnail from a video
 * @param publicId Cloudinary public ID
 * @param options Thumbnail options
 */
export function generateThumbnail(
  publicId: string,
  options: {
    width?: number;
    height?: number;
    timestamp?: number; // seconds
  } = {}
): string {
  const { width = 640, height = 360, timestamp = 1 } = options;

  return cloudinary.url(publicId, {
    resource_type: 'video',
    format: 'jpg',
    transformation: [
      { width, height, crop: 'fill' },
      { quality: 'auto' },
      { start_offset: `${timestamp}` },
    ],
  });
}

/**
 * Delete a file from Cloudinary
 * @param publicId Cloudinary public ID
 * @param resource_type Resource type (image, video, raw)
 */
export async function deleteFromCloudinary(
  publicId: string,
  resource_type: 'image' | 'video' | 'raw' = 'video'
): Promise<void> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(publicId, { resource_type }, (error, result) => {
      if (error) {
        reject(error);
      } else if (result?.result === 'ok') {
        resolve();
      } else {
        reject(new Error('Delete failed'));
      }
    });
  });
}

/**
 * Extract video duration and other metadata
 * @param publicId Cloudinary public ID
 */
export async function getVideoMetadata(publicId: string): Promise<{
  duration: number;
  width: number;
  height: number;
  format: string;
}> {
  return new Promise((resolve, reject) => {
    cloudinary.api.resource(publicId, { resource_type: 'video' }, (error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve({
          duration: result.duration,
          width: result.width,
          height: result.height,
          format: result.format,
        });
      }
    });
  });
}

export default cloudinary;