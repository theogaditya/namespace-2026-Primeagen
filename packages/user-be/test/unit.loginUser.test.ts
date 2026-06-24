import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import prismaMock from "../lib/_mocks_/prisma";
import bcrypt from 'bcrypt';

import { loginUserRouter } from '../routes/loginUser';

const JWT_SECRET = "my123";

// Helper to create a mock fetch response for reCAPTCHA
function mockCaptchaResponse(success: boolean) {
    return vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ success }),
    });
}

describe('Login User Routes', () => {
    let app: express.Express;
    let originalFetch: typeof globalThis.fetch;

    const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password: '', // will be set in beforeEach
        name: 'Test User',
        phoneNumber: '9876543210',
        dateOfBirth: new Date('2000-01-15'),
        preferredLanguage: 'en',
        disability: null,
        status: 'ACTIVE',
        location: { district: 'Ranchi' },
        dateOfCreation: new Date(),
        lastUpdated: new Date(),
    };

    beforeEach(async () => {
        app = express();
        app.use(express.json());
        app.use('/api/auth', loginUserRouter(prismaMock));
        vi.clearAllMocks();
        vi.spyOn(console, 'error').mockImplementation(() => { });
        vi.spyOn(console, 'log').mockImplementation(() => { });

        // Hash password for tests
        mockUser.password = await bcrypt.hash('password123', 10);

        // Mock fetch for reCAPTCHA verification (default: success)
        originalFetch = globalThis.fetch;
        globalThis.fetch = mockCaptchaResponse(true) as any;
    });

    afterEach(() => {
        vi.restoreAllMocks();
        globalThis.fetch = originalFetch;
    });

    describe('POST /api/auth/login', () => {
        it('logs in successfully with valid credentials', async () => {
            // @ts-ignore
            prismaMock.user.findUnique.mockResolvedValue(mockUser);

            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: 'test@example.com', password: 'password123', captchaToken: 'valid-token' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toBe('Login successful');
            expect(res.body.data.token).toBeDefined();
            expect(res.body.data.user.password).toBeUndefined();
        });

        it('returns valid JWT token on login', async () => {
            // @ts-ignore
            prismaMock.user.findUnique.mockResolvedValue(mockUser);

            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: 'test@example.com', password: 'password123', captchaToken: 'valid-token' });

            const decoded = jwt.verify(res.body.data.token, JWT_SECRET) as any;
            expect(decoded.userId).toBe('user-123');
            expect(decoded.email).toBe('test@example.com');
        });

        it('returns 401 for non-existent user', async () => {
            // @ts-ignore
            prismaMock.user.findUnique.mockResolvedValue(null);

            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: 'nonexistent@example.com', password: 'password123', captchaToken: 'valid-token' });

            expect(res.status).toBe(401);
            expect(res.body.message).toBe('Invalid email or password');
        });

        it('returns 401 for wrong password', async () => {
            // @ts-ignore
            prismaMock.user.findUnique.mockResolvedValue(mockUser);

            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: 'test@example.com', password: 'wrongpassword', captchaToken: 'valid-token' });

            expect(res.status).toBe(401);
            expect(res.body.message).toBe('Invalid email or password');
        });

        it('returns 403 for inactive user', async () => {
            // @ts-ignore
            prismaMock.user.findUnique.mockResolvedValue({
                ...mockUser,
                status: 'SUSPENDED',
            });

            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: 'test@example.com', password: 'password123', captchaToken: 'valid-token' });

            expect(res.status).toBe(403);
            expect(res.body.message).toContain('suspended');
        });

        it('returns 400 for invalid email format', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: 'not-an-email', password: 'password123', captchaToken: 'valid-token' });

            expect(res.status).toBe(400);
        });

        it('returns 400 for missing password', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: 'test@example.com', captchaToken: 'valid-token' });

            expect(res.status).toBe(400);
        });

        it('returns 400 when captchaToken is missing', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: 'test@example.com', password: 'password123' });

            expect(res.status).toBe(400);
        });

        it('returns 400 when CAPTCHA verification fails', async () => {
            // Override fetch mock to return failure
            globalThis.fetch = mockCaptchaResponse(false) as any;

            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: 'test@example.com', password: 'password123', captchaToken: 'invalid-token' });

            expect(res.status).toBe(400);
            expect(res.body.message).toContain('CAPTCHA verification failed');
        });

        it('returns 500 on database error', async () => {
            // @ts-ignore
            prismaMock.user.findUnique.mockRejectedValue(new Error('DB connection lost'));

            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: 'test@example.com', password: 'password123', captchaToken: 'valid-token' });

            expect(res.status).toBe(500);
        });
    });
});
