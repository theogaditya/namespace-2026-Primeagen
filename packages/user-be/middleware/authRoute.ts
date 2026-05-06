import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { PrismaClient } from "../prisma/generated/client/client";
import { tokenBlacklistService } from "../lib/redis/tokenBlacklistService";

const JWT_SECRET = "my123";

// Extend Express Request to include user
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
      // Get token from Authorization header
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
          success: false,
          message: "Authentication required. Please login first.",
        });
      }

      const token = authHeader.substring(7); // Remove "Bearer " prefix

      // Check if token is blacklisted (logged out)
      const isBlacklisted = await tokenBlacklistService.isBlacklisted(token);
      if (isBlacklisted) {
        return res.status(401).json({
          success: false,
          message: "Token has been invalidated. Please login again.",
        });
      }

      // Verify JWT token
      let decoded: JwtPayload;
      try {
        decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
      } catch (err) {
        return res.status(401).json({
          success: false,
          message: "Invalid or expired token. Please login again.",
        });
      }

      // Verify user exists and is active
      const user = await db.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          name: true,
          status: true,
        },
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

      // Attach user to request
      req.userId = decoded.userId;
      req.user = user;

      next();
    } catch (error) {
      console.error("Auth middleware error:", error);
      return res.status(500).json({
        success: false,
        message: "Authentication error",
      });
    }
  };
}

export default function createAuthRoute(db: PrismaClient) {
  return createAuthMiddleware(db);
}