import { createClient, type RedisClientType } from "@redis/client";

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs?: number;
}

class RateLimiter {
  private client: RedisClientType | null = null;

  async connect(): Promise<void> {
    if (!this.client) {
      const url = process.env.REDIS_URL || "redis://localhost:6379";
      this.client = createClient({ url });
      this.client.on("error", (err) => console.error("[RateLimiter] Redis error:", err));
      await this.client.connect();
    }
  }

  /**
   * Sliding window rate limiter using Redis sorted sets.
   * @param userId - The user to rate limit
   * @param action - The action type (e.g., 'chat', 'voice')
   * @param maxRequests - Max requests in the window
   * @param windowMs - Window size in milliseconds
   */
  async check(userId: string, action: string, maxRequests: number, windowMs: number): Promise<RateLimitResult> {
    if (!this.client) {
      // If Redis unavailable, allow through (fail-open)
      return { allowed: true, remaining: maxRequests };
    }

    const key = `ratelimit:${action}:${userId}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    try {
      // Remove expired entries and count current entries in one pipeline
      const multi = this.client.multi();
      multi.zRemRangeByScore(key, 0, windowStart);
      multi.zCard(key);
      multi.zAdd(key, { score: now, value: `${now}:${Math.random()}` });
      multi.expire(key, Math.ceil(windowMs / 1000));

      const results = await multi.exec();
      const currentCount = Number(results?.[1] as unknown ?? 0);

      if (currentCount >= maxRequests) {
        // Get the oldest entry to calculate retry-after
        const oldest = await this.client.zRange(key, 0, 0, { BY: "SCORE" });
        const oldestScore = oldest.length > 0 ? parseFloat(oldest[0]!.split(":")[0]!) : now;
        const retryAfterMs = oldestScore + windowMs - now;

        return {
          allowed: false,
          remaining: 0,
          retryAfterMs: Math.max(retryAfterMs, 1000),
        };
      }

      return {
        allowed: true,
        remaining: maxRequests - currentCount - 1,
      };
    } catch (error) {
      console.warn("[RateLimiter] Check failed, allowing through:", error);
      return { allowed: true, remaining: maxRequests };
    }
  }

  async disconnect(): Promise<void> {
    if (this.client?.isOpen) {
      await this.client.quit();
    }
  }
}

export const rateLimiter = new RateLimiter();

// Preset limits
export const RATE_LIMITS = {
  chat: { maxRequests: 30, windowMs: 60_000 },       // 30/min
  voice: { maxRequests: 10, windowMs: 60_000 },      // 10/min
  hourly: { maxRequests: 100, windowMs: 3_600_000 },  // 100/hour
} as const;
