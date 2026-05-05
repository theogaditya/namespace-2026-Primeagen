import { Router } from "express";
import { PrismaClient } from "../prisma/generated/client/client";
import { createAuthMiddleware } from "../middleware/authRoute";

export function logoutUserRouter(db: PrismaClient) {
  const router = Router();
  const authMiddleware = createAuthMiddleware(db);

  router.post("/logout", authMiddleware, async (req, res) => {
    try {
      // With JWT, logout is handled client-side by removing the token
      // Here we just confirm the user is authenticated and return success
      // In a production app, you might:
      // 1. Add token to a blacklist/Redis
      // 2. Update lastLogout timestamp in database
      // 3. Invalidate refresh tokens

      const userId = req.userId;
      const userName = req.user?.name;

      return res.status(200).json({
        success: true,
        message: "Logout successful. Please remove your token from storage.",
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
