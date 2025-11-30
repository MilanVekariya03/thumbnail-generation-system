import path from 'path';
import {
  SUPPORTED_IMAGE_TYPES,
  SUPPORTED_VIDEO_TYPES,
  SUPPORTED_IMAGE_EXTENSIONS,
  SUPPORTED_VIDEO_EXTENSIONS,
  MAX_FILE_SIZE,
  FileType,
} from '@thumbnail-system/shared';
import { AppError } from '@thumbnail-system/shared';

export interface FileValidationResult {
  isValid: boolean;
  fileType: FileType;
  error?: string;
}

export function validateFile(
  filename: string,
  mimeType: string,
  fileSize: number
): FileValidationResult {
  // Check file size
  if (fileSize > MAX_FILE_SIZE) {
    return {
      isValid: false,
      fileType: 'image',
      error: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    };
  }

  const extension = path.extname(filename).toLowerCase();

  // Check if it's an image
  if (
    SUPPORTED_IMAGE_TYPES.includes(mimeType) &&
    SUPPORTED_IMAGE_EXTENSIONS.includes(extension)
  ) {
    return {
      isValid: true,
      fileType: 'image',
    };
  }

  // Check if it's a video
  if (
    SUPPORTED_VIDEO_TYPES.includes(mimeType) &&
    SUPPORTED_VIDEO_EXTENSIONS.includes(extension)
  ) {
    return {
      isValid: true,
      fileType: 'video',
    };
  }

  // Unsupported file type
  return {
    isValid: false,
    fileType: 'image',
    error: `Unsupported file type. Supported types: ${[
      ...SUPPORTED_IMAGE_EXTENSIONS,
      ...SUPPORTED_VIDEO_EXTENSIONS,
    ].join(', ')}`,
  };
}

export function generateUniqueFilename(originalFilename: string): string {
  const extension = path.extname(originalFilename);
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${random}${extension}`;
}
