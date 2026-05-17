import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Admin types that the unified middleware can authenticate
export type AdminType = 'SUPER_ADMIN' | 'STATE_ADMIN' | 'MUNICIPAL_ADMIN' | 'AGENT';

// Decoded token structure
export interface DecodedToken {
  id: string;
  email: string;
  adminType: AdminType;
  accessLevel?: string;
  department?: string;
  municipality?: string;
  type?: string;
}

// Extended request with admin info
export interface AuthenticatedRequest extends Request {
  admin: DecodedToken;
}

/**
 * Unified authentication middleware for all admin types
 * Extracts token from Authorization header or cookies
 * Attaches decoded admin info to req.admin
 */
export const authenticateAdmin = (req: Request, res: any, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  
  // Check multiple cookie names for backwards compatibility
  const cookieToken = req.cookies?.token || 
                      req.cookies?.superAdminToken || 
                      req.cookies?.agentToken;

  let token: string | undefined;

  // Prefer Authorization header, fallback to cookies
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (cookieToken) {
    token = cookieToken;
  }

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'No token provided' 
    });
  }

  try {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      console.error('[authenticateAdmin] Missing JWT secret in environment');
      return res.status(500).json({ success: false, message: 'Server misconfiguration: missing JWT secret' });
    }

    const decoded = jwt.verify(token, secret) as DecodedToken;

    // Normalize adminType for backwards compatibility
    // Some tokens may have accessLevel or type instead of adminType
    if (!decoded.adminType) {
      if (decoded.type === 'AGENT' || decoded.accessLevel === 'AGENT') {
        decoded.adminType = 'AGENT';
      } else if (decoded.accessLevel === 'SUPER_ADMIN') {
        decoded.adminType = 'SUPER_ADMIN';
      } else if (decoded.accessLevel === 'DEPT_STATE_ADMIN') {
        decoded.adminType = 'STATE_ADMIN';
      } else if (decoded.accessLevel === 'DEPT_MUNICIPAL_ADMIN') {
        decoded.adminType = 'MUNICIPAL_ADMIN';
      }
    }

    (req as AuthenticatedRequest).admin = decoded;
    next();
  } catch (error) {
    console.error('[authenticateAdmin] Token verification failed:', error);
    return res.status(403).json({ 
      success: false, 
      message: 'Invalid or expired token' 
    });
  }
};

/**
 * Middleware factory to restrict access to specific admin types
 * Use after authenticateAdmin middleware
 * 
 * @example
 * router.get('/route', authenticateAdmin, requireAdminType('SUPER_ADMIN', 'STATE_ADMIN'), handler)
 */
export const requireAdminType = (...allowedTypes: AdminType[]) => {
  return (req: Request, res: any, next: NextFunction): void => {
    const admin = (req as AuthenticatedRequest).admin;

    if (!admin) {
      return res.status(401).json({ 
        success: false, 
        message: 'Not authenticated' 
      });
    }

    if (!allowedTypes.includes(admin.adminType)) {
      return res.status(403).json({ 
        success: false, 
        message: `Access denied. Required admin types: ${allowedTypes.join(', ')}` 
      });
    }

    next();
  };
};

/**
 * Authenticate only Super Admin
 */
export const authenticateSuperAdminOnly = (req: Request, res: any, next: NextFunction): void => {
  authenticateAdmin(req, res, () => {
    const admin = (req as AuthenticatedRequest).admin;
    if (admin?.adminType !== 'SUPER_ADMIN') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Super Admin only.' 
      });
    }
    next();
  });
};

/**
 * Authenticate only State Admin
 */
export const authenticateStateAdminOnly = (req: Request, res: any, next: NextFunction): void => {
  authenticateAdmin(req, res, () => {
    const admin = (req as AuthenticatedRequest).admin;
    if (admin?.adminType !== 'STATE_ADMIN') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. State Admin only.' 
      });
    }
    next();
  });
};

/**
 * Authenticate only Municipal Admin
 */
export const authenticateMunicipalAdminOnly = (req: Request, res: any, next: NextFunction): void => {
  authenticateAdmin(req, res, () => {
    const admin = (req as AuthenticatedRequest).admin;
    if (admin?.adminType !== 'MUNICIPAL_ADMIN') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Municipal Admin only.' 
      });
    }
    next();
  });
};

/**
 * Authenticate only Agent
 */
export const authenticateAgentOnly = (req: Request, res: any, next: NextFunction): void => {
  authenticateAdmin(req, res, () => {
    const admin = (req as AuthenticatedRequest).admin;
    if (admin?.adminType !== 'AGENT') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Agent only.' 
      });
    }
    next();
  });
};
