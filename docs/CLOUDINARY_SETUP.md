# Cloudinary Setup Guide

Eduplat uses Cloudinary for image and video uploads. In production, Cloudinary is required; the API does not fall back to the local filesystem.

## 1. Create a Cloudinary account

Create a Cloudinary account and open the Product Environment dashboard.

## 2. Configure environment variables

Add these values to your local .env file or your production hosting provider:

- CLOUDINARY_CLOUD_NAME
- CLOUDINARY_API_KEY
- CLOUDINARY_API_SECRET

Never commit the API secret.

## 3. Upload flow

The application sends authenticated Instructor/Admin uploads to Cloudinary through the server. Videos are stored under the eduplat/videos folder and images under eduplat/images.

Production uploads return an error when Cloudinary is not configured or when an upload fails; they are never written to public/uploads as a fallback.

## 4. Recommended Cloudinary configuration

Use Cloudinary's standard authenticated server upload API. Configure delivery and transformation settings in the Cloudinary dashboard as needed for your course media.

For stronger protection of paid content, consider signed or time-limited delivery URLs rather than relying on unguessable URLs alone.

## 5. Testing

For local development, configure the Cloudinary variables and upload a representative image and video through the instructor interface. Confirm that the returned URLs load and that video metadata such as duration is recorded.

## 6. Production checks

- Verify Cloudinary credentials in the deployment environment.
- Keep the API secret server-side only.
- Monitor storage and bandwidth usage.
- Test upload failure handling.
- Verify that only Instructor/Admin users can upload.
