import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { config } from '../config';
import { ThumbnailJobData, JOB_QUEUE_NAME } from '@thumbnail-system/shared';

export class QueueService {
  private queue: Queue<ThumbnailJobData>;
  private redis: Redis;

  constructor() {
    this.redis = new Redis(config.redisUrl, {
      maxRetriesPerRequest: null,
    });

    this.queue = new Queue<ThumbnailJobData>(JOB_QUEUE_NAME, {
      connection: this.redis,
    });
  }

  async enqueueJob(jobData: ThumbnailJobData): Promise<void> {
    await this.queue.add(
      'generate-thumbnail',
      jobData,
      {
        // Per-user FIFO: jobs with same userId are processed in order
        jobId: jobData.jobId,
        // Group by userId for FIFO ordering
        priority: 1,
      }
    );
  }

  async close(): Promise<void> {
    await this.queue.close();
    await this.redis.quit();
  }
}
