import Redis from 'ioredis';
import { config } from '../config';
import { StatusUpdateMessage, REDIS_CHANNELS } from '@thumbnail-system/shared';

export class PubSubService {
  private subscriber: Redis;
  private handlers: Map<string, (message: StatusUpdateMessage) => void>;

  constructor() {
    this.subscriber = new Redis(config.redisUrl);
    this.handlers = new Map();
    this.setupSubscriber();
  }

  private setupSubscriber(): void {
    this.subscriber.subscribe(REDIS_CHANNELS.JOB_STATUS_UPDATE, (err) => {
      if (err) {
        console.error('Failed to subscribe to Redis channel:', err);
      } else {
        console.log('✅ Subscribed to job status updates');
      }
    });

    this.subscriber.on('message', (channel, message) => {
      if (channel === REDIS_CHANNELS.JOB_STATUS_UPDATE) {
        try {
          const statusUpdate: StatusUpdateMessage = JSON.parse(message);
          this.notifyHandlers(statusUpdate);
        } catch (error) {
          console.error('Error parsing status update message:', error);
        }
      }
    });
  }

  onStatusUpdate(handler: (message: StatusUpdateMessage) => void): void {
    const id = Math.random().toString(36);
    this.handlers.set(id, handler);
  }

  private notifyHandlers(message: StatusUpdateMessage): void {
    this.handlers.forEach((handler) => {
      try {
        handler(message);
      } catch (error) {
        console.error('Error in status update handler:', error);
      }
    });
  }

  async close(): Promise<void> {
    await this.subscriber.quit();
  }
}
