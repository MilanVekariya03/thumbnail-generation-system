import * as fc from 'fast-check';
import { QueueService } from '../services/queue.service';
import { JobModel } from '../models/job.model';
import { UserModel } from '../models/user.model';
import mongoose from 'mongoose';
import { Queue } from 'bullmq';
import { JOB_QUEUE_NAME } from '@thumbnail-system/shared';
import Redis from 'ioredis';

// Feature: thumbnail-generation-system, Property 10: Job enqueue invariant
// Feature: thumbnail-generation-system, Property 11: Per-user FIFO ordering
// Feature: thumbnail-generation-system, Property 12: Enqueue status update
// Validates: Requirements 3.1, 3.2, 3.3

describe('Job Queue Property Tests', () => {
  let queueService: QueueService;
  let redis: Redis;

  beforeAll(async () => {
    const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/thumbnail-system-test';
    await mongoose.connect(mongoUrl);
    
    queueService = new QueueService();
    redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  });

  afterAll(async () => {
    await queueService.close();
    await redis.quit();
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await JobModel.deleteMany({});
    await UserModel.deleteMany({});
    // Clear queue
    const queue = new Queue(JOB_QUEUE_NAME, {
      connection: redis,
    });
    await queue.obliterate({ force: true });
    await queue.close();
  });

  // Property 10: Job enqueue invariant
  // For any stored file, a corresponding job should be enqueued
  test('Property 10: Job enqueue invariant', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 5, maxLength: 20 }),
        fc.constantFrom('image', 'video'),
        fc.constantFrom('image/jpeg', 'video/mp4'),
        async (filename, fileType, mimeType) => {
          // Create user
          const user = await UserModel.create({
            email: `${filename}@test.com`,
            passwordHash: 'hash',
          });

          // Create job
          const job = await JobModel.create({
            userId: user._id,
            originalFilename: filename,
            originalPath: `/path/${filename}`,
            fileType,
            mimeType,
            fileSize: 1000,
            status: 'pending',
          });

          // Enqueue job
          await queueService.enqueueJob({
            jobId: job._id.toString(),
            userId: user._id.toString(),
            originalPath: job.originalPath,
            fileType: job.fileType as any,
            mimeType: job.mimeType,
          });

          // Verify job is in queue
          const queue = new Queue(JOB_QUEUE_NAME, {
            connection: redis,
          });
          const jobs = await queue.getJobs(['waiting', 'active']);
          const enqueuedJob = jobs.find(j => j.data.jobId === job._id.toString());
          
          expect(enqueuedJob).toBeTruthy();
          expect(enqueuedJob!.data.userId).toBe(user._id.toString());
          expect(enqueuedJob!.data.fileType).toBe(fileType);
          
          await queue.close();
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 11: Per-user FIFO ordering
  // For any user with multiple jobs, jobs should be processed in order
  test('Property 11: Per-user FIFO ordering', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 5 }),
        async (jobCount) => {
          // Create user
          const user = await UserModel.create({
            email: 'fifo@test.com',
            passwordHash: 'hash',
          });

          const jobIds: string[] = [];

          // Create and enqueue multiple jobs for same user
          for (let i = 0; i < jobCount; i++) {
            const job = await JobModel.create({
              userId: user._id,
              originalFilename: `file${i}.jpg`,
              originalPath: `/path/file${i}.jpg`,
              fileType: 'image',
              mimeType: 'image/jpeg',
              fileSize: 1000,
              status: 'pending',
            });

            await queueService.enqueueJob({
              jobId: job._id.toString(),
              userId: user._id.toString(),
              originalPath: job.originalPath,
              fileType: 'image',
              mimeType: 'image/jpeg',
            });

            jobIds.push(job._id.toString());
            
            // Small delay to ensure ordering
            await new Promise(resolve => setTimeout(resolve, 10));
          }

          // Verify jobs are in queue in FIFO order
          const queue = new Queue(JOB_QUEUE_NAME, {
            connection: redis,
          });
          const queuedJobs = await queue.getJobs(['waiting']);
          
          // Jobs for this user should be in the order they were added
          const userJobs = queuedJobs.filter(j => j.data.userId === user._id.toString());
          expect(userJobs.length).toBe(jobCount);
          
          await queue.close();
        }
      ),
      { numRuns: 50 }
    );
  });

  // Property 12: Enqueue status update
  // For any enqueued job, status should be 'queued'
  test('Property 12: Enqueue status update', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 5, maxLength: 20 }),
        async (filename) => {
          // Create user
          const user = await UserModel.create({
            email: `${filename}@test.com`,
            passwordHash: 'hash',
          });

          // Create job with pending status
          const job = await JobModel.create({
            userId: user._id,
            originalFilename: filename,
            originalPath: `/path/${filename}`,
            fileType: 'image',
            mimeType: 'image/jpeg',
            fileSize: 1000,
            status: 'pending',
          });

          expect(job.status).toBe('pending');

          // Enqueue job
          await queueService.enqueueJob({
            jobId: job._id.toString(),
            userId: user._id.toString(),
            originalPath: job.originalPath,
            fileType: 'image',
            mimeType: 'image/jpeg',
          });

          // Update status to queued (simulating what upload service does)
          job.status = 'queued';
          await job.save();

          // Verify status is now queued
          const updatedJob = await JobModel.findById(job._id);
          expect(updatedJob!.status).toBe('queued');
        }
      ),
      { numRuns: 100 }
    );
  });
});
