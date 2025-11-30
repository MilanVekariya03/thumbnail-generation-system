import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { FastifyInstance } from 'fastify';
import {
  ServerToClientEvents,
  ClientToServerEvents,
  SocketData,
  StatusUpdateMessage,
} from '@thumbnail-system/shared';
import { PubSubService } from './pubsub.service';

export class SocketService {
  private io: SocketIOServer<ClientToServerEvents, ServerToClientEvents, {}, SocketData>;
  private pubSubService: PubSubService;

  constructor(server: HttpServer, app: FastifyInstance) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: true,
        credentials: true,
      },
    });

    this.pubSubService = new PubSubService();
    this.setupSocketHandlers(app);
    this.setupPubSubListener();
  }

  private setupSocketHandlers(app: FastifyInstance): void {
    this.io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      // Handle authentication
      socket.on('authenticate', async (token: string) => {
        try {
          const decoded = app.jwt.verify(token) as any;
          socket.data.userId = decoded.id;
          socket.data.email = decoded.email;

          // Join user-specific room
          socket.join(`user:${decoded.id}`);
          
          socket.emit('connected');
          console.log(`User ${decoded.email} authenticated and joined room`);
        } catch (error) {
          socket.emit('error', 'Authentication failed');
          socket.disconnect();
        }
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });
  }

  private setupPubSubListener(): void {
    this.pubSubService.onStatusUpdate((message: StatusUpdateMessage) => {
      // Emit to user-specific room
      this.io.to(`user:${message.userId}`).emit('jobStatusUpdate', message);
      console.log(`Status update sent to user ${message.userId}: ${message.status}`);
    });
  }

  async close(): Promise<void> {
    await this.pubSubService.close();
    this.io.close();
  }
}
