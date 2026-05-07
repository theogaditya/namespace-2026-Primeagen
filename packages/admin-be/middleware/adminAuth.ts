import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

const nodeEnv = process.env.NODE_ENV || 'development';
const envFile = nodeEnv === 'production' ? '.env.prod' : '.env.local';
dotenv.config({ path: envFile });

const JWT_SECRET = process.env.JWT_SECRET!;

export const authenticateStateAdmin = (req: Request, res: any, next: NextFunction): void => {
  console.log('[DEBUG] Starting authentication check');
  console.log('[DEBUG] Cookies:', req.cookies);
  console.log('[DEBUG] Headers:', req.headers);
  
  const token = req.cookies?.token;

  if (!token) {
    console.log('[DEBUG] No token found in cookies');
    return res.status(401).json({ success: false, message: 'Unauthorized: No token provided' });
  }

  console.log('[DEBUG] Token found:', token.substring(0, 20) + '...');

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      email: string;
      accessLevel: string;
    };

    console.log('[DEBUG] Token decoded successfully:', decoded);

    if (decoded.accessLevel !== 'DEPT_STATE_ADMIN') {
      console.log('[DEBUG] Invalid accessLevel. Expected: STATE_ADMIN, Got:', decoded.accessLevel);
      return res.status(403).json({ success: false, message: 'Forbidden: Invalid access level' });
    }

    console.log('[DEBUG] Authentication successful, proceeding to next middleware');
    (req as any).admin = decoded;
    next();
  } catch (err) {
    console.error('[DEBUG] Token verification failed:', err);
    return res.status(401).json({ success: false, message: 'Unauthorized: Invalid token' });
  }
};

export const authenticateMunicipalAdmin = (req: Request, res: any, next: NextFunction):void => {
  const authHeader = req.headers.authorization;
  const cookieToken = req.cookies?.token;
  
  let token: string | undefined;
  
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (cookieToken) {
    token = cookieToken;
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    if (decoded.accessLevel !== 'DEPT_MUNICIPAL_ADMIN') {
      return res.status(403).json({ success: false, message: 'Unauthorized: Not a municipal admin' });
    }

    (req as any).user = decoded;
    next();
  } catch {
    return res.status(403).json({ success: false, message: 'Invalid or expired token' });
  }
};

export const authenticateAgent = (req: Request, res: any, next: NextFunction):void => {
  const authHeader = req.headers.authorization;
  const cookieToken = req.cookies?.agentToken;

  let token: string | undefined;

  // Get token from Bearer header or cookie
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (cookieToken) {
    token = cookieToken;
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      officialEmail: string;
      accessLevel: string;
      department: string;
      type: string;
    };

    // Check if token is for agent
    if (decoded.type !== 'AGENT' || decoded.accessLevel !== 'AGENT') {
      return res.status(403).json({ success: false, message: 'Unauthorized: Not an agent' });
    }

    // Attach agent info to req
    (req as any).agent = decoded;
    next();
  } catch (err) {
    console.error('[authenticateAgent] Token error:', err);
    return res.status(403).json({ success: false, message: 'Invalid or expired token' });
  }
};