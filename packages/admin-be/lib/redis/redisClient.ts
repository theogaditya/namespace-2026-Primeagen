import Redis from 'ioredis';

class RedisClient {
  private client: Redis | null = null;
  private isConnected: boolean = false;

  constructor() {
    this.connect();
  }

  private connect(): void {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      
      console.log('🔌 Connecting to Redis...');
      console.log(`🌐 Redis URL: ${redisUrl}`);
      this.client = new Redis(redisUrl, {
        retryStrategy: (times: number) => {
          const delay = Math.min(times * 50, 2000);
          console.log(`⏳ Redis retry attempt ${times}, waiting ${delay}ms`);
          return delay;
        },
        maxRetriesPerRequest: null,
        enableReadyCheck: true,
        reconnectOnError: (err) => {
          console.error('❌ Redis connection error:', err.message);
          return true;
        },
      });

      this.attachListeners();
    } catch (err) {
      console.error('❌ Failed to create Redis client:', err);
      setTimeout(() => this.connect(), 3000);
    }
  }

  private attachListeners(): void {
    if (!this.client) return;

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
      setTimeout(() => this.reconnect(), 2000);
    });

    this.client.on('end', () => {
      console.log('ℹ️  Redis connection ended');
      this.isConnected = false;
    });
  }

  private reconnect(): void {
    try {
      if (this.client) {
        try { this.client.disconnect(); } catch (_) {}
        this.client = null;
      }
    } catch (e) {
      // ignore
    }
    this.connect();
  }

  getClient(): Redis {
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
}

export const redisClient = new RedisClient();
