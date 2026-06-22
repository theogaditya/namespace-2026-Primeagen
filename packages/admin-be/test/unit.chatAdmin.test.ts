import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.stubEnv('JWT_SECRET', 'test-jwt-secret-123');

// Mock Prisma
const mockChatCreate = vi.fn();
const mockChatFindMany = vi.fn();
const mockChatCount = vi.fn();
const mockChatFindUnique = vi.fn();
const mockChatDelete = vi.fn();
const mockChatFindFirst = vi.fn();
const mockComplaintFindFirst = vi.fn();

const prismaMock: any = {
    chat: {
        create: mockChatCreate,
        findMany: mockChatFindMany,
        count: mockChatCount,
        findUnique: mockChatFindUnique,
        delete: mockChatDelete,
        findFirst: mockChatFindFirst,
    },
    complaint: {
        findFirst: mockComplaintFindFirst,
    },
};

// Mock unifiedAuth middleware
vi.mock('../middleware/unifiedAuth', () => ({
    authenticateAdmin: (req: any, _res: any, next: any) => {
        req.admin = req.headers['x-test-admin']
            ? JSON.parse(req.headers['x-test-admin'] as string)
            : { id: 'agent-1', adminType: 'AGENT' };
        next();
    },
}));

import chatRoutes from '../routes/chat';

describe('Chat Routes', () => {
    let app: express.Application;

    const agentAdmin = JSON.stringify({ id: 'agent-1', adminType: 'AGENT' });
    const superAdmin = JSON.stringify({ id: 'super-1', adminType: 'SUPER_ADMIN' });

    const mockChat = {
        id: 'chat-1',
        message: 'Hello from agent',
        complaintId: 'complaint-1',
        userId: null,
        agentId: 'agent-1',
        senderType: 'AGENT',
        imageUrl: null,
        createdAt: new Date('2024-01-15'),
        user: null,
        agent: { id: 'agent-1', fullName: 'Test Agent', email: 'agent@test.com' },
    };

    beforeEach(() => {
        vi.clearAllMocks();
        app = express();
        app.use(express.json());
        app.use('/chat', chatRoutes(prismaMock));
        vi.spyOn(console, 'error').mockImplementation(() => { });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('GET /chat/:complaintId', () => {
        it('returns chats for a complaint (super admin, no access check)', async () => {
            mockChatFindMany.mockResolvedValue([mockChat]);
            mockChatCount.mockResolvedValue(1);

            const res = await request(app)
                .get('/chat/complaint-1')
                .set('x-test-admin', superAdmin);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveLength(1);
            expect(res.body.pagination).toBeDefined();
        });

        it('returns 403 when agent has no access to complaint', async () => {
            mockComplaintFindFirst.mockResolvedValue(null); // agent not assigned

            const res = await request(app)
                .get('/chat/complaint-1')
                .set('x-test-admin', agentAdmin);

            expect(res.status).toBe(403);
        });

        it('returns 500 on database error', async () => {
            mockChatFindMany.mockRejectedValue(new Error('DB error'));

            const res = await request(app)
                .get('/chat/complaint-1')
                .set('x-test-admin', superAdmin);

            expect(res.status).toBe(500);
        });
    });

    describe('POST /chat/:complaintId', () => {
        it('creates a chat message successfully', async () => {
            mockComplaintFindFirst.mockResolvedValue({ id: 'complaint-1' }); // agent access check
            mockChatCreate.mockResolvedValue(mockChat);

            const res = await request(app)
                .post('/chat/complaint-1')
                .set('x-test-admin', agentAdmin)
                .send({ message: 'Hello from agent' });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.message).toBe('Hello from agent');
        });

        it('returns 400 when message is missing', async () => {
            const res = await request(app)
                .post('/chat/complaint-1')
                .set('x-test-admin', agentAdmin)
                .send({});

            expect(res.status).toBe(400);
        });

        it('returns 403 when agent not assigned to complaint', async () => {
            mockComplaintFindFirst.mockResolvedValue(null);

            const res = await request(app)
                .post('/chat/complaint-1')
                .set('x-test-admin', agentAdmin)
                .send({ message: 'Hello' });

            expect(res.status).toBe(403);
        });
    });

    describe('GET /chat/:complaintId/count', () => {
        it('returns chat count', async () => {
            mockChatCount.mockResolvedValue(5);

            const res = await request(app)
                .get('/chat/complaint-1/count')
                .set('x-test-admin', superAdmin);

            expect(res.status).toBe(200);
            expect(res.body.data.count).toBe(5);
        });
    });

    describe('DELETE /chat/message/:messageId', () => {
        it('deletes own message successfully', async () => {
            mockChatFindUnique.mockResolvedValue(mockChat); // agent's own message
            mockChatDelete.mockResolvedValue(mockChat);

            const res = await request(app)
                .delete('/chat/message/chat-1')
                .set('x-test-admin', agentAdmin);

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Message deleted successfully');
        });

        it('returns 404 when message not found', async () => {
            mockChatFindUnique.mockResolvedValue(null);

            const res = await request(app)
                .delete('/chat/message/non-existent')
                .set('x-test-admin', agentAdmin);

            expect(res.status).toBe(404);
        });

        it('returns 403 when trying to delete another agent\'s message', async () => {
            mockChatFindUnique.mockResolvedValue({ ...mockChat, agentId: 'other-agent' });

            const res = await request(app)
                .delete('/chat/message/chat-1')
                .set('x-test-admin', agentAdmin);

            expect(res.status).toBe(403);
        });
    });
});
