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
        return res.status(401).json({
          success: false,
          message: "Invalid or expired token. Please login again.",
        });
      }

      // Verify user exists (read-only — no token blacklist check here,
      // since the agents service doesn't manage auth lifecycle)
      const user = await db.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, email: true, name: true, status: true },
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Invalid authentication. User not found.",
        });
      }

      if (user.status !== "ACTIVE") {
        return res.status(403).json({
          success: false,
          message: `Account is ${user.status.toLowerCase()}. Please contact support.`,
        });
      }

      req.userId = decoded.userId;
      req.user = user;
      next();
    } catch (error) {
      console.error("[Auth] Middleware error:", error);
      return res.status(500).json({
        success: false,
        message: "Authentication error",
      });
    }
  };
}
