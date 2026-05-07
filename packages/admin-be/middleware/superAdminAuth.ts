import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getPrisma } from '../lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';

// Extend the Express Request interface
declare global {
  namespace Express {
    interface Request {
      superAdmin?: { id: string; email: string };
    }
  }
}

export interface AuthenticatedRequest extends Request {
  superAdmin?: { id: string; email: string };
}

export const authenticateSuperAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const prisma = getPrisma();
    
    // Prioritize cookies over Authorization header for NextJS
    let token = req.cookies.superAdminToken || req.cookies.token;
    
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7); // Remove 'Bearer ' prefix
      }
    }

    if (!token) {
      res.status(401).json({ success: false, message: 'No token provided' });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string };

    const superAdmin = await prisma.superAdmin.findUnique({
      where: { id: decoded.id },
    });

    if (!superAdmin || superAdmin.officialEmail !== decoded.email) {
      res.status(403).json({ success: false, message: 'Access denied. Not a super admin.' });
      return;
    }

    // Update last login
    await prisma.superAdmin.update({
      where: { id: superAdmin.id },
      data: { lastLogin: new Date() }
    });

    req.superAdmin = { id: superAdmin.id, email: superAdmin.officialEmail };
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(400).json({ success: false, message: 'Invalid token' });
    return;
  }
};