"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  User,
  MapPin,
  Calendar,
  Shield,
  X,
  Award,
  FileText,
  CheckCircle,
  Loader2,
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import { LucideIcon } from "lucide-react";

interface UserProfile {
  id: string;
  name: string;
  status: string;
  memberSince: string;
  location: {
    district: string;
    city: string;
    state: string;
  } | null;
  badges: {
    id: string;
    name: string;
    icon: string;
    rarity: string;
    earnedAt: string;
  }[];
  stats: {
    totalComplaints: number;
    resolvedComplaints: number;
  };
}

interface UserProfilePopupProps {
  userId: string;
  userName: string;
  isOpen: boolean;
  onClose: () => void;
}

// Get Lucide icon component by name
function getIcon(iconName: string): LucideIcon {
  const icons = LucideIcons as unknown as Record<string, LucideIcon>;
  return icons[iconName] || icons["Award"];
}

// Rarity gradient colors for SVG
const RARITY_COLORS: Record<string, { start: string; mid: string; end: string; inner: string }> = {
  COMMON: { start: "#b45309", mid: "#f59e0b", end: "#b45309", inner: "#fef3c7" },
  UNCOMMON: { start: "#10b981", mid: "#34d399", end: "#10b981", inner: "#d1fae5" },
  RARE: { start: "#3b82f6", mid: "#60a5fa", end: "#3b82f6", inner: "#dbeafe" },
  EPIC: { start: "#9333ea", mid: "#a855f7", end: "#9333ea", inner: "#f3e8ff" },
  LEGENDARY: { start: "#f59e0b", mid: "#fbbf24", end: "#f97316", inner: "#fef3c7" },
};

// Rarity icon colors
const RARITY_ICON_COLORS: Record<string, string> = {
  COMMON: "text-amber-700",
  UNCOMMON: "text-emerald-600",
  RARE: "text-blue-600",
  EPIC: "text-purple-600",
  LEGENDARY: "text-amber-600",
};

// Mini hexagonal badge component for the popup
function MiniBadge({ badge }: { badge: { id: string; name: string; icon: string; rarity: string } }) {
  const Icon = getIcon(badge.icon);
  const colors = RARITY_COLORS[badge.rarity] || RARITY_COLORS.COMMON;
  const iconColor = RARITY_ICON_COLORS[badge.rarity] || RARITY_ICON_COLORS.COMMON;
  const hexPath = "M50 0 L93.3 25 L93.3 75 L50 100 L6.7 75 L6.7 25 Z";

  return (
    <div className="relative w-10 h-10 cursor-pointer" title={badge.name}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full drop-shadow-sm">
        <defs>
          <linearGradient id={`popup-badge-gradient-${badge.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.start} />
            <stop offset="50%" stopColor={colors.mid} />
            <stop offset="100%" stopColor={colors.end} />
          </linearGradient>
          <linearGradient id={`popup-badge-inner-${badge.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor={colors.inner} />
          </linearGradient>
        </defs>
        <path d={hexPath} fill={`url(#popup-badge-gradient-${badge.id})`} />
        <path d={hexPath} fill={`url(#popup-badge-inner-${badge.id})`} transform="translate(8, 8) scale(0.84)" />
      </svg>
      <div className={cn("absolute inset-0 flex items-center justify-center", iconColor)}>
        <Icon className="w-5 h-5" strokeWidth={2} />
      </div>
    </div>
  );
}

export function UserProfilePopup({ userId, userName, isOpen, onClose }: UserProfilePopupProps) {
  const [mounted, setMounted] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen && userId) {
      fetchUserProfile();
    }
  }, [isOpen, userId]);

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

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/user/${userId}/profile`);
      const data = await response.json();
      
      if (data.success) {
        setProfile(data.profile);
      } else {
        setError(data.error || "Failed to load profile");
      }
    } catch (err) {
      setError("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

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
          {/* Backdrop */}
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
            className="relative w-full max-w-md overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
              {/* Header with gradient */}
              <div className="relative h-24 bg-linear-to-br from-blue-500 to-indigo-600">
                <button
                  onClick={onClose}
                  className="absolute top-3 right-3 p-1.5 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
              
              {/* Avatar - overlapping header */}
              <div className="px-6 -mt-12 relative">
                <div className="w-20 h-20 rounded-full bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold border-4 border-white shadow-lg">
                  {userName?.[0]?.toUpperCase() || "U"}
                </div>
              </div>

              {/* Content */}
              <div className="px-6 pb-6 pt-3">
                {loading ? (
                  <div className="flex flex-col items-center py-8">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                    <p className="text-sm text-gray-500 mt-2">Loading profile...</p>
                  </div>
                ) : error ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-red-500">{error}</p>
                  </div>
                ) : profile ? (
                  <div className="space-y-4">
                    {/* Name and status */}
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{profile.name}</h2>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full",
                            profile.status === "ACTIVE"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-600"
                          )}
                        >
                          <span
                            className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              profile.status === "ACTIVE" ? "bg-green-500" : "bg-gray-400"
                            )}
                          />
                          {profile.status === "ACTIVE" ? "Active" : profile.status}
                        </span>
                      </div>
                    </div>

                    {/* Info items */}
                    <div className="space-y-2">
                      {profile.location && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span>
                            {[profile.location.city, profile.location.district, profile.location.state]
                              .filter(Boolean)
                              .join(", ")}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>Member since {formatDate(profile.memberSince)}</span>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="bg-gray-50 rounded-xl p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5 mb-1">
                          <FileText className="w-4 h-4 text-blue-500" />
                          <span className="text-lg font-bold text-gray-900">{profile.stats.totalComplaints}</span>
                        </div>
                        <p className="text-xs text-gray-500">Complaints Filed</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5 mb-1">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-lg font-bold text-gray-900">{profile.stats.resolvedComplaints}</span>
                        </div>
                        <p className="text-xs text-gray-500">Resolved</p>
                      </div>
                    </div>

                    {/* Badges */}
                    {profile.badges.length > 0 && (
                      <div className="pt-2">
                        <div className="flex items-center gap-2 mb-3">
                          <Award className="w-4 h-4 text-amber-500" />
                          <h3 className="text-sm font-semibold text-gray-700">Badges Earned</h3>
                          <span className="text-xs text-gray-400">({profile.badges.length})</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {profile.badges.slice(0, 6).map((badge) => (
                            <MiniBadge key={badge.id} badge={badge} />
                          ))}
                          {profile.badges.length > 6 && (
                            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-500">
                              +{profile.badges.length - 6}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {profile.badges.length === 0 && (
                      <div className="pt-2">
                        <div className="flex items-center gap-2 mb-2">
                          <Award className="w-4 h-4 text-gray-400" />
                          <h3 className="text-sm font-semibold text-gray-500">No badges yet</h3>
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
