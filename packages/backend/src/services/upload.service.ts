import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { MultipartFile } from '@fastify/multipart';
import { JobModel } from '../models/job.model';
import { validateFile, generateUniqueFilename } from '../utils/file-validation';
import { config } from '../config';
import { AppError, UploadResponse } from '@thumbnail-system/shared';
import { QueueService } from './queue.service';

export class UploadService {
  private queueService: QueueService;

  constructor() {
    this.queueService = new QueueService();
  }

  async uploadFiles(parts: AsyncIterableIterator<any>, userId: string): Promise<UploadResponse> {
    const jobs: UploadResponse['jobs'] = [];
    const errors: string[] = [];

    for await (const part of parts) {
      // Skip non-file parts
      if (part.type !== 'file') {
        continue;
      }

      const file = part as MultipartFile;
      try {
        // Get file info
        const mimeType = file.mimetype;
        const originalFilename = file.filename;

        // Generate unique filename first
        const uniqueFilename = generateUniqueFilename(originalFilename);
        const filePath = path.join(config.uploadDir, uniqueFilename);

        // Stream file to disk (more efficient for large files)
        await pipeline(file.file, fs.createWriteStream(filePath));

        // Get file size after saving
        const stats = await fs.promises.stat(filePath);
        const fileSize = stats.size;

        // Validate file
        const validation = validateFile(originalFilename, mimeType, fileSize);
        if (!validation.isValid) {
          // Delete invalid file
          await fs.promises.unlink(filePath);
          errors.push(`${originalFilename}: ${validation.error}`);
          continue;
        }

        // Create job record
        const job = await JobModel.create({
          userId,
          originalFilename,
          originalPath: filePath,
          fileType: validation.fileType,
          mimeType,
          fileSize,
          status: 'pending',
        });

        // Enqueue job for processing
        await this.queueService.enqueueJob({
          jobId: job._id.toString(),
          userId,
          originalPath: filePath,
          fileType: validation.fileType,
          mimeType,
        });

        // Update status to queued
        job.status = 'queued';
        await job.save();

        jobs.push({
          id: job._id.toString(),
          filename: originalFilename,
          status: job.status,
        });
      } catch (error) {
        console.error('Error uploading file:', error);
        errors.push(`${file.filename}: Upload failed`);
      }
    }

    if (jobs.length === 0 && errors.length > 0) {
      throw new AppError(400, `Upload failed: ${errors.join(', ')}`);
    }

    return {
      success: true,
      jobs,
    };
  }
}
