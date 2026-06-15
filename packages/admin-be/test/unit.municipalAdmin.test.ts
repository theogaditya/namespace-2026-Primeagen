import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import request from 'supertest';

// Set JWT secret before any imports
process.env.JWT_SECRET = 'test-jwt-secret';

// Create hoisted mocks
const { mockPrisma, mockGetBadgeService } = vi.hoisted(() => ({
  mockPrisma: {
    departmentMunicipalAdmin: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    departmentStateAdmin: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    agent: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    complaint: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn(),
  },
  mockGetBadgeService: vi.fn(),
}));

// Mock badge service
vi.mock('../lib/badges/badgeService', () => ({
  getBadgeService: mockGetBadgeService,
}));

// Mock unifiedAuth middleware
vi.mock('../middleware/unifiedAuth', () => ({
  authenticateMunicipalAdminOnly: (req: any, res: any, next: any) => {
    const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      req.admin = decoded;
      next();
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }
  },
}));

import municipalAdminRoutes from '../routes/municipalAdminRoutes';

describe('Municipal Admin Routes', () => {
  let app: express.Application;
  let validToken: string;
  const testAdminId = 'mun-admin-123';

  beforeEach(async () => {
    vi.clearAllMocks();

    app = express();
    app.use(express.json());
    app.use('/municipal-admin', municipalAdminRoutes(mockPrisma as any));

    validToken = jwt.sign(
      {
        id: testAdminId,
        email: 'municipal@admin.com',
        accessLevel: 'DEPT_MUNICIPAL_ADMIN',
      },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    mockGetBadgeService.mockReturnValue({
      checkBadgesAfterResolution: vi.fn().mockResolvedValue([]),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /municipal-admin/login', () => {
    const validCredentials = {
      officialEmail: 'municipal@admin.com',
      password: 'password123',
    };

    it('should login successfully with valid credentials', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);

      const mockAdmin = {
        id: testAdminId,
        officialEmail: 'municipal@admin.com',
        password: hashedPassword,
        accessLevel: 'DEPT_MUNICIPAL_ADMIN',
        status: 'ACTIVE',
      };

      mockPrisma.departmentMunicipalAdmin.findUnique.mockResolvedValue(mockAdmin);

      const response = await request(app)
        .post('/municipal-admin/login')
        .send(validCredentials);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.admin).toBeDefined();
    });

    it('should return 404 for non-existent admin', async () => {
      mockPrisma.departmentMunicipalAdmin.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/municipal-admin/login')
        .send(validCredentials);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Admin not found');
    });

    it('should return 403 for inactive admin', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);

      mockPrisma.departmentMunicipalAdmin.findUnique.mockResolvedValue({
        id: testAdminId,
        password: hashedPassword,
        status: 'INACTIVE',
      });

      const response = await request(app)
        .post('/municipal-admin/login')
        .send(validCredentials);

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('inactive');
    });

    it('should return 401 for wrong password', async () => {
      const hashedPassword = await bcrypt.hash('differentpassword', 10);

      mockPrisma.departmentMunicipalAdmin.findUnique.mockResolvedValue({
        id: testAdminId,
        password: hashedPassword,
        status: 'ACTIVE',
      });

      const response = await request(app)
        .post('/municipal-admin/login')
        .send(validCredentials);

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid credentials');
    });
  });

  describe('POST /municipal-admin/create/agent', () => {
    const validAgentData = {
      email: 'agent@test.com',
      fullName: 'Test Agent',
      password: 'password123',
      phoneNumber: '9876543210',
      officialEmail: 'agent.official@gov.in',
      department: 'WATER_SUPPLY_SANITATION',
      municipality: 'Test City',
    };

    it('should create agent successfully', async () => {
      mockPrisma.agent.findFirst.mockResolvedValue(null);
      mockPrisma.agent.create.mockResolvedValue({
        id: 'agent-123',
        email: validAgentData.email,
        fullName: validAgentData.fullName,
        employeeId: 'EMP001',
        phoneNumber: validAgentData.phoneNumber,
        officialEmail: validAgentData.officialEmail,
        department: validAgentData.department,
        municipality: validAgentData.municipality,
        accessLevel: 'AGENT',
        status: 'ACTIVE',
        workloadLimit: 10,
        currentWorkload: 0,
        availabilityStatus: 'At Work',
        dateOfCreation: new Date(),
        managedByMunicipal: null,
      });

      const response = await request(app)
        .post('/municipal-admin/create/agent')
        .set('Authorization', `Bearer ${validToken}`)
        .send(validAgentData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Agent created successfully');
    });

    it('should return 409 when agent already exists', async () => {
      mockPrisma.agent.findFirst.mockResolvedValue({
        id: 'existing-agent',
        email: validAgentData.email,
      });

      const response = await request(app)
        .post('/municipal-admin/create/agent')
        .set('Authorization', `Bearer ${validToken}`)
        .send(validAgentData);

      expect(response.status).toBe(409);
    });

    it('should return 400 for invalid input', async () => {
      const response = await request(app)
        .post('/municipal-admin/create/agent')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ email: 'not-an-email' }); // Invalid data

      expect(response.status).toBe(400);
    });

    it('should return 401 without token', async () => {
      const response = await request(app)
        .post('/municipal-admin/create/agent')
        .send(validAgentData);

      expect(response.status).toBe(401);
    });
  });

  describe('GET /municipal-admin/my-complaints', () => {
    it('should return paginated complaints for the admin', async () => {
      const mockComplaints = [
        {
          id: 'complaint-1',
          title: 'Water Issue',
          status: 'UNDER_PROCESSING',
          category: { id: 'cat-1', name: 'Water' },
          User: { id: 'user-1', name: 'John' },
          location: { district: 'Test City' },
          assignedAgent: null,
          managedByMunicipalAdmin: { id: testAdminId, fullName: 'Admin' },
          submissionDate: new Date(),
        },
      ];

      mockPrisma.complaint.findMany.mockResolvedValue(mockComplaints);
      mockPrisma.complaint.count.mockResolvedValue(1);

      const response = await request(app)
        .get('/municipal-admin/my-complaints')
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
        .get('/municipal-admin/my-complaints?page=2&limit=10')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.pagination.page).toBe(2);
      expect(response.body.pagination.limit).toBe(10);
    });
  });

  describe('GET /municipal-admin/complaints', () => {
    it('should return all complaints', async () => {
      const mockComplaints = [
        {
          id: 'complaint-1',
          title: 'Water Issue',
          category: { id: 'cat-1' },
          User: { id: 'user-1' },
          submissionDate: new Date(),
        },
      ];

      mockPrisma.complaint.findMany.mockResolvedValue(mockComplaints);

      const response = await request(app).get('/municipal-admin/complaints');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.complaints).toHaveLength(1);
    });
  });

  describe('PUT /municipal-admin/complaints/:id/status', () => {
    it('should update complaint status successfully', async () => {
      const mockComplaint = {
        id: 'complaint-1',
        status: 'UNDER_PROCESSING',
        assignedAgentId: null,
      };

      const updatedComplaint = {
        ...mockComplaint,
        status: 'COMPLETED',
        User: null,
        category: null,
        location: null,
        upvotes: [],
        assignedAgent: null,
      };

      mockPrisma.complaint.findUnique.mockResolvedValue(mockComplaint);
      mockPrisma.complaint.update.mockResolvedValue(updatedComplaint);

      const response = await request(app)
        .put('/municipal-admin/complaints/complaint-1/status')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ status: 'COMPLETED' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Complaint status updated successfully');
    });

    it('should return 400 for invalid status', async () => {
      const response = await request(app)
        .put('/municipal-admin/complaints/complaint-1/status')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ status: 'INVALID_STATUS' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid status');
    });

    it('should return 404 for non-existent complaint', async () => {
      mockPrisma.complaint.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .put('/municipal-admin/complaints/non-existent/status')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ status: 'COMPLETED' });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Complaint not found');
    });

    it('should decrement agent workload when completing complaint', async () => {
      const mockComplaint = {
        id: 'complaint-1',
        status: 'UNDER_PROCESSING',
        assignedAgentId: 'agent-123',
        complainantId: 'user-1',
      };

      const updatedComplaint = {
        ...mockComplaint,
        status: 'COMPLETED',
        User: null,
        category: null,
        location: null,
        upvotes: [],
        assignedAgent: { id: 'agent-123' },
      };

      mockPrisma.complaint.findUnique.mockResolvedValue(mockComplaint);
      mockPrisma.complaint.update.mockResolvedValue(updatedComplaint);
      mockPrisma.agent.update.mockResolvedValue({});

      const response = await request(app)
        .put('/municipal-admin/complaints/complaint-1/status')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ status: 'COMPLETED' });

      expect(response.status).toBe(200);
      expect(mockPrisma.agent.update).toHaveBeenCalledWith({
        where: { id: 'agent-123' },
        data: { currentWorkload: { decrement: 1 } },
      });
    });
  });

  describe('PUT /municipal-admin/complaints/:id/escalate', () => {
    it('should escalate complaint to state admin', async () => {
      const mockComplaint = {
        id: 'complaint-1',
        managedByMunicipalAdminId: testAdminId,
        managedByMunicipalAdmin: { id: testAdminId },
      };

      const mockMuniAdmin = {
        id: testAdminId,
        managedByStateAdminId: 'state-admin-1',
        municipality: 'Test City',
      };

      const mockStateAdmin = {
        id: 'state-admin-1',
      };

      mockPrisma.complaint.findUnique.mockResolvedValue(mockComplaint);
      mockPrisma.departmentMunicipalAdmin.findUnique.mockResolvedValue(mockMuniAdmin);
      mockPrisma.$transaction.mockResolvedValue([
        {
          ...mockComplaint,
          status: 'ESCALATED_TO_STATE_LEVEL',
          User: null,
          category: null,
          location: null,
        },
        {},
        {},
      ]);

      const response = await request(app)
        .put('/municipal-admin/complaints/complaint-1/escalate')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 404 for non-existent complaint', async () => {
      mockPrisma.complaint.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .put('/municipal-admin/complaints/non-existent/escalate')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Complaint not found');
    });

    it('should return 403 when not authorized to escalate', async () => {
      mockPrisma.complaint.findUnique.mockResolvedValue({
        id: 'complaint-1',
        managedByMunicipalAdminId: 'different-admin',
        managedByMunicipalAdmin: { id: 'different-admin' },
      });

      const response = await request(app)
        .put('/municipal-admin/complaints/complaint-1/escalate')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(403);
    });

    it('should find any state admin if linked one not configured', async () => {
      const mockComplaint = {
        id: 'complaint-1',
        managedByMunicipalAdminId: testAdminId,
        managedByMunicipalAdmin: { id: testAdminId },
      };

      mockPrisma.complaint.findUnique.mockResolvedValue(mockComplaint);
      mockPrisma.departmentMunicipalAdmin.findUnique.mockResolvedValue({
        id: testAdminId,
        managedByStateAdminId: null, // No linked state admin
        municipality: 'Test City',
      });
      mockPrisma.departmentStateAdmin.findFirst.mockResolvedValue({
        id: 'found-state-admin',
      });
      mockPrisma.$transaction.mockResolvedValue([
        { ...mockComplaint, User: null, category: null, location: null },
        {},
        {},
      ]);

      const response = await request(app)
        .put('/municipal-admin/complaints/complaint-1/escalate')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
    });

    it('should return 404 when no state admin available', async () => {
      const mockComplaint = {
        id: 'complaint-1',
        managedByMunicipalAdminId: testAdminId,
        managedByMunicipalAdmin: { id: testAdminId },
      };

      mockPrisma.complaint.findUnique.mockResolvedValue(mockComplaint);
      mockPrisma.departmentMunicipalAdmin.findUnique.mockResolvedValue({
        id: testAdminId,
        managedByStateAdminId: null,
        municipality: 'Test City',
      });
      mockPrisma.departmentStateAdmin.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .put('/municipal-admin/complaints/complaint-1/escalate')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('No available state admin');
    });
  });
});
