import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

vi.stubEnv('JWT_SECRET', 'test-jwt-secret-123');

// Mock Prisma
const mockComplaintFindMany = vi.fn();
const mockComplaintCount = vi.fn();
const mockComplaintFindUnique = vi.fn();
const mockComplaintFindFirst = vi.fn();

const prismaMock: any = {
    complaint: {
        findMany: mockComplaintFindMany,
        count: mockComplaintCount,
        findUnique: mockComplaintFindUnique,
        findFirst: mockComplaintFindFirst,
    },
};

// Mock unifiedAuth middleware
vi.mock('../middleware/unifiedAuth', () => ({
    authenticateAdmin: (req: any, _res: any, next: any) => {
        req.admin = req.headers['x-test-admin']
            ? JSON.parse(req.headers['x-test-admin'] as string)
            : { id: 'admin-1', adminType: 'SUPER_ADMIN', department: 'INFRASTRUCTURE' };
        next();
    },
}));

import complaintRoutes from '../routes/complaint';

describe('Complaint Routes', () => {
    let app: express.Application;

    const superAdmin = JSON.stringify({ id: 'super-1', adminType: 'SUPER_ADMIN' });
    const agent = JSON.stringify({ id: 'agent-1', adminType: 'AGENT' });
    const municipalAdmin = JSON.stringify({ id: 'mun-1', adminType: 'MUNICIPAL_ADMIN' });
    const stateAdmin = JSON.stringify({ id: 'state-1', adminType: 'STATE_ADMIN', department: 'WATER_SUPPLY_SANITATION' });

    const mockComplaint = {
        id: 'complaint-1',
        seq: 1,
        subCategory: 'Water Leakage',
        description: 'Major water leak on main road',
        status: 'REGISTERED',
        escalationLevel: 0,
        urgency: 'HIGH',
        assignedDepartment: 'WATER_SUPPLY_SANITATION',
        submissionDate: new Date('2024-01-15'),
        lastUpdated: new Date('2024-01-15'),
        dateOfResolution: null,
        attachmentUrl: null,
        isPublic: true,
        upvoteCount: 5,
        isDuplicate: false,
        sla: null,
        AIstandardizedSubCategory: 'water_pipeline_leak',
        AIabusedFlag: false,
        AIimageVarificationStatus: null,
        category: { name: 'Water Supply' },
        location: {
            district: 'Ranchi',
            city: 'Ranchi',
            locality: 'Main Road',
            street: 'Street 1',
            pin: '834001',
            latitude: 23.3441,
            longitude: 85.3096,
        },
        User: {
            id: 'user-1',
            name: 'Test User',
            email: 'test@example.com',
            phoneNumber: '9876543210',
        },
        assignedAgent: {
            id: 'agent-1',
            fullName: 'Test Agent',
            officialEmail: 'agent@test.com',
            department: 'WATER_SUPPLY_SANITATION',
        },
        managedByMunicipalAdmin: null,
        auditLogs: [],
    };

    beforeEach(() => {
        vi.clearAllMocks();
        app = express();
        app.use(express.json());
        app.use('/complaints', complaintRoutes(prismaMock));
        vi.spyOn(console, 'error').mockImplementation(() => { });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // ---- GET /complaints/list ----
    describe('GET /complaints/list', () => {
        it('returns complaints with default pagination', async () => {
            mockComplaintFindMany.mockResolvedValue([mockComplaint]);
            mockComplaintCount.mockResolvedValue(1);

            const res = await request(app)
                .get('/complaints/list')
                .set('x-test-admin', superAdmin);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveLength(1);
            expect(res.body.data[0].id).toBe('complaint-1');
            expect(res.body.pagination).toEqual({
                page: 1,
                limit: 10,
                total: 1,
                totalPages: 1,
            });
        });

        it('filters by status', async () => {
            mockComplaintFindMany.mockResolvedValue([]);
            mockComplaintCount.mockResolvedValue(0);

            await request(app)
                .get('/complaints/list?status=REGISTERED')
                .set('x-test-admin', superAdmin);

            expect(mockComplaintFindMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({ status: 'REGISTERED' }),
                })
            );
        });

        it('filters by department', async () => {
            mockComplaintFindMany.mockResolvedValue([]);
            mockComplaintCount.mockResolvedValue(0);

            await request(app)
                .get('/complaints/list?department=INFRASTRUCTURE')
                .set('x-test-admin', superAdmin);

            expect(mockComplaintFindMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({ assignedDepartment: 'INFRASTRUCTURE' }),
                })
            );
        });

        it('searches in description and subCategory', async () => {
            mockComplaintFindMany.mockResolvedValue([]);
            mockComplaintCount.mockResolvedValue(0);

            await request(app)
                .get('/complaints/list?search=water')
                .set('x-test-admin', superAdmin);

            expect(mockComplaintFindMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        OR: expect.arrayContaining([
                            expect.objectContaining({ description: expect.objectContaining({ contains: 'water' }) }),
                        ]),
                    }),
                })
            );
        });

        it('agent only sees own assigned complaints', async () => {
            mockComplaintFindMany.mockResolvedValue([]);
            mockComplaintCount.mockResolvedValue(0);

            await request(app)
                .get('/complaints/list')
                .set('x-test-admin', agent);

            expect(mockComplaintFindMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({ assignedAgentId: 'agent-1' }),
                })
            );
        });

        it('municipal admin sees managed complaints', async () => {
            mockComplaintFindMany.mockResolvedValue([]);
            mockComplaintCount.mockResolvedValue(0);

            await request(app)
                .get('/complaints/list')
                .set('x-test-admin', municipalAdmin);

            expect(mockComplaintFindMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({ managedByMunicipalAdminId: 'mun-1' }),
                })
            );
        });

        it('handles pagination correctly', async () => {
            mockComplaintFindMany.mockResolvedValue([]);
            mockComplaintCount.mockResolvedValue(50);

            const res = await request(app)
                .get('/complaints/list?page=3&limit=5')
                .set('x-test-admin', superAdmin);

            expect(res.body.pagination).toEqual({
                page: 3,
                limit: 5,
                total: 50,
                totalPages: 10,
            });
            expect(mockComplaintFindMany).toHaveBeenCalledWith(
                expect.objectContaining({ skip: 10, take: 5 })
            );
        });

        it('handles complaints without location', async () => {
            const noLocationComplaint = { ...mockComplaint, location: null };
            mockComplaintFindMany.mockResolvedValue([noLocationComplaint]);
            mockComplaintCount.mockResolvedValue(1);

            const res = await request(app)
                .get('/complaints/list')
                .set('x-test-admin', superAdmin);

            expect(res.body.data[0].location).toBeNull();
        });

        it('returns 500 on database error', async () => {
            mockComplaintFindMany.mockRejectedValue(new Error('DB error'));

            const res = await request(app)
                .get('/complaints/list')
                .set('x-test-admin', superAdmin);

            expect(res.status).toBe(500);
            expect(res.body.success).toBe(false);
        });
    });

    // ---- GET /complaints/stats/overview ----
    describe('GET /complaints/stats/overview', () => {
        it('returns statistics for super admin', async () => {
            mockComplaintCount
                .mockResolvedValueOnce(100) // total
                .mockResolvedValueOnce(30)  // registered
                .mockResolvedValueOnce(20)  // under_processing
                .mockResolvedValueOnce(40)  // completed
                .mockResolvedValueOnce(10)  // on_hold
                .mockResolvedValueOnce(15)  // high priority
                .mockResolvedValueOnce(60); // assigned

            const res = await request(app)
                .get('/complaints/stats/overview')
                .set('x-test-admin', superAdmin);

            expect(res.status).toBe(200);
            expect(res.body.data).toEqual({
                total: 100,
                registered: 30,
                inProgress: 20,
                resolved: 40,
                closed: 10,
                highPriority: 15,
                assigned: 60,
            });
        });

        it('returns 500 on database error', async () => {
            mockComplaintCount.mockRejectedValue(new Error('DB error'));

            const res = await request(app)
                .get('/complaints/stats/overview')
                .set('x-test-admin', superAdmin);

            expect(res.status).toBe(500);
        });
    });

    // ---- GET /complaints/all-complaints ----
    describe('GET /complaints/all-complaints', () => {
        it('returns all complaints regardless of admin type', async () => {
            mockComplaintFindMany.mockResolvedValue([mockComplaint]);
            mockComplaintCount.mockResolvedValue(1);

            const res = await request(app)
                .get('/complaints/all-complaints')
                .set('x-test-admin', superAdmin);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });

        it('returns 500 on database error', async () => {
            mockComplaintFindMany.mockRejectedValue(new Error('DB error'));

            const res = await request(app)
                .get('/complaints/all-complaints')
                .set('x-test-admin', superAdmin);

            expect(res.status).toBe(500);
        });
    });

    // ---- GET /complaints/locations ----
    describe('GET /complaints/locations', () => {
        it('returns locations with stored coordinates', async () => {
            mockComplaintFindMany.mockResolvedValue([{
                id: 'c-1',
                seq: 1,
                subCategory: 'Water Issue',
                description: 'Leak',
                status: 'REGISTERED',
                urgency: 'HIGH',
                submissionDate: new Date(),
                category: { name: 'Water Supply' },
                location: { latitude: 23.3, longitude: 85.3, district: 'Ranchi', city: 'Ranchi', locality: 'Main Road', pin: '834001' },
            }]);

            const res = await request(app)
                .get('/complaints/locations')
                .set('x-test-admin', superAdmin);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.locations).toHaveLength(1);
            expect(res.body.locations[0].latitude).toBe(23.3);
        });

        it('geocodes from district when no coordinates', async () => {
            mockComplaintFindMany.mockResolvedValue([{
                id: 'c-2',
                seq: 2,
                subCategory: 'Road Issue',
                description: 'Pothole',
                status: 'REGISTERED',
                urgency: 'LOW',
                submissionDate: new Date(),
                category: { name: 'Infrastructure' },
                location: { latitude: null, longitude: null, district: 'Dhanbad', city: null, locality: null, pin: '826001' },
            }]);

            const res = await request(app)
                .get('/complaints/locations')
                .set('x-test-admin', superAdmin);

            expect(res.body.locations).toHaveLength(1);
            // Should be near Dhanbad coordinates (23.7957, 86.4304) with small offset
            expect(res.body.locations[0].latitude).toBeCloseTo(23.7957, 1);
            expect(res.body.locations[0].longitude).toBeCloseTo(86.4304, 1);
        });

        it('skips complaints with no coordinates and unknown district', async () => {
            mockComplaintFindMany.mockResolvedValue([{
                id: 'c-3',
                seq: 3,
                subCategory: 'Issue',
                description: 'Some issue',
                status: 'REGISTERED',
                urgency: 'LOW',
                submissionDate: new Date(),
                category: null,
                location: { latitude: null, longitude: null, district: 'Unknown Place', city: null, locality: null, pin: '000000' },
            }]);

            const res = await request(app)
                .get('/complaints/locations')
                .set('x-test-admin', superAdmin);

            expect(res.body.locations).toHaveLength(0);
        });
    });

    // ---- GET /complaints/most-liked ----
    describe('GET /complaints/most-liked', () => {
        it('returns most-liked complaints', async () => {
            mockComplaintFindFirst.mockResolvedValue({ upvoteCount: 10 });
            mockComplaintFindMany.mockResolvedValue([mockComplaint]);

            const res = await request(app)
                .get('/complaints/most-liked')
                .set('x-test-admin', superAdmin);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.highestLikeCount).toBe(10);
        });

        it('returns empty array when no complaints have likes', async () => {
            mockComplaintFindFirst.mockResolvedValue(null);

            const res = await request(app)
                .get('/complaints/most-liked')
                .set('x-test-admin', superAdmin);

            expect(res.status).toBe(200);
            expect(res.body.data).toEqual([]);
        });

        it('returns 500 on database error', async () => {
            mockComplaintFindFirst.mockRejectedValue(new Error('DB error'));

            const res = await request(app)
                .get('/complaints/most-liked')
                .set('x-test-admin', superAdmin);

            expect(res.status).toBe(500);
        });
    });

    // ---- GET /complaints/:id ----
    describe('GET /complaints/:id', () => {
        it('returns a single complaint by ID', async () => {
            mockComplaintFindUnique.mockResolvedValue(mockComplaint);

            const res = await request(app)
                .get('/complaints/complaint-1')
                .set('x-test-admin', superAdmin);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.id).toBe('complaint-1');
            expect(res.body.data.auditLogs).toBeDefined();
        });

        it('returns 404 for non-existent complaint', async () => {
            mockComplaintFindUnique.mockResolvedValue(null);

            const res = await request(app)
                .get('/complaints/non-existent')
                .set('x-test-admin', superAdmin);

            expect(res.status).toBe(404);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe('Complaint not found');
        });

        it('returns 500 on database error', async () => {
            mockComplaintFindUnique.mockRejectedValue(new Error('DB error'));

            const res = await request(app)
                .get('/complaints/complaint-1')
                .set('x-test-admin', superAdmin);

            expect(res.status).toBe(500);
        });
    });
});
