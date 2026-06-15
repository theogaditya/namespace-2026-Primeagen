import { vi, describe, it, beforeEach, afterEach, expect } from 'vitest';
import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';

// Mock environment
vi.stubEnv('JWT_SECRET', 'test-jwt-secret-123');

import {
  authenticateAdmin,
  authenticateSuperAdminOnly,
  authenticateStateAdminOnly,
  authenticateMunicipalAdminOnly,
  authenticateAgentOnly,
  requireAdminType,
  type AuthenticatedRequest,
} from '../middleware/unifiedAuth';

describe('Unified Auth Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    jsonMock = vi.fn().mockReturnThis();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });

    mockReq = {
      headers: {},
      cookies: {},
    };

    mockRes = {
      status: statusMock as any,
      json: jsonMock as any,
    };

    mockNext = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('authenticateAdmin', () => {
    it('should return 401 when no token is provided', () => {
      authenticateAdmin(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'No token provided',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should authenticate with Bearer token from Authorization header', () => {
      const token = jwt.sign(
        { id: 'user-123', email: 'test@test.com', adminType: 'SUPER_ADMIN' },
        'test-jwt-secret-123'
      );
      mockReq.headers = { authorization: `Bearer ${token}` };

      authenticateAdmin(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect((mockReq as AuthenticatedRequest).admin).toBeDefined();
      expect((mockReq as AuthenticatedRequest).admin.id).toBe('user-123');
    });

    it('should authenticate with token from cookies', () => {
      const token = jwt.sign(
        { id: 'user-123', email: 'test@test.com', adminType: 'STATE_ADMIN' },
        'test-jwt-secret-123'
      );
      mockReq.cookies = { token };

      authenticateAdmin(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect((mockReq as AuthenticatedRequest).admin.adminType).toBe('STATE_ADMIN');
    });

    it('should authenticate with superAdminToken cookie', () => {
      const token = jwt.sign(
        { id: 'user-123', email: 'test@test.com', adminType: 'SUPER_ADMIN' },
        'test-jwt-secret-123'
      );
      mockReq.cookies = { superAdminToken: token };

      authenticateAdmin(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should authenticate with agentToken cookie', () => {
      const token = jwt.sign(
        { id: 'agent-123', email: 'agent@test.com', type: 'AGENT' },
        'test-jwt-secret-123'
      );
      mockReq.cookies = { agentToken: token };

      authenticateAdmin(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect((mockReq as AuthenticatedRequest).admin.adminType).toBe('AGENT');
    });

    it('should normalize accessLevel to adminType for backwards compatibility', () => {
      const token = jwt.sign(
        { id: 'user-123', email: 'test@test.com', accessLevel: 'DEPT_STATE_ADMIN' },
        'test-jwt-secret-123'
      );
      mockReq.headers = { authorization: `Bearer ${token}` };

      authenticateAdmin(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect((mockReq as AuthenticatedRequest).admin.adminType).toBe('STATE_ADMIN');
    });

    it('should normalize DEPT_MUNICIPAL_ADMIN to MUNICIPAL_ADMIN', () => {
      const token = jwt.sign(
        { id: 'user-123', email: 'test@test.com', accessLevel: 'DEPT_MUNICIPAL_ADMIN' },
        'test-jwt-secret-123'
      );
      mockReq.headers = { authorization: `Bearer ${token}` };

      authenticateAdmin(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect((mockReq as AuthenticatedRequest).admin.adminType).toBe('MUNICIPAL_ADMIN');
    });

    it('should return 403 for invalid token', () => {
      mockReq.headers = { authorization: 'Bearer invalid-token' };

      authenticateAdmin(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid or expired token',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 for expired token', () => {
      const token = jwt.sign(
        { id: 'user-123', email: 'test@test.com', adminType: 'SUPER_ADMIN' },
        'test-jwt-secret-123',
        { expiresIn: '-1h' }
      );
      mockReq.headers = { authorization: `Bearer ${token}` };

      authenticateAdmin(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should prefer Authorization header over cookies', () => {
      const headerToken = jwt.sign(
        { id: 'header-user', email: 'header@test.com', adminType: 'SUPER_ADMIN' },
        'test-jwt-secret-123'
      );
      const cookieToken = jwt.sign(
        { id: 'cookie-user', email: 'cookie@test.com', adminType: 'AGENT' },
        'test-jwt-secret-123'
      );
      mockReq.headers = { authorization: `Bearer ${headerToken}` };
      mockReq.cookies = { token: cookieToken };

      authenticateAdmin(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect((mockReq as AuthenticatedRequest).admin.id).toBe('header-user');
    });
  });

  describe('requireAdminType', () => {
    it('should allow access for matching admin type', () => {
      (mockReq as AuthenticatedRequest).admin = {
        id: 'user-123',
        email: 'test@test.com',
        adminType: 'SUPER_ADMIN',
      };

      const middleware = requireAdminType('SUPER_ADMIN');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow access for any of multiple allowed types', () => {
      (mockReq as AuthenticatedRequest).admin = {
        id: 'user-123',
        email: 'test@test.com',
        adminType: 'STATE_ADMIN',
      };

      const middleware = requireAdminType('SUPER_ADMIN', 'STATE_ADMIN');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should deny access for non-matching admin type', () => {
      (mockReq as AuthenticatedRequest).admin = {
        id: 'user-123',
        email: 'test@test.com',
        adminType: 'AGENT',
      };

      const middleware = requireAdminType('SUPER_ADMIN');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied. Required admin types: SUPER_ADMIN',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when admin is not authenticated', () => {
      const middleware = requireAdminType('SUPER_ADMIN');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Not authenticated',
      });
    });
  });

  describe('authenticateSuperAdminOnly', () => {
    it('should allow SUPER_ADMIN access', () => {
      const token = jwt.sign(
        { id: 'user-123', email: 'test@test.com', adminType: 'SUPER_ADMIN' },
        'test-jwt-secret-123'
      );
      mockReq.headers = { authorization: `Bearer ${token}` };

      authenticateSuperAdminOnly(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should deny non-SUPER_ADMIN access', () => {
      const token = jwt.sign(
        { id: 'user-123', email: 'test@test.com', adminType: 'STATE_ADMIN' },
        'test-jwt-secret-123'
      );
      mockReq.headers = { authorization: `Bearer ${token}` };

      authenticateSuperAdminOnly(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied. Super Admin only.',
      });
    });
  });

  describe('authenticateStateAdminOnly', () => {
    it('should allow STATE_ADMIN access', () => {
      const token = jwt.sign(
        { id: 'user-123', email: 'test@test.com', adminType: 'STATE_ADMIN' },
        'test-jwt-secret-123'
      );
      mockReq.headers = { authorization: `Bearer ${token}` };

      authenticateStateAdminOnly(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should deny non-STATE_ADMIN access', () => {
      const token = jwt.sign(
        { id: 'user-123', email: 'test@test.com', adminType: 'MUNICIPAL_ADMIN' },
        'test-jwt-secret-123'
      );
      mockReq.headers = { authorization: `Bearer ${token}` };

      authenticateStateAdminOnly(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(403);
    });
  });

  describe('authenticateMunicipalAdminOnly', () => {
    it('should allow MUNICIPAL_ADMIN access', () => {
      const token = jwt.sign(
        { id: 'user-123', email: 'test@test.com', adminType: 'MUNICIPAL_ADMIN' },
        'test-jwt-secret-123'
      );
      mockReq.headers = { authorization: `Bearer ${token}` };

      authenticateMunicipalAdminOnly(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should deny non-MUNICIPAL_ADMIN access', () => {
      const token = jwt.sign(
        { id: 'user-123', email: 'test@test.com', adminType: 'AGENT' },
        'test-jwt-secret-123'
      );
      mockReq.headers = { authorization: `Bearer ${token}` };

      authenticateMunicipalAdminOnly(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(403);
    });
  });

  describe('authenticateAgentOnly', () => {
    it('should allow AGENT access', () => {
      const token = jwt.sign(
        { id: 'agent-123', email: 'agent@test.com', adminType: 'AGENT' },
        'test-jwt-secret-123'
      );
      mockReq.headers = { authorization: `Bearer ${token}` };

      authenticateAgentOnly(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should deny non-AGENT access', () => {
      const token = jwt.sign(
        { id: 'user-123', email: 'test@test.com', adminType: 'SUPER_ADMIN' },
        'test-jwt-secret-123'
      );
      mockReq.headers = { authorization: `Bearer ${token}` };

      authenticateAgentOnly(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(403);
    });
  });
});
