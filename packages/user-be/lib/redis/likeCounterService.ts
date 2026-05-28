/**
 * Redis Like Counter Service
 * 
 * Handles atomic like count operations in Redis.
 * Acts as a fast, persistent counter that syncs with in-memory store.
 * Used for multi-instance deployments to maintain consistent counts.
 */

import { createClient, RedisClientType } from '@redis/client';

export class RedisLikeCounterService {
  private client: RedisClientType;
  private pubClient: RedisClientType;
  private subClient: RedisClientType;
  private isConnected: boolean = false;
  private connectPromise: Promise<void> | null = null;
  
  private readonly COUNTER_PREFIX = 'like_count:';
  private readonly USER_LIKES_PREFIX = 'user_likes:';
  private readonly LIKE_CHANNEL = 'like_updates';
  
  // Callback for pub/sub messages (used by WS server to broadcast)
  private onLikeUpdate?: (data: LikeUpdateMessage) => void;
  
  constructor() {
    const REDIS_URL = process.env.REDIS_URL;
    
    this.client = createClient({ url: REDIS_URL });
    this.pubClient = createClient({ url: REDIS_URL });
    this.subClient = createClient({ url: REDIS_URL });
    
    this.client.on('error', (err) => console.log('Redis Like Counter Error:', err));
    this.pubClient.on('error', (err) => console.log('Redis Pub Error:', err));
    this.subClient.on('error', (err) => console.log('Redis Sub Error:', err));
  }
  
  /**
   * Connect all Redis clients
   */
  async connect(): Promise<void> {
    // If already connected, return immediately
    if (this.isConnected) return;
    
    // If connection is in progress, wait for it
    if (this.connectPromise) {
      return this.connectPromise;
    }
    
    // Start new connection
    this.connectPromise = (async () => {
      try {
        await Promise.all([
          this.client.connect(),
          this.pubClient.connect(),
          this.subClient.connect(),
        ]);
        
        this.isConnected = true;
        console.log('✅ Redis Like Counter Service connected');
      } catch (error) {
        this.connectPromise = null;
        throw error;
      }
    })();
    
    return this.connectPromise;
  }
  
  /**
   * Subscribe to like updates (for multi-instance sync)
   */
  async subscribeToUpdates(callback: (data: LikeUpdateMessage) => void): Promise<void> {
    this.onLikeUpdate = callback;
    
    await this.subClient.subscribe(this.LIKE_CHANNEL, (message) => {
      try {
        const data = JSON.parse(message) as LikeUpdateMessage;
        if (this.onLikeUpdate) {
          this.onLikeUpdate(data);
        }
      } catch (error) {
        console.error('Error parsing like update message:', error);
      }
    });
  }
  
  /**
   * Publish a like update to all instances
   */
  async publishUpdate(data: LikeUpdateMessage): Promise<void> {
    await this.pubClient.publish(this.LIKE_CHANNEL, JSON.stringify(data));
  }
  
  /**
   * Increment like count atomically
   * Returns the new count
   */
  async incrementLikeCount(complaintId: string): Promise<number> {
    const key = `${this.COUNTER_PREFIX}${complaintId}`;
    const newCount = await this.client.incr(key);
    return newCount;
  }
  
  /**
   * Decrement like count atomically (won't go below 0)
   * Returns the new count
   */
  async decrementLikeCount(complaintId: string): Promise<number> {
    const key = `${this.COUNTER_PREFIX}${complaintId}`;
    
    // Use Lua script to ensure we don't go below 0
    const script = `
      local current = redis.call('GET', KEYS[1])
      if current and tonumber(current) > 0 then
        return redis.call('DECR', KEYS[1])
      else
        redis.call('SET', KEYS[1], 0)
        return 0
      end
    `;
    
    const newCount = await this.client.eval(script, {
      keys: [key],
    }) as number;
    
    return newCount;
  }
  
  /**
   * Get like count for a complaint
   */
  async getLikeCount(complaintId: string): Promise<number> {
    const key = `${this.COUNTER_PREFIX}${complaintId}`;
    const count = await this.client.get(key);
    return count ? parseInt(count, 10) : 0;
  }
  
  /**
   * Get like counts for multiple complaints
   */
  async getLikeCounts(complaintIds: string[]): Promise<Map<string, number>> {
    if (complaintIds.length === 0) {
      return new Map();
    }
    
    const keys = complaintIds.map(id => `${this.COUNTER_PREFIX}${id}`);
    const counts = await this.client.mGet(keys);
    
    const result = new Map<string, number>();
    complaintIds.forEach((id, index) => {
      result.set(id, counts[index] ? parseInt(counts[index]!, 10) : 0);
    });
    
    return result;
  }
  
  /**
   * Set like count (used for initialization from DB)
   */
  async setLikeCount(complaintId: string, count: number): Promise<void> {
    const key = `${this.COUNTER_PREFIX}${complaintId}`;
    await this.client.set(key, count.toString());
  }
  
  /**
   * Add a complaint to user's liked set
   */
  async addUserLike(userId: string, complaintId: string): Promise<void> {
    const key = `${this.USER_LIKES_PREFIX}${userId}`;
    await this.client.sAdd(key, complaintId);
  }
  
  /**
   * Remove a complaint from user's liked set
   */
  async removeUserLike(userId: string, complaintId: string): Promise<void> {
    const key = `${this.USER_LIKES_PREFIX}${userId}`;
    await this.client.sRem(key, complaintId);
  }
  
  /**
   * Check if user has liked a complaint
   */
  async hasUserLiked(userId: string, complaintId: string): Promise<boolean> {
    const key = `${this.USER_LIKES_PREFIX}${userId}`;
    const result = await this.client.sIsMember(key, complaintId);
    // sIsMember returns number (0 or 1) in @redis/client
    return result === 1;
  }
  
  /**
   * Get all complaints liked by a user
   */
  async getUserLikes(userId: string): Promise<string[]> {
    const key = `${this.USER_LIKES_PREFIX}${userId}`;
    return await this.client.sMembers(key);
  }
  
  /**
   * Perform like toggle with atomic operations
   * Uses Lua script for atomicity
   */
  async toggleLike(userId: string, complaintId: string): Promise<{
    liked: boolean;
    count: number;
  }> {
    const userKey = `${this.USER_LIKES_PREFIX}${userId}`;
    const countKey = `${this.COUNTER_PREFIX}${complaintId}`;
    
    // Lua script for atomic toggle
    const script = `
      local userKey = KEYS[1]
      local countKey = KEYS[2]
      local complaintId = ARGV[1]
      
      local isMember = redis.call('SISMEMBER', userKey, complaintId)
      local newCount
      local liked
      
      if isMember == 1 then
        -- Unlike: remove from set and decrement
        redis.call('SREM', userKey, complaintId)
        local current = redis.call('GET', countKey) or '0'
        if tonumber(current) > 0 then
          newCount = redis.call('DECR', countKey)
        else
          newCount = 0
        end
        liked = 0
      else
        -- Like: add to set and increment
        redis.call('SADD', userKey, complaintId)
        newCount = redis.call('INCR', countKey)
        liked = 1
      end
      
      return {liked, newCount}
    `;
    
    const result = await this.client.eval(script, {
      keys: [userKey, countKey],
      arguments: [complaintId],
    }) as [number, number];
    
    return {
      liked: result[0] === 1,
      count: result[1],
    };
  }
  
  /**
   * Disconnect all Redis clients
   */
  async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }
    
    this.isConnected = false;
    
    const disconnectClient = async (client: RedisClientType, name: string) => {
      try {
        if (client.isOpen) {
          await client.quit();
        }
      } catch (error) {
        console.warn(`Error disconnecting ${name}:`, error);
      }
    };
    
    await Promise.all([
      disconnectClient(this.client, 'client'),
      disconnectClient(this.pubClient, 'pubClient'),
      disconnectClient(this.subClient, 'subClient'),
    ]);
  }
  
  /**
   * Check if connected
   */
  isReady(): boolean {
    return this.isConnected;
  }
}

/**
 * Message format for pub/sub
 */
export interface LikeUpdateMessage {
  type: 'like' | 'unlike';
  userId: string;
  complaintId: string;
  newCount: number;
  timestamp: number;
}

// Singleton instance
let likeCounterService: RedisLikeCounterService | null = null;

export function getLikeCounterService(): RedisLikeCounterService {
  if (!likeCounterService) {
    likeCounterService = new RedisLikeCounterService();
  }
  return likeCounterService;
}
