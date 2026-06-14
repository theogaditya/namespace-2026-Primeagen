import { vi, describe, it, beforeEach, expect } from 'vitest';

const mockRedisClient = {
  lIndex: vi.fn(),
  lPop: vi.fn(),
  rPush: vi.fn(),
  lMove: vi.fn(),
  lRem: vi.fn(),
  lLen: vi.fn(),
};

const mockConnect = vi.fn();
const mockGetClient = vi.fn(() => mockRedisClient);

class MockRedisClientforComplaintQueue {
  connect = mockConnect;
  getClient = mockGetClient;
}

vi.mock('../lib/redis/redisClient', () => ({
  RedisClientforComplaintQueue: MockRedisClientforComplaintQueue,
}));

const mockProcessedComplaintQueueService = {
  pushToQueue: vi.fn(),
  getQueueLength: vi.fn(),
  peekQueue: vi.fn(),
  popFromQueue: vi.fn(),
  disconnect: vi.fn(),
};

vi.mock('../lib/redis/processedComplaintQueueService', () => ({
  processedComplaintQueueService: mockProcessedComplaintQueueService,
}));

// Mock GCP and moderation and badges to avoid external calls
vi.mock('../lib/gcp/gcp', () => ({
  standardizeSubCategory: vi.fn().mockResolvedValue('standardized-subcategory'),
}));

vi.mock('../lib/moderation/moderationClient', () => ({
  moderateTextSafe: vi.fn().mockResolvedValue({ has_abuse: false, clean_text: null }),
}));

const badgeCheck = vi.fn().mockResolvedValue([]);
vi.mock('../lib/badges/badgeService', () => ({
  getBadgeService: () => ({
    checkBadgesAfterComplaint: badgeCheck,
  }),
}));

// Minimal Prisma mock similar to admin-be tests
const mockCreateComplaint = vi.fn();
const mockFindFirst = vi.fn();
const mockFindCategory = vi.fn();

const prismaMock: any = {
  complaint: {
    create: mockCreateComplaint,
    findFirst: mockFindFirst,
  },
  category: {
    findUnique: mockFindCategory,
  },
  $transaction: async (fn: any) => {
    return await fn({ complaint: { create: mockCreateComplaint } });
  },
};

// We'll import the module under test inside each test case (same pattern as admin-be)

const REG_QUEUE = 'complaint:registration:queue';
const PROC_QUEUE = 'complaint:processing:inprogress';

const validComplaint = {
  userId: '00000000-0000-0000-0000-000000000001',
  categoryId: '11111111-1111-1111-1111-111111111111',
  subCategory: 'Water leakage',
  description: 'There is a water leakage near the park that needs fixing.',
  urgency: 'LOW',
  attachmentUrl: 'https://example.com/image.jpg',
  assignedDepartment: 'WATER_SUPPLY_SANITATION',
  isPublic: true,
  location: {
    pin: '560001',
    district: 'Bangalore',
    city: 'Bangalore',
    locality: 'MG Road',
    street: 'Church Street',
    latitude: 12.97,
    longitude: 77.59,
  },
};

describe('processNextComplaint (mocked client)', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    mockGetClient.mockReturnValue(mockRedisClient);
    // Ensure badge service is patched even if module mocking misses it
    const badgeModule = await import('../lib/badges/badgeService');
    // Replace getBadgeService with a safe stub
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    badgeModule.getBadgeService = () => ({ checkBadgesAfterComplaint: async () => [] });
  });

  it('returns processed=false when registration queue is empty', async () => {
    mockRedisClient.lMove.mockResolvedValue(null);

    const { processNextComplaint } = await import('../services/complaintProcessor');
    const result = await processNextComplaint(prismaMock);
    expect(result.processed).toBe(false);
    expect(mockConnect).toHaveBeenCalled();
    expect(mockRedisClient.lMove).toHaveBeenCalledWith(REG_QUEUE, PROC_QUEUE, 'LEFT', 'RIGHT');
  });

  it('removes invalid schema items and reports error', async () => {
    const bad = { ...validComplaint, description: 'short' };
    mockRedisClient.lMove.mockResolvedValue(JSON.stringify(bad));
    mockRedisClient.lRem.mockResolvedValue(1);

    const { processNextComplaint } = await import('../services/complaintProcessor');
    const result = await processNextComplaint(prismaMock);
    expect(result.processed).toBe(false);
    expect(result.error).toMatch(/Invalid complaint data/);
    expect(mockRedisClient.lRem).toHaveBeenCalledWith(PROC_QUEUE, 1, JSON.stringify(bad));
  });

  it('removes complaints with invalid categoryId', async () => {
    mockFindCategory.mockResolvedValue(null);
    mockRedisClient.lMove.mockResolvedValue(JSON.stringify(validComplaint));
    mockRedisClient.lRem.mockResolvedValue(1);

    const { processNextComplaint } = await import('../services/complaintProcessor');
    const result = await processNextComplaint(prismaMock);
    expect(result.processed).toBe(false);
    expect(result.error).toMatch(/Invalid categoryId/);
    expect(mockRedisClient.lRem).toHaveBeenCalledWith(PROC_QUEUE, 1, JSON.stringify(validComplaint));
  });

  it('creates complaint and pushes to processed queue for new complaint', async () => {
    mockFindCategory.mockResolvedValue({ id: validComplaint.categoryId });
    mockFindFirst.mockResolvedValue(null);
    mockCreateComplaint.mockImplementation(async () => ({ id: 'complaint-1', seq: 1, status: 'REGISTERED', categoryId: validComplaint.categoryId, subCategory: validComplaint.subCategory }));
    mockRedisClient.lMove.mockResolvedValue(JSON.stringify(validComplaint));
    mockRedisClient.lRem.mockResolvedValue(1);

    const { processNextComplaint } = await import('../services/complaintProcessor');
    const result = await processNextComplaint(prismaMock);
    expect(result.processed).toBe(true);
    expect(mockProcessedComplaintQueueService.pushToQueue).toHaveBeenCalledTimes(1);
    expect(mockRedisClient.lRem).toHaveBeenCalledWith(PROC_QUEUE, 1, JSON.stringify(validComplaint));
  });

  it('flags duplicates and avoids pushing to processed queue', async () => {
    mockFindCategory.mockResolvedValue({ id: validComplaint.categoryId });
    mockFindFirst.mockResolvedValue({ id: 'existing' });
    mockCreateComplaint.mockImplementation(async () => ({ id: 'new-id', seq: 2, status: 'REGISTERED', isDuplicate: true }));
    mockRedisClient.lMove.mockResolvedValue(JSON.stringify(validComplaint));
    mockRedisClient.lRem.mockResolvedValue(1);

    const { processNextComplaint } = await import('../services/complaintProcessor');
    const result = await processNextComplaint(prismaMock);
    expect(result.processed).toBe(true);
    expect(result.result?.isDuplicate).toBe(true);
    expect(mockProcessedComplaintQueueService.pushToQueue).not.toHaveBeenCalled();
  });

  it('handles DB constraint errors by dropping from processing queue', async () => {
    mockFindCategory.mockResolvedValue({ id: validComplaint.categoryId });
    mockFindFirst.mockResolvedValue(null);
    mockCreateComplaint.mockImplementation(async () => { const e: any = new Error('db'); e.code = 'P2003'; throw e; });
    mockRedisClient.lMove.mockResolvedValue(JSON.stringify(validComplaint));

    const { processNextComplaint } = await import('../services/complaintProcessor');
    const result = await processNextComplaint(prismaMock);
    expect(result.processed).toBe(false);
    expect(result.error).toMatch(/Invalid complaint removed from queue/);
  });

  it('requeues on generic errors', async () => {
    mockFindCategory.mockResolvedValue({ id: validComplaint.categoryId });
    mockFindFirst.mockResolvedValue(null);
    mockCreateComplaint.mockImplementation(async () => { throw new Error('transient'); });
    mockRedisClient.lMove.mockResolvedValue(JSON.stringify(validComplaint));
    mockRedisClient.lPop.mockResolvedValue(JSON.stringify(validComplaint));
    mockRedisClient.rPush.mockResolvedValue(1);

    const { processNextComplaint } = await import('../services/complaintProcessor');
    const result = await processNextComplaint(prismaMock);
    expect(result.processed).toBe(false);
    expect(result.error).toMatch(/will retry/);
  });

  it('moves unparsable payload back to registration queue', async () => {
    // lMove returns a non-JSON string
    mockRedisClient.lMove.mockResolvedValue('not-json');
    mockRedisClient.lPop.mockResolvedValue('not-json');
    mockRedisClient.rPush.mockResolvedValue(1);

    const { processNextComplaint } = await import('../services/complaintProcessor');
    const result = await processNextComplaint(prismaMock);
    expect(result.processed).toBe(false);
  });
});

describe('getQueueStatus', () => {
  it('returns lengths for both queues', async () => {
    mockRedisClient.lLen.mockImplementation(async (key: string) => {
      if (key === REG_QUEUE) return 2;
      if (key === PROC_QUEUE) return 1;
      return 0;
    });

    const { getQueueStatus } = await import('../services/complaintProcessor');
    const status = await getQueueStatus();
    expect(status.registrationQueueLength).toBe(2);
    expect(status.processingQueueLength).toBe(1);
  });
});
