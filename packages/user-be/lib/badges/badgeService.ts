/**
 * Badge Service
 * 
 * Handles badge checking, awarding, and retrieval logic.
 * Checks user activity against badge thresholds and awards badges automatically.
 */

// Type definitions for Badge entities (will be available after prisma generate)
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

interface UserBadge {
  id: string;
  userId: string;
  badgeId: string;
  earnedAt: Date;
  notified: boolean;
  badge?: Badge;
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

export interface BadgeWithEarned extends Badge {
  earned: boolean;
  earnedAt?: Date;
}

export interface NewBadgeResult {
  badge: Badge;
  isNew: boolean;
}

interface UserStats {
  totalComplaints: number;
  resolvedComplaints: number;
  totalLikesReceived: number;
  maxSingleComplaintLikes: number;
  categoryCountMap: Record<string, number>;
}

export class BadgeService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private db: any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(db: any) {
    this.db = db;
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
    // Check if already earned
    const existing = await this.db.userBadge.findFirst({
      where: {
        userId,
        badge: { slug: badgeSlug },
      },
    });

    if (existing) {
      return null;
    }

    // Get badge
    const badge = await this.db.badge.findUnique({
      where: { slug: badgeSlug },
    });

    if (!badge) {
      console.error(`Badge not found: ${badgeSlug}`);
      return null;
    }

    // Award badge
    await this.db.userBadge.create({
      data: {
        userId,
        badgeId: badge.id,
      },
    });

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

    // Get all badges and user stats
    const [allBadges, stats, earnedBadges] = await Promise.all([
      this.db.badge.findMany(),
      this.getUserStats(userId),
      this.db.userBadge.findMany({
        where: { userId },
        select: { badgeId: true },
      }),
    ]);

    const earnedBadgeIds = new Set(earnedBadges.map((eb: { badgeId: string }) => eb.badgeId));

    // Check each badge
    for (const badge of allBadges) {
      // Skip if already earned
      if (earnedBadgeIds.has(badge.id)) continue;

      // Check qualification
      if (this.checkBadgeQualification(badge, stats, department)) {
        const result = await this.awardBadge(userId, badge.slug);
        if (result) {
          newBadges.push(result);
        }
      }
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
   * Check badges after a like is received
   * This should be called with the complaint OWNER's userId
   */
  async checkBadgesAfterLike(complaintOwnerId: string, newLikeCount: number): Promise<NewBadgeResult[]> {
    const newBadges: NewBadgeResult[] = [];
    
    // Check trending_voice (single complaint with 50+ likes)
    if (newLikeCount >= 50) {
      const result = await this.awardBadge(complaintOwnerId, "trending_voice");
      if (result) newBadges.push(result);
    }

    // Check total likes badges
    const otherBadges = await this.checkAndAwardBadges(complaintOwnerId);
    newBadges.push(...otherBadges);

    return newBadges;
  }

  /**
   * Check badges after a complaint is resolved
   */
  async checkBadgesAfterResolution(userId: string): Promise<NewBadgeResult[]> {
    return this.checkAndAwardBadges(userId);
  }

  /**
   * Get all badges with user's earned status
   */
  async getAllBadgesWithStatus(userId: string): Promise<BadgeWithEarned[]> {
    const [allBadges, userBadges] = await Promise.all([
      this.db.badge.findMany({
        orderBy: [
          { category: "asc" },
          { threshold: "asc" },
        ],
      }),
      this.db.userBadge.findMany({
        where: { userId },
        include: { badge: true },
      }),
    ]);

    const earnedMap = new Map<string, Date>(
      userBadges.map((ub: { badgeId: string; earnedAt: Date }) => [ub.badgeId, ub.earnedAt])
    );

    return allBadges.map((badge: Badge) => ({
      ...badge,
      earned: earnedMap.has(badge.id),
      earnedAt: earnedMap.get(badge.id),
    }));
  }

  /**
   * Get only user's earned badges
   */
  async getUserBadges(userId: string): Promise<(Badge & { earnedAt: Date })[]> {
    const userBadges = await this.db.userBadge.findMany({
      where: { userId },
      include: { badge: true },
      orderBy: { earnedAt: "desc" },
    });

    return userBadges.map((ub: { badge: Badge; earnedAt: Date }) => ({
      ...ub.badge,
      earnedAt: ub.earnedAt,
    }));
  }

  /**
   * Get recently earned badges that haven't been notified
   */
  async getUnnotifiedBadges(userId: string): Promise<Badge[]> {
    const unnotified = await this.db.userBadge.findMany({
      where: {
        userId,
        notified: false,
      },
      include: { badge: true },
    });

    // Mark as notified
    if (unnotified.length > 0) {
      await this.db.userBadge.updateMany({
        where: {
          userId,
          notified: false,
        },
        data: { notified: true },
      });
    }

    return unnotified.map((ub: { badge: Badge }) => ub.badge);
  }

  /**
   * Get badge progress for a user (percentage towards next badge in each category)
   */
  async getBadgeProgress(userId: string) {
    const stats = await this.getUserStats(userId);
    const earnedBadges = await this.db.userBadge.findMany({
      where: { userId },
      include: { badge: true },
    });
    const earnedSlugs = new Set(earnedBadges.map((eb: { badge: Badge }) => eb.badge.slug));

    // Find next badge in each category
    const allBadges: Badge[] = await this.db.badge.findMany({
      orderBy: { threshold: "asc" },
    });

    const progress = {
      complaints: { current: stats.totalComplaints, next: 0, percentage: 0, nextBadge: null as string | null },
      likes: { current: stats.totalLikesReceived, next: 0, percentage: 0, nextBadge: null as string | null },
      resolved: { current: stats.resolvedComplaints, next: 0, percentage: 0, nextBadge: null as string | null },
    };

    // Find next unearned badge for complaints
    const filingBadges = allBadges.filter((b: Badge) => b.category === "FILING");
    for (const badge of filingBadges) {
      if (!earnedSlugs.has(badge.slug)) {
        progress.complaints.next = badge.threshold;
        progress.complaints.nextBadge = badge.name;
        progress.complaints.percentage = Math.min(100, Math.round((stats.totalComplaints / badge.threshold) * 100));
        break;
      }
    }

    // Find next unearned badge for likes
    const engagementBadges = allBadges.filter(
      (b: Badge) => b.category === "ENGAGEMENT" && BADGE_THRESHOLD_TYPES[b.slug] === "likes_received"
    );
    for (const badge of engagementBadges) {
      if (!earnedSlugs.has(badge.slug)) {
        progress.likes.next = badge.threshold;
        progress.likes.nextBadge = badge.name;
        progress.likes.percentage = Math.min(100, Math.round((stats.totalLikesReceived / badge.threshold) * 100));
        break;
      }
    }

    // Find next unearned badge for resolved
    const resolutionBadges = allBadges.filter((b: Badge) => b.category === "RESOLUTION");
    for (const badge of resolutionBadges) {
      if (!earnedSlugs.has(badge.slug)) {
        progress.resolved.next = badge.threshold;
        progress.resolved.nextBadge = badge.name;
        progress.resolved.percentage = Math.min(100, Math.round((stats.resolvedComplaints / badge.threshold) * 100));
        break;
      }
    }

    return progress;
  }
}

// Singleton instance
let badgeServiceInstance: BadgeService | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getBadgeService(db: any): BadgeService {
  if (!badgeServiceInstance) {
    badgeServiceInstance = new BadgeService(db);
  }
  return badgeServiceInstance;
}