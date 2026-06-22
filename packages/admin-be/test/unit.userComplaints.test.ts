import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.stubEnv('JWT_SECRET', 'test-jwt-secret-123');

// Mock Prisma
const mockUserFindUnique = vi.fn();
const mockComplaintFindMany = vi.fn();

const prismaMock: any = {
    user: { findUnique: mockUserFindUnique },
    complaint: { findMany: mockComplaintFindMany },
};

import { userComplaintsRouter } from '../routes/userComplaints';

describe('User Complaints Routes', () => {
    let app: express.Application;

    const mockUser = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Test User',
        email: 'test@example.com',
    };

    const mockComplaint = {
        id: 'complaint-1',
        seq: 1,
        subCategory: 'Water Leakage',
        description: 'Leak on main road',
        urgency: 'HIGH',
        status: 'REGISTERED',
        assignedDepartment: 'WATER_SUPPLY_SANITATION',
        isPublic: true,
        isDuplicate: false,
        submissionDate: new Date('2024-01-15'),
        lastUpdated: new Date('2024-01-15'),
        dateOfResolution: null,
        attachmentUrl: null,
        location: { district: 'Ranchi' },
        category: { id: 'cat-1', name: 'Water Supply' },
        assignedAgent: { id: 'agent-1', fullName: 'Agent', department: 'WATER_SUPPLY_SANITATION' },
    };

    beforeEach(() => {
        vi.clearAllMocks();
        app = express();
        app.use(express.json());
        app.use('/users', userComplaintsRouter(prismaMock));
        vi.spyOn(console, 'error').mockImplementation(() => { });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('GET /users/:userId/complaints', () => {
        it('returns complaints for a valid user', async () => {
            mockUserFindUnique.mockResolvedValue(mockUser);
            mockComplaintFindMany.mockResolvedValue([mockComplaint]);

            const res = await request(app)
                .get(`/users/${mockUser.id}/complaints`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.user.id).toBe(mockUser.id);
            expect(res.body.data.totalComplaints).toBe(1);
            expect(res.body.data.complaints).toHaveLength(1);
        });

        it('returns 400 for invalid user ID format', async () => {
            const res = await request(app)
                .get('/users/not-a-uuid/complaints');

            expect(res.status).toBe(400);
            expect(res.body.message).toBe('Invalid user ID format');
        });

        it('returns 404 when user not found', async () => {
            mockUserFindUnique.mockResolvedValue(null);

            const res = await request(app)
                .get(`/users/${mockUser.id}/complaints`);

            expect(res.status).toBe(404);
            expect(res.body.message).toBe('User not found');
        });

        it('returns empty complaints array for user with no complaints', async () => {
            mockUserFindUnique.mockResolvedValue(mockUser);
            mockComplaintFindMany.mockResolvedValue([]);

            const res = await request(app)
                .get(`/users/${mockUser.id}/complaints`);

            expect(res.status).toBe(200);
            expect(res.body.data.totalComplaints).toBe(0);
            expect(res.body.data.complaints).toHaveLength(0);
        });

        it('returns 500 on database error', async () => {
            mockUserFindUnique.mockRejectedValue(new Error('DB error'));

            const res = await request(app)
                .get(`/users/${mockUser.id}/complaints`);

            expect(res.status).toBe(500);
            expect(res.body.message).toBe('Internal server error');
        });
    });
});
