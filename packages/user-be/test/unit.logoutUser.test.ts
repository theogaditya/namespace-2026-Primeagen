import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import prismaMock from "../lib/_mocks_/prisma";

// Mock token blacklist service
vi.mock('../lib/redis/tokenBlacklistService', () => ({
    tokenBlacklistService: {
        blacklistToken: vi.fn().mockResolvedValue(undefined),
        isBlacklisted: vi.fn().mockResolvedValue(false),
        connect: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn().mockResolvedValue(undefined),
    },
}));

import { logoutUserRouter } from '../routes/logoutUser';
import { tokenBlacklistService } from '../lib/redis/tokenBlacklistService';

const JWT_SECRET = "my123";

describe('Logout User Routes', () => {
    let app: express.Express;

    beforeEach(() => {
        app = express();
        app.use(express.json());
        app.use('/api/auth', logoutUserRouter(prismaMock));
        vi.clearAllMocks();
        vi.spyOn(console, 'error').mockImplementation(() => { });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('POST /api/auth/logout', () => {
        it('logs out successfully and blacklists token', async () => {
            const token = jwt.sign(
                { userId: 'user-1', email: 'test@example.com', name: 'Test User' },
                JWT_SECRET,
                { expiresIn: '24h' }
            );

            // Mock the auth middleware to pass
            // @ts-ignore
            prismaMock.user.findUnique.mockResolvedValue({
                id: 'user-1',
                email: 'test@example.com',
                name: 'Test User',
                status: 'ACTIVE',
            });

            const res = await request(app)
                .post('/api/auth/logout')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toContain('Logout successful');
            expect(tokenBlacklistService.blacklistToken).toHaveBeenCalledWith(
                token,
                expect.any(Number)
            );
        });

        it('returns 401 when no token provided', async () => {
            const res = await request(app)
                .post('/api/auth/logout');

            expect(res.status).toBe(401);
        });

        it('returns 401 for invalid token', async () => {
            const res = await request(app)
                .post('/api/auth/logout')
                .set('Authorization', 'Bearer invalid-token');

            expect(res.status).toBe(401);
        });
    });
});
