"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  BadgeWithEarned,
  CATEGORY_LABELS,
  BadgeCategory,
} from "@/types/badges";
import { BadgeIcon, BadgeCard } from "./BadgeIcon";
import {
  Award,
  ChevronRight,
  Trophy,
  X,
  FileText,
  Heart,
  CheckCircle,
  Star,
} from "lucide-react";

interface BadgeShowcaseProps {
  maxDisplay?: number;
  showViewAll?: boolean;
  compact?: boolean;
}

const categoryIcons: Record<BadgeCategory, React.ReactNode> = {
  FILING: <FileText className="w-4 h-4" />,
  ENGAGEMENT: <Heart className="w-4 h-4" />,
  RESOLUTION: <CheckCircle className="w-4 h-4" />,
  CATEGORY_SPECIALIST: <Star className="w-4 h-4" />,
};

export function BadgeShowcase({ maxDisplay = 5, showViewAll = true, compact = false }: BadgeShowcaseProps) {
  const [badges, setBadges] = useState<BadgeWithEarned[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllModal, setShowAllModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<BadgeCategory | "ALL">("ALL");
  const [selectedBadge, setSelectedBadge] = useState<BadgeWithEarned | null>(null);

  useEffect(() => {
    fetchBadges();
  }, []);

  const fetchBadges = async () => {
    try {
      setLoading(true);
      const authToken = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      
      if (!authToken) {
        setError("Not authenticated");
        setLoading(false);
        return;
      }
      
      const response = await fetch("/api/badges", {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      const data = await response.json();
      
      if (data.success) {
        setBadges(data.badges);
      } else {
        setError(data.error || "Failed to fetch badges");
      }
    } catch (err) {
      setError("Failed to fetch badges");
    } finally {
      setLoading(false);
    }
  };

  const earnedBadges = badges.filter(b => b.earned);
  const displayBadges = earnedBadges.slice(0, maxDisplay);
  const totalEarned = earnedBadges.length;
  const totalBadges = badges.length;

  const filteredBadges = selectedCategory === "ALL" 
    ? badges 
    : badges.filter(b => b.category === selectedCategory);

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-5 h-5 bg-gray-200 rounded" />
          <div className="h-4 bg-gray-200 rounded w-20" />
        </div>
        <div className="flex gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="w-14 h-14 bg-gray-200 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return null;
  }

  if (compact) {
    return (
      <div className="space-y-3 relative">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-semibold text-gray-700">Badges</span>
          </div>
          <span className="text-sm text-gray-500">
            <span className="font-semibold text-gray-800">{totalEarned}</span>/{totalBadges}
          </span>
        </div>
        
        {/* Badge icons row */}
        <div className="flex items-center gap-2 flex-wrap">
          {displayBadges.length > 0 ? (
            <>
              {displayBadges.map((badge, i) => (
                <motion.div
                  key={badge.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.08 }}
                  onClick={() => setSelectedBadge(selectedBadge?.id === badge.id ? null : badge)}
                  className="cursor-pointer"
                >
                  <BadgeIcon badge={badge} size="sm" showTooltip={false} />
                </motion.div>
              ))}
              {totalEarned > maxDisplay && showViewAll && (
                <button
                  onClick={() => setShowAllModal(true)}
                  className="w-14 h-14 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
                >
                  <span className="text-xs font-semibold">+{totalEarned - maxDisplay}</span>
                </button>
              )}
            </>
          ) : (
            <p className="text-xs text-gray-400">No badges yet</p>
          )}
        </div>

        {/* Badge Info Tooltip */}
        <AnimatePresence>
          {selectedBadge && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white rounded-xl shadow-lg border border-gray-200 p-3 mt-2"
            >
              <div className="flex items-start gap-3">
                <BadgeIcon badge={selectedBadge} size="sm" showTooltip={false} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-gray-900 text-sm">{selectedBadge.name}</h4>
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full font-medium",
                      selectedBadge.rarity === "LEGENDARY" ? "bg-amber-100 text-amber-700" :
                      selectedBadge.rarity === "EPIC" ? "bg-purple-100 text-purple-700" :
                      selectedBadge.rarity === "RARE" ? "bg-blue-100 text-blue-700" :
                      selectedBadge.rarity === "UNCOMMON" ? "bg-emerald-100 text-emerald-700" :
                      "bg-orange-100 text-orange-700"
                    )}>
                      {selectedBadge.rarity === "COMMON" ? "Bronze" : selectedBadge.rarity.charAt(0) + selectedBadge.rarity.slice(1).toLowerCase()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">{selectedBadge.description}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Category: {CATEGORY_LABELS[selectedBadge.category]}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedBadge(null)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* View all link */}
        {showViewAll && totalBadges > 0 && (
          <button
            onClick={() => setShowAllModal(true)}
            className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            View all badges 
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}

        <AllBadgesModal
          isOpen={showAllModal}
          onClose={() => setShowAllModal(false)}
          badges={badges}
          filteredBadges={filteredBadges}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          totalEarned={totalEarned}
          totalBadges={totalBadges}
          categoryIcons={categoryIcons}
        />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Header - Eye-catching design */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-amber-400/30 rounded-xl blur-md" />
            <div className="relative w-10 h-10 bg-linear-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-md">
              <Trophy className="w-5 h-5 text-white" />
            </div>
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Achievements</h3>
            <p className="text-xs text-gray-500">Collect badges & rewards</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold bg-linear-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
            {totalEarned}<span className="text-gray-400 text-sm font-normal">/{totalBadges}</span>
          </div>
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">earned</p>
        </div>
      </div>

      {/* Progress bar with gradient */}
      <div className="relative">
        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
          <motion.div
            className="h-full bg-linear-to-r from-amber-400 via-orange-400 to-amber-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(totalEarned / totalBadges) * 100}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
        <p className="text-[10px] text-gray-400 mt-1 text-center">
          {Math.round((totalEarned / totalBadges) * 100)}% complete
        </p>
      </div>

      {/* Badge icons display */}
      <div className="flex items-center gap-3 flex-wrap py-1">
        {displayBadges.length > 0 ? (
          <>
            {displayBadges.map((badge, i) => (
              <motion.div
                key={badge.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.08, type: "spring", stiffness: 200 }}
              >
                <BadgeIcon badge={badge} size="md" />
              </motion.div>
            ))}
            {totalEarned > maxDisplay && (
              <button
                onClick={() => setShowAllModal(true)}
                className="w-[72px] h-[72px] rounded-xl bg-gray-50 border border-gray-200 flex flex-col items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
              >
                <span className="text-base font-semibold">+{totalEarned - maxDisplay}</span>
                <span className="text-[10px]">more</span>
              </button>
            )}
          </>
        ) : (
          <div className="w-full text-center py-6 px-4 bg-linear-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200/50">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Award className="w-6 h-6 text-amber-500" />
            </div>
            <p className="text-sm font-medium text-gray-700">No badges earned yet</p>
            <p className="text-xs text-gray-500 mt-0.5">Start filing complaints to earn badges!</p>
          </div>
        )}
      </div>

      {/* View all button - Better design */}
      {showViewAll && totalBadges > 0 && (
        <motion.button
          onClick={() => setShowAllModal(true)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full py-3 bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 transition-all"
        >
          <Trophy className="w-4 h-4" />
          View All Badges
          <ChevronRight className="w-4 h-4" />
        </motion.button>
      )}

      <AllBadgesModal
        isOpen={showAllModal}
        onClose={() => setShowAllModal(false)}
        badges={badges}
        filteredBadges={filteredBadges}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        totalEarned={totalEarned}
        totalBadges={totalBadges}
        categoryIcons={categoryIcons}
      />
    </motion.div>
  );
}

// Separate modal component
interface AllBadgesModalProps {
  isOpen: boolean;
  onClose: () => void;
  badges: BadgeWithEarned[];
  filteredBadges: BadgeWithEarned[];
  selectedCategory: BadgeCategory | "ALL";
  setSelectedCategory: (cat: BadgeCategory | "ALL") => void;
  totalEarned: number;
  totalBadges: number;
  categoryIcons: Record<BadgeCategory, React.ReactNode>;
}

function AllBadgesModal({
  isOpen,
  onClose,
  badges,
  filteredBadges,
  selectedCategory,
  setSelectedCategory,
  totalEarned,
  totalBadges,
  categoryIcons,
}: AllBadgesModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!mounted) return null;

  // Calculate stats
  const earnedByRarity = {
    COMMON: badges.filter(b => b.rarity === "COMMON" && b.earned).length,
    UNCOMMON: badges.filter(b => b.rarity === "UNCOMMON" && b.earned).length,
    RARE: badges.filter(b => b.rarity === "RARE" && b.earned).length,
    EPIC: badges.filter(b => b.rarity === "EPIC" && b.earned).length,
    LEGENDARY: badges.filter(b => b.rarity === "LEGENDARY" && b.earned).length,
  };

  const totalByRarity = {
    COMMON: badges.filter(b => b.rarity === "COMMON").length,
    UNCOMMON: badges.filter(b => b.rarity === "UNCOMMON").length,
    RARE: badges.filter(b => b.rarity === "RARE").length,
    EPIC: badges.filter(b => b.rarity === "EPIC").length,
    LEGENDARY: badges.filter(b => b.rarity === "LEGENDARY").length,
  };

  const progressPercent = totalBadges > 0 ? Math.round((totalEarned / totalBadges) * 100) : 0;

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ zIndex: 99999 }}
        >
          {/* Clean white backdrop with subtle blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          
          {/* Modal Content */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 30, stiffness: 400 }}
            className="relative w-full max-w-2xl max-h-[85vh] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Main modal container - Clean white design */}
            <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
              
              {/* Header */}
              <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                      <Trophy className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">All Badges</h2>
                      <p className="text-sm text-gray-500">
                        {totalEarned} of {totalBadges} earned
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                {/* Progress section */}
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Collection Progress</span>
                    <span className="text-sm font-semibold text-gray-800">{progressPercent}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-amber-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercent}%` }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                    />
                  </div>
                  
                  {/* Rarity breakdown */}
                  <div className="flex items-center justify-between mt-3 gap-2 flex-wrap">
                    {[
                      { key: "COMMON", label: "Bronze", color: "bg-amber-600" },
                      { key: "UNCOMMON", label: "Uncommon", color: "bg-emerald-500" },
                      { key: "RARE", label: "Rare", color: "bg-blue-500" },
                      { key: "EPIC", label: "Epic", color: "bg-purple-500" },
                      { key: "LEGENDARY", label: "Legendary", color: "bg-yellow-500" },
                    ].map(({ key, label, color }) => (
                      <div key={key} className="flex items-center gap-1.5 text-xs">
                        <div className={cn("w-2 h-2 rounded-full", color)} />
                        <span className="text-gray-500 hidden sm:inline">{label}</span>
                        <span className="text-gray-700 font-medium">
                          {earnedByRarity[key as keyof typeof earnedByRarity]}/{totalByRarity[key as keyof typeof totalByRarity]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Category Filter */}
              <div className="px-4 py-3 border-b border-gray-100 flex gap-2 overflow-x-auto bg-white">
                <button
                  onClick={() => setSelectedCategory("ALL")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                    selectedCategory === "ALL"
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  )}
                >
                  All
                </button>
                {(Object.keys(CATEGORY_LABELS) as BadgeCategory[]).map(cat => {
                  const catEarned = badges.filter(b => b.category === cat && b.earned).length;
                  const catTotal = badges.filter(b => b.category === cat).length;
                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex items-center gap-1.5",
                        selectedCategory === cat
                          ? "bg-gray-900 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      )}
                    >
                      {categoryIcons[cat]}
                      <span>{CATEGORY_LABELS[cat]}</span>
                      <span className={cn(
                        "text-xs px-1.5 py-0.5 rounded-full",
                        selectedCategory === cat ? "bg-white/20" : "bg-gray-200"
                      )}>
                        {catEarned}/{catTotal}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Badge Grid */}
              <div className="p-4 overflow-y-auto bg-gray-50/30" style={{ maxHeight: 'calc(85vh - 280px)' }}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredBadges
                    .sort((a, b) => {
                      // Sort earned first, then by rarity
                      if (a.earned !== b.earned) return b.earned ? 1 : -1;
                      const rarityOrder = { LEGENDARY: 0, EPIC: 1, RARE: 2, UNCOMMON: 3, COMMON: 4 };
                      return rarityOrder[a.rarity] - rarityOrder[b.rarity];
                    })
                    .map((badge, index) => (
                      <motion.div
                        key={badge.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.02, duration: 0.2 }}
                      >
                        <BadgeCard badge={badge} />
                      </motion.div>
                    ))}
                </div>
                
                {filteredBadges.length === 0 && (
                  <div className="text-center py-12">
                    <Award className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">No badges in this category</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Use portal to render modal at document body level
  return createPortal(modalContent, document.body);
}
