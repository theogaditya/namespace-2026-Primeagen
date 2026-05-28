/**
 * Badge Types
 * 
 * Type definitions for the badge/achievement system
 */

export type BadgeCategory = "FILING" | "ENGAGEMENT" | "RESOLUTION" | "CATEGORY_SPECIALIST";
export type BadgeRarity = "COMMON" | "UNCOMMON" | "RARE" | "EPIC" | "LEGENDARY";

export interface Badge {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  category: BadgeCategory;
  rarity: BadgeRarity;
  threshold: number;
  createdAt: string;
}

export interface BadgeWithEarned extends Badge {
  earned: boolean;
  earnedAt?: string;
}

export interface UserBadge extends Badge {
  earnedAt: string;
}

export interface BadgeProgress {
  current: number;
  next: number;
  percentage: number;
  nextBadge: string | null;
}

export interface BadgeStats {
  totalBadges: number;
  earnedCount: number;
  percentage: number;
  userStats: {
    totalComplaints: number;
    resolvedComplaints: number;
    totalLikesReceived: number;
    maxSingleComplaintLikes: number;
    categoryCountMap: Record<string, number>;
  };
  progress: {
    complaints: BadgeProgress;
    likes: BadgeProgress;
    resolved: BadgeProgress;
  };
  rarityStats: {
    COMMON: { total: number; earned: number };
    UNCOMMON: { total: number; earned: number };
    RARE: { total: number; earned: number };
    EPIC: { total: number; earned: number };
    LEGENDARY: { total: number; earned: number };
  };
  recentBadges: BadgeWithEarned[];
}

export interface BadgesResponse {
  success: boolean;
  badges: BadgeWithEarned[];
  grouped: {
    FILING: BadgeWithEarned[];
    ENGAGEMENT: BadgeWithEarned[];
    RESOLUTION: BadgeWithEarned[];
    CATEGORY_SPECIALIST: BadgeWithEarned[];
  };
  totalBadges: number;
  earnedCount: number;
}

export interface UserBadgesResponse {
  success: boolean;
  badges: UserBadge[];
  count: number;
}

export interface RecentBadgesResponse {
  success: boolean;
  badges: Badge[];
  hasNew: boolean;
}

export interface BadgeStatsResponse {
  success: boolean;
  stats: BadgeStats;
}

// Rarity color mapping
export const RARITY_COLORS: Record<BadgeRarity, { bg: string; text: string; border: string; glow: string }> = {
  COMMON: {
    bg: "bg-gray-100",
    text: "text-gray-700",
    border: "border-gray-300",
    glow: "",
  },
  UNCOMMON: {
    bg: "bg-green-100",
    text: "text-green-700",
    border: "border-green-400",
    glow: "",
  },
  RARE: {
    bg: "bg-blue-100",
    text: "text-blue-700",
    border: "border-blue-400",
    glow: "shadow-blue-200",
  },
  EPIC: {
    bg: "bg-purple-100",
    text: "text-purple-700",
    border: "border-purple-400",
    glow: "shadow-purple-300",
  },
  LEGENDARY: {
    bg: "bg-gradient-to-br from-amber-100 to-yellow-100",
    text: "text-amber-700",
    border: "border-amber-400",
    glow: "shadow-amber-300 shadow-lg",
  },
};

// Category labels
export const CATEGORY_LABELS: Record<BadgeCategory, string> = {
  FILING: "Filing",
  ENGAGEMENT: "Engagement",
  RESOLUTION: "Resolution",
  CATEGORY_SPECIALIST: "Specialist",
};

// Category icons (Lucide icon names)
export const CATEGORY_ICONS: Record<BadgeCategory, string> = {
  FILING: "FileText",
  ENGAGEMENT: "Heart",
  RESOLUTION: "CheckCircle",
  CATEGORY_SPECIALIST: "Award",
};
