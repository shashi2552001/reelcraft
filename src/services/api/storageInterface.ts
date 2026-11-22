import { validateReferenceImageFile } from '../../utils/validation';

export type AssetCategory =
  | 'generated_video'
  | 'character_image'
  | 'reference_image'
  | 'story_asset';

export interface PresignedUploadRequest {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  category: AssetCategory;
}

export interface PresignedUploadResponse {
  uploadUrl: string;
  objectKey: string;
  assetId: string;
}

export interface AssetStorageService {
  prepareCharacterImagePreview(file: File): Promise<{ dataUrl: string; fileName: string }>;
  requestPresignedUpload(
    backendBaseUrl: string,
    payload: PresignedUploadRequest
  ): Promise<PresignedUploadResponse>;
}

class StudioAssetStorageService implements AssetStorageService {
  async prepareCharacterImagePreview(file: File): Promise<{ dataUrl: string; fileName: string }> {
    const validation = validateReferenceImageFile(file);
    if (!validation.valid) {
      throw new Error(validation.error ?? 'Invalid reference image file.');
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve({ dataUrl: reader.result, fileName: file.name });
        } else {
          reject(new Error('Could not read uploaded image file.'));
        }
      };
      reader.onerror = () => reject(new Error('File read failed.'));
      reader.readAsDataURL(file);
    });
  }

  async requestPresignedUpload(
    backendBaseUrl: string,
    payload: PresignedUploadRequest
  ): Promise<PresignedUploadResponse> {
    const cleanBase = backendBaseUrl.trim().replace(/\/+$/, '');
    if (!cleanBase) {
      throw new Error(
        'Cloud S3 storage is not connected yet. Reference image saved as local browser draft only.'
      );
    }

    const res = await fetch(`${cleanBase}/api/v1/assets/presign-upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file_name: payload.fileName,
        mime_type: payload.mimeType,
        size_bytes: payload.sizeBytes,
        category: payload.category,
      }),
    });

    if (!res.ok) {
      throw new Error(`Presign upload failed (${res.status}).`);
    }

    const data = (await res.json()) as {
      upload_url: string;
      object_key: string;
      asset_id: string;
    };

    return {
      uploadUrl: data.upload_url,
      objectKey: data.object_key,
      assetId: data.asset_id,
    };
  }
}

export const assetStorageService: AssetStorageService = new StudioAssetStorageService();
