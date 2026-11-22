const ALLOWED_IMAGE_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
] as const;

const MAX_LOCAL_IMAGE_BYTES = 2 * 1024 * 1024; // 2 MB limit for safe browser localStorage previews

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateRequiredText(
  value: string,
  fieldLabel: string,
  minLength = 2,
  maxLength = 4000
): ValidationResult {
  const trimmed = value.trim();
  if (trimmed.length < minLength) {
    return {
      valid: false,
      error: `${fieldLabel} must be at least ${minLength} characters.`,
    };
  }
  if (trimmed.length > maxLength) {
    return {
      valid: false,
      error: `${fieldLabel} cannot exceed ${maxLength} characters.`,
    };
  }
  return { valid: true };
}

export function validateReferenceImageFile(file: File): ValidationResult {
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_MIME_TYPES)[number])) {
    return {
      valid: false,
      error: 'Unsupported file type. Upload a PNG, JPEG, or WebP image.',
    };
  }
  if (file.size > MAX_LOCAL_IMAGE_BYTES) {
    return {
      valid: false,
      error: 'Image exceeds 2 MB browser draft limit. Compress the image or use a hosted URL.',
    };
  }
  return { valid: true };
}

export function validateBackendUrl(url: string): ValidationResult {
  const trimmed = url.trim();
  if (!trimmed) {
    return { valid: true }; // Empty means intentionally disconnected
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return {
        valid: false,
        error: 'Backend URL must begin with http:// or https://',
      };
    }
    return { valid: true };
  } catch {
    return {
      valid: false,
      error: 'Enter a valid URL (for example, http://localhost:8000).',
    };
  }
}

export function sanitizeImageUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('/src/assets/')) return trimmed;
  if (trimmed.startsWith('data:image/png;base64,') || trimmed.startsWith('data:image/jpeg;base64,') || trimmed.startsWith('data:image/webp;base64,')) {
    return trimmed;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return trimmed;
    }
  } catch {
    return '';
  }
  return '';
}
