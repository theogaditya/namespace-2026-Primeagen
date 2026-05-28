/**
 * Badge Service for Admin Backend
 * 
 * Handles badge checking, awarding, and retrieval logic.
 * Checks user activity against badge thresholds and awards badges automatically.
 * 
 * Uses raw SQL queries since badges/user_badges models may not be in generated client.
 */

import { PrismaClient } from "../../prisma/generated/client/client";
import { randomUUID } from "crypto";

// Type definitions for Badge entities
interface Badge {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  rarity: string;
  threshold: number;
  createdAt: Date;
}

interface NewBadgeResult {
  badge: Badge;
  isNew: boolean;
}

// Department mapping for category badges
const DEPARTMENT_TO_BADGE_SLUG: Record<string, string> = {
  "TRANSPORTATION": "road_warrior",
  "INFRASTRUCTURE": "road_warrior",
  "WATER_SUPPLY_SANITATION": "water_guardian",
  "ELECTRICITY_POWER": "power_ranger",
  "ENVIRONMENT": "eco_warrior",
  "HEALTH": "health_advocate",
};

// Badge slug to threshold type mapping
type ThresholdType = "complaints" | "likes_received" | "resolved" | "single_complaint_likes" | "category";

const BADGE_THRESHOLD_TYPES: Record<string, ThresholdType> = {
  // Filing
  "first_step": "complaints",
  "active_reporter": "complaints",
  "vocal_citizen": "complaints",
  "public_voice": "complaints",
  "watchdog": "complaints",
  "democracy_champion": "complaints",
  // Engagement
  "appreciated": "likes_received",
  "rising_star": "likes_received",
  "trending_voice": "single_complaint_likes",
  "community_favorite": "likes_received",
  "influencer": "likes_received",
  // Resolution
  "problem_identified": "resolved",
  "fixer": "resolved",
  "problem_solver": "resolved",
  "change_maker": "resolved",
  "impact_legend": "resolved",
  // Category
  "road_warrior": "category",
  "water_guardian": "category",
  "power_ranger": "category",
  "eco_warrior": "category",
  "health_advocate": "category",
};

interface UserStats {
  totalComplaints: number;
  resolvedComplaints: number;
  totalLikesReceived: number;
  maxSingleComplaintLikes: number;
  categoryCountMap: Record<string, number>;
}

export class BadgeService {
  private db: PrismaClient;

  constructor(db: PrismaClient) {
    this.db = db;
  }

  /**
   * Get all badges from database using raw query
   */
  private async getAllBadges(): Promise<Badge[]> {
    const badges = await this.db.$queryRaw<Badge[]>`
      SELECT id, slug, name, description, icon, category, rarity, threshold, "createdAt"
      FROM badges
    `;
    return badges;
  }

  /**
   * Get badge by slug using raw query
   */
  private async getBadgeBySlug(slug: string): Promise<Badge | null> {
    const badges = await this.db.$queryRaw<Badge[]>`
      SELECT id, slug, name, description, icon, category, rarity, threshold, "createdAt"
      FROM badges
      WHERE slug = ${slug}
      LIMIT 1
    `;
    return badges[0] || null;
  }

  /**
   * Check if user already has a badge
   */
  private async userHasBadge(userId: string, badgeId: string): Promise<boolean> {
    const result = await this.db.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count FROM user_badges
      WHERE "userId" = ${userId} AND "badgeId" = ${badgeId}
    `;
    return Number(result[0]?.count || 0) > 0;
  }

  /**
   * Get all earned badge IDs for a user
   */
  private async getUserEarnedBadgeIds(userId: string): Promise<string[]> {
    const result = await this.db.$queryRaw<{ badgeId: string }[]>`
      SELECT "badgeId" FROM user_badges WHERE "userId" = ${userId}
    `;
    return result.map(r => r.badgeId);
  }

  /**
   * Create a user badge entry
   */
  private async createUserBadge(userId: string, badgeId: string): Promise<void> {
    const id = randomUUID();
    await this.db.$executeRaw`
      INSERT INTO user_badges (id, "userId", "badgeId", "earnedAt", notified)
      VALUES (${id}, ${userId}, ${badgeId}, NOW(), false)
      ON CONFLICT ("userId", "badgeId") DO NOTHING
    `;
  }

  /**
   * Get user stats for badge calculations
   */
  async getUserStats(userId: string): Promise<UserStats> {
    const [
      totalComplaints,
      resolvedComplaints,
      totalLikesReceived,
      maxSingleComplaintLikes,
      categoryCounts,
    ] = await Promise.all([
      // Total complaints filed
      this.db.complaint.count({
        where: { complainantId: userId },
      }),
      // Resolved complaints
      this.db.complaint.count({
        where: {
          complainantId: userId,
          status: "COMPLETED",
        },
      }),
      // Total likes received on all complaints
      this.db.complaint.aggregate({
        where: { complainantId: userId },
        _sum: { upvoteCount: true },
      }),
      // Max likes on a single complaint
      this.db.complaint.aggregate({
        where: { complainantId: userId },
        _max: { upvoteCount: true },
      }),
      // Complaints by department
      this.db.complaint.groupBy({
        by: ["assignedDepartment"],
        where: { complainantId: userId },
        _count: { id: true },
      }),
    ]);

    // Convert category counts to a map
    const categoryCountMap: Record<string, number> = {};
    for (const cat of categoryCounts) {
      categoryCountMap[cat.assignedDepartment] = cat._count.id;
    }

    return {
      totalComplaints,
      resolvedComplaints,
      totalLikesReceived: totalLikesReceived._sum.upvoteCount || 0,
      maxSingleComplaintLikes: maxSingleComplaintLikes._max.upvoteCount || 0,
      categoryCountMap,
    };
  }

  /**
   * Check if user qualifies for a badge
   */
  private checkBadgeQualification(
    badge: Badge,
    stats: UserStats,
    department?: string
  ): boolean {
    const thresholdType = BADGE_THRESHOLD_TYPES[badge.slug];
    
    switch (thresholdType) {
      case "complaints":
        return stats.totalComplaints >= badge.threshold;
      case "likes_received":
        return stats.totalLikesReceived >= badge.threshold;
      case "single_complaint_likes":
        return stats.maxSingleComplaintLikes >= badge.threshold;
      case "resolved":
        return stats.resolvedComplaints >= badge.threshold;
      case "category":
        // Find the matching department for this category badge
        const matchingDept = Object.entries(DEPARTMENT_TO_BADGE_SLUG)
          .find(([_, slug]) => slug === badge.slug)?.[0];
        if (matchingDept && stats.categoryCountMap[matchingDept]) {
          return stats.categoryCountMap[matchingDept] >= badge.threshold;
        }
        return false;
      default:
        return false;
    }
  }

  /**
   * Award a badge to a user if not already earned
   */
  async awardBadge(userId: string, badgeSlug: string): Promise<NewBadgeResult | null> {
    // Get badge
    const badge = await this.getBadgeBySlug(badgeSlug);

    if (!badge) {
      console.error(`Badge not found: ${badgeSlug}`);
      return null;
    }

    // Check if already earned
    const alreadyHas = await this.userHasBadge(userId, badge.id);
    if (alreadyHas) {
      return null;
    }

    // Award badge
    await this.createUserBadge(userId, badge.id);

    console.log(`🏅 Awarded badge "${badge.name}" to user ${userId}`);
    
    return { badge, isNew: true };
  }

  /**
   * Check and award all applicable badges for a user
   * Call this after complaint creation, likes, or resolution
   */
  async checkAndAwardBadges(
    userId: string,
    department?: string
  ): Promise<NewBadgeResult[]> {
    const newBadges: NewBadgeResult[] = [];

    try {
      console.log(`[BadgeService] Checking badges for user ${userId}, department: ${department}`);
      
      // Get all badges and user stats
      const [allBadges, stats, earnedBadgeIds] = await Promise.all([
        this.getAllBadges(),
        this.getUserStats(userId),
        this.getUserEarnedBadgeIds(userId),
      ]);

      console.log(`[BadgeService] Found ${allBadges.length} total badges, user has ${earnedBadgeIds.length} earned`);
      console.log(`[BadgeService] User stats:`, JSON.stringify(stats));

      const earnedBadgeIdSet = new Set(earnedBadgeIds);

      // Check each badge
      for (const badge of allBadges) {
        // Skip if already earned
        if (earnedBadgeIdSet.has(badge.id)) continue;

        // Check qualification
        const qualifies = this.checkBadgeQualification(badge, stats, department);
        if (qualifies) {
          console.log(`[BadgeService] User qualifies for badge: ${badge.slug} (threshold: ${badge.threshold})`);
          const result = await this.awardBadge(userId, badge.slug);
          if (result) {
            newBadges.push(result);
          }
        }
      }
    } catch (error) {
      console.error("[BadgeService] Error checking/awarding badges:", error);
    }

    return newBadges;
  }

  /**
   * Check badges specifically after a complaint is created
   */
  async checkBadgesAfterComplaint(userId: string, department: string): Promise<NewBadgeResult[]> {
    return this.checkAndAwardBadges(userId, department);
  }

  /**
   * Check badges after a complaint is resolved
   */
  async checkBadgesAfterResolution(userId: string): Promise<NewBadgeResult[]> {
    return this.checkAndAwardBadges(userId);
  }
}

// Singleton instance
let badgeServiceInstance: BadgeService | null = null;

export function getBadgeService(db: PrismaClient): BadgeService {
  if (!badgeServiceInstance) {
    badgeServiceInstance = new BadgeService(db);
  }
  return badgeServiceInstance;
}
