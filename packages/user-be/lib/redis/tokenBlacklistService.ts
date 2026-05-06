import { createClient, RedisClientType } from '@redis/client';
import dotenv from 'dotenv';

dotenv.config();

const REDIS_URL = process.env.REDIS_URL;
const BLACKLIST_PREFIX = 'token_blacklist:';

class TokenBlacklistService {
  private client: RedisClientType;
  private isConnected: boolean = false;

  constructor() {
    this.client = createClient({
      url: REDIS_URL,
    });
    this.client.on('error', (err) => console.log('Token Blacklist Redis Error:', err));
  }

  public async connect(): Promise<void> {
    if (!this.isConnected) {
      await this.client.connect();
      this.isConnected = true;
    }
  }

  /**
   * Add a token to the blacklist
   * @param token - The JWT token to blacklist
   * @param expiresInSeconds - Time until token expires (we'll keep it blacklisted until then)
   */
  public async blacklistToken(token: string, expiresInSeconds: number): Promise<void> {
    await this.connect();
    const key = `${BLACKLIST_PREFIX}${token}`;
    // Store with expiry so it auto-cleans after token would have expired anyway
    await this.client.setEx(key, expiresInSeconds, 'blacklisted');
  }

  /**
   * Check if a token is blacklisted
   * @param token - The JWT token to check
   * @returns true if blacklisted, false otherwise
   */
  public async isBlacklisted(token: string): Promise<boolean> {
    await this.connect();
    const key = `${BLACKLIST_PREFIX}${token}`;
    const result = await this.client.get(key);
    return result !== null;
  }

  public async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.disconnect();
      this.isConnected = false;
    }
  }
}

export const tokenBlacklistService = new TokenBlacklistService();
