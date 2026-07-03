import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import type { PrismaClient } from "../prisma/generated/client/client";

const JWT_SECRET = process.env.JWT_SECRET || "my123";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      user?: any;
    }
  }
}

interface JwtPayload {
  userId: string;
  email: string;
  name: string;
}

export function createAuthMiddleware(db: PrismaClient) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        console.warn('[Auth] Missing or malformed Authorization header');
        return res.status(401).json({
          success: false,
          message: "Authentication required. Please login first.",
        });
      }

      const token = authHeader.substring(7);

      let decoded: JwtPayload;
      try {
        decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
      } catch {
        // Provide additional debug info to help diagnose secret or token issues
        try {
          const partial = `${token.slice(0, 6)}...${token.slice(-6)}`;
          const decodedUnsafe = jwt.decode(token);
          console.error('[Auth] Token verification failed. tokenSnippet=', partial, 'decodedPayload=', decodedUnsafe);
        } catch (e) {
          console.error('[Auth] Token verification failed and decode failed:', e);
        }
        return res.status(401).json({
          success: false,
          message: "Invalid or expired token. Please login again.",
        });
      }

      // The token payload can come from different auth services.
      // Admin tokens (from admin-be) include `adminType` and `id` fields.
      // Regular user tokens include `userId` (or `id`). Handle both shapes.
      const payload: any = decoded as any;

      // If this is an admin token, skip DB user lookup and attach payload directly.
      if (payload && payload.adminType && payload.id) {
        req.userId = String(payload.id);
        req.user = payload;
        return next();
      }

      // Otherwise, attempt to find a corresponding user record.
      const lookupId = payload.userId ?? payload.id;
      const lookupEmail = payload.email ?? undefined;

      if (!lookupId && !lookupEmail) {
        return res.status(401).json({ success: false, message: "Invalid token payload" });
      }

      const whereClause: any = lookupId ? { id: String(lookupId) } : { email: String(lookupEmail) };

      const user = await db.user.findUnique({
        where: whereClause,
        select: { id: true, email: true, name: true, status: true },
      });

      if (!user) {
        return res.status(401).json({ success: false, message: "Invalid authentication. User not found." });
      }

      if (user.status !== "ACTIVE") {
        return res.status(403).json({ success: false, message: `Account is ${user.status.toLowerCase()}. Please contact support.` });
      }

      req.userId = user.id;
      req.user = user;
      return next();
    } catch (error) {
      console.error("[Auth] Middleware error:", error);
      return res.status(500).json({
        success: false,
        message: "Authentication error",
      });
    }
  };
}
