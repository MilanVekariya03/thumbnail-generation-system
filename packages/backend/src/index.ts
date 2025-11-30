import { buildApp } from './app';
import { config } from './config';
import { connectDatabase } from './db/mongoose';
import { authRoutes } from './routes/auth.routes';
import { SocketService } from './services/socket.service';
import fs from 'fs';
import path from 'path';

async function start() {
  try {
    // Connect to database
    await connectDatabase();

    // Create upload directories
    if (!fs.existsSync(config.uploadDir)) {
      fs.mkdirSync(config.uploadDir, { recursive: true });
    }
    if (!fs.existsSync(config.thumbnailDir)) {
      fs.mkdirSync(config.thumbnailDir, { recursive: true });
    }

    // Build app
    const app = await buildApp();

    // Register routes
    await app.register(authRoutes);
    const { uploadRoutes } = await import('./routes/upload.routes');
    await app.register(uploadRoutes);
    const { jobRoutes } = await import('./routes/job.routes');
    await app.register(jobRoutes);
    const { thumbnailRoutes } = await import('./routes/thumbnail.routes');
    await app.register(thumbnailRoutes);

    // Start server
    await app.listen({ port: config.port, host: '0.0.0.0' });
    console.log(`🚀 Backend server running on http://localhost:${config.port}`);

    // Initialize Socket.io
    const socketService = new SocketService(app.server, app);
    console.log('✅ Socket.io server initialized');

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received, shutting down gracefully...');
      await socketService.close();
      await app.close();
      process.exit(0);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
