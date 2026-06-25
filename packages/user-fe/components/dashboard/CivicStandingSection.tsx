"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  Trophy,
  Lock,
  ArrowRight,
  Building2,
  Newspaper,
  Medal,
  Megaphone,
  Shield,
  Lightbulb,
  Heart,
  Star,
} from "lucide-react";

// Badge icon + color map
const BADGE_ICONS: Record<string, { icon: React.ReactNode; color: string }> = {
  urbanist: { icon: <Building2 className="w-7 h-7 text-white" />, color: "#F9BC38" },
  reporter: { icon: <Newspaper className="w-7 h-7 text-white" />, color: "#A855F7" },
  veteran: { icon: <Medal className="w-7 h-7 text-white" />, color: "#6366F1" },
  voice: { icon: <Megaphone className="w-7 h-7 text-white" />, color: "#10B981" },
  guardian: { icon: <Shield className="w-7 h-7 text-white" />, color: "#3B82F6" },
  innovator: { icon: <Lightbulb className="w-7 h-7 text-white" />, color: "#F59E0B" },
  helper: { icon: <Heart className="w-7 h-7 text-white" />, color: "#EC4899" },
  champion: { icon: <Star className="w-7 h-7 text-white" />, color: "#8B5CF6" },
};

function getBadgeVisual(name: string, icon: string) {
  const key = name.toLowerCase().replace(/\s+/g, "");
  if (BADGE_ICONS[key]) return BADGE_ICONS[key];
  // Fallback: cycle through colors based on icon name
  const colors = ["#F9BC38", "#A855F7", "#6366F1", "#10B981", "#3B82F6", "#F59E0B", "#EC4899", "#8B5CF6"];
  const idx = icon.length % colors.length;
  return { icon: <Trophy className="w-7 h-7 text-white" />, color: colors[idx] };
}

interface StatsData {
  civicScore: number;
  scoreDelta: number;
  levelName: string;
  levelNumber: number;
  currentXP: number;
  xpToNextLevel: number;
  earnedBadges: number;
}

interface Badge {
  id: string;
  name: string;
  icon: string;
  description?: string;
  rarity?: string;
  earned: boolean;
  earnedAt?: string | null;
}

interface CivicStandingSectionProps {
  stats: StatsData | null;
  badges: Badge[];
  userLocality?: string;
  onViewAllBadges?: () => void;
}

export default function CivicStandingSection({
  stats,
  badges,
  userLocality = "your region",
  onViewAllBadges,
}: CivicStandingSectionProps) {
  const [animatedOffset, setAnimatedOffset] = useState(527.7);

  const score = stats?.civicScore ?? 0;
  const maxScore = 1000;
  const circumference = 527.7;
  const targetOffset = circumference - (score / maxScore) * circumference;
  const xpProgress = stats ? ((stats.currentXP % 200) / 200) * 100 : 0;

  const earnedCount = badges.filter((b) => b.earned).length;
  const totalCount = badges.length || 21;

  // Animate donut on mount
  useEffect(() => {
    const timer = setTimeout(() => setAnimatedOffset(targetOffset), 100);
    return () => clearTimeout(timer);
  }, [targetOffset]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="mb-10"
    >
      <div className="bg-white rounded-[2rem] p-6 lg:p-8 border border-slate-200/60 shadow-sm relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12 relative z-10">
          {/* Civic Trust Score - Donut */}
          <div className="flex flex-col items-center text-center shrink-0">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">
              Civic Trust Score
            </p>
            <div className="relative w-48 h-48 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90">
                <circle
                  className="text-slate-100"
                  cx="96"
                  cy="96"
                  fill="transparent"
                  r="84"
                  stroke="currentColor"
                  strokeWidth="12"
                />
                <circle
                  cx="96"
                  cy="96"
                  fill="transparent"
                  r="84"
                  stroke="var(--dash-primary)"
                  strokeDasharray={circumference}
                  strokeDashoffset={animatedOffset}
                  strokeLinecap="round"
                  strokeWidth="12"
                  style={{ transition: "stroke-dashoffset 1.2s ease-out" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-[var(--font-headline)] font-black text-[var(--dash-on-surface)]">
                  {score}
                </span>
                <div className="flex items-center gap-1 text-[var(--dash-tertiary)]">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span className="text-sm font-bold">+{stats?.scoreDelta ?? 0}</span>
                </div>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-lg font-bold text-[var(--dash-on-surface)]">
                Level {stats?.levelNumber ?? 1}: {stats?.levelName ?? "Newcomer"}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                  <div
                    className="bg-[var(--dash-primary)] h-full transition-all duration-700"
                    style={{ width: `${xpProgress}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">
                  {stats?.xpToNextLevel ?? 0} XP to Level {(stats?.levelNumber ?? 0) + 1}
                </span>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="hidden lg:block w-[1px] h-48 bg-slate-200" />

          {/* Achievements / Badges */}
          <div className="flex-1 w-full">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-[var(--font-headline)] font-bold text-slate-800">
                  Your Achievements
                </h3>
                <p className="text-sm text-slate-500">
                  Unlocking the region of {userLocality}...
                </p>
              </div>
              <div className="bg-amber-100 text-amber-700 px-4 py-2 rounded-lg text-sm font-black flex items-center gap-2 border-2 border-amber-200">
                <Trophy className="w-4 h-4" />
                {earnedCount} / {totalCount}
              </div>
            </div>

            {/* Pixel-Art Style Badges — earned row + one locked hint */}
            <div className="flex items-center gap-4 lg:gap-6 overflow-x-auto pb-2 mb-8">
              {badges
                .filter((b) => b.earned)
                .slice(0, 5)
                .map((badge) => {
                  const visual = getBadgeVisual(badge.name, badge.icon);
                  return (
                    <div key={badge.id} className="flex flex-col items-center gap-3 group cursor-pointer shrink-0">
                      <div
                        className="w-16 h-16 pixel-badge flex items-center justify-center transition-transform group-hover:-translate-y-1"
                        style={{ backgroundColor: visual.color }}
                      >
                        {visual.icon}
                      </div>
                      <span className="text-[10px] font-black text-slate-600 uppercase tracking-tighter text-center">
                        {badge.name}
                      </span>
                    </div>
                  );
                })}
              {/* Show one locked hint */}
              {badges.some((b) => !b.earned) && (
                <div className="flex flex-col items-center gap-3 group cursor-pointer shrink-0">
                  <div className="w-16 h-16 bg-slate-200 pixel-badge opacity-40 grayscale flex items-center justify-center transition-transform group-hover:-translate-y-1">
                    <Lock className="w-7 h-7 text-slate-400" />
                  </div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                    Locked
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end border-t border-slate-100 pt-6">
              <button
                onClick={onViewAllBadges}
                className="text-[var(--dash-primary)] font-bold text-sm flex items-center gap-1 group hover:underline"
              >
                View regional milestones
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
