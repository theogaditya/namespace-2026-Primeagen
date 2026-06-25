"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Trophy,
  Lock,
  Info,
  Building2,
  Newspaper,
  Medal,
  Megaphone,
  Shield,
  Lightbulb,
  Heart,
  Star,
  Award,
  CheckSquare,
} from "lucide-react";

/* ─── Badge visual map ─── */
const BADGE_ICONS: Record<string, { icon: React.ReactNode; color: string }> = {
  urbanist: { icon: <Building2 className="w-8 h-8 text-white" />, color: "#F9BC38" },
  reporter: { icon: <Newspaper className="w-8 h-8 text-white" />, color: "#A855F7" },
  veteran: { icon: <Medal className="w-8 h-8 text-white" />, color: "#6366F1" },
  voice: { icon: <Megaphone className="w-8 h-8 text-white" />, color: "#10B981" },
  guardian: { icon: <Shield className="w-8 h-8 text-white" />, color: "#3B82F6" },
  innovator: { icon: <Lightbulb className="w-8 h-8 text-white" />, color: "#F59E0B" },
  helper: { icon: <Heart className="w-8 h-8 text-white" />, color: "#EC4899" },
  champion: { icon: <Star className="w-8 h-8 text-white" />, color: "#8B5CF6" },
  foundation: { icon: <Award className="w-8 h-8 text-white" />, color: "#CD7F32" },
  "fact checker": { icon: <CheckSquare className="w-8 h-8 text-white" />, color: "#630ed4" },
};

function getBadgeVisual(name: string) {
  const key = name.toLowerCase().replace(/\s+/g, " ").trim();
  if (BADGE_ICONS[key]) return BADGE_ICONS[key];
  const keyNoSpace = key.replace(/\s+/g, "");
  if (BADGE_ICONS[keyNoSpace]) return BADGE_ICONS[keyNoSpace];
  const colors = ["#F9BC38", "#A855F7", "#6366F1", "#10B981", "#3B82F6", "#F59E0B", "#EC4899", "#8B5CF6"];
  const idx = name.length % colors.length;
  return { icon: <Trophy className="w-8 h-8 text-white" />, color: colors[idx] };
}

/* ─── Rarity badge style ─── */
const RARITY_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  legendary: { bg: "bg-yellow-100", text: "text-amber-800", border: "border-amber-200" },
  epic: { bg: "bg-purple-100", text: "text-purple-800", border: "border-purple-200" },
  rare: { bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-200" },
  uncommon: { bg: "bg-emerald-100", text: "text-emerald-800", border: "border-emerald-200" },
  bronze: { bg: "bg-orange-100", text: "text-orange-900", border: "border-orange-200" },
  common: { bg: "bg-slate-100", text: "text-slate-600", border: "border-slate-200" },
};

function getRarityStyle(rarity?: string) {
  return RARITY_STYLE[(rarity || "common").toLowerCase()] || RARITY_STYLE.common;
}

/* ─── Category tabs: badges can be tagged by category ─── */
const TABS = ["All", "Filing", "Engagement", "Resolution", "Specialist"];

interface Badge {
  id: string;
  name: string;
  icon: string;
  description?: string;
  rarity?: string;
  earned: boolean;
  earnedAt?: string | null;
  category?: string;
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

interface AllBadgesModalProps {
  isOpen: boolean;
  onClose: () => void;
  badges: Badge[];
  stats: StatsData | null;
  onNavigateDashboard?: () => void;
}

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const modalVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.96 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 300, damping: 28 } },
  exit: { opacity: 0, y: 40, scale: 0.96, transition: { duration: 0.2 } },
};

const badgeCardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
};

export default function AllBadgesModal({
  isOpen,
  onClose,
  badges,
  stats,
  onNavigateDashboard,
}: AllBadgesModalProps) {
  const [activeTab, setActiveTab] = useState("All");

  const earnedCount = badges.filter((b) => b.earned).length;
  const totalCount = badges.length || 21;
  const progressPct = totalCount > 0 ? Math.round((earnedCount / totalCount) * 100) : 0;

  const filteredBadges = useMemo(() => {
    if (activeTab === "All") return badges;
    return badges.filter((b) => (b.category || "").toLowerCase() === activeTab.toLowerCase());
  }, [badges, activeTab]);

  function formatEarnedDate(dateStr?: string | null) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" }).toUpperCase();
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-[var(--dash-on-surface)]/20 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.main
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative z-10 w-full max-w-5xl bg-white shadow-2xl rounded-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* ─── Header ─── */}
            <header className="p-6 md:p-8 flex flex-col gap-6 border-b border-slate-200/40 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[var(--dash-primary)]/10 rounded-lg flex items-center justify-center text-[var(--dash-primary)]">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <h1 className="font-[var(--font-headline)] text-2xl font-bold tracking-tight text-[var(--dash-on-surface)]">
                    All Badges
                  </h1>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Progress Cluster */}
              <div className="bg-[var(--dash-surface)] p-5 rounded-2xl flex flex-col md:flex-row md:items-center gap-6">
                <div className="flex-1">
                  <div className="flex justify-between items-end mb-2">
                    <span className="font-[var(--font-headline)] font-bold text-slate-600 text-sm">
                      Collection Progress
                    </span>
                    <div className="bg-amber-100 text-amber-700 px-3 py-1 rounded-lg text-xs font-black flex items-center gap-2 border border-amber-200">
                      <Trophy className="w-3.5 h-3.5" />
                      {earnedCount} / {totalCount}
                    </div>
                  </div>
                  <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-[var(--dash-primary)] to-[var(--dash-primary-container)] rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPct}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                  </div>
                </div>
                <div className="flex gap-4 border-l border-slate-200 md:pl-6">
                  <div className="text-center">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Mastery</p>
                    <p className="font-[var(--font-headline)] font-bold text-[var(--dash-on-surface)]">
                      {progressPct}%
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Rank</p>
                    <p className="font-[var(--font-headline)] font-bold text-[var(--dash-on-surface)]">
                      {stats?.levelName || "Newcomer"}
                    </p>
                  </div>
                </div>
              </div>
            </header>

            {/* ─── Category Tabs ─── */}
            <nav className="px-8 pt-4 flex gap-8 overflow-x-auto border-b border-slate-100 shrink-0 bg-white">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-4 text-sm font-medium whitespace-nowrap transition-colors ${
                    activeTab === tab
                      ? "text-[var(--dash-primary)] font-semibold border-b-2 border-[var(--dash-primary)]"
                      : "text-slate-500 hover:text-[var(--dash-primary)]"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </nav>

            {/* ─── Badge Grid ─── */}
            <section className="flex-1 overflow-y-auto p-8 bg-white">
              <motion.div
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8"
                initial="hidden"
                animate="visible"
                variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
              >
                {filteredBadges.map((badge) => {
                  const visual = getBadgeVisual(badge.name);
                  const rarityStyle = getRarityStyle(badge.rarity);

                  if (!badge.earned) {
                    return (
                      <motion.article
                        key={badge.id}
                        variants={badgeCardVariants}
                        className="flex flex-col items-center text-center group opacity-50 grayscale"
                      >
                        <div className="w-20 h-20 bg-slate-200 pixel-badge flex items-center justify-center transition-transform group-hover:-translate-y-1 mb-4">
                          <Lock className="w-8 h-8 text-slate-400" />
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-black tracking-widest mb-2 border border-slate-200 uppercase">
                          Locked
                        </span>
                        <h3 className="font-[var(--font-headline)] font-bold text-slate-500 text-base mb-1">
                          {badge.name}
                        </h3>
                        <p className="text-[11px] text-slate-400 leading-tight">
                          {badge.description || "???"}
                        </p>
                        <p className="text-[9px] text-slate-400 font-bold mt-2 uppercase italic tracking-tighter">
                          Locked
                        </p>
                      </motion.article>
                    );
                  }

                  return (
                    <motion.article
                      key={badge.id}
                      variants={badgeCardVariants}
                      className="flex flex-col items-center text-center group"
                    >
                      <div
                        className="w-20 h-20 pixel-badge flex items-center justify-center transition-transform group-hover:-translate-y-1 mb-4"
                        style={{ backgroundColor: visual.color }}
                      >
                        {visual.icon}
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full ${rarityStyle.bg} ${rarityStyle.text} text-[10px] font-black tracking-widest mb-2 border ${rarityStyle.border} uppercase`}
                      >
                        {badge.rarity || "Common"}
                      </span>
                      <h3 className="font-[var(--font-headline)] font-bold text-[var(--dash-on-surface)] text-base mb-1">
                        {badge.name}
                      </h3>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        {badge.description || ""}
                      </p>
                      {badge.earnedAt && (
                        <p className="text-[9px] text-emerald-600 font-bold mt-2 uppercase tracking-tighter">
                          Earned {formatEarnedDate(badge.earnedAt)}
                        </p>
                      )}
                    </motion.article>
                  );
                })}
              </motion.div>

              {filteredBadges.length === 0 && (
                <div className="py-16 text-center text-slate-400 text-sm">
                  No badges found in this category.
                </div>
              )}
            </section>

            {/* ─── Footer ─── */}
            <footer className="p-6 bg-[var(--dash-surface)] border-t border-slate-200/40 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
              <p className="text-xs text-slate-500 flex items-center gap-2">
                <Info className="w-3.5 h-3.5" />
                Earn more badges by completing daily <b>Quests</b> and <b>Regional Tasks</b>.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-semibold text-[var(--dash-primary)] hover:bg-slate-100 transition-all rounded-lg"
                >
                  View Quests
                </button>
                <button
                  onClick={() => {
                    onClose();
                    onNavigateDashboard?.();
                  }}
                  className="px-6 py-2 bg-gradient-to-r from-[var(--dash-primary)] to-[var(--dash-primary-container)] text-white text-sm font-bold rounded-lg shadow-md hover:shadow-lg active:scale-95 transition-all"
                >
                  Go to Dashboard
                </button>
              </div>
            </footer>
          </motion.main>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
