import Redis from 'ioredis';
import { config } from '../config';
import { StatusUpdateMessage, REDIS_CHANNELS } from '@thumbnail-system/shared';

export class StatusPublisher {
  private redis: Redis;

  constructor() {
    this.redis = new Redis(config.redisUrl);
  }

  async publishStatusUpdate(message: StatusUpdateMessage): Promise<void> {
    await this.redis.publish(
      REDIS_CHANNELS.JOB_STATUS_UPDATE,
      JSON.stringify(message)
    );
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }
}
