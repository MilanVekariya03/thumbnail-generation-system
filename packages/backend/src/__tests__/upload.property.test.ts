import * as fc from 'fast-check';
import { buildApp } from '../app';
import { authRoutes } from '../routes/auth.routes';
import { uploadRoutes } from '../routes/upload.routes';
import { JobModel } from '../models/job.model';
import { UserModel } from '../models/user.model';
import mongoose from 'mongoose';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

// Feature: thumbnail-generation-system, Property 5: Image file acceptance
// Feature: thumbnail-generation-system, Property 6: Video file acceptance
// Feature: thumbnail-generation-system, Property 7: File type validation
// Feature: thumbnail-generation-system, Property 8: Metadata creation invariant
// Feature: thumbnail-generation-system, Property 9: Upload identifier return
// Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5

describe('File Upload Property Tests', () => {
  let app: any;
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/thumbnail-system-test';
    await mongoose.connect(mongoUrl);
    
    app = await buildApp();
    await app.register(authRoutes);
    await app.register(uploadRoutes);
    await app.ready();

    // Create test user
    const registerResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: 'test@example.com',
        password: 'password123',
      },
    });
    const body = JSON.parse(registerResponse.body);
    authToken = body.token;
    userId = body.user.id;
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await app.close();
  });

  beforeEach(async () => {
    await JobModel.deleteMany({ userId });
  });

  // Helper to create test image buffer
  function createTestImageBuffer(format: string): Buffer {
    // Create a minimal valid image buffer for testing
    if (format === 'png') {
      // Minimal PNG signature
      return Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
        0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
      ]);
    }
    // Minimal JPEG signature
    return Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
  }

  // Property 5: Image file acceptance
  // For any valid image file, upload should succeed and store the file
  test('Property 5: Image file acceptance', async () => {
    const imageTypes = [
      { ext: '.jpg', mime: 'image/jpeg' },
      { ext: '.png', mime: 'image/png' },
      { ext: '.gif', mime: 'image/gif' },
      { ext: '.webp', mime: 'image/webp' },
    ];

    for (const imageType of imageTypes) {
      const form = new FormData();
      const buffer = createTestImageBuffer(imageType.ext.slice(1));
      form.append('files', buffer, {
        filename: `test${imageType.ext}`,
        contentType: imageType.mime,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/upload',
        headers: {
          ...form.getHeaders(),
          authorization: `Bearer ${authToken}`,
        },
        payload: form,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.jobs).toHaveLength(1);
      expect(body.jobs[0].id).toBeTruthy();

      // Verify job in database
      const job = await JobModel.findById(body.jobs[0].id);
      expect(job).toBeTruthy();
      expect(job!.fileType).toBe('image');
      expect(job!.status).toBe('pending');
    }
  });

  // Property 6: Video file acceptance
  // For any valid video file, upload should succeed and store the file
  test('Property 6: Video file acceptance', async () => {
    const videoTypes = [
      { ext: '.mp4', mime: 'video/mp4' },
      { ext: '.avi', mime: 'video/avi' },
      { ext: '.mov', mime: 'video/quicktime' },
      { ext: '.webm', mime: 'video/webm' },
    ];

    for (const videoType of videoTypes) {
      const form = new FormData();
      const buffer = Buffer.from('fake video content');
      form.append('files', buffer, {
        filename: `test${videoType.ext}`,
        contentType: videoType.mime,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/upload',
        headers: {
          ...form.getHeaders(),
          authorization: `Bearer ${authToken}`,
        },
        payload: form,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.jobs).toHaveLength(1);

      // Verify job in database
      const job = await JobModel.findById(body.jobs[0].id);
      expect(job).toBeTruthy();
      expect(job!.fileType).toBe('video');
      expect(job!.status).toBe('pending');
    }
  });

  // Property 7: File type validation
  // For any unsupported file type, upload should be rejected
  test('Property 7: File type validation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('.txt', '.pdf', '.doc', '.exe', '.zip'),
        fc.constantFrom('text/plain', 'application/pdf', 'application/octet-stream'),
        async (extension, mimeType) => {
          const form = new FormData();
          const buffer = Buffer.from('test content');
          form.append('files', buffer, {
            filename: `test${extension}`,
            contentType: mimeType,
          });

          const response = await app.inject({
            method: 'POST',
            url: '/api/upload',
            headers: {
              ...form.getHeaders(),
              authorization: `Bearer ${authToken}`,
            },
            payload: form,
          });

          // Should reject unsupported file types
          expect(response.statusCode).toBe(400);
          const body = JSON.parse(response.body);
          expect(body.success).toBe(false);
        }
      ),
      { numRuns: 50 }
    );
  });

  // Property 8: Metadata creation invariant
  // For any successfully stored file, metadata should exist with 'pending' status
  test('Property 8: Metadata creation invariant', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('image/jpeg', 'image/png', 'video/mp4'),
        fc.string({ minLength: 1, maxLength: 50 }),
        async (mimeType, filename) => {
          const ext = mimeType.includes('jpeg') ? '.jpg' : 
                      mimeType.includes('png') ? '.png' : '.mp4';
          const form = new FormData();
          const buffer = createTestImageBuffer('jpg');
          form.append('files', buffer, {
            filename: `${filename}${ext}`,
            contentType: mimeType,
          });

          const response = await app.inject({
            method: 'POST',
            url: '/api/upload',
            headers: {
              ...form.getHeaders(),
              authorization: `Bearer ${authToken}`,
            },
            payload: form,
          });

          if (response.statusCode === 200) {
            const body = JSON.parse(response.body);
            const jobId = body.jobs[0].id;

            // Verify metadata exists
            const job = await JobModel.findById(jobId);
            expect(job).toBeTruthy();
            expect(job!.status).toBe('pending');
            expect(job!.userId.toString()).toBe(userId);
            expect(job!.originalFilename).toBeTruthy();
            expect(job!.originalPath).toBeTruthy();
            expect(job!.mimeType).toBe(mimeType);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 9: Upload identifier return
  // For any completed upload, response should contain valid job identifiers
  test('Property 9: Upload identifier return', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }),
        async (fileCount) => {
          const form = new FormData();
          
          for (let i = 0; i < fileCount; i++) {
            const buffer = createTestImageBuffer('jpg');
            form.append('files', buffer, {
              filename: `test${i}.jpg`,
              contentType: 'image/jpeg',
            });
          }

          const response = await app.inject({
            method: 'POST',
            url: '/api/upload',
            headers: {
              ...form.getHeaders(),
              authorization: `Bearer ${authToken}`,
            },
            payload: form,
          });

          expect(response.statusCode).toBe(200);
          const body = JSON.parse(response.body);
          
          // Should return identifiers for all files
          expect(body.jobs).toHaveLength(fileCount);
          
          for (const job of body.jobs) {
            expect(job.id).toBeTruthy();
            expect(typeof job.id).toBe('string');
            expect(job.filename).toBeTruthy();
            expect(job.status).toBe('pending');
            
            // Verify each ID is valid
            const dbJob = await JobModel.findById(job.id);
            expect(dbJob).toBeTruthy();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
