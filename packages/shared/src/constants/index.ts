export const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
export const SUPPORTED_VIDEO_TYPES = ['video/mp4', 'video/avi', 'video/quicktime', 'video/webm'];

export const SUPPORTED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
export const SUPPORTED_VIDEO_EXTENSIONS = ['.mp4', '.avi', '.mov', '.webm'];

export const THUMBNAIL_SIZE = 256; // 256x256 thumbnails
export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export const REDIS_CHANNELS = {
  JOB_STATUS_UPDATE: 'job:status:update',
} as const;

export const JOB_QUEUE_NAME = 'thumbnail-generation';
