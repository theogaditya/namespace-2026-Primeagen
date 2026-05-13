import { vi, describe, it, beforeEach, expect } from 'vitest';

const mockRedisClient = {
  lIndex: vi.fn(),
  lPop: vi.fn(), 
  lPush: vi.fn()
};

// Mock RedisClientforComplaintQueue class
const mockConnect = vi.fn();
const mockGetClient = vi.fn(() => mockRedisClient);

// Use a real class for the mock constructor
class MockRedisClientforComplaintQueue {
  connect = mockConnect;
  getClient = mockGetClient;
}

vi.mock('../lib/redis/redisClient', () => ({
  RedisClientforComplaintQueue: MockRedisClientforComplaintQueue
}));

const mockProcessedComplaintQueueService = {
  pushToQueue: vi.fn()
};

vi.mock('../lib/redis/processedComplaintQueueService', () => ({
  processedComplaintQueueService: mockProcessedComplaintQueueService
}));

// Mock the GCP module to avoid Vertex AI calls in tests
vi.mock('../lib/gcp/gcp', () => ({
  standardizeSubCategory: vi.fn().mockResolvedValue('standardized-subcategory')
}));

// minimal mock prisma client
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
  $transaction: vi.fn(async (fn: any) => {
    return fn({ complaint: { create: mockCreateComplaint } });
  })
};

describe('processNextComplaint', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Re-setup mocks after reset
    mockGetClient.mockReturnValue(mockRedisClient);
  });

  it('returns processed=false when queue is empty', async () => {
    mockRedisClient.lIndex.mockResolvedValue(null);

    const { processNextComplaint } = await import('../routes/complaintProcessing');
    const result = await processNextComplaint(prismaMock);
    
    expect(result.processed).toBe(false);
    expect(mockConnect).toHaveBeenCalled();
    expect(mockRedisClient.lIndex).toHaveBeenCalledWith('complaint:registration:queue', 0);
  });

  it('processes valid complaint and pushes to processed queue', async () => {
    const validComplaint = {
      userId: 'b162fd66-80aa-4ab6-b9cb-a6dc42b50291',
      categoryId: 'c953f48a-9c65-4560-a9af-0771d46e8166',
      subCategory: 'Water Leakage',
      description: 'Major water leakage causing traffic issues',
      urgency: 'HIGH',
      assignedDepartment: 'WATER_SUPPLY_SANITATION',
      isPublic: true,
      location: { 
        pin: '560001', 
        district: 'Ranchi', 
        city: 'Ranchi', 
        locality: 'Lewis Road' 
      }
    };

    const sample = JSON.stringify(validComplaint);
    mockRedisClient.lIndex.mockResolvedValue(sample);
    mockRedisClient.lPop.mockResolvedValue(sample);

    // Mock category exists
    mockFindCategory.mockResolvedValue({ id: validComplaint.categoryId, name: 'Water Supply & Sanitation' });

    // Mock no existing duplicate complaint
    mockFindFirst.mockResolvedValue(null);
    
    // Mock successful complaint creation
    mockCreateComplaint.mockResolvedValue({ 
      id: 'complaint-id-123', 
      seq: 1, 
      status: 'REGISTERED',
      categoryId: 'c953f48a-9c65-4560-a9af-0771d46e8166',
      subCategory: 'Water Leakage'
    });

    const { processNextComplaint } = await import('../routes/complaintProcessing');
    const result = await processNextComplaint(prismaMock);

    expect(result.processed).toBe(true);
    expect(result.result).toEqual({ 
      id: 'complaint-id-123', 
      seq: 1, 
      status: 'REGISTERED',
      isDuplicate: false
    });
    expect(mockProcessedComplaintQueueService.pushToQueue).toHaveBeenCalled();
    expect(mockRedisClient.lPop).toHaveBeenCalledWith('complaint:registration:queue');
  });

  it('removes invalid JSON complaint and returns processed=false', async () => {
    const invalidJson = 'not-valid-json';
    mockRedisClient.lIndex.mockResolvedValue(invalidJson);

    const { processNextComplaint } = await import('../routes/complaintProcessing');
    const result = await processNextComplaint(prismaMock);

    expect(result.processed).toBe(false);
    expect(result.error).toBe('Processing failed');
    // JSON.parse error goes to generic catch, so no lPop call
  });

  it('removes complaint with validation errors and returns processed=false', async () => {
    const invalidComplaint = {
      // Missing required fields like categoryId, assignedDepartment, isPublic, location
      subCategory: 'Water Leakage',
      description: 'desc'
    };

    const sample = JSON.stringify(invalidComplaint);
    mockRedisClient.lIndex.mockResolvedValue(sample);

    // category check should not be called because validation fails earlier
    mockFindCategory.mockResolvedValue(null);

    const { processNextComplaint } = await import('../routes/complaintProcessing');
    const result = await processNextComplaint(prismaMock);

    expect(result.processed).toBe(false);
    expect(result.error).toBe('Invalid complaint data removed from queue');
    expect(mockRedisClient.lPop).toHaveBeenCalledWith('complaint:registration:queue');
  });

  it('flags duplicate complaint with isDuplicate=true and still creates it', async () => {
    const validComplaint = {
      userId: 'b162fd66-80aa-4ab6-b9cb-a6dc42b50291',
      categoryId: 'c953f48a-9c65-4560-a9af-0771d46e8166',
      subCategory: 'Water Leakage',
      description: 'Duplicate complaint',
      urgency: 'HIGH',
      assignedDepartment: 'WATER_SUPPLY_SANITATION',
      isPublic: true,
      location: { pin: '560001', district: 'Ranchi', city: 'Ranchi', locality: 'X' }
    };

    const sample = JSON.stringify(validComplaint);
    mockRedisClient.lIndex.mockResolvedValue(sample);
    mockRedisClient.lPop.mockResolvedValue(sample);
    
    // Mock existing complaint found (duplicate)
    mockFindFirst.mockResolvedValue({ id: 'existing-id' });

    // Mock category exists
    mockFindCategory.mockResolvedValue({ id: validComplaint.categoryId, name: 'Water Supply & Sanitation' });

    // Mock successful complaint creation (with isDuplicate flag)
    mockCreateComplaint.mockResolvedValue({ 
      id: 'new-complaint-id', 
      seq: 2, 
      status: 'REGISTERED',
      categoryId: 'c953f48a-9c65-4560-a9af-0771d46e8166',
      subCategory: 'Water Leakage',
      isDuplicate: true
    });

    const { processNextComplaint } = await import('../routes/complaintProcessing');
    const result = await processNextComplaint(prismaMock);

    // Duplicate should still be processed and created but NOT pushed to queue
    expect(result.processed).toBe(true);
    expect(result.result).toEqual({ 
      id: 'new-complaint-id', 
      seq: 2, 
      status: 'REGISTERED',
      isDuplicate: true
    });
    expect(mockCreateComplaint).toHaveBeenCalled();
    // Duplicates are NOT pushed to the processed queue
    expect(mockProcessedComplaintQueueService.pushToQueue).not.toHaveBeenCalled();
    expect(mockRedisClient.lPop).toHaveBeenCalledWith('complaint:registration:queue');
  });
});