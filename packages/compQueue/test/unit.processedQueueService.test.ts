import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Create hoisted mocks - the mockClient methods and a mock connect function
const { mockClient, mockConnect } = vi.hoisted(() => ({
  mockClient: {
    rPush: vi.fn(),
    lPop: vi.fn(),
    lLen: vi.fn(),
    lIndex: vi.fn(),
    lRange: vi.fn(),
    quit: vi.fn(),
  },
  mockConnect: vi.fn().mockResolvedValue(undefined),
}));

// Mock the Redis client module BEFORE any imports
vi.mock('../lib/redis/redisClient', () => ({
  RedisClientforComplaintQueue: vi.fn().mockImplementation(() => ({
    connect: mockConnect,
    getClient: vi.fn().mockReturnValue(mockClient),
  })),
}));

// Import the mock to use in tests
import { RedisClientforComplaintQueue } from '../lib/redis/redisClient';

describe('ProcessedComplaintQueueService', () => {
  let ProcessedComplaintQueueService: typeof import('../lib/redis/processedComplaintQueueService').ProcessedComplaintQueueService;
  let service: any; // Use any for singleton with private constructor

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Reset modules to clear singleton
    vi.resetModules();
    
    // Re-apply the mock after module reset
    vi.doMock('../lib/redis/redisClient', () => ({
      RedisClientforComplaintQueue: vi.fn().mockImplementation(() => ({
        connect: mockConnect,
        getClient: vi.fn().mockReturnValue(mockClient),
      })),
    }));

    // Dynamically import after mocking
    const module = await import('../lib/redis/processedComplaintQueueService');
    ProcessedComplaintQueueService = module.ProcessedComplaintQueueService;
    service = ProcessedComplaintQueueService.getInstance();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getInstance', () => {
    it('should return singleton instance', async () => {
      const instance1 = ProcessedComplaintQueueService.getInstance();
      const instance2 = ProcessedComplaintQueueService.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('connect', () => {
    it('should connect to Redis', async () => {
      await service.connect();

      expect(mockConnect).toHaveBeenCalled();
    });

    it('should not reconnect if already connected', async () => {
      await service.connect();
      await service.connect();

      // Connect on client should only be called once
      expect(mockConnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('pushToQueue', () => {
    const complaintData = {
      id: 'complaint-1',
      seq: 1,
      status: 'REGISTERED',
      categoryId: 'cat-1',
      subCategory: 'Water Supply',
      assignedDepartment: 'WATER_SUPPLY_SANITATION',
      city: 'Test City',
      district: 'Test District',
    };

    it('should push complaint to queue', async () => {
      mockClient.rPush.mockResolvedValue(1);
      mockClient.lLen.mockResolvedValue(1);

      await service.pushToQueue(complaintData);

      expect(mockClient.rPush).toHaveBeenCalledWith(
        'complaint:processed:queue',
        JSON.stringify(complaintData)
      );
    });

    it('should auto-connect if not connected', async () => {
      mockClient.rPush.mockResolvedValue(1);
      mockClient.lLen.mockResolvedValue(1);

      await service.pushToQueue(complaintData);

      expect(mockConnect).toHaveBeenCalled();
    });

    it('should throw error on push failure', async () => {
      mockClient.rPush.mockRejectedValue(new Error('Redis error'));

      await expect(service.pushToQueue(complaintData)).rejects.toThrow('Redis error');
    });
  });

  describe('getQueueLength', () => {
    it('should return queue length', async () => {
      mockClient.lLen.mockResolvedValue(5);

      const length = await service.getQueueLength();

      expect(length).toBe(5);
      expect(mockClient.lLen).toHaveBeenCalledWith('complaint:processed:queue');
    });

    it('should return 0 for empty queue', async () => {
      mockClient.lLen.mockResolvedValue(0);

      const length = await service.getQueueLength();

      expect(length).toBe(0);
    });

    it('should throw error on failure', async () => {
      mockClient.lLen.mockRejectedValue(new Error('Redis error'));

      await expect(service.getQueueLength()).rejects.toThrow('Redis error');
    });
  });

  describe('peekQueue', () => {
    it('should return first complaint without removing', async () => {
      const complaint = { id: 'complaint-1', seq: 1 };
      mockClient.lIndex.mockResolvedValue(JSON.stringify(complaint));

      const result = await service.peekQueue();

      expect(result).toEqual(complaint);
      expect(mockClient.lIndex).toHaveBeenCalledWith('complaint:processed:queue', 0);
    });

    it('should return null for empty queue', async () => {
      mockClient.lIndex.mockResolvedValue(null);

      const result = await service.peekQueue();

      expect(result).toBeNull();
    });

    it('should return raw string for non-JSON content', async () => {
      mockClient.lIndex.mockResolvedValue('invalid-json');

      const result = await service.peekQueue();

      expect(result).toBe('invalid-json');
    });
  });

  describe('popFromQueue', () => {
    it('should pop and return complaint', async () => {
      const complaint = { id: 'complaint-1', seq: 1 };
      mockClient.lPop.mockResolvedValue(JSON.stringify(complaint));

      const result = await service.popFromQueue();

      expect(result).toEqual(complaint);
    });

    it('should return null for empty queue', async () => {
      mockClient.lPop.mockResolvedValue(null);

      const result = await service.popFromQueue();

      expect(result).toBeNull();
    });

    it('should return raw string for non-JSON content', async () => {
      mockClient.lPop.mockResolvedValue('not-json');

      const result = await service.popFromQueue();

      expect(result).toBe('not-json');
    });
  });
});
