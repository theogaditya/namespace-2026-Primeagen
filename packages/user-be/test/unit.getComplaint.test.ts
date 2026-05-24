import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import prismaMock from "../lib/_mocks_/prisma";

vi.mock('../lib/prisma', () => ({ prisma: prismaMock }));

// Mock the tokenBlacklistService
vi.mock('../lib/redis/tokenBlacklistService', () => ({
  tokenBlacklistService: {
    blacklistToken: vi.fn().mockResolvedValue(undefined),
    isBlacklisted: vi.fn().mockResolvedValue(false),
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
  }
}));

import { getComplaintRouter } from '../routes/getComplaint';
import { createAuthMiddleware } from '../middleware/authRoute';
import { tokenBlacklistService } from '../lib/redis/tokenBlacklistService';

const JWT_SECRET = "my123";

let app: express.Express;

const mockUser = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  email: 'test@example.com',
  name: 'Test User',
  status: 'ACTIVE',
  phoneNumber: '9876543210',
};

const mockCategory = {
  id: '550e8400-e29b-41d4-a716-446655440010',
  name: 'Water Supply',
  subCategories: ['Leakage', 'No Water'],
  assignedDepartment: 'WATER_SUPPLY_SANITATION',
};

const mockLocation = {
  id: '550e8400-e29b-41d4-a716-446655440020',
  complaintId: '550e8400-e29b-41d4-a716-446655440100',
  pin: '110001',
  district: 'Central Delhi',
  city: 'New Delhi',
  locality: 'Connaught Place',
  street: 'Janpath Road',
  latitude: 28.6139,
  longitude: 77.2090,
};

const mockComplaint = {
  id: '550e8400-e29b-41d4-a716-446655440100',
  seq: 1,
  submissionDate: new Date('2024-01-15'),
  complainantId: '550e8400-e29b-41d4-a716-446655440001',
  subCategory: 'Water Leakage',
  description: 'There is a major water leakage on the main road',
  urgency: 'HIGH',
  attachmentUrl: 'https://example.com/image.jpg',
  status: 'REGISTERED',
  upvoteCount: 5,
  isPublic: true,
  assignedAgentId: null,
  assignedDepartment: 'WATER_SUPPLY_SANITATION',
  categoryId: '550e8400-e29b-41d4-a716-446655440010',
  dateOfResolution: null,
  escalationLevel: null,
  sla: null,
  AIabusedFlag: null,
  AIimageVarificationStatus: null,
  AIstandardizedSubCategory: null,
  lastUpdated: new Date('2024-01-15'),
  isDuplicate: null,
  location: mockLocation,
  User: mockUser,
  category: mockCategory,
};

const mockPrivateComplaint = {
  ...mockComplaint,
  id: '550e8400-e29b-41d4-a716-446655440101',
  seq: 2,
  isPublic: false,
  complainantId: '550e8400-e29b-41d4-a716-446655440002', // Different user
};

const mockOwnPrivateComplaint = {
  ...mockComplaint,
  id: '550e8400-e29b-41d4-a716-446655440102',
  seq: 3,
  isPublic: false,
  complainantId: '550e8400-e29b-41d4-a716-446655440001', // Same user
};

function generateToken(userId: string = '550e8400-e29b-41d4-a716-446655440001') {
  return jwt.sign(
    { userId, email: 'test@example.com', name: 'Test User' },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

beforeEach(() => {
  app = express();
  app.use(express.json());
  const authMiddleware = createAuthMiddleware(prismaMock);
  app.use('/api/complaints/get', authMiddleware, getComplaintRouter(prismaMock));
  
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  
  // Default mock for user lookup
  // @ts-ignore
  prismaMock.user.findUnique.mockResolvedValue(mockUser);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GET /api/complaints/get - Get All Complaints', () => {
  it('returns 401 when no authorization header is provided', async () => {
    const res = await request(app).get('/api/complaints/get');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Authentication required. Please login first.');
  });

  it('returns 200 with paginated complaints list', async () => {
    const token = generateToken();
    
    // @ts-ignore
    prismaMock.complaint.count.mockResolvedValue(2);
    // @ts-ignore
    prismaMock.complaint.findMany.mockResolvedValue([mockComplaint, mockOwnPrivateComplaint]);

    const res = await request(app)
      .get('/api/complaints/get')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.pagination).toEqual({
      total: 2,
      page: 1,
      limit: 10,
      totalPages: 1,
    });
  });

  it('returns 200 with custom pagination', async () => {
    const token = generateToken();
    
    // @ts-ignore
    prismaMock.complaint.count.mockResolvedValue(50);
    // @ts-ignore
    prismaMock.complaint.findMany.mockResolvedValue([mockComplaint]);

    const res = await request(app)
      .get('/api/complaints/get?page=2&limit=5')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.pagination).toEqual({
      total: 50,
      page: 2,
      limit: 5,
      totalPages: 10,
    });
  });

  it('returns 200 with status filter', async () => {
    const token = generateToken();
    
    // @ts-ignore
    prismaMock.complaint.count.mockResolvedValue(1);
    // @ts-ignore
    prismaMock.complaint.findMany.mockResolvedValue([mockComplaint]);

    const res = await request(app)
      .get('/api/complaints/get?status=REGISTERED')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 200 with department filter', async () => {
    const token = generateToken();
    
    // @ts-ignore
    prismaMock.complaint.count.mockResolvedValue(1);
    // @ts-ignore
    prismaMock.complaint.findMany.mockResolvedValue([mockComplaint]);

    const res = await request(app)
      .get('/api/complaints/get?department=WATER_SUPPLY_SANITATION')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 200 with urgency filter', async () => {
    const token = generateToken();
    
    // @ts-ignore
    prismaMock.complaint.count.mockResolvedValue(1);
    // @ts-ignore
    prismaMock.complaint.findMany.mockResolvedValue([mockComplaint]);

    const res = await request(app)
      .get('/api/complaints/get?urgency=HIGH')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns empty array when no complaints found', async () => {
    const token = generateToken();
    
    // @ts-ignore
    prismaMock.complaint.count.mockResolvedValue(0);
    // @ts-ignore
    prismaMock.complaint.findMany.mockResolvedValue([]);

    const res = await request(app)
      .get('/api/complaints/get')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(0);
    expect(res.body.message).toBe('Found 0 complaints');
  });

  it('limits maximum page size to 100', async () => {
    const token = generateToken();
    
    // @ts-ignore
    prismaMock.complaint.count.mockResolvedValue(200);
    // @ts-ignore
    prismaMock.complaint.findMany.mockResolvedValue([]);

    const res = await request(app)
      .get('/api/complaints/get?limit=500')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.pagination.limit).toBe(100);
  });
});

describe('GET /api/complaints/get/my - Get My Complaints', () => {
  it('returns 200 with user complaints', async () => {
    const token = generateToken();
    
    // @ts-ignore
    prismaMock.complaint.count.mockResolvedValue(2);
    // @ts-ignore
    prismaMock.complaint.findMany.mockResolvedValue([mockComplaint, mockOwnPrivateComplaint]);

    const res = await request(app)
      .get('/api/complaints/get/my')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.message).toBe('Found 2 complaints for this user');
  });

  it('returns 200 with status filter on my complaints', async () => {
    const token = generateToken();
    
    // @ts-ignore
    prismaMock.complaint.count.mockResolvedValue(1);
    // @ts-ignore
    prismaMock.complaint.findMany.mockResolvedValue([mockComplaint]);

    const res = await request(app)
      .get('/api/complaints/get/my?status=REGISTERED')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns empty array when user has no complaints', async () => {
    const token = generateToken();
    
    // @ts-ignore
    prismaMock.complaint.count.mockResolvedValue(0);
    // @ts-ignore
    prismaMock.complaint.findMany.mockResolvedValue([]);

    const res = await request(app)
      .get('/api/complaints/get/my')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(0);
  });
});

describe('GET /api/complaints/get/:id - Get Complaint by ID', () => {
  it('returns 200 with public complaint', async () => {
    const token = generateToken();
    
    // @ts-ignore
    prismaMock.complaint.findUnique.mockResolvedValue(mockComplaint);

    const res = await request(app)
      .get('/api/complaints/get/550e8400-e29b-41d4-a716-446655440100')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe('550e8400-e29b-41d4-a716-446655440100');
    expect(res.body.message).toBe('Complaint retrieved successfully');
  });

  it('returns 200 with own private complaint', async () => {
    const token = generateToken();
    
    // @ts-ignore
    prismaMock.complaint.findUnique.mockResolvedValue(mockOwnPrivateComplaint);

    const res = await request(app)
      .get('/api/complaints/get/550e8400-e29b-41d4-a716-446655440102')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe('550e8400-e29b-41d4-a716-446655440102');
  });

  it('returns 403 when trying to access others private complaint', async () => {
    const token = generateToken();
    
    // @ts-ignore
    prismaMock.complaint.findUnique.mockResolvedValue(mockPrivateComplaint);

    const res = await request(app)
      .get('/api/complaints/get/550e8400-e29b-41d4-a716-446655440101')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('You do not have permission to view this complaint');
  });

  it('returns 404 when complaint not found', async () => {
    const token = generateToken();
    
    // @ts-ignore
    prismaMock.complaint.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/complaints/get/550e8400-e29b-41d4-a716-446655440999')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Complaint not found');
  });

  it('returns 400 for invalid UUID format', async () => {
    const token = generateToken();

    const res = await request(app)
      .get('/api/complaints/get/invalid-id')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Invalid complaint ID format. Must be a valid UUID.');
  });
});

describe('GET /api/complaints/get/user/:userId - Get Complaints by User ID', () => {
  it('returns 200 with public complaints of another user', async () => {
    const token = generateToken('550e8400-e29b-41d4-a716-446655440001');
    
    // @ts-ignore - First call for auth middleware
    prismaMock.user.findUnique.mockResolvedValueOnce(mockUser);
    // @ts-ignore - Second call for checking if target user exists
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: '550e8400-e29b-41d4-a716-446655440002' });
    // @ts-ignore
    prismaMock.complaint.count.mockResolvedValue(1);
    // @ts-ignore - Only public complaint
    prismaMock.complaint.findMany.mockResolvedValue([{ ...mockComplaint, complainantId: '550e8400-e29b-41d4-a716-446655440002' }]);

    const res = await request(app)
      .get('/api/complaints/get/user/550e8400-e29b-41d4-a716-446655440002')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 200 with all complaints when viewing own profile', async () => {
    const token = generateToken('550e8400-e29b-41d4-a716-446655440001');
    
    // @ts-ignore - First call for auth middleware
    prismaMock.user.findUnique.mockResolvedValueOnce(mockUser);
    // @ts-ignore - Second call for checking if target user exists
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: '550e8400-e29b-41d4-a716-446655440001' });
    // @ts-ignore
    prismaMock.complaint.count.mockResolvedValue(2);
    // @ts-ignore
    prismaMock.complaint.findMany.mockResolvedValue([mockComplaint, mockOwnPrivateComplaint]);

    const res = await request(app)
      .get('/api/complaints/get/user/550e8400-e29b-41d4-a716-446655440001')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);
  });

  it('returns 404 when user not found', async () => {
    const token = generateToken();
    
    // @ts-ignore - First call for auth middleware
    prismaMock.user.findUnique.mockResolvedValueOnce(mockUser);
    // @ts-ignore - Second call returns null (user not found)
    prismaMock.user.findUnique.mockResolvedValueOnce(null);

    const res = await request(app)
      .get('/api/complaints/get/user/550e8400-e29b-41d4-a716-446655440999')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('User not found');
  });

  it('returns 400 for invalid user ID format', async () => {
    const token = generateToken();

    const res = await request(app)
      .get('/api/complaints/get/user/invalid-id')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Invalid user ID format. Must be a valid UUID.');
  });
});

describe('GET /api/complaints/get/seq/:seq - Get Complaint by Sequence Number', () => {
  it('returns 200 with public complaint by sequence', async () => {
    const token = generateToken();
    
    // @ts-ignore
    prismaMock.complaint.findUnique.mockResolvedValue(mockComplaint);

    const res = await request(app)
      .get('/api/complaints/get/seq/1')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.seq).toBe(1);
  });

  it('returns 200 with own private complaint by sequence', async () => {
    const token = generateToken();
    
    // @ts-ignore
    prismaMock.complaint.findUnique.mockResolvedValue(mockOwnPrivateComplaint);

    const res = await request(app)
      .get('/api/complaints/get/seq/3')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 403 when trying to access others private complaint by sequence', async () => {
    const token = generateToken();
    
    // @ts-ignore
    prismaMock.complaint.findUnique.mockResolvedValue(mockPrivateComplaint);

    const res = await request(app)
      .get('/api/complaints/get/seq/2')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('returns 404 when complaint not found', async () => {
    const token = generateToken();
    
    // @ts-ignore
    prismaMock.complaint.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/complaints/get/seq/999')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Complaint not found');
  });

  it('returns 400 for invalid sequence number', async () => {
    const token = generateToken();

    const res = await request(app)
      .get('/api/complaints/get/seq/invalid')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Invalid sequence number. Must be a positive integer.');
  });

  it('returns 400 for negative sequence number', async () => {
    const token = generateToken();

    const res = await request(app)
      .get('/api/complaints/get/seq/-1')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 for zero sequence number', async () => {
    const token = generateToken();

    const res = await request(app)
      .get('/api/complaints/get/seq/0')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('Authentication Tests for Get Complaints', () => {
  it('returns 401 when token is blacklisted', async () => {
    const token = generateToken();
    
    vi.mocked(tokenBlacklistService.isBlacklisted).mockResolvedValueOnce(true);

    const res = await request(app)
      .get('/api/complaints/get')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Token has been invalidated. Please login again.');
  });

  it('returns 401 when token is expired', async () => {
    const expiredToken = jwt.sign(
      { userId: '550e8400-e29b-41d4-a716-446655440001', email: 'test@example.com', name: 'Test User' },
      JWT_SECRET,
      { expiresIn: '-1h' }
    );

    const res = await request(app)
      .get('/api/complaints/get')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid or expired token. Please login again.');
  });

  it('returns 403 when user account is suspended', async () => {
    const token = generateToken();
    
    // @ts-ignore
    prismaMock.user.findUnique.mockResolvedValue({
      ...mockUser,
      status: 'SUSPENDED',
    });

    const res = await request(app)
      .get('/api/complaints/get')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Account is suspended. Please contact support.');
  });
});

describe('Error Handling', () => {
  it('returns 500 on database error for get all complaints', async () => {
    const token = generateToken();
    
    // @ts-ignore
    prismaMock.complaint.count.mockRejectedValue(new Error('Database error'));

    const res = await request(app)
      .get('/api/complaints/get')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Internal server error while fetching complaints');
  });

  it('returns 500 on database error for get complaint by id', async () => {
    const token = generateToken();
    
    // @ts-ignore
    prismaMock.complaint.findUnique.mockRejectedValue(new Error('Database error'));

    const res = await request(app)
      .get('/api/complaints/get/550e8400-e29b-41d4-a716-446655440100')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Internal server error while fetching complaint');
  });
});
