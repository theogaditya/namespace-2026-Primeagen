import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface CivicPartnerToken {
  id: string;
  email: string;
  orgType: 'NGO' | 'GOVERNMENT_BODY';
  accessLevel: 'CIVIC_PARTNER';
  isVerified: boolean;
}

export interface CivicPartnerRequest extends Request {
  civicPartner: CivicPartnerToken;
}

/**
 * Verifies a JWT issued to a CivicPartner and attaches the decoded payload
 * to req.civicPartner. Returns 401 if token is missing/invalid, 403 if
 * the account has not yet been verified by a SuperAdmin.
 */
export const authenticateCivicPartner = (
  req: Request,
  res: any,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  const cookieToken = req.cookies?.civicPartnerToken;

  let token: string | undefined;

  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (cookieToken) {
    token = cookieToken;
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('[civicPartnerAuth] Missing JWT_SECRET');
    return res.status(500).json({ success: false, message: 'Server misconfiguration' });
  }

  try {
    const decoded = jwt.verify(token, secret) as CivicPartnerToken;

    if (decoded.accessLevel !== 'CIVIC_PARTNER') {
      return res
        .status(403)
        .json({ success: false, message: 'Access denied. Not a CivicPartner token.' });
    }

    if (!decoded.isVerified) {
      return res.status(403).json({
        success: false,
        message:
          'Your organisation is pending verification by the platform administrator. Please check back later.',
      });
    }

    (req as CivicPartnerRequest).civicPartner = decoded;
    next();
  } catch (err) {
    console.error('[civicPartnerAuth] Token verification failed:', err);
    return res.status(403).json({ success: false, message: 'Invalid or expired token' });
  }
};

/**
 * Type-safe helper to extract the civicPartner payload set by
 * authenticateCivicPartner middleware. Avoids TypeScript cast errors
 * on parameterised Express.Request types in route handlers.
 */
export function getCivicPartner(req: Request): CivicPartnerToken {
  return (req as any).civicPartner as CivicPartnerToken;
}
