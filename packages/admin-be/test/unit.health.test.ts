import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

// Set JWT secret before any imports that might use it
process.env.JWT_SECRET = 'test-jwt-secret';

// Create hoisted mocks
const { mockPrisma, mockComplaintQueueService, mockProcessedQueueService, mockBlockchainQueueService } = vi.hoisted(() => ({
  mockPrisma: {
    $queryRaw: vi.fn(),
  },
  mockComplaintQueueService: {
    getQueueLength: vi.fn(),
  },
  mockProcessedQueueService: {
    getQueueLength: vi.fn(),
  },
  mockBlockchainQueueService: {
    getQueueLength: vi.fn(),
  },
}));

// Mock Redis services
vi.mock('../lib/redis/complaintQueueService', () => ({
  complaintQueueService: mockComplaintQueueService,
}));

vi.mock('../lib/redis/processedComplaintQueueService', () => ({
  processedComplaintQueueService: mockProcessedQueueService,
}));

vi.mock('../lib/redis/blockchainQueueService', () => ({
  blockchainQueueService: mockBlockchainQueueService,
}));

import { healthPoint } from '../routes/health';

describe('Health Route', () => {
  let app: express.Application;
  let request: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Dynamic import of supertest
    const supertest = await import('supertest');
    request = supertest.default;
    
    app = express();
    app.use(express.json());
    app.use(healthPoint(mockPrisma as any));
  });

  describe('GET /health', () => {
    it('should return healthy status when all services are up', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
      mockComplaintQueueService.getQueueLength.mockResolvedValue(5);
      mockProcessedQueueService.getQueueLength.mockResolvedValue(3);
      mockBlockchainQueueService.getQueueLength.mockResolvedValue(2);

      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.database).toBe('ok');
      expect(response.body.redis).toBe('ok');
      expect(response.body.queues.complaint.status).toBe('ok');
      expect(response.body.queues.complaint.length).toBe(5);
      expect(response.body.queues.processed.status).toBe('ok');
      expect(response.body.queues.processed.length).toBe(3);
      expect(response.body.queues.blockchain.status).toBe('ok');
      expect(response.body.queues.blockchain.length).toBe(2);
    });

    it('should return 503 when database is down', async () => {
      mockPrisma.$queryRaw.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app).get('/health');

      expect(response.status).toBe(503);
      expect(response.body.error).toBe('database error');
    });

    it('should return partial redis status when complaint queue is down', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
      mockComplaintQueueService.getQueueLength.mockRejectedValue(new Error('Redis error'));
      mockProcessedQueueService.getQueueLength.mockResolvedValue(3);
      mockBlockchainQueueService.getQueueLength.mockResolvedValue(2);

      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.redis).toBe('partial');
      expect(response.body.queues.complaint.status).toBe('error');
      expect(response.body.queues.processed.status).toBe('ok');
    });

    it('should return partial redis status when processed queue is down', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
      mockComplaintQueueService.getQueueLength.mockResolvedValue(5);
      mockProcessedQueueService.getQueueLength.mockRejectedValue(new Error('Redis error'));
      mockBlockchainQueueService.getQueueLength.mockResolvedValue(2);

      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.redis).toBe('partial');
      expect(response.body.queues.processed.status).toBe('error');
    });

    it('should return partial redis status when blockchain queue is down', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
      mockComplaintQueueService.getQueueLength.mockResolvedValue(5);
      mockProcessedQueueService.getQueueLength.mockResolvedValue(3);
      mockBlockchainQueueService.getQueueLength.mockRejectedValue(new Error('Redis error'));

      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.redis).toBe('partial');
      expect(response.body.queues.blockchain.status).toBe('error');
    });

    it('should return partial redis status when all queues are down', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
      mockComplaintQueueService.getQueueLength.mockRejectedValue(new Error('Redis error'));
      mockProcessedQueueService.getQueueLength.mockRejectedValue(new Error('Redis error'));
      mockBlockchainQueueService.getQueueLength.mockRejectedValue(new Error('Redis error'));

      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.redis).toBe('partial');
      expect(response.body.queues.complaint.status).toBe('error');
      expect(response.body.queues.processed.status).toBe('error');
      expect(response.body.queues.blockchain.status).toBe('error');
    });

    it('should handle zero queue lengths correctly', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
      mockComplaintQueueService.getQueueLength.mockResolvedValue(0);
      mockProcessedQueueService.getQueueLength.mockResolvedValue(0);
      mockBlockchainQueueService.getQueueLength.mockResolvedValue(0);

      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.queues.complaint.length).toBe(0);
      expect(response.body.queues.processed.length).toBe(0);
      expect(response.body.queues.blockchain.length).toBe(0);
    });
  });
});
