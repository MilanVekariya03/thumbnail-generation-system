import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// Get the project root directory (3 levels up from worker/src/config)
const projectRoot = path.resolve(__dirname, '../../..');

export const config = {
  mongoUrl: process.env.MONGO_URL || 'mongodb://localhost:27017/thumbnail-system',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  thumbnailDir: process.env.THUMBNAIL_DIR || path.join(projectRoot, 'packages', 'backend', 'thumbnails'),
  workerConcurrency: parseInt(process.env.WORKER_CONCURRENCY || '1', 10),
  jobTimeout: parseInt(process.env.JOB_TIMEOUT || '300000', 10), // 5 minutes
};
