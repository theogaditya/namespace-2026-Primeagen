import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import request from 'supertest';

// Set JWT secret before any imports
process.env.JWT_SECRET = 'test-jwt-secret';

// Create hoisted mocks
const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    superAdmin: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    departmentStateAdmin: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    departmentMunicipalAdmin: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    superMunicipalAdmin: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    superStateAdmin: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    agent: {
      findMany: vi.fn(),
    },
    complaint: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

// Mock unifiedAuth middleware
vi.mock('../middleware/unifiedAuth', () => ({
  authenticateSuperAdminOnly: (req: any, res: any, next: any) => {
    const token = req.cookies?.superAdminToken || req.headers.authorization?.replace('Bearer ', '');
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

import superAdminRoutes from '../routes/superAdminRoutes';

describe('Super Admin Routes', () => {
  let app: express.Application;
  let validToken: string;
  const testAdminId = 'super-admin-123';

  beforeEach(async () => {
    vi.clearAllMocks();

    app = express();
    app.use(express.json());
    app.use('/super-admin', superAdminRoutes(mockPrisma as any));

    validToken = jwt.sign(
      {
        id: testAdminId,
        email: 'super@admin.com',
        accessLevel: 'SUPER_ADMIN',
      },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /super-admin/login', () => {
    const validCredentials = {
      officialEmail: 'super@admin.com',
      password: 'password123',
    };

    it('should login successfully with valid credentials', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);

      const mockAdmin = {
        id: testAdminId,
        adminId: 'SA001',
        fullName: 'Super Admin',
        officialEmail: 'super@admin.com',
        password: hashedPassword,
        accessLevel: 'SUPER_ADMIN',
        status: 'ACTIVE',
        lastLogin: null,
      };

      mockPrisma.superAdmin.findUnique.mockResolvedValue(mockAdmin);
      mockPrisma.superAdmin.update.mockResolvedValue({ ...mockAdmin, lastLogin: new Date() });

      const response = await request(app)
        .post('/super-admin/login')
        .send(validCredentials);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.admin).toBeDefined();
      expect(response.body.admin.password).toBeUndefined();
    });

    it('should return 401 for invalid credentials', async () => {
      mockPrisma.superAdmin.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/super-admin/login')
        .send(validCredentials);

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should return 401 for wrong password', async () => {
      const hashedPassword = await bcrypt.hash('differentpassword', 10);

      mockPrisma.superAdmin.findUnique.mockResolvedValue({
        id: testAdminId,
        password: hashedPassword,
      });

      const response = await request(app)
        .post('/super-admin/login')
        .send(validCredentials);

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should return 400 for invalid input', async () => {
      const response = await request(app)
        .post('/super-admin/login')
        .send({ officialEmail: 'not-an-email', password: '' });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /super-admin/logout', () => {
    it('should logout successfully', async () => {
      const response = await request(app).post('/super-admin/logout');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Logged out successfully');
    });
  });

  describe('POST /super-admin/create', () => {
    const validData = {
      fullName: 'New Super Admin',
      officialEmail: 'new@admin.com',
      phoneNumber: '9876543210',
      password: 'password12345',
    };

    it('should create super admin successfully', async () => {
      mockPrisma.superAdmin.findFirst.mockResolvedValue(null);
      mockPrisma.superAdmin.create.mockResolvedValue({
        id: 'new-admin-id',
        adminId: 'SA002',
        fullName: validData.fullName,
        officialEmail: validData.officialEmail,
        accessLevel: 'SUPER_ADMIN',
        status: 'ACTIVE',
        dateOfCreation: new Date(),
      });

      const response = await request(app)
        .post('/super-admin/create')
        .send(validData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Super Admin created successfully');
    });

    it('should return 409 when admin already exists', async () => {
      mockPrisma.superAdmin.findFirst.mockResolvedValue({
        id: 'existing-id',
        officialEmail: validData.officialEmail,
      });

      const response = await request(app)
        .post('/super-admin/create')
        .send(validData);

      expect(response.status).toBe(409);
      expect(response.body.message).toContain('already exists');
    });

    it('should return 400 for invalid input', async () => {
      const response = await request(app)
        .post('/super-admin/create')
        .send({ fullName: 'A', password: '123' }); // Invalid data

      expect(response.status).toBe(400);
    });
  });

  describe('GET /super-admin/profile', () => {
    it('should return super admin profile', async () => {
      const mockProfile = {
        id: testAdminId,
        adminId: 'SA001',
        fullName: 'Super Admin',
        officialEmail: 'super@admin.com',
        phoneNumber: '9876543210',
        accessLevel: 'SUPER_ADMIN',
        status: 'ACTIVE',
        dateOfCreation: new Date(),
        lastUpdated: new Date(),
        lastLogin: new Date(),
      };

      mockPrisma.superAdmin.findUnique.mockResolvedValue(mockProfile);

      const response = await request(app)
        .get('/super-admin/profile')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.superAdmin).toBeDefined();
    });

    it('should return 401 without token', async () => {
      const response = await request(app).get('/super-admin/profile');

      expect(response.status).toBe(401);
    });

    it('should return 404 when admin not found', async () => {
      mockPrisma.superAdmin.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/super-admin/profile')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /super-admin/create/state-admins', () => {
    const validData = {
      fullName: 'State Admin',
      officialEmail: 'state@admin.com',
      phoneNumber: '9876543210',
      password: 'password12345',
      department: 'WATER_SUPPLY_SANITATION',
      state: 'Karnataka',
    };

    it('should create state admin successfully', async () => {
      mockPrisma.departmentStateAdmin.findFirst.mockResolvedValue(null);
      mockPrisma.departmentStateAdmin.create.mockResolvedValue({
        id: 'state-admin-id',
        adminId: 'DSA001',
        ...validData,
        password: undefined,
        accessLevel: 'DEPT_STATE_ADMIN',
        status: 'ACTIVE',
        dateOfCreation: new Date(),
      });

      const response = await request(app)
        .post('/super-admin/create/state-admins')
        .set('Authorization', `Bearer ${validToken}`)
        .send(validData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Department State Admin created successfully');
    });

    it('should return 409 when state admin already exists', async () => {
      mockPrisma.departmentStateAdmin.findFirst.mockResolvedValue({
        id: 'existing-id',
        officialEmail: validData.officialEmail,
      });

      const response = await request(app)
        .post('/super-admin/create/state-admins')
        .set('Authorization', `Bearer ${validToken}`)
        .send(validData);

      expect(response.status).toBe(409);
    });

    it('should return 401 without token', async () => {
      const response = await request(app)
        .post('/super-admin/create/state-admins')
        .send(validData);

      expect(response.status).toBe(401);
    });
  });

  describe('POST /super-admin/create/municipal-admins', () => {
    const validData = {
      fullName: 'Municipal Admin',
      officialEmail: 'municipal@admin.com',
      phoneNumber: '9876543210',
      password: 'password12345',
      department: 'Water Supply',
      municipality: 'Bangalore',
    };

    it('should create municipal admin successfully', async () => {
      mockPrisma.departmentMunicipalAdmin.findFirst.mockResolvedValue(null);
      mockPrisma.departmentMunicipalAdmin.create.mockResolvedValue({
        id: 'mun-admin-id',
        adminId: 'DMA001',
        ...validData,
        password: undefined,
        accessLevel: 'DEPT_MUNICIPAL_ADMIN',
        status: 'ACTIVE',
        workloadLimit: 50,
        currentWorkload: 0,
        dateOfCreation: new Date(),
      });

      const response = await request(app)
        .post('/super-admin/create/municipal-admins')
        .set('Authorization', `Bearer ${validToken}`)
        .send(validData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Department Municipal Admin created successfully');
    });

    it('should return 409 when municipal admin already exists', async () => {
      mockPrisma.departmentMunicipalAdmin.findFirst.mockResolvedValue({
        id: 'existing-id',
        officialEmail: validData.officialEmail,
      });

      const response = await request(app)
        .post('/super-admin/create/municipal-admins')
        .set('Authorization', `Bearer ${validToken}`)
        .send(validData);

      expect(response.status).toBe(409);
    });
  });

  describe('POST /super-admin/create/super-municipal-admins', () => {
    const validData = {
      fullName: 'Super Municipal Admin',
      officialEmail: 'supermun@admin.com',
      phoneNumber: '9876543210',
      password: 'password12345',
      municipality: 'Bangalore',
    };

    it('should create super municipal admin successfully', async () => {
      mockPrisma.superMunicipalAdmin.findFirst.mockResolvedValue(null);
      mockPrisma.superMunicipalAdmin.create.mockResolvedValue({
        id: 'super-mun-id',
        adminId: 'SMA001',
        ...validData,
        password: undefined,
        accessLevel: 'SUPER_MUNICIPAL_ADMIN',
        status: 'ACTIVE',
        dateOfCreation: new Date(),
      });

      const response = await request(app)
        .post('/super-admin/create/super-municipal-admins')
        .set('Authorization', `Bearer ${validToken}`)
        .send(validData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    it('should return 400 when missing required fields', async () => {
      const response = await request(app)
        .post('/super-admin/create/super-municipal-admins')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ fullName: 'Admin' }); // Missing fields

      expect(response.status).toBe(400);
    });

    it('should return 409 when admin already exists', async () => {
      mockPrisma.superMunicipalAdmin.findFirst.mockResolvedValue({
        id: 'existing-id',
      });

      const response = await request(app)
        .post('/super-admin/create/super-municipal-admins')
        .set('Authorization', `Bearer ${validToken}`)
        .send(validData);

      expect(response.status).toBe(409);
    });
  });

  describe('POST /super-admin/create/super-state-admins', () => {
    const validData = {
      fullName: 'Super State Admin',
      officialEmail: 'superstate@admin.com',
      phoneNumber: '9876543210',
      password: 'password12345',
      state: 'Karnataka',
    };

    it('should create super state admin successfully', async () => {
      mockPrisma.superStateAdmin.findFirst.mockResolvedValue(null);
      mockPrisma.superStateAdmin.create.mockResolvedValue({
        id: 'super-state-id',
        adminId: 'SSA001',
        ...validData,
        password: undefined,
        accessLevel: 'SUPER_STATE_ADMIN',
        status: 'ACTIVE',
        dateOfCreation: new Date(),
      });

      const response = await request(app)
        .post('/super-admin/create/super-state-admins')
        .set('Authorization', `Bearer ${validToken}`)
        .send(validData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    it('should return 400 when missing required fields', async () => {
      const response = await request(app)
        .post('/super-admin/create/super-state-admins')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ fullName: 'Admin' }); // Missing fields

      expect(response.status).toBe(400);
    });
  });
});
