
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

import { createAuthMiddleware } from '../middleware/authRoute';
import { tokenBlacklistService } from '../lib/redis/tokenBlacklistService';

const JWT_SECRET = "my123";

let app: express.Express;

beforeEach(() => {
  app = express();
  app.use(express.json());
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Auth Middleware', () => {
  describe('Token Validation', () => {
    it('returns 401 when no Authorization header is provided', async () => {
      const authMiddleware = createAuthMiddleware(prismaMock);
      
      app.use('/api/protected', authMiddleware, (req, res) => {
        res.json({ success: true, userId: req.userId });
      });

      const res = await request(app).get('/api/protected');
      
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Authentication required. Please login first.');
    });

    it('returns 401 when Authorization header does not start with Bearer', async () => {
      const authMiddleware = createAuthMiddleware(prismaMock);
      
      app.use('/api/protected', authMiddleware, (req, res) => {
        res.json({ success: true });
      });

      const res = await request(app)
        .get('/api/protected')
        .set('Authorization', 'Basic some-token');
      
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Authentication required. Please login first.');
    });

    it('returns 401 when token is invalid', async () => {
      const authMiddleware = createAuthMiddleware(prismaMock);
      
      app.use('/api/protected', authMiddleware, (req, res) => {
        res.json({ success: true });
      });

      const res = await request(app)
        .get('/api/protected')
        .set('Authorization', 'Bearer invalid-token-here');
      
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid or expired token. Please login again.');
    });

    it('returns 401 when token is expired', async () => {
      const authMiddleware = createAuthMiddleware(prismaMock);
      
      // Create an expired token
      const expiredToken = jwt.sign(
        { userId: 'user-123', email: 'test@example.com', name: 'Test' },
        JWT_SECRET,
        { expiresIn: '-1h' } // Already expired
      );
      
      app.use('/api/protected', authMiddleware, (req, res) => {
        res.json({ success: true });
      });

      const res = await request(app)
        .get('/api/protected')
        .set('Authorization', `Bearer ${expiredToken}`);
      
      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid or expired token. Please login again.');
    });

    it('allows access with valid token', async () => {
      const authMiddleware = createAuthMiddleware(prismaMock);
      
      const validToken = jwt.sign(
        { userId: 'user-123', email: 'test@example.com', name: 'Test User' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      // @ts-ignore
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        status: 'ACTIVE',
      });

      app.use('/api/protected', authMiddleware, (req, res) => {
        res.json({ success: true, userId: req.userId, user: req.user });
      });

      const res = await request(app)
        .get('/api/protected')
        .set('Authorization', `Bearer ${validToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.userId).toBe('user-123');
      expect(res.body.user.name).toBe('Test User');
    });
  });

  describe('Token Blacklist Checking', () => {
    it('returns 401 when token is blacklisted', async () => {
      const authMiddleware = createAuthMiddleware(prismaMock);
      
      const validToken = jwt.sign(
        { userId: 'user-123', email: 'test@example.com', name: 'Test' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Mock token as blacklisted
      vi.mocked(tokenBlacklistService.isBlacklisted).mockResolvedValue(true);

      app.use('/api/protected', authMiddleware, (req, res) => {
        res.json({ success: true });
      });

      const res = await request(app)
        .get('/api/protected')
        .set('Authorization', `Bearer ${validToken}`);
      
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Token has been invalidated. Please login again.');
      expect(tokenBlacklistService.isBlacklisted).toHaveBeenCalledWith(validToken);
    });

    it('allows access when token is not blacklisted', async () => {
      const authMiddleware = createAuthMiddleware(prismaMock);
      
      const validToken = jwt.sign(
        { userId: 'user-123', email: 'test@example.com', name: 'Test' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      vi.mocked(tokenBlacklistService.isBlacklisted).mockResolvedValue(false);

      // @ts-ignore
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        status: 'ACTIVE',
      });

      app.use('/api/protected', authMiddleware, (req, res) => {
        res.json({ success: true });
      });

      const res = await request(app)
        .get('/api/protected')
        .set('Authorization', `Bearer ${validToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('User Status Verification', () => {
    it('returns 401 when user is not found in database', async () => {
      const authMiddleware = createAuthMiddleware(prismaMock);
      
      const validToken = jwt.sign(
        { userId: 'user-123', email: 'test@example.com', name: 'Test' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      // @ts-ignore
      prismaMock.user.findUnique.mockResolvedValue(null);

      app.use('/api/protected', authMiddleware, (req, res) => {
        res.json({ success: true });
      });

      const res = await request(app)
        .get('/api/protected')
        .set('Authorization', `Bearer ${validToken}`);
      
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid authentication. User not found.');
    });

    it('returns 403 when user status is SUSPENDED', async () => {
      const authMiddleware = createAuthMiddleware(prismaMock);
      
      const validToken = jwt.sign(
        { userId: 'user-123', email: 'test@example.com', name: 'Test' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      // @ts-ignore
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        status: 'SUSPENDED',
      });

      app.use('/api/protected', authMiddleware, (req, res) => {
        res.json({ success: true });
      });

      const res = await request(app)
        .get('/api/protected')
        .set('Authorization', `Bearer ${validToken}`);
      
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Account is suspended. Please contact support.');
    });

    it('returns 403 when user status is DELETED', async () => {
      const authMiddleware = createAuthMiddleware(prismaMock);
      
      const validToken = jwt.sign(
        { userId: 'user-123', email: 'test@example.com', name: 'Test' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      // @ts-ignore
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        status: 'DELETED',
      });

      app.use('/api/protected', authMiddleware, (req, res) => {
        res.json({ success: true });
      });

      const res = await request(app)
        .get('/api/protected')
        .set('Authorization', `Bearer ${validToken}`);
      
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Account is deleted. Please contact support.');
    });

    it('allows access when user status is ACTIVE', async () => {
      const authMiddleware = createAuthMiddleware(prismaMock);
      
      const validToken = jwt.sign(
        { userId: 'user-123', email: 'test@example.com', name: 'Test' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      // @ts-ignore
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        status: 'ACTIVE',
      });

      app.use('/api/protected', authMiddleware, (req, res) => {
        res.json({ success: true, user: req.user });
      });

      const res = await request(app)
        .get('/api/protected')
        .set('Authorization', `Bearer ${validToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.status).toBe('ACTIVE');
    });
  });

  describe('Error Handling', () => {
    it('returns 500 when database throws error', async () => {
      const authMiddleware = createAuthMiddleware(prismaMock);
      
      const validToken = jwt.sign(
        { userId: 'user-123', email: 'test@example.com', name: 'Test' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      // @ts-ignore
      prismaMock.user.findUnique.mockRejectedValue(new Error('Database connection error'));

      app.use('/api/protected', authMiddleware, (req, res) => {
        res.json({ success: true });
      });

      const res = await request(app)
        .get('/api/protected')
        .set('Authorization', `Bearer ${validToken}`);
      
      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Authentication error');
    });

    it('returns 500 when token blacklist service throws error', async () => {
      const authMiddleware = createAuthMiddleware(prismaMock);
      
      const validToken = jwt.sign(
        { userId: 'user-123', email: 'test@example.com', name: 'Test' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      vi.mocked(tokenBlacklistService.isBlacklisted).mockRejectedValue(
        new Error('Redis connection error')
      );

      app.use('/api/protected', authMiddleware, (req, res) => {
        res.json({ success: true });
      });

      const res = await request(app)
        .get('/api/protected')
        .set('Authorization', `Bearer ${validToken}`);
      
      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Authentication error');
    });
  });

  describe('Request Augmentation', () => {
    it('attaches userId to request object', async () => {
      // Reset the mock to return false (not blacklisted)
      vi.mocked(tokenBlacklistService.isBlacklisted).mockResolvedValue(false);
      
      const authMiddleware = createAuthMiddleware(prismaMock);
      
      const validToken = jwt.sign(
        { userId: 'user-123', email: 'test@example.com', name: 'Test' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      // @ts-ignore
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        status: 'ACTIVE',
      });

      let capturedUserId: string | undefined;

      app.use('/api/protected', authMiddleware, (req, res) => {
        capturedUserId = req.userId;
        res.json({ success: true });
      });

      await request(app)
        .get('/api/protected')
        .set('Authorization', `Bearer ${validToken}`);
      
      expect(capturedUserId).toBe('user-123');
    });

    it('attaches user object to request', async () => {
      // Reset the mock to return false (not blacklisted)
      vi.mocked(tokenBlacklistService.isBlacklisted).mockResolvedValue(false);
      
      const authMiddleware = createAuthMiddleware(prismaMock);
      
      const validToken = jwt.sign(
        { userId: 'user-123', email: 'test@example.com', name: 'Test' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        status: 'ACTIVE',
      };

      // @ts-ignore
      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      let capturedUser: any;

      app.use('/api/protected', authMiddleware, (req, res) => {
        capturedUser = req.user;
        res.json({ success: true });
      });

      await request(app)
        .get('/api/protected')
        .set('Authorization', `Bearer ${validToken}`);
      
      expect(capturedUser).toEqual(mockUser);
    });
  });
});
