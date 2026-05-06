import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import prismaMock from "../lib/_mocks_/prisma";
import jwt from 'jsonwebtoken';

vi.mock('../lib/prisma', () => ({ prisma: prismaMock }));

// Mock the userQueueService
vi.mock('../lib/redis/userQueueService', () => ({
  userQueueService: {
    pushUserToQueue: vi.fn().mockResolvedValue(undefined),
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

import { addUserRouter } from '../routes/adduser';
import { loginUserRouter } from '../routes/loginUser';
import { logoutUserRouter } from '../routes/logoutUser';
import { tokenBlacklistService } from '../lib/redis/tokenBlacklistService';
import bcrypt from 'bcrypt';

const JWT_SECRET = "my123";

let app: express.Express;

beforeEach(() => {
  app = express();
  app.use(express.json());
  // addUserRouter is a function that takes a PrismaClient and returns a router
  app.use('/api/users', addUserRouter(prismaMock));
  app.use('/api/users', loginUserRouter(prismaMock));
  app.use('/api/users', logoutUserRouter(prismaMock));
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Add User routes', () => {
  it('returns 400 for invalid PIN on location lookup', async () => {
    const res = await request(app).get('/api/users/location/123');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns location data for valid PIN', async () => {
    // stub global fetch
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ([{ Status: 'Success', PostOffice: [{ District: 'SomeDistrict', Division: 'SomeCity', State: 'SomeState' }] }])
    });
    // @ts-ignore
    vi.stubGlobal('fetch', fetchMock);

    const res = await request(app).get('/api/users/location/110001');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({ district: 'SomeDistrict', city: 'SomeCity', state: 'SomeState' });
  });

  it('returns 201 on successful signup', async () => {
    // prepare payload (age >= 18)
    const payload = {
      email: 'test@example.com',
      phoneNumber: '+919876543210',
      name: 'Test User',
      password: 'password123',
      dateOfBirth: '1990-01-01',
      aadhaarId: '123456789012',
      preferredLanguage: 'English',
      disability: 'None',
      location: {
        pin: '110001',
        district: 'SomeDistrict',
        city: 'SomeCity',
        locality: 'SomeLocality',
        street: 'SomeStreet',
        municipal: 'SomeMunicipal',
        state: 'SomeState'
      }
    };

    // mock prisma responses
    // @ts-ignore
    prismaMock.user.findFirst.mockResolvedValue(null);
    // @ts-ignore
    prismaMock.user.create.mockResolvedValue({
      id: 'uuid-1',
      email: payload.email,
      phoneNumber: payload.phoneNumber,
      name: payload.name,
      dateOfBirth: new Date(payload.dateOfBirth),
      preferredLanguage: payload.preferredLanguage,
      disability: payload.disability,
      // include minimal fields that the route selects; cast to any to satisfy mock types
      location: payload.location,
      dateOfCreation: new Date(),
      lastUpdated: new Date(),
    } as any);

    // mock bcrypt.hash
    vi.spyOn(bcrypt, 'hash').mockResolvedValue('hashed-password' as any);

    const res = await request(app).post('/api/users/signup').send(payload);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('id', 'uuid-1');
  });

  it('returns 400 on signup validation error', async () => {
    const badPayload = { email: 'not-an-email' };
    const res = await request(app).post('/api/users/signup').send(badPayload);
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(Array.isArray(res.body.errors)).toBe(true);
  });
});

describe('Login User routes', () => {
  it('returns 200 on successful login with ACTIVE status', async () => {
    const loginPayload = {
      email: 'test@example.com',
      password: 'password123',
    };

    const mockUser = {
      id: 'uuid-1',
      email: 'test@example.com',
      password: 'hashed-password',
      name: 'Test User',
      phoneNumber: '+919876543210',
      dateOfBirth: new Date('1990-01-01'),
      preferredLanguage: 'English',
      disability: 'None',
      status: 'ACTIVE',
      location: { pin: '110001', district: 'Delhi', city: 'New Delhi' },
      dateOfCreation: new Date(),
      lastUpdated: new Date(),
    };

    // @ts-ignore
    prismaMock.user.findUnique.mockResolvedValue(mockUser);
    vi.spyOn(bcrypt, 'compare').mockResolvedValue(true as any);

    const res = await request(app).post('/api/users/login').send(loginPayload);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Login successful');
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data.user).toHaveProperty('id', 'uuid-1');
    expect(res.body.data.user).toHaveProperty('email', 'test@example.com');
    expect(res.body.data.user).not.toHaveProperty('password');
    
    // Verify JWT token is valid
    const decoded = jwt.verify(res.body.data.token, JWT_SECRET) as any;
    expect(decoded).toHaveProperty('userId', 'uuid-1');
    expect(decoded).toHaveProperty('email', 'test@example.com');
  });

  it('returns 401 when user not found', async () => {
    const loginPayload = {
      email: 'nonexistent@example.com',
      password: 'password123',
    };

    // @ts-ignore
    prismaMock.user.findUnique.mockResolvedValue(null);

    const res = await request(app).post('/api/users/login').send(loginPayload);
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Invalid email or password');
  });

  it('returns 401 when password is incorrect', async () => {
    const loginPayload = {
      email: 'test@example.com',
      password: 'wrongpassword',
    };

    const mockUser = {
      id: 'uuid-1',
      email: 'test@example.com',
      password: 'hashed-password',
      name: 'Test User',
      phoneNumber: '+919876543210',
      dateOfBirth: new Date('1990-01-01'),
      preferredLanguage: 'English',
      disability: 'None',
      status: 'ACTIVE',
      location: { pin: '110001' },
      dateOfCreation: new Date(),
      lastUpdated: new Date(),
    };

    // @ts-ignore
    prismaMock.user.findUnique.mockResolvedValue(mockUser);
    vi.spyOn(bcrypt, 'compare').mockResolvedValue(false as any);

    const res = await request(app).post('/api/users/login').send(loginPayload);
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Invalid email or password');
  });

  it('returns 403 when user status is SUSPENDED', async () => {
    const loginPayload = {
      email: 'test@example.com',
      password: 'password123',
    };

    const mockUser = {
      id: 'uuid-1',
      email: 'test@example.com',
      password: 'hashed-password',
      name: 'Test User',
      phoneNumber: '+919876543210',
      dateOfBirth: new Date('1990-01-01'),
      preferredLanguage: 'English',
      disability: 'None',
      status: 'SUSPENDED',
      location: { pin: '110001' },
      dateOfCreation: new Date(),
      lastUpdated: new Date(),
    };

    // @ts-ignore
    prismaMock.user.findUnique.mockResolvedValue(mockUser);

    const res = await request(app).post('/api/users/login').send(loginPayload);
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Account is suspended. Please contact support.');
  });

  it('returns 403 when user status is DELETED', async () => {
    const loginPayload = {
      email: 'test@example.com',
      password: 'password123',
    };

    const mockUser = {
      id: 'uuid-1',
      email: 'test@example.com',
      password: 'hashed-password',
      name: 'Test User',
      phoneNumber: '+919876543210',
      dateOfBirth: new Date('1990-01-01'),
      preferredLanguage: 'English',
      disability: 'None',
      status: 'DELETED',
      location: { pin: '110001' },
      dateOfCreation: new Date(),
      lastUpdated: new Date(),
    };

    // @ts-ignore
    prismaMock.user.findUnique.mockResolvedValue(mockUser);

    const res = await request(app).post('/api/users/login').send(loginPayload);
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Account is deleted. Please contact support.');
  });

  it('returns 400 on login validation error', async () => {
    const badPayload = { email: 'invalid-email', password: '' };
    const res = await request(app).post('/api/users/login').send(badPayload);
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(Array.isArray(res.body.errors)).toBe(true);
  });
});

describe('Logout User routes', () => {
  it('returns 200 on successful logout with valid JWT token', async () => {
    const mockUser = {
      id: 'uuid-1',
      email: 'test@example.com',
      name: 'Test User',
      status: 'ACTIVE',
    };

    // Generate valid JWT token
    const token = jwt.sign(
      { userId: 'uuid-1', email: 'test@example.com', name: 'Test User' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // @ts-ignore
    prismaMock.user.findUnique.mockResolvedValue(mockUser);

    const res = await request(app)
      .post('/api/users/logout')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('Logout successful');
    expect(res.body.data).toHaveProperty('userId', 'uuid-1');
    expect(res.body.data).toHaveProperty('logoutTime');
    
    // Verify token was added to blacklist
    expect(tokenBlacklistService.blacklistToken).toHaveBeenCalledTimes(1);
    expect(tokenBlacklistService.blacklistToken).toHaveBeenCalledWith(
      token,
      expect.any(Number)
    );
  });

  it('returns 401 when no Authorization header is provided', async () => {
    const res = await request(app).post('/api/users/logout');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Authentication required. Please login first.');
  });

  it('returns 401 when token is invalid', async () => {
    const res = await request(app)
      .post('/api/users/logout')
      .set('Authorization', 'Bearer invalid-token');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Invalid or expired token. Please login again.');
  });

  it('returns 401 when user not found in database', async () => {
    const token = jwt.sign(
      { userId: 'nonexistent-id', email: 'test@example.com', name: 'Test User' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // @ts-ignore
    prismaMock.user.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/users/logout')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Invalid authentication. User not found.');
  });

  it('returns 403 when user status is not ACTIVE', async () => {
    const mockUser = {
      id: 'uuid-1',
      email: 'test@example.com',
      name: 'Test User',
      status: 'SUSPENDED',
    };

    const token = jwt.sign(
      { userId: 'uuid-1', email: 'test@example.com', name: 'Test User' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // @ts-ignore
    prismaMock.user.findUnique.mockResolvedValue(mockUser);

    const res = await request(app)
      .post('/api/users/logout')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Account is suspended. Please contact support.');
  });

  it('returns 401 when using a blacklisted token', async () => {
    const token = jwt.sign(
      { userId: 'uuid-1', email: 'test@example.com', name: 'Test User' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Mock token as blacklisted
    vi.mocked(tokenBlacklistService.isBlacklisted).mockResolvedValueOnce(true);

    const res = await request(app)
      .post('/api/users/logout')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Token has been invalidated. Please login again.');
  });

  it('returns 500 when Redis blacklist fails during logout', async () => {
    const mockUser = {
      id: 'uuid-1',
      email: 'test@example.com',
      name: 'Test User',
      status: 'ACTIVE',
    };

    const token = jwt.sign(
      { userId: 'uuid-1', email: 'test@example.com', name: 'Test User' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // @ts-ignore
    prismaMock.user.findUnique.mockResolvedValue(mockUser);
    
    // Mock Redis failure
    vi.mocked(tokenBlacklistService.blacklistToken).mockRejectedValueOnce(
      new Error('Redis connection failed')
    );

    const res = await request(app)
      .post('/api/users/logout')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });

  it('returns 401 when Authorization header missing Bearer prefix', async () => {
    const token = jwt.sign(
      { userId: 'uuid-1', email: 'test@example.com', name: 'Test User' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const res = await request(app)
      .post('/api/users/logout')
      .set('Authorization', token); // Missing "Bearer " prefix

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Authentication required. Please login first.');
  });

  it('returns 401 when JWT token is expired', async () => {
    // Create an already expired token
    const token = jwt.sign(
      { userId: 'uuid-1', email: 'test@example.com', name: 'Test User' },
      JWT_SECRET,
      { expiresIn: '-1h' } // Expired 1 hour ago
    );

    const res = await request(app)
      .post('/api/users/logout')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Invalid or expired token. Please login again.');
  });
});
