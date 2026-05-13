import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import prismaMock from "../lib/_mocks_/prisma";

vi.mock('../lib/prisma', () => ({ prisma: prismaMock }));

// Mock the complaintQueueService
vi.mock('../lib/redis/complaintQueueService', () => ({
  complaintQueueService: {
    pushComplaintToQueue: vi.fn().mockResolvedValue(undefined),
    connect: vi.fn().mockResolvedValue(undefined),
    getQueueLength: vi.fn().mockResolvedValue(0),
    disconnect: vi.fn().mockResolvedValue(undefined),
  }
}));

// Mock the tokenBlacklistService
vi.mock('../lib/redis/tokenBlacklistService', () => ({
  tokenBlacklistService: {
    blacklistToken: vi.fn().mockResolvedValue(undefined),
    isBlacklisted: vi.fn().mockResolvedValue(false),
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
  }
}));

import { createComplaintRouter } from '../routes/createComplaint';
import { createAuthMiddleware } from '../middleware/authRoute';
import { complaintQueueService } from '../lib/redis/complaintQueueService';
import { tokenBlacklistService } from '../lib/redis/tokenBlacklistService';

const JWT_SECRET = "my123";

let app: express.Express;
let appWithAuth: express.Express;

beforeEach(() => {
  // App without auth (for validation tests)
  app = express();
  app.use(express.json());
  app.use('/api/complaints', createComplaintRouter(prismaMock));
  
  // App with auth middleware (for auth flow tests)
  appWithAuth = express();
  appWithAuth.use(express.json());
  const authMiddleware = createAuthMiddleware(prismaMock);
  appWithAuth.use('/api/complaints', authMiddleware, createComplaintRouter(prismaMock));
  
  vi.clearAllMocks();
  // suppress expected error logs during tests (e.g. when queue is mocked to fail)
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  // restore any mocked globals
  vi.restoreAllMocks();
});

describe('Create Complaint routes', () => {
  const validComplaintPayload = {
    categoryId: '123e4567-e89b-12d3-a456-426614174001',
    subCategory: 'Water Leakage',
    description: 'There is a major water leakage on the main road causing traffic issues',
    urgency: 'HIGH',
    assignedDepartment: 'WATER_SUPPLY_SANITATION',
    isPublic: true,
    location: {
      pin: '110001',
      district: 'Central Delhi',
      city: 'New Delhi',
      locality: 'Connaught Place',
      street: 'Janpath Road',
      latitude: 28.6139,
      longitude: 77.2090,
    },
  };

  it('returns 202 on successful complaint submission', async () => {
    const res = await request(app)
      .post('/api/complaints')
      .send(validComplaintPayload);

    expect(res.status).toBe(202);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Complaint submitted successfully and is being processed');
    expect(res.body.data).toHaveProperty('categoryId', validComplaintPayload.categoryId);
    expect(res.body.data).toHaveProperty('subCategory', validComplaintPayload.subCategory);
    expect(res.body.data).toHaveProperty('assignedDepartment', validComplaintPayload.assignedDepartment);
    expect(res.body.data).toHaveProperty('submissionDate');
    
    // Verify queue service was called
    expect(complaintQueueService.pushComplaintToQueue).toHaveBeenCalledTimes(1);
  });

  it('returns 202 with optional fields omitted', async () => {
    const minimalPayload = {
      categoryId: '123e4567-e89b-12d3-a456-426614174001',
      subCategory: 'Road Damage',
      description: 'Large pothole on the main road causing accidents',
      assignedDepartment: 'INFRASTRUCTURE',
      isPublic: false,
      location: {
        pin: '110001',
        district: 'Central Delhi',
        city: 'New Delhi',
        locality: 'Connaught Place',
      },
    };

    const res = await request(app)
      .post('/api/complaints')
      .send(minimalPayload);

    expect(res.status).toBe(202);
    expect(res.body.success).toBe(true);
  });



  it('returns 400 for invalid categoryId (not UUID)', async () => {
    const invalidPayload = {
      ...validComplaintPayload,
      categoryId: 'not-a-uuid',
    };

    const res = await request(app)
      .post('/api/complaints')
      .send(invalidPayload);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 for missing required fields', async () => {
    const incompletePayload = {
      categoryId: '123e4567-e89b-12d3-a456-426614174001',
    };

    const res = await request(app)
      .post('/api/complaints')
      .send(incompletePayload);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(Array.isArray(res.body.errors)).toBe(true);
  });

  it('returns 400 for description too short', async () => {
    const invalidPayload = {
      ...validComplaintPayload,
      description: 'Short',
    };

    const res = await request(app)
      .post('/api/complaints')
      .send(invalidPayload);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 for invalid department', async () => {
    const invalidPayload = {
      ...validComplaintPayload,
      assignedDepartment: 'INVALID_DEPARTMENT',
    };

    const res = await request(app)
      .post('/api/complaints')
      .send(invalidPayload);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 for invalid urgency level', async () => {
    const invalidPayload = {
      ...validComplaintPayload,
      urgency: 'SUPER_URGENT',
    };

    const res = await request(app)
      .post('/api/complaints')
      .send(invalidPayload);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 for invalid PIN code', async () => {
    const invalidPayload = {
      ...validComplaintPayload,
      location: {
        ...validComplaintPayload.location,
        pin: '123', // Invalid - should be 6 digits
      },
    };

    const res = await request(app)
      .post('/api/complaints')
      .send(invalidPayload);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 for invalid latitude', async () => {
    const invalidPayload = {
      ...validComplaintPayload,
      location: {
        ...validComplaintPayload.location,
        latitude: 100, // Invalid - should be between -90 and 90
      },
    };

    const res = await request(app)
      .post('/api/complaints')
      .send(invalidPayload);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 for invalid longitude', async () => {
    const invalidPayload = {
      ...validComplaintPayload,
      location: {
        ...validComplaintPayload.location,
        longitude: 200, // Invalid - should be between -180 and 180
      },
    };

    const res = await request(app)
      .post('/api/complaints')
      .send(invalidPayload);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 for invalid attachment URL', async () => {
    const invalidPayload = {
      ...validComplaintPayload,
      attachmentUrl: 'not-a-valid-url',
    };

    const res = await request(app)
      .post('/api/complaints')
      .send(invalidPayload);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 202 with valid attachment URL', async () => {
    const payloadWithAttachment = {
      ...validComplaintPayload,
      attachmentUrl: 'https://example.com/image.jpg',
    };

    const res = await request(app)
      .post('/api/complaints')
      .send(payloadWithAttachment);

    expect(res.status).toBe(202);
    expect(res.body.success).toBe(true);
  });

  it('returns 503 when queue service fails', async () => {
    // Mock queue service to throw error
    vi.mocked(complaintQueueService.pushComplaintToQueue).mockRejectedValueOnce(
      new Error('Redis connection failed')
    );

    const res = await request(app)
      .post('/api/complaints')
      .send(validComplaintPayload);

    expect(res.status).toBe(503);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Failed to submit complaint. Please try again later.');
  });

  it('defaults urgency to LOW when not provided', async () => {
    const payloadWithoutUrgency = {
      categoryId: '123e4567-e89b-12d3-a456-426614174001',
      subCategory: 'Minor Issue',
      description: 'This is a minor issue that can be addressed later',
      assignedDepartment: 'MUNICIPAL_SERVICES',
      isPublic: true,
      location: {
        pin: '110001',
        district: 'Central Delhi',
        city: 'New Delhi',
        locality: 'Connaught Place',
      },
    };

    const res = await request(app)
      .post('/api/complaints')
      .send(payloadWithoutUrgency);

    expect(res.status).toBe(202);
    expect(res.body.success).toBe(true);
    
    // Verify the queue was called with default urgency
    expect(complaintQueueService.pushComplaintToQueue).toHaveBeenCalledWith(
      expect.objectContaining({
        urgency: 'LOW',
      })
    );
  });

  it('validates all department enum values', async () => {
    const validDepartments = [
      'INFRASTRUCTURE',
      'EDUCATION',
      'REVENUE',
      'HEALTH',
      'WATER_SUPPLY_SANITATION',
      'ELECTRICITY_POWER',
      'TRANSPORTATION',
      'MUNICIPAL_SERVICES',
      'POLICE_SERVICES',
      'ENVIRONMENT',
      'HOUSING_URBAN_DEVELOPMENT',
      'SOCIAL_WELFARE',
      'PUBLIC_GRIEVANCES',
    ];

    for (const department of validDepartments) {
      vi.clearAllMocks();
      const payload = {
        ...validComplaintPayload,
        assignedDepartment: department,
      };

      const res = await request(app)
        .post('/api/complaints')
        .send(payload);

      expect(res.status).toBe(202);
      expect(res.body.success).toBe(true);
    }
  });

  it('validates all urgency enum values', async () => {
    const validUrgencies = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

    for (const urgency of validUrgencies) {
      vi.clearAllMocks();
      const payload = {
        ...validComplaintPayload,
        urgency: urgency,
      };

      const res = await request(app)
        .post('/api/complaints')
        .send(payload);

      expect(res.status).toBe(202);
      expect(res.body.success).toBe(true);
    }
  });
});

describe('Create Complaint with Authentication', () => {
  const validComplaintPayload = {
    categoryId: '123e4567-e89b-12d3-a456-426614174001',
    subCategory: 'Water Leakage',
    description: 'There is a major water leakage on the main road causing traffic issues',
    urgency: 'HIGH',
    assignedDepartment: 'WATER_SUPPLY_SANITATION',
    isPublic: true,
    location: {
      pin: '110001',
      district: 'Central Delhi',
      city: 'New Delhi',
      locality: 'Connaught Place',
      street: 'Janpath Road',
      latitude: 28.6139,
      longitude: 77.2090,
    },
  };

  const mockUser = {
    id: 'uuid-1',
    email: 'test@example.com',
    name: 'Test User',
    status: 'ACTIVE',
  };

  it('returns 401 when no Authorization header is provided', async () => {
    const res = await request(appWithAuth)
      .post('/api/complaints')
      .send(validComplaintPayload);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Authentication required. Please login first.');
  });

  it('returns 401 when Authorization header missing Bearer prefix', async () => {
    const token = jwt.sign(
      { userId: 'uuid-1', email: 'test@example.com', name: 'Test User' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const res = await request(appWithAuth)
      .post('/api/complaints')
      .set('Authorization', token) // Missing "Bearer " prefix
      .send(validComplaintPayload);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Authentication required. Please login first.');
  });

  it('returns 401 when JWT token is invalid', async () => {
    const res = await request(appWithAuth)
      .post('/api/complaints')
      .set('Authorization', 'Bearer invalid-token')
      .send(validComplaintPayload);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Invalid or expired token. Please login again.');
  });

  it('returns 401 when JWT token is expired', async () => {
    const token = jwt.sign(
      { userId: 'uuid-1', email: 'test@example.com', name: 'Test User' },
      JWT_SECRET,
      { expiresIn: '-1h' } // Expired 1 hour ago
    );

    const res = await request(appWithAuth)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${token}`)
      .send(validComplaintPayload);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Invalid or expired token. Please login again.');
  });

  it('returns 401 when token is blacklisted (user logged out)', async () => {
    const token = jwt.sign(
      { userId: 'uuid-1', email: 'test@example.com', name: 'Test User' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Mock token as blacklisted
    vi.mocked(tokenBlacklistService.isBlacklisted).mockResolvedValueOnce(true);

    const res = await request(appWithAuth)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${token}`)
      .send(validComplaintPayload);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Token has been invalidated. Please login again.');
  });

  it('returns 401 when user not found in database', async () => {
    const token = jwt.sign(
      { userId: 'nonexistent-id', email: 'test@example.com', name: 'Test User' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // @ts-ignore
    prismaMock.user.findUnique.mockResolvedValue(null);

    const res = await request(appWithAuth)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${token}`)
      .send(validComplaintPayload);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Invalid authentication. User not found.');
  });

  it('returns 403 when user status is SUSPENDED', async () => {
    const token = jwt.sign(
      { userId: 'uuid-1', email: 'test@example.com', name: 'Test User' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // @ts-ignore
    prismaMock.user.findUnique.mockResolvedValue({
      ...mockUser,
      status: 'SUSPENDED',
    });

    const res = await request(appWithAuth)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${token}`)
      .send(validComplaintPayload);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Account is suspended. Please contact support.');
  });

  it('returns 202 on successful authenticated complaint submission', async () => {
    const token = jwt.sign(
      { userId: 'uuid-1', email: 'test@example.com', name: 'Test User' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // @ts-ignore
    prismaMock.user.findUnique.mockResolvedValue(mockUser);

    const res = await request(appWithAuth)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${token}`)
      .send(validComplaintPayload);

    expect(res.status).toBe(202);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Complaint submitted successfully and is being processed');
    expect(complaintQueueService.pushComplaintToQueue).toHaveBeenCalledTimes(1);
  });

  it('verifies blacklist is checked before allowing complaint creation', async () => {
    const token = jwt.sign(
      { userId: 'uuid-1', email: 'test@example.com', name: 'Test User' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // @ts-ignore
    prismaMock.user.findUnique.mockResolvedValue(mockUser);

    await request(appWithAuth)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${token}`)
      .send(validComplaintPayload);

    // Verify isBlacklisted was called with the token
    expect(tokenBlacklistService.isBlacklisted).toHaveBeenCalledWith(token);
  });
});
