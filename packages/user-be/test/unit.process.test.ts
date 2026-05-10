import { vi, describe, it, beforeEach, expect } from 'vitest';

const mockRedisClient = {
  lIndex: vi.fn(),
  lPop: vi.fn(), 
  lPush: vi.fn()
};

// Mock the complaintQueueService with bracket notation access
const mockComplaintQueueService = {
  connect: vi.fn(),
  redisClient: {
    getClient: vi.fn(() => mockRedisClient)
  }
};

// Add bracket notation access for private property
(mockComplaintQueueService as any)['redisClient'] = {
  getClient: vi.fn(() => mockRedisClient)
};

vi.mock('../lib/redis/complaintQueueService', () => ({
  complaintQueueService: mockComplaintQueueService
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

const prismaMock: any = {
  complaint: {
    create: mockCreateComplaint,
    findFirst: mockFindFirst,
  },
  $transaction: vi.fn(async (fn: any) => {
    return fn({ complaint: { create: mockCreateComplaint } });
  })
};

describe('processNextComplaint', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns processed=false when queue is empty', async () => {
    mockRedisClient.lIndex.mockResolvedValue(null);

    const { processNextComplaint } = await import('../routes/complaintProcessing');
    const result = await processNextComplaint(prismaMock);
    
    expect(result.processed).toBe(false);
    expect(mockComplaintQueueService.connect).toHaveBeenCalled();
    expect(mockRedisClient.lIndex).toHaveBeenCalledWith('complaint:registration:queue', 0);
  });

  it('processes valid complaint and pushes to processed queue', async () => {
    const validComplaint = {
      complainantId: '9e03d714-1a2f-4a45-9740-98f1a33115ab',
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

    // Mock no existing duplicate complaint
    mockFindFirst.mockResolvedValue(null);
    
    // Mock successful complaint creation
    mockCreateComplaint.mockResolvedValue({ 
      id: 'complaint-id-123', 
      seq: 1, 
      status: 'REGISTERED', 
      complainantId: '9e03d714-1a2f-4a45-9740-98f1a33115ab',
      categoryId: 'c953f48a-9c65-4560-a9af-0771d46e8166',
      subCategory: 'Water Leakage'
    });

    const { processNextComplaint } = await import('../routes/complaintProcessing');
    const result = await processNextComplaint(prismaMock);

    expect(result.processed).toBe(true);
    expect(result.result).toEqual({ 
      id: 'complaint-id-123', 
      seq: 1, 
      status: 'REGISTERED' 
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
      // Missing required fields like complainantId, categoryId
      subCategory: 'Water Leakage',
      description: 'desc'
    };

    const sample = JSON.stringify(invalidComplaint);
    mockRedisClient.lIndex.mockResolvedValue(sample);

    const { processNextComplaint } = await import('../routes/complaintProcessing');
    const result = await processNextComplaint(prismaMock);

    expect(result.processed).toBe(false);
    expect(result.error).toBe('Invalid complaint data removed from queue');
    expect(mockRedisClient.lPop).toHaveBeenCalledWith('complaint:registration:queue');
  });

  it('removes duplicate complaint and returns processed=false', async () => {
    const validComplaint = {
      complainantId: '9e03d714-1a2f-4a45-9740-98f1a33115ab',
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
    
    // Mock existing complaint found (duplicate)
    mockFindFirst.mockResolvedValue({ id: 'existing-id' });

    const { processNextComplaint } = await import('../routes/complaintProcessing');
    const result = await processNextComplaint(prismaMock);

    expect(result.processed).toBe(false);
    expect(result.error).toBe('Duplicate complaint removed from queue');
    expect(mockRedisClient.lPop).toHaveBeenCalledWith('complaint:registration:queue');
  });
});
