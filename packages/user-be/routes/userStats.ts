/**
 * User Stats Routes
 * 
 * API endpoint for fetching civic trust score and dashboard stats.
 */

import { Router, Request, Response } from "express";
import { PrismaClient } from "../prisma/generated/client/client";
import { getBadgeService } from "../lib/badges/badgeService";

// Level thresholds
const LEVELS = [
  { min: 0, max: 199, number: 1, name: "Newcomer" },
  { min: 200, max: 399, number: 2, name: "Active Citizen" },
  { min: 400, max: 599, number: 3, name: "Advocate" },
  { min: 600, max: 799, number: 4, name: "Community Pillar" },
  { min: 800, max: 999, number: 5, name: "Civic Champion" },
  { min: 1000, max: Infinity, number: 6, name: "Regional Leader" },
];

function getLevel(score: number) {
  const level = LEVELS.find((l) => score >= l.min && score <= l.max) || LEVELS[0];
  const xpToNext = level.max === Infinity ? 0 : level.max + 1 - score;
  return { levelNumber: level.number, levelName: level.name, xpToNextLevel: xpToNext };
}

export function createUserStatsRouter(db: PrismaClient) {
  const router = Router();
  const badgeService = getBadgeService(db);

  /**
   * GET /api/users/stats - Get civic trust score & dashboard stats
   * Auth: Required (userId from middleware)
   */
  router.get("/stats", async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;

      if (!userId) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      // Count complaints by status
      const [registered, processing, resolved, total, badges] = await Promise.all([
        db.complaint.count({ where: { complainantId: userId, status: "REGISTERED" } }),
        db.complaint.count({
          where: {
            complainantId: userId,
            status: { in: ["UNDER_PROCESSING", "FORWARDED"] },
          },
        }),
        db.complaint.count({ where: { complainantId: userId, status: "COMPLETED" } }),
        db.complaint.count({ where: { complainantId: userId } }),
        badgeService.getUserBadges(userId),
      ]);

      const earnedBadges = badges.filter((b: any) => b.earnedAt).length;

      // Score algorithm
      const civicScore = Math.min(
        1200,
        resolved * 120 + processing * 40 + registered * 15 + earnedBadges * 30
      );

      const { levelNumber, levelName, xpToNextLevel } = getLevel(civicScore);

      return res.json({
        success: true,
        data: {
          civicScore,
          scoreDelta: 12, // Static placeholder for now
          levelName,
          levelNumber,
          currentXP: civicScore,
          xpToNextLevel,
          totalComplaints: total,
          resolvedComplaints: resolved,
          earnedBadges,
          complaintsByStatus: {
            REGISTERED: registered,
            PROCESSING: processing,
            RESOLVED: resolved,
          },
        },
      });
    } catch (error) {
      console.error("Error fetching user stats:", error);
      return res.status(500).json({ success: false, error: "Internal server error" });
    }
  });

  return router;
}
