import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import request from 'supertest';

// Set JWT secret before any imports that might use it
process.env.JWT_SECRET = 'test-jwt-secret';

// Create hoisted mocks
const { mockPrisma, mockGetProcessedQueueLength, mockPeekProcessedQueue, mockGetBadgeService } = vi.hoisted(() => ({
  mockPrisma: {
    agent: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    complaint: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    departmentMunicipalAdmin: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
  mockGetProcessedQueueLength: vi.fn(),
  mockPeekProcessedQueue: vi.fn(),
  mockGetBadgeService: vi.fn(),
}));

// Mock Redis assign queue
vi.mock('../lib/redis/assignQueue', () => ({
  getProcessedQueueLength: mockGetProcessedQueueLength,
  peekProcessedQueue: mockPeekProcessedQueue,
}));

// Mock badge service
vi.mock('../lib/badges/badgeService', () => ({
  getBadgeService: mockGetBadgeService,
}));

// Mock unifiedAuth middleware
vi.mock('../middleware/unifiedAuth', () => ({
  authenticateAgentOnly: (req: any, res: any, next: any) => {
    // Check for token
    const token = req.cookies?.agentToken || req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      req.admin = decoded;
      next();
    } catch (err) {
      return res.status(401).json({ message: 'Invalid token' });
    }
  },
}));

import agentRoutes from '../routes/agent';

describe('Agent Routes', () => {
  let app: express.Application;
  let validToken: string;
  let expiredToken: string;
  const testAgentId = 'agent-123';

  beforeEach(async () => {
    vi.clearAllMocks();
    
    app = express();
    app.use(express.json());
    app.use('/agent', agentRoutes(mockPrisma as any));

    // Create a valid JWT token for testing
    validToken = jwt.sign(
      {
        id: testAgentId,
        officialEmail: 'agent@test.com',
        accessLevel: 'AGENT',
        department: 'WATER_SUPPLY_SANITATION',
        type: 'AGENT',
      },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );

    // Create an expired token
    expiredToken = jwt.sign(
      { id: testAgentId, type: 'AGENT' },
      process.env.JWT_SECRET!,
      { expiresIn: '-1h' }
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /agent/login', () => {
    const validCredentials = {
      officialEmail: 'agent@test.com',
      password: 'password123',
    };

    it('should login successfully with valid credentials', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      
      const mockAgent = {
        id: testAgentId,
        email: 'agent@test.com',
        fullName: 'Test Agent',
        employeeId: 'EMP001',
        password: hashedPassword,
        phoneNumber: '9876543210',
        officialEmail: 'agent@test.com',
        department: 'WATER_SUPPLY_SANITATION',
        municipality: 'Test City',
        accessLevel: 'AGENT',
        status: 'ACTIVE',
        workloadLimit: 10,
        currentWorkload: 5,
        availabilityStatus: 'AVAILABLE',
        dateOfCreation: new Date(),
        lastLogin: null,
      };

      mockPrisma.agent.findFirst.mockResolvedValue(mockAgent);
      mockPrisma.agent.update.mockResolvedValue({ ...mockAgent, lastLogin: new Date() });

      const response = await request(app)
        .post('/agent/login')
        .send(validCredentials);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.agent).toBeDefined();
      expect(response.body.agent.password).toBeUndefined();
      expect(response.body.token).toBeDefined();
    });

    it('should return 401 for invalid credentials - wrong password', async () => {
      const hashedPassword = await bcrypt.hash('differentpassword', 10);
      
      mockPrisma.agent.findFirst.mockResolvedValue({
        id: testAgentId,
        password: hashedPassword,
        status: 'ACTIVE',
      });

      const response = await request(app)
        .post('/agent/login')
        .send(validCredentials);

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should return 401 for non-existent agent', async () => {
      mockPrisma.agent.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .post('/agent/login')
        .send(validCredentials);

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should return 403 for inactive agent', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      
      mockPrisma.agent.findFirst.mockResolvedValue({
        id: testAgentId,
        password: hashedPassword,
        status: 'INACTIVE',
      });

      const response = await request(app)
        .post('/agent/login')
        .send(validCredentials);

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('inactive');
    });

    it('should return 400 for invalid input - missing email', async () => {
      const response = await request(app)
        .post('/agent/login')
        .send({ password: 'password123' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid input');
    });

    it('should return 400 for invalid input - invalid email format', async () => {
      const response = await request(app)
        .post('/agent/login')
        .send({ officialEmail: 'not-an-email', password: 'password123' });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /agent/me', () => {
    it('should return agent profile with valid token', async () => {
      const mockAgent = {
        id: testAgentId,
        email: 'agent@test.com',
        fullName: 'Test Agent',
        employeeId: 'EMP001',
        phoneNumber: '9876543210',
        officialEmail: 'agent@test.com',
        department: 'WATER_SUPPLY_SANITATION',
        municipality: 'Test City',
        accessLevel: 'AGENT',
        status: 'ACTIVE',
        workloadLimit: 10,
        currentWorkload: 5,
        availabilityStatus: 'AVAILABLE',
        dateOfCreation: new Date(),
        lastLogin: new Date(),
        resolutionRate: 0.85,
        avgResolutionTime: 2.5,
        collaborationMetric: 0.9,
      };

      mockPrisma.agent.findUnique.mockResolvedValue(mockAgent);

      const response = await request(app)
        .get('/agent/me')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.agent).toBeDefined();
      expect(response.body.agent.id).toBe(testAgentId);
    });

    it('should return 401 when no token provided', async () => {
      const response = await request(app).get('/agent/me');

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('No token provided');
    });

    it('should return 401 for invalid token', async () => {
      const response = await request(app)
        .get('/agent/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });

    it('should return 404 when agent not found', async () => {
      mockPrisma.agent.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/agent/me')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Agent not found');
    });
  });

  describe('GET /agent/my-complaints', () => {
    it('should return paginated complaints for the agent', async () => {
      const mockComplaints = [
        {
          id: 'complaint-1',
          title: 'Water Issue',
          status: 'UNDER_PROCESSING',
          category: { id: 'cat-1', name: 'Water' },
          User: { id: 'user-1', name: 'John' },
          location: { district: 'Test City' },
          assignedAgent: { id: testAgentId, fullName: 'Test Agent' },
          managedByMunicipalAdmin: null,
          submissionDate: new Date(),
        },
      ];

      mockPrisma.complaint.findMany.mockResolvedValue(mockComplaints);
      mockPrisma.complaint.count.mockResolvedValue(1);

      const response = await request(app)
        .get('/agent/my-complaints')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.complaints).toHaveLength(1);
      expect(response.body.complaints[0].complainant).toBeDefined();
      expect(response.body.pagination).toBeDefined();
    });

    it('should handle pagination parameters', async () => {
      mockPrisma.complaint.findMany.mockResolvedValue([]);
      mockPrisma.complaint.count.mockResolvedValue(0);

      const response = await request(app)
        .get('/agent/my-complaints?page=2&limit=10')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.pagination.page).toBe(2);
      expect(response.body.pagination.limit).toBe(10);
    });
  });

  describe('GET /agent/complaints/:id', () => {
    it('should return complaint details', async () => {
      const mockComplaint = {
        id: 'complaint-1',
        title: 'Water Issue',
        User: { id: 'user-1', name: 'John' },
        category: { id: 'cat-1', name: 'Water' },
        location: { district: 'Test City' },
        upvotes: [],
      };

      mockPrisma.complaint.findUnique.mockResolvedValue(mockComplaint);

      const response = await request(app)
        .get('/agent/complaints/complaint-1')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.complaint).toBeDefined();
      expect(response.body.complaint.complainant).toBeDefined();
    });

    it('should return 404 for non-existent complaint', async () => {
      mockPrisma.complaint.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/agent/complaints/non-existent')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Complaint not found');
    });
  });

  describe('PUT /agent/complaints/:id/status', () => {
    it('should update complaint status successfully', async () => {
      const mockComplaint = {
        id: 'complaint-1',
        assignedAgentId: testAgentId,
        status: 'UNDER_PROCESSING',
      };

      const updatedComplaint = {
        ...mockComplaint,
        status: 'COMPLETED',
        User: null,
        category: { id: 'cat-1' },
        location: null,
        upvotes: [],
        assignedAgent: { id: testAgentId },
      };

      mockPrisma.complaint.findUnique.mockResolvedValue(mockComplaint);
      mockPrisma.complaint.update.mockResolvedValue(updatedComplaint);
      mockPrisma.agent.update.mockResolvedValue({});
      mockGetBadgeService.mockReturnValue({
        checkBadgesAfterResolution: vi.fn().mockResolvedValue([]),
      });

      const response = await request(app)
        .put('/agent/complaints/complaint-1/status')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ status: 'COMPLETED' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 400 for invalid status', async () => {
      const response = await request(app)
        .put('/agent/complaints/complaint-1/status')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ status: 'INVALID_STATUS' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid status');
    });

    it('should return 404 for non-existent complaint', async () => {
      mockPrisma.complaint.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .put('/agent/complaints/non-existent/status')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ status: 'COMPLETED' });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Complaint not found');
    });

    it('should return 403 when agent is not assigned to complaint', async () => {
      mockPrisma.complaint.findUnique.mockResolvedValue({
        id: 'complaint-1',
        assignedAgentId: 'different-agent',
      });

      const response = await request(app)
        .put('/agent/complaints/complaint-1/status')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ status: 'COMPLETED' });

      expect(response.status).toBe(403);
    });

    it('should handle escalation request', async () => {
      const mockComplaint = {
        id: 'complaint-1',
        assignedAgentId: testAgentId,
        status: 'UNDER_PROCESSING',
      };

      const updatedComplaint = {
        ...mockComplaint,
        status: 'ESCALATED_TO_MUNICIPAL_LEVEL',
        User: null,
        category: null,
        location: null,
        upvotes: [],
        assignedAgent: { id: testAgentId },
      };

      mockPrisma.complaint.findUnique.mockResolvedValue(mockComplaint);
      mockPrisma.complaint.update.mockResolvedValue(updatedComplaint);

      const response = await request(app)
        .put('/agent/complaints/complaint-1/status')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ escalate: true });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('escalated');
    });
  });

  describe('PUT /agent/complaints/:id/escalate', () => {
    it('should escalate complaint to municipal admin', async () => {
      const mockComplaint = {
        id: 'complaint-1',
        assignedAgentId: testAgentId,
        location: { district: 'Test City' },
      };

      const mockMunicipalAdmin = {
        id: 'mun-admin-1',
        fullName: 'Municipal Admin',
        officialEmail: 'munadmin@test.com',
      };

      const updatedComplaint = {
        ...mockComplaint,
        status: 'ESCALATED_TO_MUNICIPAL_LEVEL',
        managedByMunicipalAdminId: mockMunicipalAdmin.id,
        User: null,
        category: null,
        assignedAgent: { id: testAgentId },
        managedByMunicipalAdmin: mockMunicipalAdmin,
      };

      mockPrisma.complaint.findUnique.mockResolvedValue(mockComplaint);
      mockPrisma.agent.findUnique.mockResolvedValue({ id: testAgentId, status: 'ACTIVE', fullName: 'Test Agent' });
      mockPrisma.departmentMunicipalAdmin.findFirst.mockResolvedValue(mockMunicipalAdmin);
      mockPrisma.$transaction.mockResolvedValue([updatedComplaint, {}, {}]);

      const response = await request(app)
        .put('/agent/complaints/complaint-1/escalate')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('escalated');
    });

    it('should return 404 for non-existent complaint', async () => {
      mockPrisma.complaint.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .put('/agent/complaints/non-existent/escalate')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Complaint not found');
    });

    it('should return 403 when agent is not assigned to complaint', async () => {
      mockPrisma.complaint.findUnique.mockResolvedValue({
        id: 'complaint-1',
        assignedAgentId: 'different-agent',
        location: { district: 'Test City' },
      });

      const response = await request(app)
        .put('/agent/complaints/complaint-1/escalate')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(403);
    });

    it('should return 400 when complaint has no district', async () => {
      mockPrisma.complaint.findUnique.mockResolvedValue({
        id: 'complaint-1',
        assignedAgentId: testAgentId,
        location: null,
      });
      mockPrisma.agent.findUnique.mockResolvedValue({ id: testAgentId, status: 'ACTIVE' });

      const response = await request(app)
        .put('/agent/complaints/complaint-1/escalate')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('no district');
    });

    it('should return 404 when no municipal admin found for district', async () => {
      mockPrisma.complaint.findUnique.mockResolvedValue({
        id: 'complaint-1',
        assignedAgentId: testAgentId,
        location: { district: 'Unknown City' },
      });
      mockPrisma.agent.findUnique.mockResolvedValue({ id: testAgentId, status: 'ACTIVE' });
      mockPrisma.departmentMunicipalAdmin.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .put('/agent/complaints/complaint-1/escalate')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('No municipal admin found');
    });
  });

  describe('POST /agent/complaints/:id/assign', () => {
    it('should assign complaint to agent', async () => {
      const mockAgent = {
        id: testAgentId,
        currentWorkload: 5,
        workloadLimit: 10,
        assignedComplaints: [],
      };

      const mockComplaint = {
        id: 'complaint-1',
        assignedAgentId: null,
      };

      mockPrisma.agent.findUnique.mockResolvedValue(mockAgent);
      mockPrisma.complaint.findUnique.mockResolvedValue(mockComplaint);
      mockPrisma.$transaction.mockResolvedValue([{}, {}]);

      const response = await request(app)
        .post('/agent/complaints/complaint-1/assign')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Complaint assigned successfully');
    });

    it('should return 404 when agent not found', async () => {
      mockPrisma.agent.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/agent/complaints/complaint-1/assign')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Agent not found');
    });

    it('should return 400 when workload limit reached', async () => {
      mockPrisma.agent.findUnique.mockResolvedValue({
        id: testAgentId,
        currentWorkload: 10,
        workloadLimit: 10,
      });

      const response = await request(app)
        .post('/agent/complaints/complaint-1/assign')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Workload limit reached');
    });

    it('should return 400 when complaint already assigned', async () => {
      mockPrisma.agent.findUnique.mockResolvedValue({
        id: testAgentId,
        currentWorkload: 5,
        workloadLimit: 10,
      });
      mockPrisma.complaint.findUnique.mockResolvedValue({
        id: 'complaint-1',
        assignedAgentId: 'other-agent',
      });

      const response = await request(app)
        .post('/agent/complaints/complaint-1/assign')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Complaint already assigned');
    });
  });

  describe('GET /agent/me/complaints', () => {
    it('should return complaints assigned to agent', async () => {
      const mockComplaints = [
        { id: 'complaint-1', title: 'Issue 1' },
        { id: 'complaint-2', title: 'Issue 2' },
      ];

      mockPrisma.complaint.findMany.mockResolvedValue(mockComplaints);

      const response = await request(app)
        .get('/agent/me/complaints')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
    });
  });

  describe('PUT /agent/me/workload/dec', () => {
    it('should decrement agent workload', async () => {
      const mockAgent = {
        id: testAgentId,
        status: 'ACTIVE',
        currentWorkload: 5,
      };

      mockPrisma.agent.findUnique.mockResolvedValue(mockAgent);
      mockPrisma.agent.update.mockResolvedValue({ ...mockAgent, currentWorkload: 4 });

      const response = await request(app)
        .put('/agent/me/workload/dec')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
    });

    it('should return 400 when agent not active', async () => {
      mockPrisma.agent.findUnique.mockResolvedValue({
        id: testAgentId,
        status: 'INACTIVE',
      });

      const response = await request(app)
        .put('/agent/me/workload/dec')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(400);
    });

    it('should not decrement when workload is 0', async () => {
      const mockAgent = {
        id: testAgentId,
        status: 'ACTIVE',
        currentWorkload: 0,
      };

      mockPrisma.agent.findUnique.mockResolvedValue(mockAgent);

      const response = await request(app)
        .put('/agent/me/workload/dec')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      // Update should not be called when workload is 0
      expect(mockPrisma.agent.update).not.toHaveBeenCalled();
    });
  });
});
