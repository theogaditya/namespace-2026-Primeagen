import { createClient } from '@redis/client';
import type { RedisClientType } from '@redis/client';

// Generic Redis client (singleton pattern)
// Defers client creation until connect() is called so that
// AWS secrets (REDIS_URL) are available in process.env
class RedisClient {
  private client: RedisClientType | null = null;
  private isConnected: boolean = false;

  private createClient(): RedisClientType {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    console.log(`[Redis] Connecting to ${url.replace(/:\/\/.*@/, '://<redacted>@')}`);
    const client = createClient({ url });

    client.on('error', (err) => {
      console.error('Redis Client Error:', err);
      this.isConnected = false;
    });

    client.on('ready', () => {
      console.log('Redis client ready');
      this.isConnected = true;
    });

    client.on('connect', () => {
      console.log('Redis client connected');
      this.isConnected = true;
    });

    client.on('end', () => {
      console.log('Redis connection ended');
      this.isConnected = false;
    });

    return client;
  }

  async connect(): Promise<void> {
    if (!this.client) {
      this.client = this.createClient();
    }
    if (!this.client.isOpen) {
      await this.client.connect();
    }
  }

  getClient(): RedisClientType {
    if (!this.client) {
      throw new Error('Redis client not initialized. Call connect() first.');
    }
    return this.client;
  }

  isReady(): boolean {
    return this.isConnected && !!this.client?.isOpen;
  }

  async disconnect(): Promise<void> {
    if (this.client?.isOpen) {
      await this.client.quit();
      this.isConnected = false;
    }
  }
}

export const redisClient = new RedisClient();

// Complaint Queue Redis client (matches user-be pattern)
// Defers client creation until connect() is called
export class RedisClientforComplaintQueue {
  private complaintClient: RedisClientType | null = null;

  private createClient(): RedisClientType {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    const client = createClient({ url });
    client.on('error', (err) => console.log('Redis Complaint Client Error', err));
    return client;
  }

  public async connect() {
    if (!this.complaintClient) {
      this.complaintClient = this.createClient();
    }
    if (!this.complaintClient.isOpen) {
      await this.complaintClient.connect();
    }
  }

  public getClient(): RedisClientType {
    if (!this.complaintClient) {
      throw new Error('Complaint Redis client not initialized. Call connect() first.');
    }
    return this.complaintClient;
  }
}
