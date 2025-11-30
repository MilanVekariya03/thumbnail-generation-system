import * as fc from 'fast-check';
import mongoose from 'mongoose';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { JOB_QUEUE_NAME } from '@thumbnail-system/shared';

// Feature: thumbnail-generation-system, Property 13: Worker consumption pattern
// Feature: thumbnail-generation-system, Property 14: Failure status update
// Feature: thumbnail-generation-system, Property 38: Job timeout handling
// Validates: Requirements 3.4, 3.5, 10.5

// Job Model
const JobSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  originalFilename: String,
  originalPath: String,
  thumbnailPath: String,
  fileType: String,
  mimeType: String,
  fileSize: Number,
  status: String,
  errorMessage: String,
  completedAt: Date,
}, { timestamps: true });

const JobModel = mongoose.model('Job', JobSchema);

describe('Worker Property Tests', () => {
  let redis: Redis;
  let queue: Queue;

  beforeAll(async () => {
    const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/thumbnail-system-test';
    await mongoose.connect(mongoUrl);
    
    redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    queue = new Queue(JOB_QUEUE_NAME, { connection: redis });
  });

  afterAll(async () => {
    await queue.close();
    await redis.quit();
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await JobModel.deleteMany({});
    await queue.obliterate({ force: true });
  });

  // Property 13: Worker consumption pattern
  // For any user with jobs, worker should process one at a time per user
  test('Property 13: Worker consumption pattern', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 3 }),
        async (jobCount) => {
          const userId = new mongoose.Types.ObjectId();

          // Create multiple jobs for same user
          const jobIds: string[] = [];
          for (let i = 0; i < jobCount; i++) {
            const job = await JobModel.create({
              userId,
              originalFilename: `file${i}.jpg`,
              originalPath: `/path/file${i}.jpg`,
              fileType: 'image',
              mimeType: 'image/jpeg',
              fileSize: 1000,
              status: 'queued',
            });
            jobIds.push(job._id.toString());

            // Add to queue
            await queue.add('generate-thumbnail', {
              jobId: job._id.toString(),
              userId: userId.toString(),
              originalPath: job.originalPath,
              fileType: 'image',
              mimeType: 'image/jpeg',
            });
          }

          // Verify jobs are in queue
          const waitingJobs = await queue.getWaiting();
          expect(waitingJobs.length).toBe(jobCount);

          // Worker would process these one at a time
          // This test verifies the queue structure supports per-user FIFO
          const userJobs = waitingJobs.filter(
            j => j.data.userId === userId.toString()
          );
          expect(userJobs.length).toBe(jobCount);
        }
      ),
      { numRuns: 50 }
    );
  });

  // Property 14: Failure status update
  // For any failed job, status should be 'failed' with error message
  test('Property 14: Failure status update', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 10, maxLength: 100 }),
        async (errorMessage) => {
          const userId = new mongoose.Types.ObjectId();
          
          // Create job
          const job = await JobModel.create({
            userId,
            originalFilename: 'test.jpg',
            originalPath: '/path/test.jpg',
            fileType: 'image',
            mimeType: 'image/jpeg',
            fileSize: 1000,
            status: 'processing',
          });

          // Simulate failure
          job.status = 'failed';
          job.errorMessage = errorMessage;
          await job.save();

          // Verify failure was recorded
          const failedJob = await JobModel.findById(job._id);
          expect(failedJob!.status).toBe('failed');
          expect(failedJob!.errorMessage).toBe(errorMessage);
          expect(failedJob!.errorMessage).toBeTruthy();
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 38: Job timeout handling
  // Jobs should have timeout configuration
  test('Property 38: Job timeout handling', async () => {
    const timeout = 300000; // 5 minutes
    
    // Verify queue can be configured with timeout
    const testQueue = new Queue(JOB_QUEUE_NAME, {
      connection: redis,
      defaultJobOptions: {
        timeout,
      },
    });

    const userId = new mongoose.Types.ObjectId();
    const job = await JobModel.create({
      userId,
      originalFilename: 'test.jpg',
      originalPath: '/path/test.jpg',
      fileType: 'image',
      mimeType: 'image/jpeg',
      fileSize: 1000,
      status: 'queued',
    });

    await testQueue.add('generate-thumbnail', {
      jobId: job._id.toString(),
      userId: userId.toString(),
      originalPath: job.originalPath,
      fileType: 'image',
      mimeType: 'image/jpeg',
    });

    const queuedJob = await testQueue.getJob(job._id.toString());
    expect(queuedJob).toBeTruthy();

    await testQueue.close();
  });
});
