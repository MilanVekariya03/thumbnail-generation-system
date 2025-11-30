import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import mongoose from 'mongoose';
import path from 'path';
import { config } from './config';
import { ThumbnailJobData, JOB_QUEUE_NAME, JobStatus } from '@thumbnail-system/shared';
import { ImageProcessor } from './processors/image.processor';
import { VideoProcessor } from './processors/video.processor';
import { StatusPublisher } from './services/status-publisher.service';

// Import Job model
const JobSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  originalFilename: String,
  originalPath: String,
  thumbnailPath: String,
  thumbnailSize: Number,
  fileType: String,
  mimeType: String,
  fileSize: Number,
  status: String,
  errorMessage: String,
  completedAt: Date,
}, { timestamps: true });

const JobModel = mongoose.model('Job', JobSchema);

export class ThumbnailWorker {
  private worker: Worker<ThumbnailJobData>;
  private imageProcessor: ImageProcessor;
  private videoProcessor: VideoProcessor;
  private statusPublisher: StatusPublisher;

  constructor() {
    this.imageProcessor = new ImageProcessor();
    this.videoProcessor = new VideoProcessor();
    this.statusPublisher = new StatusPublisher();

    const connection = new Redis(config.redisUrl, {
      maxRetriesPerRequest: null,
    });

    this.worker = new Worker<ThumbnailJobData>(
      JOB_QUEUE_NAME,
      async (job: Job<ThumbnailJobData>) => {
        return await this.processJob(job);
      },
      {
        connection,
        concurrency: config.workerConcurrency,
        lockDuration: config.jobTimeout,
      }
    );

    this.setupEventHandlers();
  }

  private async processJob(job: Job<ThumbnailJobData>): Promise<void> {
    const { jobId, userId, originalPath, fileType, mimeType } = job.data;

    console.log(`\n🔄 Processing job ${jobId} for user ${userId}`);
    console.log(`   File type: ${fileType}`);
    console.log(`   Original path: ${originalPath}`);

    try {
      // Update status to processing
      await this.updateJobStatus(jobId, 'processing');
      await this.publishStatus(jobId, userId, 'processing');
      console.log(`   ✅ Status updated to 'processing'`);

      // Generate thumbnail filename
      // For videos, use .jpeg extension since we extract a frame
      const extension = fileType === 'video' ? '.jpeg' : path.extname(originalPath);
      const thumbnailFilename = `thumb-${jobId}${extension}`;
      console.log(`   📝 Thumbnail filename: ${thumbnailFilename}`);
      let thumbnailPath: string;

      // Process based on file type
      if (fileType === 'image') {
        console.log(`   🖼️  Processing as image...`);
        thumbnailPath = await this.imageProcessor.generateThumbnail(
          originalPath,
          thumbnailFilename
        );
      } else if (fileType === 'video') {
        console.log(`   🎬 Processing as video...`);
        thumbnailPath = await this.videoProcessor.generateThumbnail(
          originalPath,
          thumbnailFilename
        );
      } else {
        throw new Error(`Unsupported file type: ${fileType}`);
      }

      console.log(`   💾 Thumbnail path: ${thumbnailPath}`);

      // Get thumbnail file size
      const fs = require('fs');
      const thumbnailStats = await fs.promises.stat(thumbnailPath);
      const thumbnailSize = thumbnailStats.size;
      console.log(`   📊 Thumbnail size: ${(thumbnailSize / 1024).toFixed(2)} KB`);

      // Update job as completed
      await this.updateJobStatus(jobId, 'completed', thumbnailPath, undefined, thumbnailSize);
      await this.publishStatus(jobId, userId, 'completed', thumbnailPath);

      console.log(`✅ Job ${jobId} completed successfully\n`);
    } catch (error: any) {
      console.error(`\n❌ Job ${jobId} failed:`, error);
      
      // Update job as failed
      await this.updateJobStatus(jobId, 'failed', undefined, error.message);
      await this.publishStatus(jobId, userId, 'failed', undefined, error.message);
    }
  }

  private async updateJobStatus(
    jobId: string,
    status: JobStatus,
    thumbnailPath?: string,
    errorMessage?: string,
    thumbnailSize?: number
  ): Promise<void> {
    const update: any = { status };
    
    if (thumbnailPath) {
      update.thumbnailPath = thumbnailPath;
      update.completedAt = new Date();
    }
    
    if (thumbnailSize) {
      update.thumbnailSize = thumbnailSize;
    }
    
    if (errorMessage) {
      update.errorMessage = errorMessage;
    }

    await JobModel.findByIdAndUpdate(jobId, update);
  }

  private async publishStatus(
    jobId: string,
    userId: string,
    status: JobStatus,
    thumbnailPath?: string,
    errorMessage?: string
  ): Promise<void> {
    await this.statusPublisher.publishStatusUpdate({
      jobId,
      userId,
      status,
      thumbnailPath,
      errorMessage,
      timestamp: Date.now(),
    });
  }

  private setupEventHandlers(): void {
    this.worker.on('completed', (job) => {
      console.log(`Job ${job.id} completed`);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`Job ${job?.id} failed:`, err);
    });

    this.worker.on('error', (err) => {
      console.error('Worker error:', err);
    });
  }

  async close(): Promise<void> {
    await this.worker.close();
    await this.statusPublisher.close();
  }
}
