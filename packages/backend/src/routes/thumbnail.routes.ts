import { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth.middleware';
import { JobModel } from '../models/job.model';
import { AppError } from '@thumbnail-system/shared';
import path from 'path';
import fs from 'fs';
import { config } from '../config';

export async function thumbnailRoutes(app: FastifyInstance) {
  // Serve thumbnail file (public access - thumbnails are not sensitive)
  app.get<{
    Params: { filename: string };
  }>(
    '/api/thumbnails/:filename',
    async (request, reply) => {
      const { filename } = request.params;

      // Find job by thumbnail filename
      const job = await JobModel.findOne({
        thumbnailPath: { $regex: filename },
      });

      if (!job || !job.thumbnailPath) {
        throw new AppError(404, 'Thumbnail not found');
      }

      // Check if file exists
      if (!fs.existsSync(job.thumbnailPath)) {
        throw new AppError(404, 'Thumbnail file not found');
      }

      // Serve file
      return reply.sendFile(path.basename(job.thumbnailPath), path.dirname(job.thumbnailPath));
    }
  );

  // Download thumbnail (public access - thumbnails are not sensitive)
  app.get<{
    Params: { filename: string };
  }>(
    '/api/download/:filename',
    async (request, reply) => {
      const { filename } = request.params;

      // Find job by thumbnail filename
      const job = await JobModel.findOne({
        thumbnailPath: { $regex: filename },
      });

      if (!job || !job.thumbnailPath) {
        throw new AppError(404, 'Thumbnail not found');
      }

      // Check if file exists
      if (!fs.existsSync(job.thumbnailPath)) {
        throw new AppError(404, 'Thumbnail file not found');
      }

      // Serve file with download headers
      reply.header('Content-Disposition', `attachment; filename="${filename}"`);
      return reply.sendFile(path.basename(job.thumbnailPath), path.dirname(job.thumbnailPath));
    }
  );
}
