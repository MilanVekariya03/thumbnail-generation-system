import mongoose, { Schema, Document } from 'mongoose';
import { Job as IJob, JobStatus, FileType } from '@thumbnail-system/shared';

export interface JobDocument extends Omit<IJob, '_id'>, Document {}

const jobSchema = new Schema<JobDocument>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    originalFilename: {
      type: String,
      required: true,
    },
    originalPath: {
      type: String,
      required: true,
    },
    thumbnailPath: {
      type: String,
    },
    thumbnailSize: {
      type: Number,
    },
    fileType: {
      type: String,
      enum: ['image', 'video'],
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'queued', 'processing', 'completed', 'failed'],
      default: 'pending',
      index: true,
    },
    errorMessage: {
      type: String,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
jobSchema.index({ userId: 1, createdAt: -1 });
jobSchema.index({ status: 1, createdAt: 1 });

export const JobModel = mongoose.model<JobDocument>('Job', jobSchema);
