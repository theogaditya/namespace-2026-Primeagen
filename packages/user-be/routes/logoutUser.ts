import { Router,Request,Response } from "express";
import jwt from "jsonwebtoken";
import { PrismaClient } from "../prisma/generated/client/client";
import { createAuthMiddleware } from "../middleware/authRoute";
import { tokenBlacklistService } from "../lib/redis/tokenBlacklistService";

const JWT_SECRET = "my123";

export function logoutUserRouter(db: PrismaClient) {
  const router = Router();
  const authMiddleware = createAuthMiddleware(db);

  router.post("/logout", authMiddleware, async (req: Request, res: Response) => {
    try {
      // Extract token from header
      const authHeader = req.headers.authorization;
      const token = authHeader?.substring(7); // Remove "Bearer " prefix

      if (!token) {
        return res.status(400).json({
          success: false,
          message: "No token provided",
        });
      }

      // Decode token to get expiry time
      const decoded = jwt.decode(token) as { exp?: number };
      const now = Math.floor(Date.now() / 1000);
      const expiresIn = decoded?.exp ? decoded.exp - now : 86400; // Default 24h if no exp

      // Add token to blacklist
      await tokenBlacklistService.blacklistToken(token, expiresIn);

      const userId = req.userId;
      const userName = req.user?.name;

      return res.status(200).json({
        success: true,
        message: "Logout successful. Token has been invalidated.",
        data: {
          userId,
          userName,
          logoutTime: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Logout error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  });

  return router;
}
