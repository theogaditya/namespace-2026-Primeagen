/**
 * Badge Routes
 * 
 * API endpoints for badge-related operations.
 * All routes require authentication.
 */

import { Router, Request, Response } from "express";
import { getPrisma } from "../lib/prisma";
import { getBadgeService } from "../lib/badges/badgeService";

const prisma = getPrisma();
const badgeService = getBadgeService(prisma);

// Extended Request with user data
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    phoneNumber: string;
  };
}

export function createBadgeRouter() {
  const router = Router();

  /**
   * GET /badges - Get all badges with user's earned status
   * Returns all badges in the system along with whether the current user has earned each one
   */
  router.get("/", async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "Unauthorized",
        });
      }

      const badges = await badgeService.getAllBadgesWithStatus(userId);
      
      // Group by category for frontend convenience
      const grouped = {
        FILING: badges.filter(b => b.category === "FILING"),
        ENGAGEMENT: badges.filter(b => b.category === "ENGAGEMENT"),
        RESOLUTION: badges.filter(b => b.category === "RESOLUTION"),
        CATEGORY_SPECIALIST: badges.filter(b => b.category === "CATEGORY_SPECIALIST"),
      };

      return res.json({
        success: true,
        badges,
        grouped,
        totalBadges: badges.length,
        earnedCount: badges.filter(b => b.earned).length,
      });
    } catch (error) {
      console.error("Error fetching badges:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch badges",
      });
    }
  });
  
  /**
   * GET /badges/my - Get only user's earned badges
   * Returns badges the user has already earned, sorted by most recent
   */
  router.get("/my", async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "Unauthorized",
        });
      }

      const badges = await badgeService.getUserBadges(userId);
      
      return res.json({
        success: true,
        badges,
        count: badges.length,
      });
    } catch (error) {
      console.error("Error fetching user badges:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch user badges",
      });
    }
  });
  
  /**
   * GET /badges/recent - Get newly earned badges (unnotified)
   * Returns badges user hasn't been notified about yet, then marks them as notified
   */
  router.get("/recent", async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "Unauthorized",
        });
      }

      const newBadges = await badgeService.getUnnotifiedBadges(userId);
      
      return res.json({
        success: true,
        badges: newBadges,
        hasNew: newBadges.length > 0,
      });
    } catch (error) {
      console.error("Error fetching recent badges:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch recent badges",
      });
    }
  });
  
  /**
   * GET /badges/progress - Get progress towards next badges
   * Returns user's current progress towards earning badges in each category
   */
  router.get("/progress", async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "Unauthorized",
        });
      }

      const progress = await badgeService.getBadgeProgress(userId);
      
      return res.json({
        success: true,
        progress,
      });
    } catch (error) {
      console.error("Error fetching badge progress:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch badge progress",
      });
    }
  });
  
  /**
   * GET /badges/check - Manually check and award any earned badges
   * Useful for awarding badges that may have been missed
   */
  router.get("/check", async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "Unauthorized",
        });
      }

      const newBadges = await badgeService.checkAndAwardBadges(userId);
      
      return res.json({
        success: true,
        newBadges: newBadges.map(b => b.badge),
        awarded: newBadges.length,
        message: newBadges.length > 0 
          ? `Congratulations! You earned ${newBadges.length} new badge(s)!`
          : "No new badges earned",
      });
    } catch (error) {
      console.error("Error checking badges:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to check badges",
      });
    }
  });
  
  /**
   * GET /badges/stats - Get user's badge statistics
   * Returns summary statistics about user's badge progress
   */
  router.get("/stats", async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "Unauthorized",
        });
      }

      const [badges, stats, progress] = await Promise.all([
        badgeService.getAllBadgesWithStatus(userId),
        badgeService.getUserStats(userId),
        badgeService.getBadgeProgress(userId),
      ]);

      const earnedBadges = badges.filter(b => b.earned);
      
      // Calculate rarity distribution
      const rarityStats = {
        COMMON: { total: 0, earned: 0 },
        UNCOMMON: { total: 0, earned: 0 },
        RARE: { total: 0, earned: 0 },
        EPIC: { total: 0, earned: 0 },
        LEGENDARY: { total: 0, earned: 0 },
      };

      badges.forEach(badge => {
        const rarity = badge.rarity as keyof typeof rarityStats;
        if (rarityStats[rarity]) {
          rarityStats[rarity].total++;
          if (badge.earned) {
            rarityStats[rarity].earned++;
          }
        }
      });

      return res.json({
        success: true,
        stats: {
          totalBadges: badges.length,
          earnedCount: earnedBadges.length,
          percentage: Math.round((earnedBadges.length / badges.length) * 100),
          userStats: stats,
          progress,
          rarityStats,
          recentBadges: earnedBadges.slice(0, 3),
        },
      });
    } catch (error) {
      console.error("Error fetching badge stats:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch badge stats",
      });
    }
  });

  return router;
}
