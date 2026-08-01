# Cloudinary Setup Guide for Eduplat

## 1. Create a Cloudinary Account
1. Go to [cloudinary.com](https://cloudinary.com) and sign up for a free account
2. Verify your email address

## 2. Get Your Cloudinary Credentials
After signing in to the Cloudinary dashboard:
1. Note your **Cloud Name** (shown in the dashboard)
2. Go to **Account Settings** → **Security** to find your **API Key** and **API Secret**
3. Update your `.env` file with these credentials:
```env
CLOUDINARY_CLOUD_NAME=your_actual_cloud_name
CLOUDINARY_API_KEY=your_actual_api_key
CLOUDINARY_API_SECRET=your_actual_api_secret
```

## 3. Configure Auto-Upload Mapping

Auto-upload mapping allows Cloudinary to automatically fetch files from external URLs when they're requested but don't exist in Cloudinary yet.

### Option A: Using Cloudinary Dashboard
1. Log in to your Cloudinary dashboard
2. Go to **Settings** → **Upload** → **Upload presets**
3. Scroll down to **Auto Upload Mapping** section
4. Click **Add mapping**
5. Configure as follows:
   - **Folder name**: `eduplat/videos` (or any folder you want to map)
   - **URL prefix**: `https://your-domain.com/uploads/` (or your S3 bucket URL)
   - **Storage type**: Select based on your source (HTTP/HTTPS or S3)

### Option B: Using Cloudinary API (Programmatic Setup)

Create a setup script to configure auto-upload mapping:

```javascript
// scripts/setup-cloudinary.js
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function setupAutoUploadMapping() {
  try {
    // Create auto-upload mapping for local uploads folder
    const result = await cloudinary.api.create_upload_mapping('eduplat/videos', {
      template: 'http://localhost:3000/uploads/{filename}'
    });
    
    console.log('Auto-upload mapping created:', result);
    
    // For S3 bucket mapping (if you have S3)
    // const s3Result = await cloudinary.api.create_upload_mapping('eduplat/s3-videos', {
    //   template: 's3://your-bucket-name/videos/{filename}'
    // });
    
    // console.log('S3 mapping created:', s3Result);
    
  } catch (error) {
    console.error('Error setting up auto-upload mapping:', error.message);
  }
}

setupAutoUploadMapping();
```

### Option C: Using cURL Command
```bash
curl -X POST https://api.cloudinary.com/v1_1/{cloud_name}/upload_mappings \
  -u {api_key}:{api_secret} \
  -d "name=eduplat/videos" \
  -d "template=http://localhost:3000/uploads/{filename}"
```

## 4. How Auto-Upload Mapping Works

With the mapping configured:
- When you request `https://res.cloudinary.com/{cloud_name}/video/upload/eduplat/videos/myvideo.mp4`
- Cloudinary checks if `myvideo.mp4` exists in the `eduplat/videos` folder
- If not found, it automatically fetches it from `http://localhost:3000/uploads/myvideo.mp4`
- Stores it in Cloudinary for future requests
- Returns the Cloudinary-optimized version

## 5. S3 Bucket Configuration (Optional)

If you want to map to an S3 bucket:

1. **Configure S3 bucket permissions**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::[Cloudinary-Account-ID]:root"
      },
      "Action": [
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::your-bucket-name",
        "arn:aws:s3:::your-bucket-name/*"
      ]
    }
  ]
}
```

2. **Create the mapping in Cloudinary**:
```bash
curl -X POST https://api.cloudinary.com/v1_1/{cloud_name}/upload_mappings \
  -u {api_key}:{api_secret} \
  -d "name=eduplat/s3-videos" \
  -d "template=s3://your-bucket-name/videos/{filename}"
```

## 6. Testing the Setup

1. **Test auto-upload**:
   - Upload a video file locally to `public/uploads/test.mp4`
   - Access it via: `https://res.cloudinary.com/{cloud_name}/video/upload/eduplat/videos/test.mp4`
   - Cloudinary should fetch and serve the file

2. **Test direct upload**:
   - Use the drag-and-drop UI to upload a video
   - Check if it appears in your Cloudinary media library

## 7. Monitoring and Management

- **Cloudinary Dashboard**: Monitor uploads, bandwidth, and storage usage
- **Transformations**: Configure video optimizations (resizing, compression, etc.)
- **CDN**: Cloudinary automatically serves files via global CDN
- **Analytics**: View usage statistics in the dashboard

## 8. Troubleshooting

### Common Issues:

1. **"Invalid credentials"**: Double-check your API key and secret
2. **"Mapping already exists"**: Use `cloudinary.api.update_upload_mapping()` instead
3. **"URL not accessible"**: Ensure your source URLs are publicly accessible
4. **"S3 access denied"**: Check S3 bucket permissions and CORS configuration

### Debug Commands:
```javascript
// List all upload mappings
const mappings = await cloudinary.api.upload_mappings();

// Get specific mapping
const mapping = await cloudinary.api.upload_mapping('eduplat/videos');

// Delete a mapping
await cloudinary.api.delete_upload_mapping('eduplat/videos');
```

## 9. Production Considerations

1. **Use environment-specific folders**:
   - Development: `eduplat/dev/videos`
   - Production: `eduplat/prod/videos`

2. **Set up webhook notifications** for upload completion

3. **Configure upload presets** for consistent transformations

4. **Implement cleanup scripts** to remove unused assets

5. **Monitor usage** to stay within free tier limits or plan upgrades