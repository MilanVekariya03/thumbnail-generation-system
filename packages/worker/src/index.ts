import mongoose from 'mongoose';
import fs from 'fs';
import { config } from './config';
import { ThumbnailWorker } from './worker';

async function start() {
  try {
    // Connect to MongoDB
    await mongoose.connect(config.mongoUrl);
    console.log('✅ MongoDB connected');

    // Create thumbnail directory if it doesn't exist
    if (!fs.existsSync(config.thumbnailDir)) {
      fs.mkdirSync(config.thumbnailDir, { recursive: true });
    }

    // Start worker
    const worker = new ThumbnailWorker();
    console.log('🔄 Worker started and listening for jobs...');

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received, shutting down gracefully...');
      await worker.close();
      await mongoose.connection.close();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.log('SIGINT received, shutting down gracefully...');
      await worker.close();
      await mongoose.connection.close();
      process.exit(0);
    });
  } catch (error) {
    console.error('Failed to start worker:', error);
    process.exit(1);
  }
}

start();
