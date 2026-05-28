"use client";

import React, { useId } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  BadgeWithEarned,
  BadgeRarity,
} from "@/types/badges";
import * as LucideIcons from "lucide-react";
import { Lock, LucideIcon } from "lucide-react";

interface BadgeIconProps {
  badge: BadgeWithEarned;
  size?: "sm" | "md" | "lg" | "xl";
  showTooltip?: boolean;
  onClick?: () => void;
}

// Get Lucide icon component by name
function getIcon(iconName: string): LucideIcon {
  const icons = LucideIcons as unknown as Record<string, LucideIcon>;
  return icons[iconName] || icons["Award"];
}

// Rarity display names
const RARITY_LABELS: Record<BadgeRarity, string> = {
  COMMON: "Bronze",
  UNCOMMON: "Uncommon",
  RARE: "Rare",
  EPIC: "Epic",
  LEGENDARY: "Legendary",
};

// GitHub-style colors for each rarity
const RARITY_STYLES: Record<BadgeRarity, {
  gradient: string;
  border: string;
  glow: string;
  icon: string;
  bg: string;
  label: string;
}> = {
  COMMON: {
    gradient: "from-amber-700 via-orange-500 to-amber-700",
    border: "border-amber-600",
    glow: "shadow-amber-400/40",
    icon: "text-amber-700",
    bg: "bg-amber-50",
    label: "bg-amber-100 text-amber-800",
  },
  UNCOMMON: {
    gradient: "from-emerald-500 via-green-400 to-emerald-500",
    border: "border-emerald-400",
    glow: "shadow-emerald-300/50",
    icon: "text-emerald-600",
    bg: "bg-emerald-50",
    label: "bg-emerald-100 text-emerald-700",
  },
  RARE: {
    gradient: "from-blue-500 via-sky-400 to-blue-500",
    border: "border-blue-400",
    glow: "shadow-blue-300/50",
    icon: "text-blue-600",
    bg: "bg-blue-50",
    label: "bg-blue-100 text-blue-700",
  },
  EPIC: {
    gradient: "from-purple-600 via-violet-500 to-purple-600",
    border: "border-purple-400",
    glow: "shadow-purple-400/50",
    icon: "text-purple-600",
    bg: "bg-purple-50",
    label: "bg-purple-100 text-purple-700",
  },
  LEGENDARY: {
    gradient: "from-amber-500 via-yellow-400 to-orange-500",
    border: "border-amber-400",
    glow: "shadow-amber-400/60",
    icon: "text-amber-600",
    bg: "bg-amber-50",
    label: "bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-700",
  },
};

export function BadgeIcon({ badge, size = "md", showTooltip = true, onClick }: BadgeIconProps) {
  const Icon = getIcon(badge.icon);
  const style = RARITY_STYLES[badge.rarity];
  
  const sizeConfig = {
    sm: { container: "w-14 h-14", icon: "w-6 h-6", hexSize: 52 },
    md: { container: "w-[72px] h-[72px]", icon: "w-8 h-8", hexSize: 68 },
    lg: { container: "w-24 h-24", icon: "w-10 h-10", hexSize: 88 },
    xl: { container: "w-28 h-28", icon: "w-12 h-12", hexSize: 104 },
  };

  const config = sizeConfig[size];

  // SVG hexagon path
  const hexPath = "M50 0 L93.3 25 L93.3 75 L50 100 L6.7 75 L6.7 25 Z";
  
  // Generate unique ID for this badge instance to avoid SVG gradient conflicts
  const reactId = useId();
  const uniqueId = `badge-${badge.id}-${reactId.replace(/:/g, '')}`;

  return (
    <motion.div
      whileHover={badge.earned ? { scale: 1.1, y: -4 } : { scale: 1.02 }}
      whileTap={badge.earned ? { scale: 0.95 } : {}}
      onClick={onClick}
      className={cn(
        "relative cursor-pointer group flex items-center justify-center isolate",
        config.container
      )}
      title={showTooltip ? `${badge.name}: ${badge.description}` : undefined}
    >
      {/* Main badge SVG - the hexagon shape */}
      <svg 
        viewBox="0 0 100 100" 
        className="absolute inset-0 w-full h-full"
        style={{ 
          filter: badge.earned ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : 'none',
          zIndex: 1 
        }}
      >
        <defs>
          {/* Gradient for earned badges */}
          <linearGradient id={`gradient-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={badge.earned ? (
              badge.rarity === "LEGENDARY" ? "#f59e0b" :
              badge.rarity === "EPIC" ? "#9333ea" :
              badge.rarity === "RARE" ? "#3b82f6" :
              badge.rarity === "UNCOMMON" ? "#10b981" : "#b45309"
            ) : "#d1d5db"} />
            <stop offset="50%" stopColor={badge.earned ? (
              badge.rarity === "LEGENDARY" ? "#fbbf24" :
              badge.rarity === "EPIC" ? "#a855f7" :
              badge.rarity === "RARE" ? "#60a5fa" :
              badge.rarity === "UNCOMMON" ? "#34d399" : "#f59e0b"
            ) : "#e5e7eb"} />
            <stop offset="100%" stopColor={badge.earned ? (
              badge.rarity === "LEGENDARY" ? "#f97316" :
              badge.rarity === "EPIC" ? "#9333ea" :
              badge.rarity === "RARE" ? "#3b82f6" :
              badge.rarity === "UNCOMMON" ? "#10b981" : "#b45309"
            ) : "#d1d5db"} />
          </linearGradient>
          
          {/* Inner fill gradient */}
          <linearGradient id={`inner-${uniqueId}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={badge.earned ? "#ffffff" : "#f9fafb"} />
            <stop offset="100%" stopColor={badge.earned ? (
              badge.rarity === "LEGENDARY" ? "#fef3c7" :
              badge.rarity === "EPIC" ? "#f3e8ff" :
              badge.rarity === "RARE" ? "#dbeafe" :
              badge.rarity === "UNCOMMON" ? "#d1fae5" : "#fef3c7"
            ) : "#f3f4f6"} />
          </linearGradient>

          {/* Shine effect */}
          <linearGradient id={`shine-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="white" stopOpacity="0.5" />
            <stop offset="50%" stopColor="white" stopOpacity="0" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
        </defs>
        
        {/* Outer hexagon (border) */}
        <path 
          d={hexPath} 
          fill={`url(#gradient-${uniqueId})`}
          className={badge.earned ? "" : "opacity-50"}
        />
        
        {/* Inner hexagon (background) */}
        <path 
          d={hexPath} 
          fill={`url(#inner-${uniqueId})`}
          transform="translate(8, 8) scale(0.84)"
          className={badge.earned ? "" : "opacity-70"}
        />
        
        {/* Shine overlay for earned */}
        {badge.earned && (
          <path 
            d={hexPath} 
            fill={`url(#shine-${uniqueId})`}
            transform="translate(8, 8) scale(0.84)"
            className="opacity-60"
          />
        )}
      </svg>
      
      {/* Icon - on top of SVG */}
      <div 
        className={cn(
          "relative flex items-center justify-center",
          badge.earned ? style.icon : "text-gray-400"
        )}
        style={{ zIndex: 2 }}
      >
        {badge.earned ? (
          <Icon className={config.icon} strokeWidth={2} />
        ) : (
          <div className="relative">
            <Icon className={cn(config.icon, "opacity-40")} strokeWidth={2} />
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-sm">
              <Lock className="w-2.5 h-2.5 text-gray-400" />
            </div>
          </div>
        )}
      </div>

      {/* Animated particles for legendary */}
      {badge.earned && badge.rarity === "LEGENDARY" && (
        <>
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-amber-400 rounded-full"
              initial={{ opacity: 0, scale: 0 }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0, 1, 0],
                x: [0, (i - 1) * 20],
                y: [0, -20 - i * 5],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.3,
                ease: "easeOut",
              }}
            />
          ))}
        </>
      )}
    </motion.div>
  );
}

interface BadgeCardProps {
  badge: BadgeWithEarned;
  compact?: boolean;
}

export function BadgeCard({ badge, compact = false }: BadgeCardProps) {
  const style = RARITY_STYLES[badge.rarity];

  if (compact) {
    return (
      <motion.div 
        whileHover={{ scale: 1.02 }}
        className={cn(
          "flex items-center gap-3 p-3 rounded-xl border transition-all duration-200",
          badge.earned 
            ? `${style.bg} ${style.border} border-opacity-50` 
            : "bg-gray-50 border-gray-200 opacity-60"
        )}
      >
        <BadgeIcon badge={badge} size="sm" showTooltip={false} />
        <div className="flex-1 min-w-0">
          <p className={cn(
            "font-semibold text-sm truncate",
            badge.earned ? "text-gray-800" : "text-gray-500"
          )}>
            {badge.name}
          </p>
          <p className="text-xs text-gray-500 truncate">{badge.description}</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={badge.earned ? { y: -4, boxShadow: "0 12px 24px -8px rgba(0,0,0,0.15)" } : {}}
      transition={{ duration: 0.2 }}
      className={cn(
        "relative p-5 rounded-2xl border transition-all duration-300",
        badge.earned 
          ? `bg-white ${style.border} border-opacity-40 shadow-sm hover:shadow-xl` 
          : "bg-gray-50/80 border-gray-200 opacity-50"
      )}
    >
      {/* Subtle gradient background for earned */}
      {badge.earned && (
        <div className={cn(
          "absolute inset-0 rounded-2xl opacity-[0.03]",
          `bg-linear-to-br ${style.gradient}`
        )} />
      )}

      <div className="relative flex items-center gap-4">
        {/* Badge icon */}
        <div className="shrink-0">
          <BadgeIcon badge={badge} size="lg" showTooltip={false} />
        </div>
        
        <div className="flex-1 min-w-0">
          {/* Name and rarity */}
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h4 className={cn(
              "font-bold text-base",
              badge.earned ? "text-gray-900" : "text-gray-500"
            )}>
              {badge.name}
            </h4>
            <span className={cn(
              "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider",
              badge.earned ? style.label : "bg-gray-100 text-gray-400"
            )}>
              {RARITY_LABELS[badge.rarity]}
            </span>
          </div>
          
          {/* Description */}
          <p className={cn(
            "text-sm leading-relaxed",
            badge.earned ? "text-gray-600" : "text-gray-400"
          )}>
            {badge.description}
          </p>
          
          {/* Earned date or locked */}
          <div className="mt-2">
            {badge.earned && badge.earnedAt ? (
              <div className="flex items-center gap-2 text-xs">
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  `bg-linear-to-r ${style.gradient}`
                )} />
                <span className="text-gray-500">
                  Earned {new Date(badge.earnedAt).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <Lock className="w-3 h-3" />
                <span>Keep going to unlock!</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
