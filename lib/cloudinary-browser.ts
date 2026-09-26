export type BrowserUploadKind = 'video' | 'image' | 'document';

export interface BrowserUploadResult {
  url: string;
  public_id?: string;
  resource_type?: string;
  format?: string;
  bytes?: number;
  duration?: number;
  width?: number;
  height?: number;
}

async function readJsonResponse(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    if (response.status === 413) {
      throw new Error('Upload is too large for the current hosting limit. Direct Cloudinary upload is required.');
    }
    throw new Error('Upload request failed (' + response.status + ')');
  }
}

export async function uploadToCloudinaryBrowser(file: File, kind: BrowserUploadKind): Promise<BrowserUploadResult> {
  const signatureResponse = await fetch('/api/upload/signature', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind }),
  });

  const signatureData = await readJsonResponse(signatureResponse);
  if (!signatureResponse.ok || !signatureData.success) {
    throw new Error(typeof signatureData.error === 'string' ? signatureData.error : 'Unable to prepare Cloudinary upload');
  }

  const signature = signatureData.data as {
    cloudName: string;
    apiKey: string;
    timestamp: number;
    signature: string;
    folder: string;
    resourceType: 'video' | 'image' | 'raw';
  };

  const endpoint = 'https://api.cloudinary.com/v1_1/' + encodeURIComponent(signature.cloudName) + '/' + signature.resourceType + '/upload';
  const formData = new FormData();
  formData.append('file', file);
  formData.append('api_key', signature.apiKey);
  formData.append('timestamp', String(signature.timestamp));
  formData.append('signature', signature.signature);
  formData.append('folder', signature.folder);

  const uploadResponse = await fetch(endpoint, { method: 'POST', body: formData });
  const result = await readJsonResponse(uploadResponse);
  if (!uploadResponse.ok || typeof result.secure_url !== 'string') {
    const cloudinaryError = result.error;
    if (typeof cloudinaryError === 'object' && cloudinaryError !== null && 'message' in cloudinaryError && typeof cloudinaryError.message === 'string') {
      throw new Error(cloudinaryError.message);
    }
    throw new Error('Cloudinary upload failed (' + uploadResponse.status + ')');
  }

  return {
    url: result.secure_url,
    public_id: typeof result.public_id === 'string' ? result.public_id : undefined,
    resource_type: typeof result.resource_type === 'string' ? result.resource_type : undefined,
    format: typeof result.format === 'string' ? result.format : undefined,
    bytes: typeof result.bytes === 'number' ? result.bytes : undefined,
    duration: typeof result.duration === 'number' ? result.duration : undefined,
    width: typeof result.width === 'number' ? result.width : undefined,
    height: typeof result.height === 'number' ? result.height : undefined,
  };
}
