// apps/api/admin-be/src/services/redisService.ts

import Redis from 'ioredis';
import { redisConfig } from '../config/redis.config';

type IORedisClient = any; // can be Redis.Redis or Redis.Cluster

class RedisService {
  private client: IORedisClient | null = null;
  private isConnected: boolean = false;

  constructor() {
    this.buildClient();
  }

  private buildClient(): void {
    try {
      // If cluster mode is enabled and nodes provided, create a Cluster instance
      if (redisConfig.enableCluster && redisConfig.clusterNodes) {
        const nodes = redisConfig.clusterNodes.split(',').map((n) => {
          const [host, port] = n.split(':');
          return { host, port: parseInt(port || '6379') };
        });

        // @ts-ignore - use ioredis.Cluster
        this.client = new Redis.Cluster(nodes, ({
          redisOptions: {
            password: redisConfig.password,
            retryStrategy: (times: number) => Math.min(times * 50, 2000),
          },
        } as any));

        console.log('🔗 Redis Cluster client created');
      } else if (redisConfig.sentinelHosts) {
        // Sentinel mode
        const sentinels = redisConfig.sentinelHosts.split(',').map((s) => {
          const [host, port] = s.split(':');
          return { host, port: parseInt(port || '26379') };
        });

        this.client = new Redis(({
          sentinels,
          name: redisConfig.sentinelMasterName || 'mymaster',
          password: redisConfig.password,
          retryStrategy: (times: number) => Math.min(times * 50, 2000),
        } as any));

        console.log('🛰️  Redis Sentinel client created');
      } else {
        // Single node
        this.client = new Redis(({
          host: redisConfig.host,
          port: redisConfig.port,
          password: redisConfig.password,
          retryStrategy: (times: number) => Math.min(times * 50, 2000),
          maxRetriesPerRequest: null,
        } as any));

        console.log('🔌 Redis single-node client created');
      }

      this.attachListeners();
    } catch (err) {
      console.error('❌ Failed to build Redis client:', err);
      // try again after delay
      setTimeout(() => this.buildClient(), 3000);
    }
  }

  private attachListeners(): void {
    if (!this.client) return;

    // 'ready' is useful for both single and cluster clients
    this.client.on('ready', () => {
      console.log('✅ Redis ready');
      this.isConnected = true;
    });

    this.client.on('connect', () => {
      console.log('🔌 Redis connected');
      this.isConnected = true;
    });

    this.client.on('error', (err: any) => {
      console.error('❌ Redis error:', err?.message || err);
      this.isConnected = false;
    });

    this.client.on('close', () => {
      console.log('⚠️  Redis connection closed');
      this.isConnected = false;
      // attempt rebuild after short delay
      setTimeout(() => this.rebuildClient(), 2000);
    });

    this.client.on('end', () => {
      console.log('ℹ️  Redis connection ended');
      this.isConnected = false;
    });
  }

  private rebuildClient(): void {
    try {
      if (this.client) {
        try { this.client.disconnect(); } catch (_) {}
        try { this.client.quit(); } catch (_) {}
        this.client = null;
      }
    } catch (e) {
      // ignore
    }

    // recreate
    this.buildClient();
  }

  getClient(): IORedisClient {
    if (!this.client) throw new Error('Redis client not initialized');
    return this.client;
  }

  isReady(): boolean {
    return this.isConnected;
  }

  async disconnect(): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.quit();
    } catch (err) {
      try { this.client.disconnect(); } catch (_) {}
    }
  }

  // Push complaint to queue (for testing via CLI or other services)
  async pushComplaint(queueName: string, complaint: any): Promise<void> {
    const client = this.getClient();
    await client.lpush(queueName, JSON.stringify(complaint));
    console.log(`📨 Complaint ${complaint.id} pushed to queue`);
  }

  // Blocking pop - waits for complaints. Safe wrapper around brpop.
  async popComplaint(queueName: string, timeout: number = 0): Promise<any | null> {
    try {
      const client = this.getClient();
      const result = await client.brpop(queueName, timeout);
      if (result) {
        const [, complaintJson] = result;
        try {
          return JSON.parse(complaintJson);
        } catch (err: any) {
          console.error('❌ Failed to parse complaint JSON from Redis:', err?.message || err, '\nRaw payload:', complaintJson);
          // Move malformed payload to a dedicated dead-letter list for inspection
          try {
            await client.lpush('complaint:assignment:malformed', complaintJson);
            console.log('📮 Malformed complaint pushed to complaint:assignment:malformed');
          } catch (dlqErr) {
            console.error('❌ Failed to push malformed payload to dead-letter list:', dlqErr);
          }
          return null;
        }
      }
      return null;
    } catch (err: any) {
      console.error('❌ Redis pop error (will retry):', err?.message || err);
      // don't throw - let worker loop handle retry/backoff
      return null;
    }
  }

  // Non-blocking poll: check queue length and pop only if items present
  async pollAndPop(queueName: string): Promise<any | null> {
    try {
      const client = this.getClient();
      const len = await client.llen(queueName);
      if (!len || len <= 0) return null;

      const complaintJson = await client.lpop(queueName);
      if (!complaintJson) return null;

      try {
        return JSON.parse(complaintJson);
      } catch (err: any) {
        console.error('❌ Failed to parse complaint JSON from Redis (pollAndPop):', err?.message || err, '\nRaw payload:', complaintJson);
        try {
          await client.lpush('complaint:assignment:malformed', complaintJson);
          console.log('📮 Malformed complaint pushed to complaint:assignment:malformed');
        } catch (dlqErr) {
          console.error('❌ Failed to push malformed payload to dead-letter list:', dlqErr);
        }
        return null;
      }
    } catch (err: any) {
      console.error('❌ Redis pollAndPop error (will retry):', err?.message || err);
      return null;
    }
  }
}

export const redisService = new RedisService();