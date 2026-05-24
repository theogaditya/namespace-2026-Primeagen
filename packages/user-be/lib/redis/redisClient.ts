import { createClient, RedisClientType } from '@redis/client';

// Note: REDIS_URL is read at connection time, not module load time
// This allows AWS Secrets to be injected before Redis clients are created

export class RedisPublishClient {
    private Publishclient: RedisClientType;
    constructor() {
        const REDIS_URL = process.env.REDIS_URL;
        this.Publishclient = createClient({
            url: REDIS_URL,
        });
        this.Publishclient.on('error', (err) => console.log('Redis Client Error', err));
    }
    public async connect() {
        if (!this.Publishclient.isOpen) {
            await this.Publishclient.connect();
        }
    }

    public getClient(): RedisClientType {
        return this.Publishclient;
    }
}

export class RedisSubscribeClient {
    private Subscribeclient: RedisClientType;
    constructor() {
        const REDIS_URL = process.env.REDIS_URL;
        this.Subscribeclient = createClient({
            url: REDIS_URL,
        });
        this.Subscribeclient.on('error', (err) => console.log('Redis Client Error', err));
    }
    public async connect() {
        if (!this.Subscribeclient.isOpen) {
            await this.Subscribeclient.connect();
        }
    }

    public getClient(): RedisClientType {
        return this.Subscribeclient;
    }
}   

export class generaleClientforCaching{
    private generalClient: RedisClientType;
    constructor() {
        const REDIS_URL = process.env.REDIS_URL;
        this.generalClient = createClient({
            url: REDIS_URL,
        });
        this.generalClient.on('error', (err) => console.log('Redis Client Error', err));
    }
    public async connect() {
        if (!this.generalClient.isOpen) {
            await this.generalClient.connect();
        }
    }

    public getClient(): RedisClientType {
        return this.generalClient;
    }
}

export class RedisClientForComplaintCache {
    private complaintCacheClient: RedisClientType;
    private readonly CACHE_PREFIX = 'complaint_cache:';
    private readonly DEFAULT_TTL = 300; // 5 minutes default TTL

    constructor() {
        const REDIS_URL = process.env.REDIS_URL;
        this.complaintCacheClient = createClient({
            url: REDIS_URL,
        });
        this.complaintCacheClient.on('error', (err) => console.log('Redis Complaint Cache Client Error', err));
    }

    public async connect() {
        if (!this.complaintCacheClient.isOpen) {
            await this.complaintCacheClient.connect();
        }
    }

    public getClient(): RedisClientType {
        return this.complaintCacheClient;
    }

    // Helper method to generate cache key
    public generateKey(type: string, identifier?: string): string {
        return identifier 
            ? `${this.CACHE_PREFIX}${type}:${identifier}`
            : `${this.CACHE_PREFIX}${type}`;
    }

    // Cache a complaint response with optional TTL
    public async cacheResponse(key: string, data: unknown, ttl: number = this.DEFAULT_TTL): Promise<void> {
        await this.complaintCacheClient.setEx(key, ttl, JSON.stringify(data));
    }

    // Get cached response
    public async getCachedResponse<T>(key: string): Promise<T | null> {
        const cached = await this.complaintCacheClient.get(key);
        return cached ? JSON.parse(cached) as T : null;
    }

    // Invalidate cache by key
    public async invalidateCache(key: string): Promise<void> {
        await this.complaintCacheClient.del(key);
    }

    // Invalidate all complaint caches (useful when complaints are updated)
    public async invalidateAllComplaintCaches(): Promise<void> {
        const keys = await this.complaintCacheClient.keys(`${this.CACHE_PREFIX}*`);
        if (keys.length > 0) {
            await this.complaintCacheClient.del(keys);
        }
    }

    // Invalidate caches by pattern (e.g., all caches for a specific user)
    public async invalidateCachesByPattern(pattern: string): Promise<void> {
        const keys = await this.complaintCacheClient.keys(`${this.CACHE_PREFIX}${pattern}*`);
        if (keys.length > 0) {
            await this.complaintCacheClient.del(keys);
        }
    }
}

export class RedisClientforUserQueue {
    private UserqueueClient: RedisClientType;
    constructor() {
        const REDIS_URL = process.env.REDIS_URL;
        this.UserqueueClient = createClient({
            url: REDIS_URL,
        });
        this.UserqueueClient.on('error', (err) => console.log('Redis Client Error', err));
    }
    public async connect() {
        if (!this.UserqueueClient.isOpen) {
            await this.UserqueueClient.connect();
        }
    }

    public getClient(): RedisClientType {
        return this.UserqueueClient;
    }
}


export class RedisClientforComplaintQueue{
    private complaintClient: RedisClientType;
    constructor() {
        const REDIS_URL = process.env.REDIS_URL;
        this.complaintClient = createClient({
            url: REDIS_URL,
        });
        this.complaintClient.on('error', (err) => console.log('Redis Client Error', err));
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