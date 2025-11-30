import { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth.middleware';
import { UploadService } from '../services/upload.service';
import { AppError } from '@thumbnail-system/shared';

export async function uploadRoutes(app: FastifyInstance) {
  const uploadService = new UploadService();

  app.post(
    '/api/upload',
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      const userId = request.user!.id;
      const result = await uploadService.uploadFiles(request.parts(), userId);

      return reply.status(200).send(result);
    }
  );
}
