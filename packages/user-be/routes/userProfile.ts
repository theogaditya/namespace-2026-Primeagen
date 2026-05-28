/**
 * User Profile Routes
 * 
 * API endpoints for fetching public user profile information.
 */

import { Router, Request, Response } from "express";
import { PrismaClient } from "../prisma/generated/client/client";
import { getBadgeService } from "../lib/badges/badgeService";

export function createUserProfileRouter(db: PrismaClient) {
  const router = Router();
  const badgeService = getBadgeService(db);

  /**
   * GET /user/:userId/profile - Get public user profile
   * Returns user's public info: name, location, member since, badges, account status
   */
  router.get("/:userId/profile", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: "User ID is required",
        });
      }

      // Fetch user with limited public info
      const user = await db.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          status: true,
          dateOfCreation: true,
          location: {
            select: {
              district: true,
              city: true,
              state: true,
            },
          },
        },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      // Get user's earned badges
      const badges = await badgeService.getUserBadges(userId);

      // Get complaint stats
      const complaintStats = await db.complaint.aggregate({
        where: { complainantId: userId, isPublic: true },
        _count: { id: true },
      });

      const resolvedCount = await db.complaint.count({
        where: { 
          complainantId: userId, 
          isPublic: true,
          status: "COMPLETED" 
        },
      });

      return res.json({
        success: true,
        profile: {
          id: user.id,
          name: user.name,
          status: user.status,
          memberSince: user.dateOfCreation,
          location: user.location ? {
            district: user.location.district,
            city: user.location.city,
            state: user.location.state,
          } : null,
          badges: badges.map(b => ({
            id: b.id,
            name: b.name,
            icon: b.icon,
            rarity: b.rarity,
            earnedAt: b.earnedAt,
          })),
          stats: {
            totalComplaints: complaintStats._count.id,
            resolvedComplaints: resolvedCount,
          },
        },
      });
    } catch (error) {
      console.error("Error fetching user profile:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch user profile",
      });
    }
  });

  return router;
}
