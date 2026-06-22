import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import prismaMock from "../lib/_mocks_/prisma";

// Mock badge service
vi.mock('../lib/badges/badgeService', () => ({
    getBadgeService: vi.fn().mockReturnValue({
        getUserBadges: vi.fn().mockResolvedValue([]),
    }),
}));

import { createUserProfileRouter } from '../routes/userProfile';
import { getBadgeService } from '../lib/badges/badgeService';

describe('User Profile Routes', () => {
    let app: express.Express;

    const mockUser = {
        id: 'user-123',
        name: 'Test User',
        status: 'ACTIVE',
        dateOfCreation: new Date('2024-01-15'),
        location: {
            district: 'Ranchi',
            city: 'Ranchi',
            state: 'Jharkhand',
        },
    };

    beforeEach(() => {
        app = express();
        app.use(express.json());
        app.use('/user', createUserProfileRouter(prismaMock));
        vi.clearAllMocks();
        vi.spyOn(console, 'error').mockImplementation(() => { });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('GET /user/:userId/profile', () => {
        it('returns user profile with badges and stats', async () => {
            // @ts-ignore
            prismaMock.user.findUnique.mockResolvedValue(mockUser);
            // @ts-ignore
            prismaMock.complaint.aggregate.mockResolvedValue({ _count: { id: 5 } });
            // @ts-ignore
            prismaMock.complaint.count.mockResolvedValue(3);

            const mockBadgeService = getBadgeService(prismaMock);
            vi.mocked(mockBadgeService.getUserBadges).mockResolvedValue([
                { id: 'badge-1', name: 'First Complaint', icon: '🏆', rarity: 'COMMON', earnedAt: new Date() } as any,
            ]);

            const res = await request(app).get('/user/user-123/profile');

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.profile.name).toBe('Test User');
            expect(res.body.profile.stats.totalComplaints).toBe(5);
            expect(res.body.profile.stats.resolvedComplaints).toBe(3);
        });

        it('returns 404 when user not found', async () => {
            // @ts-ignore
            prismaMock.user.findUnique.mockResolvedValue(null);

            const res = await request(app).get('/user/non-existent/profile');

            expect(res.status).toBe(404);
            expect(res.body.error).toBe('User not found');
        });

        it('handles user with no location', async () => {
            // @ts-ignore
            prismaMock.user.findUnique.mockResolvedValue({ ...mockUser, location: null });
            // @ts-ignore
            prismaMock.complaint.aggregate.mockResolvedValue({ _count: { id: 0 } });
            // @ts-ignore
            prismaMock.complaint.count.mockResolvedValue(0);

            const res = await request(app).get('/user/user-123/profile');

            expect(res.status).toBe(200);
            expect(res.body.profile.location).toBeNull();
        });

        it('returns 500 on database error', async () => {
            // @ts-ignore
            prismaMock.user.findUnique.mockRejectedValue(new Error('DB error'));

            const res = await request(app).get('/user/user-123/profile');

            expect(res.status).toBe(500);
        });
    });
});
