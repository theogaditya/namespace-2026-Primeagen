"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge, RARITY_COLORS } from "@/types/badges";
import { BadgeIcon } from "./BadgeIcon";
import { X, PartyPopper, Sparkles } from "lucide-react";

interface NewBadgeNotificationProps {
  onDismiss?: () => void;
  checkInterval?: number; // How often to check for new badges (ms)
}

// Sparkle particle component for celebration effect
function CelebrationParticles({ show }: { show: boolean }) {
  if (!show) return null;
  
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ 
            opacity: 0, 
            scale: 0,
            x: "50%",
            y: "50%"
          }}
          animate={{ 
            opacity: [0, 1, 0],
            scale: [0, 1, 0.5],
            x: `${50 + (Math.random() - 0.5) * 150}%`,
            y: `${50 + (Math.random() - 0.5) * 150}%`,
          }}
          transition={{
            duration: 1.5,
            delay: i * 0.1,
            repeat: Infinity,
            repeatDelay: 1
          }}
          className="absolute"
        >
          <Sparkles className="w-4 h-4 text-amber-400" />
        </motion.div>
      ))}
    </div>
  );
}

export function NewBadgeNotification({ 
  onDismiss, 
  checkInterval = 30000 // Check every 30 seconds
}: NewBadgeNotificationProps) {
  const [newBadges, setNewBadges] = useState<Badge[]>([]);
  const [currentBadgeIndex, setCurrentBadgeIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    // Check on mount
    checkForNewBadges();
    
    // Set up interval to check periodically
    const interval = setInterval(checkForNewBadges, checkInterval);
    return () => clearInterval(interval);
  }, [checkInterval]);

  const checkForNewBadges = async () => {
    try {
      // Get auth token from localStorage
      const authToken = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      
      if (!authToken) {
        return; // Not authenticated, skip check
      }
      
      const response = await fetch("/api/badges/recent", {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      const data = await response.json();
      
      if (data.success && data.hasNew && data.badges.length > 0) {
        setNewBadges(data.badges);
        setCurrentBadgeIndex(0);
        setIsVisible(true);
        
        // Show celebration particles for epic/legendary badges
        if (data.badges.some((b: Badge) => b.rarity === "EPIC" || b.rarity === "LEGENDARY")) {
          setShowCelebration(true);
        }
      }
    } catch (error) {
      console.error("Failed to check for new badges:", error);
    }
  };

  const handleDismiss = () => {
    if (currentBadgeIndex < newBadges.length - 1) {
      setCurrentBadgeIndex(prev => prev + 1);
    } else {
      setIsVisible(false);
      setNewBadges([]);
      setShowCelebration(false);
      onDismiss?.();
    }
  };

  const currentBadge = newBadges[currentBadgeIndex];

  if (!isVisible || !currentBadge) return null;

  const colors = RARITY_COLORS[currentBadge.rarity];
  const isSpecialRarity = currentBadge.rarity === "EPIC" || currentBadge.rarity === "LEGENDARY";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100, scale: 0.8 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 100, scale: 0.8 }}
        className="fixed bottom-4 right-4 z-50 max-w-sm"
      >
        <div className={`
          relative overflow-hidden rounded-2xl border-2 shadow-xl
          ${colors.border} ${colors.glow}
          bg-white
        `}>
          {/* Background gradient */}
          <div className={`absolute inset-0 ${colors.bg} opacity-30`} />
          
          {/* Celebration particles for special badges */}
          <CelebrationParticles show={showCelebration && isSpecialRarity} />
          
          {/* Dismiss button */}
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 p-1 hover:bg-black/10 rounded-full transition-colors z-10"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>

          <div className="relative p-4">
            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
              <PartyPopper className="w-5 h-5 text-amber-500" />
              <span className="text-sm font-bold text-amber-600">
                New Achievement!
              </span>
              {newBadges.length > 1 && (
                <span className="text-xs text-gray-400 ml-auto">
                  {currentBadgeIndex + 1}/{newBadges.length}
                </span>
              )}
            </div>

            {/* Badge Display */}
            <div className="flex items-center gap-4">
              <motion.div
                initial={{ rotate: -10, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ 
                  type: "spring", 
                  stiffness: 200, 
                  damping: 10,
                  delay: 0.2 
                }}
              >
                <BadgeIcon 
                  badge={{ ...currentBadge, earned: true } as any} 
                  size="lg" 
                  showTooltip={false} 
                />
              </motion.div>
              
              <div className="flex-1">
                <motion.h3
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className={`font-bold text-lg ${colors.text}`}
                >
                  {currentBadge.name}
                </motion.h3>
                <motion.p
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-sm text-gray-600"
                >
                  {currentBadge.description}
                </motion.p>
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className={`
                    inline-block mt-2 text-xs px-2 py-0.5 rounded-full font-medium
                    ${colors.bg} ${colors.text}
                  `}
                >
                  {currentBadge.rarity}
                </motion.span>
              </div>
            </div>

            {/* Action */}
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              onClick={handleDismiss}
              className={`
                w-full mt-4 py-2 rounded-xl font-medium text-sm
                transition-colors
                ${colors.bg} ${colors.text} hover:opacity-80
              `}
            >
              {currentBadgeIndex < newBadges.length - 1 ? "Next Badge →" : "Awesome! 🎉"}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
