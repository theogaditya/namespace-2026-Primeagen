import { vi, describe, it, beforeEach, afterEach, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import bcrypt from 'bcrypt';

// Mock Prisma
const mockSuperAdminFindUnique = vi.fn();
const mockStateAdminFindUnique = vi.fn();
const mockMunicipalAdminFindUnique = vi.fn();
const mockAgentFindFirst = vi.fn();
const mockSuperAdminUpdate = vi.fn();
const mockStateAdminUpdate = vi.fn();
const mockMunicipalAdminUpdate = vi.fn();
const mockAgentUpdate = vi.fn();

const prismaMock: any = {
  superAdmin: {
    findUnique: mockSuperAdminFindUnique,
    update: mockSuperAdminUpdate,
  },
  departmentStateAdmin: {
    findUnique: mockStateAdminFindUnique,
    update: mockStateAdminUpdate,
  },
  departmentMunicipalAdmin: {
    findUnique: mockMunicipalAdminFindUnique,
    update: mockMunicipalAdminUpdate,
  },
  agent: {
    findFirst: mockAgentFindFirst,
    update: mockAgentUpdate,
  },
};

// Mock environment
vi.stubEnv('JWT_SECRET', 'test-jwt-secret-123');

import authRouter from '../routes/auth';

describe('Auth Routes - Unified Login', () => {
  let app: express.Express;

  const mockSuperAdmin = {
    id: 'super-admin-123',
    officialEmail: 'super@admin.com',
    password: '$2b$10$hashedpassword', // bcrypt hash
    accessLevel: 'SUPER_ADMIN',
    fullName: 'Super Admin',
    status: 'ACTIVE',
    lastLogin: null,
  };

  const mockStateAdmin = {
    id: 'state-admin-123',
    officialEmail: 'state@admin.com',
    password: '$2b$10$hashedpassword',
    accessLevel: 'DEPT_STATE_ADMIN',
    fullName: 'State Admin',
    status: 'ACTIVE',
    lastLogin: null,
  };

  const mockMunicipalAdmin = {
    id: 'municipal-admin-123',
    officialEmail: 'municipal@admin.com',
    password: '$2b$10$hashedpassword',
    accessLevel: 'DEPT_MUNICIPAL_ADMIN',
    fullName: 'Municipal Admin',
    status: 'ACTIVE',
    lastLogin: null,
  };

  const mockAgent = {
    id: 'agent-123',
    officialEmail: 'agent@admin.com',
    password: '$2b$10$hashedpassword',
    accessLevel: 'AGENT',
    fullName: 'Test Agent',
    department: 'WATER_SUPPLY_SANITATION',
    status: 'ACTIVE',
    lastLogin: null,
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRouter(prismaMock));

    // Hash a password for comparison
    const hashedPassword = await bcrypt.hash('password123', 10);
    mockSuperAdmin.password = hashedPassword;
    mockStateAdmin.password = hashedPassword;
    mockMunicipalAdmin.password = hashedPassword;
    mockAgent.password = hashedPassword;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/auth/login', () => {
    it('should return 400 for invalid input (missing fields)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ officialEmail: 'test@test.com' }); // missing password and adminType

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid input');
    });

    it('should return 400 for invalid admin type', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          officialEmail: 'test@test.com',
          password: 'password123',
          adminType: 'INVALID_TYPE',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    // SUPER_ADMIN login tests
    describe('SUPER_ADMIN login', () => {
      it('should login successfully as SUPER_ADMIN', async () => {
        mockSuperAdminFindUnique.mockResolvedValue(mockSuperAdmin);
        mockSuperAdminUpdate.mockResolvedValue(mockSuperAdmin);

        const res = await request(app)
          .post('/api/auth/login')
          .send({
            officialEmail: 'super@admin.com',
            password: 'password123',
            adminType: 'SUPER_ADMIN',
          });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.token).toBeDefined();
        expect(res.body.admin).toBeDefined();
        expect(res.body.admin.password).toBeUndefined(); // password should not be returned
      });

      it('should return 401 for non-existent SUPER_ADMIN', async () => {
        mockSuperAdminFindUnique.mockResolvedValue(null);

        const res = await request(app)
          .post('/api/auth/login')
          .send({
            officialEmail: 'nonexistent@admin.com',
            password: 'password123',
            adminType: 'SUPER_ADMIN',
          });

        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe('Invalid credentials');
      });

      it('should return 401 for wrong password', async () => {
        mockSuperAdminFindUnique.mockResolvedValue(mockSuperAdmin);

        const res = await request(app)
          .post('/api/auth/login')
          .send({
            officialEmail: 'super@admin.com',
            password: 'wrongpassword',
            adminType: 'SUPER_ADMIN',
          });

        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe('Invalid credentials');
      });
    });

    // STATE_ADMIN login tests
    describe('STATE_ADMIN login', () => {
      it('should login successfully as STATE_ADMIN', async () => {
        mockStateAdminFindUnique.mockResolvedValue(mockStateAdmin);
        mockStateAdminUpdate.mockResolvedValue(mockStateAdmin);

        const res = await request(app)
          .post('/api/auth/login')
          .send({
            officialEmail: 'state@admin.com',
            password: 'password123',
            adminType: 'STATE_ADMIN',
          });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.token).toBeDefined();
      });

      it('should return 403 for inactive STATE_ADMIN', async () => {
        mockStateAdminFindUnique.mockResolvedValue({
          ...mockStateAdmin,
          status: 'INACTIVE',
        });

        const res = await request(app)
          .post('/api/auth/login')
          .send({
            officialEmail: 'state@admin.com',
            password: 'password123',
            adminType: 'STATE_ADMIN',
          });

        expect(res.status).toBe(403);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toContain('inactive');
      });
    });

    // MUNICIPAL_ADMIN login tests
    describe('MUNICIPAL_ADMIN login', () => {
      it('should login successfully as MUNICIPAL_ADMIN', async () => {
        mockMunicipalAdminFindUnique.mockResolvedValue(mockMunicipalAdmin);
        mockMunicipalAdminUpdate.mockResolvedValue(mockMunicipalAdmin);

        const res = await request(app)
          .post('/api/auth/login')
          .send({
            officialEmail: 'municipal@admin.com',
            password: 'password123',
            adminType: 'MUNICIPAL_ADMIN',
          });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.token).toBeDefined();
      });

      it('should return 403 for inactive MUNICIPAL_ADMIN', async () => {
        mockMunicipalAdminFindUnique.mockResolvedValue({
          ...mockMunicipalAdmin,
          status: 'INACTIVE',
        });

        const res = await request(app)
          .post('/api/auth/login')
          .send({
            officialEmail: 'municipal@admin.com',
            password: 'password123',
            adminType: 'MUNICIPAL_ADMIN',
          });

        expect(res.status).toBe(403);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toContain('inactive');
      });
    });

    // AGENT login tests
    describe('AGENT login', () => {
      it('should login successfully as AGENT', async () => {
        mockAgentFindFirst.mockResolvedValue(mockAgent);
        mockAgentUpdate.mockResolvedValue(mockAgent);

        const res = await request(app)
          .post('/api/auth/login')
          .send({
            officialEmail: 'agent@admin.com',
            password: 'password123',
            adminType: 'AGENT',
          });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.token).toBeDefined();
      });

      it('should return 403 for inactive AGENT', async () => {
        mockAgentFindFirst.mockResolvedValue({
          ...mockAgent,
          status: 'INACTIVE',
        });

        const res = await request(app)
          .post('/api/auth/login')
          .send({
            officialEmail: 'agent@admin.com',
            password: 'password123',
            adminType: 'AGENT',
          });

        expect(res.status).toBe(403);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toContain('inactive');
      });
    });

    // Error handling tests
    describe('Error handling', () => {
      it('should return 500 on database error', async () => {
        mockSuperAdminFindUnique.mockRejectedValue(new Error('Database error'));

        const res = await request(app)
          .post('/api/auth/login')
          .send({
            officialEmail: 'super@admin.com',
            password: 'password123',
            adminType: 'SUPER_ADMIN',
          });

        expect(res.status).toBe(500);
        expect(res.body.success).toBe(false);
      });

      it('should return 500 when JWT_SECRET is missing', async () => {
        vi.stubEnv('JWT_SECRET', '');
        mockSuperAdminFindUnique.mockResolvedValue(mockSuperAdmin);

        const res = await request(app)
          .post('/api/auth/login')
          .send({
            officialEmail: 'super@admin.com',
            password: 'password123',
            adminType: 'SUPER_ADMIN',
          });

        // Reset for other tests
        vi.stubEnv('JWT_SECRET', 'test-jwt-secret-123');

        expect(res.status).toBe(500);
      });
    });
  });
});
