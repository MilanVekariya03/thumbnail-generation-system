export type JobStatus = 'pending' | 'queued' | 'processing' | 'completed' | 'failed';

export type FileType = 'image' | 'video';

export interface Job {
  _id: string;
  userId: string;
  originalFilename: string;
  originalPath: string;
  thumbnailPath?: string;
  fileType: FileType;
  mimeType: string;
  fileSize: number;
  status: JobStatus;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface ThumbnailJobData {
  jobId: string;
  userId: string;
  originalPath: string;
  fileType: FileType;
  mimeType: string;
}

export interface UploadResponse {
  success: boolean;
  jobs: Array<{
    id: string;
    filename: string;
    status: JobStatus;
  }>;
}

export interface JobListResponse {
  jobs: Job[];
  total: number;
}

export interface JobDetailResponse {
  job: Job;
}
