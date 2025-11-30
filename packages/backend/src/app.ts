import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import jwt from '@fastify/jwt';
import fastifyStatic from '@fastify/static';
import { config } from './config';
import { errorHandler } from './middleware/error.middleware';

export async function buildApp() {
  const app = Fastify({
    logger: config.nodeEnv === 'development',
    bodyLimit: 500 * 1024 * 1024, // 500MB body limit for large uploads
    requestTimeout: 300000, // 5 minutes timeout for large file uploads
  });

  // Register plugins
  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  await app.register(multipart, {
    limits: {
      fileSize: 500 * 1024 * 1024, // 500MB - increased for large video files
      files: 10, // Maximum 10 files per upload
      fieldSize: 1024 * 1024, // 1MB for field values
    },
    attachFieldsToBody: false,
  });

  await app.register(jwt, {
    secret: config.jwtSecret,
  });

  await app.register(fastifyStatic, {
    root: config.thumbnailDir,
    prefix: '/static/',
  });

  // Error handler
  app.setErrorHandler(errorHandler);

  // Health check
  app.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  return app;
}
