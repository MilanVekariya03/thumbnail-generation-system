import { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth.middleware';
import { JobModel } from '../models/job.model';
import { AppError, JobListResponse, JobDetailResponse } from '@thumbnail-system/shared';

export async function jobRoutes(app: FastifyInstance) {
  // Get all jobs for authenticated user
  app.get<{
    Querystring: { page?: string; limit?: string };
  }>(
    '/api/jobs',
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      const userId = (request.user as any).id;
      const page = parseInt(request.query.page || '1', 10);
      const limit = parseInt(request.query.limit || '50', 10);
      const skip = (page - 1) * limit;

      const [jobs, total] = await Promise.all([
        JobModel.find({ userId })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        JobModel.countDocuments({ userId }),
      ]);

      const response: JobListResponse = {
        jobs: jobs.map(job => ({
          ...job,
          _id: job._id.toString(),
          userId: job.userId.toString(),
        })) as any,
        total,
      };

      return reply.send(response);
    }
  );

  // Get specific job by ID
  app.get<{
    Params: { id: string };
  }>(
    '/api/jobs/:id',
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      const userId = (request.user as any).id;
      const jobId = request.params.id;

      const job = await JobModel.findOne({
        _id: jobId,
        userId,
      }).lean();

      if (!job) {
        throw new AppError(404, 'Job not found');
      }

      const response: JobDetailResponse = {
        job: {
          ...job,
          _id: job._id.toString(),
          userId: job.userId.toString(),
        } as any,
      };

      return reply.send(response);
    }
  );

  // Delete job by ID
  app.delete<{
    Params: { id: string };
  }>(
    '/api/jobs/:id',
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      const userId = (request.user as any).id;
      const jobId = request.params.id;

      const job = await JobModel.findOne({
        _id: jobId,
        userId,
      });

      if (!job) {
        throw new AppError(404, 'Job not found');
      }

      // Delete the job from database
      await JobModel.deleteOne({ _id: jobId, userId });

      return reply.send({ 
        success: true, 
        message: 'Job deleted successfully' 
      });
    }
  );
}
