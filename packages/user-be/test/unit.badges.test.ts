import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import prismaMock from "../lib/_mocks_/prisma";

vi.mock('../lib/prisma', () => ({ 
  prisma: prismaMock,
  getPrisma: () => prismaMock
}));

// Use vi.hoisted to create mocks that are available during vi.mock hoisting
const { mockBadgeService } = vi.hoisted(() => {
  return {
    mockBadgeService: {
      getAllBadgesWithStatus: vi.fn(),
      getUserBadges: vi.fn(),
      getUnnotifiedBadges: vi.fn(),
      getBadgeProgress: vi.fn(),
      checkAndAwardBadges: vi.fn(),
      getUserStats: vi.fn(),
    }
  };
});

// Mock the badgeService
vi.mock('../lib/badges/badgeService', () => {
  return {
    getBadgeService: vi.fn(() => mockBadgeService),
    BadgeService: vi.fn(),
  };
});

import { createBadgeRouter } from '../routes/badges';

let app: express.Express;

// Middleware to attach mock user
const mockAuthMiddleware = (userId: string | null) => {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (userId) {
      (req as any).user = { id: userId, phoneNumber: '+919876543210' };
    }
    next();
  };
};

beforeEach(() => {
  app = express();
  app.use(express.json());
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Badge Routes', () => {
  describe('GET /badges - Get all badges with user status', () => {
    it('returns 401 when user is not authenticated', async () => {
      app.use(mockAuthMiddleware(null));
      app.use('/badges', createBadgeRouter());

      const res = await request(app).get('/badges');
      
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Unauthorized');
    });

    it('returns all badges with earned status for authenticated user', async () => {
      const mockBadges = [
        { id: '1', slug: 'first_step', name: 'First Step', category: 'FILING', rarity: 'COMMON', earned: true, earnedAt: new Date() },
        { id: '2', slug: 'active_reporter', name: 'Active Reporter', category: 'FILING', rarity: 'UNCOMMON', earned: false },
        { id: '3', slug: 'appreciated', name: 'Appreciated', category: 'ENGAGEMENT', rarity: 'COMMON', earned: true, earnedAt: new Date() },
        { id: '4', slug: 'problem_identified', name: 'Problem Identified', category: 'RESOLUTION', rarity: 'COMMON', earned: false },
      ];

      mockBadgeService.getAllBadgesWithStatus.mockResolvedValue(mockBadges);
      
      app.use(mockAuthMiddleware('user-123'));
      app.use('/badges', createBadgeRouter());

      const res = await request(app).get('/badges');
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.badges).toHaveLength(4);
      expect(res.body.totalBadges).toBe(4);
      expect(res.body.earnedCount).toBe(2);
      expect(res.body.grouped.FILING).toHaveLength(2);
      expect(res.body.grouped.ENGAGEMENT).toHaveLength(1);
      expect(res.body.grouped.RESOLUTION).toHaveLength(1);
    });

    it('returns 500 when service throws error', async () => {
      mockBadgeService.getAllBadgesWithStatus.mockRejectedValue(new Error('Database error'));
      
      app.use(mockAuthMiddleware('user-123'));
      app.use('/badges', createBadgeRouter());

      const res = await request(app).get('/badges');
      
      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Failed to fetch badges');
    });
  });

  describe('GET /badges/my - Get user earned badges', () => {
    it('returns 401 when user is not authenticated', async () => {
      app.use(mockAuthMiddleware(null));
      app.use('/badges', createBadgeRouter());

      const res = await request(app).get('/badges/my');
      
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('returns user earned badges sorted by most recent', async () => {
      const mockEarnedBadges = [
        { id: '1', slug: 'first_step', name: 'First Step', earnedAt: new Date('2025-12-20') },
        { id: '3', slug: 'appreciated', name: 'Appreciated', earnedAt: new Date('2025-12-15') },
      ];

      mockBadgeService.getUserBadges.mockResolvedValue(mockEarnedBadges);
      
      app.use(mockAuthMiddleware('user-123'));
      app.use('/badges', createBadgeRouter());

      const res = await request(app).get('/badges/my');
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.badges).toHaveLength(2);
      expect(res.body.count).toBe(2);
    });

    it('returns empty array when user has no badges', async () => {
      mockBadgeService.getUserBadges.mockResolvedValue([]);
      
      app.use(mockAuthMiddleware('user-123'));
      app.use('/badges', createBadgeRouter());

      const res = await request(app).get('/badges/my');
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.badges).toHaveLength(0);
      expect(res.body.count).toBe(0);
    });
  });

  describe('GET /badges/recent - Get newly earned badges', () => {
    it('returns 401 when user is not authenticated', async () => {
      app.use(mockAuthMiddleware(null));
      app.use('/badges', createBadgeRouter());

      const res = await request(app).get('/badges/recent');
      
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('returns unnotified badges and marks them as notified', async () => {
      const mockNewBadges = [
        { id: '1', slug: 'first_step', name: 'First Step' },
      ];

      mockBadgeService.getUnnotifiedBadges.mockResolvedValue(mockNewBadges);
      
      app.use(mockAuthMiddleware('user-123'));
      app.use('/badges', createBadgeRouter());

      const res = await request(app).get('/badges/recent');
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.badges).toHaveLength(1);
      expect(res.body.hasNew).toBe(true);
    });

    it('returns hasNew false when no new badges', async () => {
      mockBadgeService.getUnnotifiedBadges.mockResolvedValue([]);
      
      app.use(mockAuthMiddleware('user-123'));
      app.use('/badges', createBadgeRouter());

      const res = await request(app).get('/badges/recent');
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.hasNew).toBe(false);
    });
  });

  describe('GET /badges/progress - Get badge progress', () => {
    it('returns 401 when user is not authenticated', async () => {
      app.use(mockAuthMiddleware(null));
      app.use('/badges', createBadgeRouter());

      const res = await request(app).get('/badges/progress');
      
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('returns badge progress for authenticated user', async () => {
      const mockProgress = {
        complaints: { current: 5, next: 10, percentage: 50, nextBadge: 'Active Reporter' },
        likes: { current: 15, next: 25, percentage: 60, nextBadge: 'Rising Star' },
        resolved: { current: 2, next: 5, percentage: 40, nextBadge: 'Fixer' },
      };

      mockBadgeService.getBadgeProgress.mockResolvedValue(mockProgress);
      
      app.use(mockAuthMiddleware('user-123'));
      app.use('/badges', createBadgeRouter());

      const res = await request(app).get('/badges/progress');
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.progress.complaints.current).toBe(5);
      expect(res.body.progress.complaints.percentage).toBe(50);
      expect(res.body.progress.likes.nextBadge).toBe('Rising Star');
    });
  });

  describe('GET /badges/stats - Get badge statistics', () => {
    it('returns 401 when user is not authenticated', async () => {
      app.use(mockAuthMiddleware(null));
      app.use('/badges', createBadgeRouter());

      const res = await request(app).get('/badges/stats');
      
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('returns comprehensive badge statistics', async () => {
      const mockBadges = [
        { id: '1', slug: 'first_step', name: 'First Step', category: 'FILING', rarity: 'COMMON', earned: true },
        { id: '2', slug: 'active_reporter', name: 'Active Reporter', category: 'FILING', rarity: 'UNCOMMON', earned: false },
        { id: '3', slug: 'appreciated', name: 'Appreciated', category: 'ENGAGEMENT', rarity: 'RARE', earned: true },
      ];

      const mockStats = {
        totalComplaints: 10,
        resolvedComplaints: 3,
        totalLikesReceived: 25,
        maxSingleComplaintLikes: 15,
        categoryCountMap: { TRANSPORTATION: 5, HEALTH: 3 },
      };

      const mockProgress = {
        complaints: { current: 10, next: 25, percentage: 40, nextBadge: 'Vocal Citizen' },
        likes: { current: 25, next: 50, percentage: 50, nextBadge: 'Community Favorite' },
        resolved: { current: 3, next: 5, percentage: 60, nextBadge: 'Problem Solver' },
      };

      mockBadgeService.getAllBadgesWithStatus.mockResolvedValue(mockBadges);
      mockBadgeService.getUserStats.mockResolvedValue(mockStats);
      mockBadgeService.getBadgeProgress.mockResolvedValue(mockProgress);
      
      app.use(mockAuthMiddleware('user-123'));
      app.use('/badges', createBadgeRouter());

      const res = await request(app).get('/badges/stats');
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.stats.totalBadges).toBe(3);
      expect(res.body.stats.earnedCount).toBe(2);
      expect(res.body.stats.percentage).toBe(67); // 2/3 * 100 rounded
      expect(res.body.stats.userStats.totalComplaints).toBe(10);
      expect(res.body.stats.rarityStats.COMMON.total).toBe(1);
      expect(res.body.stats.rarityStats.COMMON.earned).toBe(1);
    });
  });

  describe('GET /badges/check - Manually check and award badges', () => {
    it('returns 401 when user is not authenticated', async () => {
      app.use(mockAuthMiddleware(null));
      app.use('/badges', createBadgeRouter());

      const res = await request(app).get('/badges/check');
      
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('returns newly awarded badges', async () => {
      const mockNewBadges = [
        { badge: { id: '1', slug: 'first_step', name: 'First Step' }, isNew: true },
        { badge: { id: '2', slug: 'appreciated', name: 'Appreciated' }, isNew: true },
      ];

      mockBadgeService.checkAndAwardBadges.mockResolvedValue(mockNewBadges);
      
      app.use(mockAuthMiddleware('user-123'));
      app.use('/badges', createBadgeRouter());

      const res = await request(app).get('/badges/check');
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.awarded).toBe(2);
      expect(res.body.message).toContain('Congratulations');
    });

    it('returns message when no new badges earned', async () => {
      mockBadgeService.checkAndAwardBadges.mockResolvedValue([]);
      
      app.use(mockAuthMiddleware('user-123'));
      app.use('/badges', createBadgeRouter());

      const res = await request(app).get('/badges/check');
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.awarded).toBe(0);
      expect(res.body.message).toBe('No new badges earned');
    });
  });
});
