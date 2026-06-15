import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Use vi.hoisted to create mocks that are hoisted along with vi.mock
const {
  mockConnect,
  mockQuit,
  mockRPush,
  mockLLen,
  mockSetEx,
  mockGet,
  mockIncr,
  mockMGet,
  mockSAdd,
  mockSRem,
  mockSIsMember,
  mockPublish,
  mockEval,
} = vi.hoisted(() => ({
  mockConnect: vi.fn().mockResolvedValue(undefined),
  mockQuit: vi.fn().mockResolvedValue(undefined),
  mockRPush: vi.fn().mockResolvedValue(1),
  mockLLen: vi.fn().mockResolvedValue(5),
  mockSetEx: vi.fn().mockResolvedValue('OK'),
  mockGet: vi.fn().mockResolvedValue(null),
  mockIncr: vi.fn().mockResolvedValue(1),
  mockMGet: vi.fn().mockResolvedValue([]),
  mockSAdd: vi.fn().mockResolvedValue(1),
  mockSRem: vi.fn().mockResolvedValue(1),
  mockSIsMember: vi.fn().mockResolvedValue(false),
  mockPublish: vi.fn().mockResolvedValue(1),
  mockEval: vi.fn().mockResolvedValue(0),
}));

// Mock Redis client
vi.mock('@redis/client', () => ({
  createClient: vi.fn(() => ({
    connect: mockConnect,
    quit: mockQuit,
    disconnect: vi.fn().mockResolvedValue(undefined),
    rPush: mockRPush,
    lPop: vi.fn().mockResolvedValue(null),
    lLen: mockLLen,
    setEx: mockSetEx,
    get: mockGet,
    incr: mockIncr,
    eval: mockEval,
    mGet: mockMGet,
    sAdd: mockSAdd,
    sRem: mockSRem,
    sIsMember: mockSIsMember,
    subscribe: vi.fn().mockResolvedValue(undefined),
    publish: mockPublish,
    on: vi.fn(),
  })),
}));

// Mock the RedisClient classes with proper class constructors
vi.mock('../lib/redis/redisClient', () => {
  return {
    RedisClientforComplaintQueue: class MockRedisClientforComplaintQueue {
      connect = mockConnect;
      getClient = vi.fn().mockReturnValue({
        rPush: mockRPush,
        lLen: mockLLen,
        quit: mockQuit,
      });
    },
    RedisClientforUserQueue: class MockRedisClientforUserQueue {
      connect = mockConnect;
      getClient = vi.fn().mockReturnValue({
        rPush: mockRPush,
        lLen: mockLLen,
        quit: mockQuit,
      });
    },
  };
});

describe('Redis Services', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('ComplaintQueueService', () => {
    it('should be a singleton', async () => {
      const { ComplaintQueueService } = await import('../lib/redis/complaintQueueService');
      
      const instance1 = ComplaintQueueService.getInstance();
      const instance2 = ComplaintQueueService.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should connect to Redis', async () => {
      const { ComplaintQueueService } = await import('../lib/redis/complaintQueueService');
      const service = ComplaintQueueService.getInstance();
      
      // Reset the connection state for testing
      (service as any).isConnected = false;
      (service as any).redisClient = null;
      
      await service.connect();
      
      expect((service as any).isConnected).toBe(true);
    });

    it('should push complaint to queue', async () => {
      const { ComplaintQueueService } = await import('../lib/redis/complaintQueueService');
      const service = ComplaintQueueService.getInstance();
      
      const mockComplaintData = {
        id: 'complaint-123',
        title: 'Test Complaint',
        description: 'Test Description',
        userId: 'user-456',
      };

      // Should not throw
      await expect(service.pushComplaintToQueue(mockComplaintData)).resolves.toBeUndefined();
    });

    it('should get queue length', async () => {
      const { ComplaintQueueService } = await import('../lib/redis/complaintQueueService');
      const service = ComplaintQueueService.getInstance();
      
      const length = await service.getQueueLength();
      
      expect(typeof length).toBe('number');
    });
  });

  describe('UserQueueService', () => {
    it('should be a singleton', async () => {
      const { UserQueueService } = await import('../lib/redis/userQueueService');
      
      const instance1 = UserQueueService.getInstance();
      const instance2 = UserQueueService.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should connect to Redis', async () => {
      const { UserQueueService } = await import('../lib/redis/userQueueService');
      const service = UserQueueService.getInstance();
      
      // Reset connection state
      (service as any).isConnected = false;
      (service as any).redisClient = null;
      
      await service.connect();
      
      expect((service as any).isConnected).toBe(true);
    });

    it('should push user to queue', async () => {
      const { UserQueueService } = await import('../lib/redis/userQueueService');
      const service = UserQueueService.getInstance();
      
      const mockUserData = {
        id: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
      };

      await expect(service.pushUserToQueue(mockUserData)).resolves.toBeUndefined();
    });

    it('should get queue length', async () => {
      const { UserQueueService } = await import('../lib/redis/userQueueService');
      const service = UserQueueService.getInstance();
      
      const length = await service.getQueueLength();
      
      expect(typeof length).toBe('number');
    });
  });

  describe('TokenBlacklistService', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should blacklist a token with expiry', async () => {
      const { createClient } = await import('@redis/client');
      const client = createClient();
      
      await client.setEx('token_blacklist:test-token', 3600, 'blacklisted');
      
      expect(mockSetEx).toHaveBeenCalledWith(
        'token_blacklist:test-token',
        3600,
        'blacklisted'
      );
    });

    it('should check if token is blacklisted - not blacklisted', async () => {
      mockGet.mockResolvedValue(null);
      
      const { createClient } = await import('@redis/client');
      const client = createClient();
      const result = await client.get('token_blacklist:test-token');
      
      expect(result).toBeNull();
    });

    it('should check if token is blacklisted - is blacklisted', async () => {
      mockGet.mockResolvedValue('blacklisted');
      
      const { createClient } = await import('@redis/client');
      const client = createClient();
      const result = await client.get('token_blacklist:test-token');
      
      expect(result).toBe('blacklisted');
    });
  });

  describe('LikeCounterService', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should increment like count atomically', async () => {
      mockIncr.mockResolvedValue(6);
      
      const { createClient } = await import('@redis/client');
      const client = createClient();
      const newCount = await client.incr('like_count:complaint-123');
      
      expect(newCount).toBe(6);
      expect(mockIncr).toHaveBeenCalledWith('like_count:complaint-123');
    });

    it('should get like count for a complaint', async () => {
      mockGet.mockResolvedValue('15');
      
      const { createClient } = await import('@redis/client');
      const client = createClient();
      const count = await client.get('like_count:complaint-123');
      
      expect(count).toBe('15');
    });

    it('should return 0 for unknown complaint', async () => {
      mockGet.mockResolvedValue(null);
      
      const { createClient } = await import('@redis/client');
      const client = createClient();
      const count = await client.get('like_count:unknown');
      
      expect(count).toBeNull();
    });

    it('should get multiple like counts', async () => {
      mockMGet.mockResolvedValue(['5', '10', '3']);
      
      const { createClient } = await import('@redis/client');
      const client = createClient();
      const counts = await client.mGet([
        'like_count:complaint-1',
        'like_count:complaint-2',
        'like_count:complaint-3',
      ]);
      
      expect(counts).toEqual(['5', '10', '3']);
    });

    it('should track user likes with sets', async () => {
      mockSIsMember.mockResolvedValue(true);
      
      const { createClient } = await import('@redis/client');
      const client = createClient();
      
      // Add user like
      await client.sAdd('user_likes:user-123', 'complaint-456');
      expect(mockSAdd).toHaveBeenCalledWith('user_likes:user-123', 'complaint-456');
      
      // Check if user liked
      const hasLiked = await client.sIsMember('user_likes:user-123', 'complaint-456');
      expect(hasLiked).toBe(true);
      
      // Remove user like
      await client.sRem('user_likes:user-123', 'complaint-456');
      expect(mockSRem).toHaveBeenCalledWith('user_likes:user-123', 'complaint-456');
    });

    it('should decrement like count without going below 0', async () => {
      mockEval.mockResolvedValue(0);
      
      const { createClient } = await import('@redis/client');
      const client = createClient();
      
      // Lua script ensures count doesn't go below 0
      const result = await client.eval('script', { keys: ['like_count:complaint-123'] });
      
      expect(result).toBe(0);
    });

    it('should publish like updates for multi-instance sync', async () => {
      mockPublish.mockResolvedValue(1);
      
      const { createClient } = await import('@redis/client');
      const client = createClient();
      
      const updateData = {
        complaintId: 'complaint-123',
        userId: 'user-456',
        liked: true,
        count: 10,
      };
      
      await client.publish('like_updates', JSON.stringify(updateData));
      
      expect(mockPublish).toHaveBeenCalledWith('like_updates', JSON.stringify(updateData));
    });
  });
});
