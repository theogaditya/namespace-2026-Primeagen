import { createClient } from '@redis/client';
import type { RedisClientType } from '@redis/client';
import dotenv from 'dotenv';

dotenv.config();

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Generic Redis client (singleton pattern)
class RedisClient {
  private client: RedisClientType;
  private isConnected: boolean = false;

  constructor() {
    this.client = createClient({
      url: REDIS_URL,
    });

    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
      this.isConnected = false;
    });

    this.client.on('ready', () => {
      console.log('Redis client ready');
      this.isConnected = true;
    });

    this.client.on('connect', () => {
      console.log('Redis client connected');
      this.isConnected = true;
    });

    this.client.on('end', () => {
      console.log('Redis connection ended');
      this.isConnected = false;
    });
  }

  async connect(): Promise<void> {
    if (!this.client.isOpen) {
      await this.client.connect();
    }
  }

  getClient(): RedisClientType {
    return this.client;
  }

  isReady(): boolean {
    return this.isConnected && this.client.isOpen;
  }

  async disconnect(): Promise<void> {
    if (this.client.isOpen) {
      await this.client.quit();
      this.isConnected = false;
    }
  }
}

export const redisClient = new RedisClient();

// Complaint Queue Redis client (matches user-be pattern)
export class RedisClientforComplaintQueue {
  private complaintClient: RedisClientType;

  constructor() {
    this.complaintClient = createClient({
      url: REDIS_URL,
    });
    this.complaintClient.on('error', (err) => console.log('Redis Complaint Client Error', err));
  }

  public async connect() {
    if (!this.complaintClient.isOpen) {
      await this.complaintClient.connect();
    }
  }

  public getClient(): RedisClientType {
    return this.complaintClient;
  }
}
