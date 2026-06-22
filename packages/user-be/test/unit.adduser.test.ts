import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import prismaMock from "../lib/_mocks_/prisma";

// Mock Redis queue service
vi.mock('../lib/redis/userQueueService', () => ({
    userQueueService: {
        pushUserToQueue: vi.fn().mockResolvedValue(undefined),
    },
}));

import { addUserRouter } from '../routes/adduser';
import { userQueueService } from '../lib/redis/userQueueService';

describe('Add User Routes', () => {
    let app: express.Express;

    const validSignupPayload = {
        email: 'newuser@example.com',
        phoneNumber: '9876543210',
        name: 'New User',
        password: 'securepass123',
        dateOfBirth: '2000-01-15',
        aadhaarId: '123456789012',
        preferredLanguage: 'en',
        location: {
            pin: '834001',
            district: 'Ranchi',
            city: 'Ranchi',
            locality: 'Main Road',
            street: 'Street 1',
            municipal: 'Ranchi Municipal',
            state: 'Jharkhand',
        },
    };

    beforeEach(() => {
        app = express();
        app.use(express.json());
        app.use('/api/users', addUserRouter(prismaMock));
        vi.clearAllMocks();
        vi.spyOn(console, 'error').mockImplementation(() => { });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('POST /api/users/signup', () => {
        it('creates user successfully with valid data', async () => {
            // @ts-ignore
            prismaMock.user.findFirst.mockResolvedValue(null); // no existing user
            // @ts-ignore
            prismaMock.user.create.mockResolvedValue({
                id: 'new-user-id',
                email: 'newuser@example.com',
                phoneNumber: '9876543210',
                name: 'New User',
                dateOfBirth: new Date('2000-01-15'),
                preferredLanguage: 'en',
                disability: null,
                dateOfCreation: new Date(),
                lastUpdated: new Date(),
            } as any);

            const res = await request(app)
                .post('/api/users/signup')
                .send(validSignupPayload);

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toBe('User created successfully');
            expect(res.body.data.password).toBeUndefined();
        });

        it('pushes user to Redis queue after creation', async () => {
            // @ts-ignore
            prismaMock.user.findFirst.mockResolvedValue(null);
            // @ts-ignore
            prismaMock.user.create.mockResolvedValue({
                id: 'new-user-id',
                email: 'newuser@example.com',
                phoneNumber: '9876543210',
                name: 'New User',
                dateOfBirth: new Date('2000-01-15'),
                preferredLanguage: 'en',
                disability: null,
                dateOfCreation: new Date(),
                lastUpdated: new Date(),
            } as any);

            await request(app)
                .post('/api/users/signup')
                .send(validSignupPayload);

            expect(userQueueService.pushUserToQueue).toHaveBeenCalledTimes(1);
        });

        it('still creates user when queue push fails', async () => {
            // @ts-ignore
            prismaMock.user.findFirst.mockResolvedValue(null);
            // @ts-ignore
            prismaMock.user.create.mockResolvedValue({
                id: 'new-user-id',
                email: 'newuser@example.com',
                phoneNumber: '9876543210',
                name: 'New User',
                dateOfBirth: new Date('2000-01-15'),
                preferredLanguage: 'en',
                disability: null,
                dateOfCreation: new Date(),
                lastUpdated: new Date(),
            } as any);
            vi.mocked(userQueueService.pushUserToQueue).mockRejectedValueOnce(new Error('Redis down'));

            const res = await request(app)
                .post('/api/users/signup')
                .send(validSignupPayload);

            // User should still be created despite queue failure
            expect(res.status).toBe(201);
        });

        it('returns 409 when user already exists', async () => {
            // @ts-ignore
            prismaMock.user.findFirst.mockResolvedValue({
                id: 'existing-user',
                email: 'newuser@example.com',
            });

            const res = await request(app)
                .post('/api/users/signup')
                .send(validSignupPayload);

            expect(res.status).toBe(409);
            expect(res.body.message).toContain('already exists');
        });

        it('returns 400 for invalid email', async () => {
            const res = await request(app)
                .post('/api/users/signup')
                .send({ ...validSignupPayload, email: 'not-an-email' });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it('returns 400 for short password', async () => {
            const res = await request(app)
                .post('/api/users/signup')
                .send({ ...validSignupPayload, password: '1234' });

            expect(res.status).toBe(400);
        });

        it('returns 400 for invalid aadhaar', async () => {
            const res = await request(app)
                .post('/api/users/signup')
                .send({ ...validSignupPayload, aadhaarId: '12345' });

            expect(res.status).toBe(400);
        });

        it('returns 400 for underage user', async () => {
            const res = await request(app)
                .post('/api/users/signup')
                .send({ ...validSignupPayload, dateOfBirth: '2020-01-01' });

            expect(res.status).toBe(400);
        });

        it('returns 400 for invalid PIN code', async () => {
            const res = await request(app)
                .post('/api/users/signup')
                .send({
                    ...validSignupPayload,
                    location: { ...validSignupPayload.location, pin: '123' },
                });

            expect(res.status).toBe(400);
        });

        it('returns 400 for missing required fields', async () => {
            const res = await request(app)
                .post('/api/users/signup')
                .send({ email: 'test@test.com' });

            expect(res.status).toBe(400);
        });

        it('returns 500 on database error', async () => {
            // @ts-ignore
            prismaMock.user.findFirst.mockRejectedValue(new Error('DB error'));

            const res = await request(app)
                .post('/api/users/signup')
                .send(validSignupPayload);

            expect(res.status).toBe(500);
        });
    });

    describe('GET /api/users/location/:pin', () => {
        it('returns 400 for invalid PIN format', async () => {
            const res = await request(app).get('/api/users/location/12345');

            expect(res.status).toBe(400);
            expect(res.body.message).toBe('Invalid PIN code');
        });

        it('returns 400 for non-numeric PIN', async () => {
            const res = await request(app).get('/api/users/location/abcdef');

            expect(res.status).toBe(400);
        });
    });
});
