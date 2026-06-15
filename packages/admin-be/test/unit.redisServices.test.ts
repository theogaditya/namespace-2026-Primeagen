import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Create hoisted mock for Redis client
const { mockRedisClient } = vi.hoisted(() => ({
  mockRedisClient: {
    connect: vi.fn(),
    getClient: vi.fn(),
  },
}));

// Create hoisted mock for the actual Redis client operations
const { mockClient } = vi.hoisted(() => ({
  mockClient: {
    rPush: vi.fn(),
    lPop: vi.fn(),
    lLen: vi.fn(),
    lIndex: vi.fn(),
    lRange: vi.fn(),
    lPush: vi.fn(),
    brPop: vi.fn(),
  },
}));

// Mock the Redis client
vi.mock('../lib/redis/redisClient', () => ({
  redisClient: mockRedisClient,
}));

describe('Complaint Queue Service', () => {
  let complaintQueueService: typeof import('../lib/redis/complaintQueueService').complaintQueueService;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockRedisClient.connect.mockResolvedValue(undefined);
    mockRedisClient.getClient.mockReturnValue(mockClient);

    // Reset modules to get fresh imports
    vi.resetModules();
    
    // Re-mock after reset
    vi.doMock('../lib/redis/redisClient', () => ({
      redisClient: mockRedisClient,
    }));

    const module = await import('../lib/redis/complaintQueueService');
    complaintQueueService = module.complaintQueueService;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('pushComplaint', () => {
    it('should push complaint to queue', async () => {
      const complaint = { id: 'complaint-1', title: 'Test complaint' };
      mockClient.rPush.mockResolvedValue(1);

      await complaintQueueService.pushComplaint(complaint);

      expect(mockRedisClient.connect).toHaveBeenCalled();
      expect(mockClient.rPush).toHaveBeenCalledWith(
        'complaint:registration:queue',
        JSON.stringify(complaint)
      );
    });
  });

  describe('pollAndPop', () => {
    it('should return null when queue is empty', async () => {
      mockClient.lLen.mockResolvedValue(0);

      const result = await complaintQueueService.pollAndPop();

      expect(result).toBeNull();
    });

    it('should pop and return parsed complaint', async () => {
      const complaint = { id: 'complaint-1', title: 'Test' };
      mockClient.lLen.mockResolvedValue(1);
      mockClient.lPop.mockResolvedValue(JSON.stringify(complaint));

      const result = await complaintQueueService.pollAndPop();

      expect(result).toEqual(complaint);
    });

    it('should handle malformed JSON and move to dead-letter queue', async () => {
      mockClient.lLen.mockResolvedValue(1);
      mockClient.lPop.mockResolvedValue('invalid-json');
      mockClient.lPush.mockResolvedValue(1);

      const result = await complaintQueueService.pollAndPop();

      expect(result).toBeNull();
      expect(mockClient.lPush).toHaveBeenCalledWith(
        'complaint:assignment:malformed',
        'invalid-json'
      );
    });

    it('should return null when lPop returns null', async () => {
      mockClient.lLen.mockResolvedValue(1);
      mockClient.lPop.mockResolvedValue(null);

      const result = await complaintQueueService.pollAndPop();

      expect(result).toBeNull();
    });

    it('should handle Redis errors gracefully', async () => {
      mockClient.lLen.mockRejectedValue(new Error('Redis connection failed'));

      const result = await complaintQueueService.pollAndPop();

      expect(result).toBeNull();
    });
  });

  describe('getQueueLength', () => {
    it('should return queue length', async () => {
      mockClient.lLen.mockResolvedValue(5);

      const length = await complaintQueueService.getQueueLength();

      expect(length).toBe(5);
    });

    it('should return 0 when queue is empty', async () => {
      mockClient.lLen.mockResolvedValue(0);

      const length = await complaintQueueService.getQueueLength();

      expect(length).toBe(0);
    });
  });

  describe('peekComplaint', () => {
    it('should return first complaint without removing it', async () => {
      const complaint = { id: 'complaint-1' };
      mockClient.lLen.mockResolvedValue(1); // Queue has 1 item
      mockClient.lIndex.mockResolvedValue(JSON.stringify(complaint));

      const result = await complaintQueueService.peekComplaint();

      expect(result).toEqual(complaint);
    });

    it('should return null when queue is empty', async () => {
      mockClient.lLen.mockResolvedValue(0); // Queue is empty

      const result = await complaintQueueService.peekComplaint();

      expect(result).toBeNull();
    });
  });
});

describe('Assign Queue Service', () => {
  let getProcessedQueueLength: typeof import('../lib/redis/assignQueue').getProcessedQueueLength;
  let peekProcessedQueue: typeof import('../lib/redis/assignQueue').peekProcessedQueue;
  let popProcessedQueue: typeof import('../lib/redis/assignQueue').popProcessedQueue;
  let getAllProcessedComplaints: typeof import('../lib/redis/assignQueue').getAllProcessedComplaints;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockRedisClient.connect.mockResolvedValue(undefined);
    mockRedisClient.getClient.mockReturnValue(mockClient);

    vi.resetModules();
    
    vi.doMock('../lib/redis/redisClient', () => ({
      redisClient: mockRedisClient,
    }));

    const module = await import('../lib/redis/assignQueue');
    getProcessedQueueLength = module.getProcessedQueueLength;
    peekProcessedQueue = module.peekProcessedQueue;
    popProcessedQueue = module.popProcessedQueue;
    getAllProcessedComplaints = module.getAllProcessedComplaints;
  });

  describe('getProcessedQueueLength', () => {
    it('should return queue length', async () => {
      mockClient.lLen.mockResolvedValue(10);

      const length = await getProcessedQueueLength();

      expect(length).toBe(10);
      expect(mockClient.lLen).toHaveBeenCalledWith('complaint:processed:queue');
    });

    it('should throw error on Redis failure', async () => {
      mockClient.lLen.mockRejectedValue(new Error('Redis error'));

      await expect(getProcessedQueueLength()).rejects.toThrow('Redis error');
    });
  });

  describe('peekProcessedQueue', () => {
    it('should return first complaint without removing', async () => {
      const complaint = {
        id: 'complaint-1',
        seq: 1,
        status: 'REGISTERED',
        categoryId: 'cat-1',
        subCategory: 'Water',
        assignedDepartment: 'WATER_SUPPLY_SANITATION',
        city: 'Test City',
        district: 'Test District',
      };
      mockClient.lIndex.mockResolvedValue(JSON.stringify(complaint));

      const result = await peekProcessedQueue();

      expect(result).toEqual(complaint);
      expect(mockClient.lIndex).toHaveBeenCalledWith('complaint:processed:queue', 0);
    });

    it('should return null for empty queue', async () => {
      mockClient.lIndex.mockResolvedValue(null);

      const result = await peekProcessedQueue();

      expect(result).toBeNull();
    });

    it('should return null for malformed JSON', async () => {
      mockClient.lIndex.mockResolvedValue('invalid-json');

      const result = await peekProcessedQueue();

      expect(result).toBeNull();
    });
  });

  describe('popProcessedQueue', () => {
    it('should pop and return complaint', async () => {
      const complaint = {
        id: 'complaint-1',
        seq: 1,
        status: 'REGISTERED',
        categoryId: 'cat-1',
        subCategory: 'Water',
        assignedDepartment: 'WATER_SUPPLY_SANITATION',
        city: 'Test City',
        district: 'Test District',
      };
      mockClient.lPop.mockResolvedValue(JSON.stringify(complaint));

      const result = await popProcessedQueue();

      expect(result).toEqual(complaint);
    });

    it('should return null for empty queue', async () => {
      mockClient.lPop.mockResolvedValue(null);

      const result = await popProcessedQueue();

      expect(result).toBeNull();
    });

    it('should return null for malformed JSON', async () => {
      mockClient.lPop.mockResolvedValue('invalid-json');

      const result = await popProcessedQueue();

      expect(result).toBeNull();
    });
  });

  describe('getAllProcessedComplaints', () => {
    it('should return all complaints', async () => {
      const complaints = [
        { id: '1', seq: 1 },
        { id: '2', seq: 2 },
      ];
      mockClient.lRange.mockResolvedValue(complaints.map(c => JSON.stringify(c)));

      const result = await getAllProcessedComplaints();

      expect(result).toHaveLength(2);
      expect(result[0]?.id).toBe('1');
      expect(result[1]?.id).toBe('2');
    });

    it('should filter out malformed entries', async () => {
      mockClient.lRange.mockResolvedValue([
        JSON.stringify({ id: '1' }),
        'invalid-json',
        JSON.stringify({ id: '2' }),
      ]);

      const result = await getAllProcessedComplaints();

      expect(result).toHaveLength(2);
    });

    it('should return empty array for empty queue', async () => {
      mockClient.lRange.mockResolvedValue([]);

      const result = await getAllProcessedComplaints();

      expect(result).toHaveLength(0);
    });
  });
});
