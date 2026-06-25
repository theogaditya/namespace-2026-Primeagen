"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Complaint,
  STATUS_CONFIG,
  getRelativeTime,
} from "./types";
import {
  Heart,
  Share2,
  Clock,
  TrendingUp,
  Users,
  Sparkles,
  Loader2,
  AlertCircle,
  Building,
  Check,
  Wifi,
  WifiOff,
  RefreshCw,
  ArrowRight,
  Zap,
  Filter,
  Droplets,
  Lightbulb,
  Trash2,
} from "lucide-react";
import { useLikes, useComplaintLike } from "@/contexts/LikeContext";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { UserProfilePopup } from "./UserProfilePopup";

// Sub-tab types for community feed
export type CommunitySubTab = "for-you" | "trending" | "recent";

interface CommunityFeedProps {
  authToken: string | null;
  onComplaintClick: (complaint: Complaint) => void;
}

// Animation variants
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 300, damping: 24 },
  },
  exit: { opacity: 0, y: -10 },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

// ─── Shared: Like button hook wrapper ───────────────────────────────
function LikeButton({ complaintId }: { complaintId: string }) {
  const { liked, count, isLiking, toggle } = useComplaintLike(complaintId);
  return (
    <button
      className={cn(
        "flex items-center gap-1.5 text-sm transition-colors",
        liked ? "text-rose-500" : "text-gray-500 hover:text-rose-500"
      )}
      onClick={(e) => { e.stopPropagation(); if (!isLiking) toggle(); }}
      disabled={isLiking}
    >
      <Heart className={cn("w-4 h-4", liked && "fill-current")} />
      <span>{count}</span>
    </button>
  );
}

function ShareButton({ complaintId, description }: { complaintId: string; description: string }) {
  const [showCopied, setShowCopied] = useState(false);
  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/complaint/${complaintId}`;
    if (navigator.share) {
      try { await navigator.share({ title: "Complaint", text: description.slice(0, 100), url: shareUrl }); return; } catch { /* fallback */ }
    }
    try { await navigator.clipboard.writeText(shareUrl); setShowCopied(true); setTimeout(() => setShowCopied(false), 2000); } catch { /* noop */ }
  };
  return (
    <button onClick={handleShare} className="text-gray-400 hover:text-gray-600 transition-colors">
      {showCopied ? <Check className="w-4 h-4 text-green-500" /> : <Share2 className="w-4 h-4" />}
    </button>
  );
}

// ─── Filter popover ─────────────────────────────────────────────────
type FilterState = {
  status: string | null;
  category: string | null;
};

function FilterPopover({
  isOpen,
  onClose,
  filter,
  onFilterChange,
  complaints,
}: {
  isOpen: boolean;
  onClose: () => void;
  filter: FilterState;
  onFilterChange: (f: FilterState) => void;
  complaints: Complaint[];
}) {
  if (!isOpen) return null;

  const statuses = Array.from(new Set(complaints.map(c => c.status)));
  const categories = Array.from(new Set(complaints.map(c => c.category?.name).filter(Boolean))) as string[];

  return (
    <div className="absolute right-0 top-full mt-1 w-64 bg-white rounded-xl border border-gray-200 shadow-xl z-50 p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-bold text-gray-900">Filters</h4>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
      </div>

      {/* Status filter */}
      <div className="mb-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Status</p>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => onFilterChange({ ...filter, status: null })}
            className={cn("px-2 py-1 text-xs rounded-lg border transition-colors", !filter.status ? "bg-[#630ed4] text-white border-[#630ed4]" : "border-gray-200 text-gray-600 hover:bg-gray-50")}
          >All</button>
          {statuses.map(s => {
            const sc = STATUS_CONFIG[s];
            return (
              <button key={s} onClick={() => onFilterChange({ ...filter, status: s })}
                className={cn("px-2 py-1 text-xs rounded-lg border transition-colors", filter.status === s ? "bg-[#630ed4] text-white border-[#630ed4]" : "border-gray-200 text-gray-600 hover:bg-gray-50")}
              >{sc.label}</button>
            );
          })}
        </div>
      </div>

      {/* Category filter */}
      {categories.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Category</p>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => onFilterChange({ ...filter, category: null })}
              className={cn("px-2 py-1 text-xs rounded-lg border transition-colors", !filter.category ? "bg-[#630ed4] text-white border-[#630ed4]" : "border-gray-200 text-gray-600 hover:bg-gray-50")}
            >All</button>
            {categories.map(c => (
              <button key={c} onClick={() => onFilterChange({ ...filter, category: c })}
                className={cn("px-2 py-1 text-xs rounded-lg border transition-colors", filter.category === c ? "bg-[#630ed4] text-white border-[#630ed4]" : "border-gray-200 text-gray-600 hover:bg-gray-50")}
              >{c}</button>
            ))}
          </div>
        </div>
      )}

      {/* Clear */}
      {(filter.status || filter.category) && (
        <button onClick={() => onFilterChange({ status: null, category: null })}
          className="mt-3 w-full py-1.5 text-xs font-medium text-[#630ed4] border border-[#630ed4]/20 rounded-lg hover:bg-[#630ed4]/5 transition-colors">
          Clear All Filters
        </button>
      )}
    </div>
  );
}

function applyFilter(complaints: Complaint[], filter: FilterState): Complaint[] {
  let result = complaints;
  if (filter.status) result = result.filter(c => c.status === filter.status);
  if (filter.category) result = result.filter(c => c.category?.name === filter.category);
  return result;
}

// ─── Sub-tab navigation (Twitter-style evenly spread) ───────────────
function SubTabNavigation({
  activeTab,
  onTabChange,
}: {
  activeTab: CommunitySubTab;
  onTabChange: (tab: CommunitySubTab) => void;
}) {
  const tabs: { id: CommunitySubTab; label: string }[] = [
    { id: "for-you", label: "For You" },
    { id: "trending", label: "Trending" },
    { id: "recent", label: "Recent" },
  ];

  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="flex">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex-1 py-3.5 text-sm font-semibold transition-colors relative text-center",
                isActive ? "text-[#630ed4]" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              )}
            >
              {tab.label}
              {isActive && (
                <motion.div
                  layoutId="communityTabIndicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#630ed4]"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── TRENDING TAB ───────────────────────────────────────────────────

function TrendingFeaturedCard({
  complaint,
  onClick,
}: {
  complaint: Complaint;
  onClick: () => void;
}) {
  const statusConfig = STATUS_CONFIG[complaint.status];
  return (
    <motion.div
      variants={cardVariants}
      onClick={onClick}
      className="bg-white rounded-2xl border border-gray-200 overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
    >
      <div className="flex flex-col sm:flex-row">
        {/* Large image */}
        {complaint.attachmentUrl ? (
          <div className="sm:w-[45%] h-52 sm:h-auto">
            <img
              src={complaint.attachmentUrl}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = "none"; }}
            />
          </div>
        ) : (
          <div className="sm:w-[45%] h-52 sm:h-auto bg-linear-to-br from-[#630ed4]/10 to-purple-50 flex items-center justify-center">
            <TrendingUp className="w-16 h-16 text-[#630ed4]/30" />
          </div>
        )}

        {/* Details */}
        <div className="flex-1 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className={cn("px-2.5 py-0.5 text-xs font-bold rounded-md uppercase", statusConfig.bgColor, statusConfig.color)}>
                {statusConfig.label}
              </span>
              <span className="text-xs text-gray-500">
                {getRelativeTime(complaint.submissionDate)}
                {complaint.location?.locality && ` · ${complaint.location.locality}`}
              </span>
            </div>
            <h3 className="text-lg font-bold text-gray-900 leading-snug mb-2">
              {complaint.subCategory || complaint.category?.name || "Untitled Issue"}
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">
              {complaint.description}
            </p>
          </div>
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
            <LikeButton complaintId={complaint.id} />
            <ShareButton complaintId={complaint.id} description={complaint.description} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function TrendingSmallCard({
  complaint,
  onClick,
}: {
  complaint: Complaint;
  onClick: () => void;
}) {
  const statusConfig = STATUS_CONFIG[complaint.status];
  return (
    <motion.div
      variants={cardVariants}
      onClick={onClick}
      className="bg-white rounded-xl border border-gray-200 overflow-hidden cursor-pointer hover:shadow-md transition-shadow flex flex-col"
    >
      {/* Image with status overlay */}
      {complaint.attachmentUrl ? (
        <div className="relative h-36">
          <img src={complaint.attachmentUrl} alt="" className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).parentElement!.innerHTML = '<div class="w-full h-full bg-gray-100 flex items-center justify-center"><span class="text-gray-300 text-xs">No image</span></div>'; }} />
          <span className={cn("absolute top-2 left-2 px-2 py-0.5 text-[10px] font-bold rounded-md uppercase", statusConfig.bgColor, statusConfig.color)}>
            {statusConfig.label}
          </span>
        </div>
      ) : (
        <div className="relative h-36 bg-gray-50 flex items-center justify-center">
          <Building className="w-10 h-10 text-gray-200" />
          <span className={cn("absolute top-2 left-2 px-2 py-0.5 text-[10px] font-bold rounded-md uppercase", statusConfig.bgColor, statusConfig.color)}>
            {statusConfig.label}
          </span>
        </div>
      )}

      <div className="p-3 flex-1 flex flex-col">
        <h4 className="text-sm font-bold text-gray-900 line-clamp-1">
          {complaint.subCategory || complaint.category?.name || "Issue"}
        </h4>
        <p className="text-xs text-gray-500 line-clamp-2 mt-1 flex-1">
          {complaint.description}
        </p>
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
          <LikeButton complaintId={complaint.id} />
          <span className="text-xs font-semibold text-[#630ed4] flex items-center gap-1 hover:underline">
            View Full Report <ArrowRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    </motion.div>
  );
}

function TrendingSidebar({ complaints }: { complaints: Complaint[] }) {
  // Calculate trending topics from actual complaint data
  const categoryMap = new Map<string, { count: number; upvotes: number }>();
  complaints.forEach(c => {
    const cat = c.category?.name || "General";
    const existing = categoryMap.get(cat) || { count: 0, upvotes: 0 };
    categoryMap.set(cat, { count: existing.count + 1, upvotes: existing.upvotes + (c.upvoteCount || 0) });
  });
  const trendingTopics = Array.from(categoryMap.entries())
    .sort((a, b) => b[1].upvotes - a[1].upvotes)
    .slice(0, 5);

  return (
    <div className="space-y-4">
      {/* Trending Topics - calculated from data */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-[#630ed4]" />
          <h4 className="font-bold text-sm text-gray-900">Trending Topics</h4>
        </div>
        <div className="space-y-3">
          {trendingTopics.map(([topic, data], i) => (
            <div key={topic} className="flex items-center gap-3">
              <span className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                i === 0 ? "bg-[#630ed4] text-white" : i === 1 ? "bg-purple-100 text-[#630ed4]" : "bg-gray-100 text-gray-600"
              )}>
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">#{topic.replace(/\s+/g, "")}</p>
                <p className="text-xs text-gray-500">{data.count} reports · {data.upvotes} upvotes</p>
              </div>
              <TrendingUp className={cn("w-3.5 h-3.5 shrink-0", i === 0 ? "text-[#630ed4]" : "text-gray-300")} />
            </div>
          ))}
          {trendingTopics.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-2">No trending topics yet</p>
          )}
        </div>
      </div>
    </div>
  );
}

function TrendingTabContent({
  complaints,
  allComplaints,
  onComplaintClick,
  filter,
  onFilterChange,
}: {
  complaints: Complaint[];
  allComplaints: Complaint[];
  onComplaintClick: (c: Complaint) => void;
  filter: FilterState;
  onFilterChange: (f: FilterState) => void;
}) {
  const [showFilter, setShowFilter] = useState(false);
  const featured = complaints[0];
  const rest = complaints.slice(1, 4); // up to 3 small cards
  const remaining = complaints.slice(4);

  return (
    <div className="p-4 sm:p-5">
      {/* Header */}
      <div className="mb-5">
        <span className="flex items-center gap-1.5 text-xs font-bold text-[#630ed4] uppercase tracking-wider mb-1">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          Live Trending Reports
        </span>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Trending Issues</h2>
            <p className="text-sm text-gray-500 mt-1 max-w-lg">
              Reports gaining massive community momentum in the last 24 hours.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 relative">
            <button onClick={() => setShowFilter(!showFilter)} className={cn("px-3 py-1.5 text-sm font-medium border rounded-lg transition-colors flex items-center gap-1.5", (filter.status || filter.category) ? "text-[#630ed4] border-[#630ed4] bg-[#630ed4]/5" : "text-gray-600 border-gray-200 hover:bg-gray-50")}>
              <Filter className="w-3.5 h-3.5" /> Filter {(filter.status || filter.category) && "·"}
            </button>
            <FilterPopover isOpen={showFilter} onClose={() => setShowFilter(false)} filter={filter} onFilterChange={(f) => { onFilterChange(f); }} complaints={allComplaints} />
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex flex-col lg:flex-row gap-5">
        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-5">
          {/* Featured card */}
          {featured && (
            <TrendingFeaturedCard complaint={featured} onClick={() => onComplaintClick(featured)} />
          )}

          {/* 3 small cards grid */}
          {rest.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {rest.map((c) => (
                <TrendingSmallCard key={c.id} complaint={c} onClick={() => onComplaintClick(c)} />
              ))}
            </div>
          )}

          {/* Remaining as simple list */}
          {remaining.length > 0 && (
            <div className="space-y-3 pt-2">
              {remaining.map((c) => (
                <TrendingSmallCard key={c.id} complaint={c} onClick={() => onComplaintClick(c)} />
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:w-72 shrink-0">
          <TrendingSidebar complaints={allComplaints} />
        </div>
      </div>
    </div>
  );
}

// ─── RECENT TAB ─────────────────────────────────────────────────────

function RecentTimelineCard({
  complaint,
  onClick,
  onUserClick,
  isLast,
}: {
  complaint: Complaint;
  onClick: () => void;
  onUserClick: (userId: string, userName: string) => void;
  isLast: boolean;
}) {
  const statusConfig = STATUS_CONFIG[complaint.status];

  const handleUserClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (complaint.User?.id && complaint.User?.name) {
      onUserClick(complaint.User.id, complaint.User.name);
    }
  };

  return (
    <div className="relative flex gap-4">
      {/* Timeline line + dot */}
      <div className="flex flex-col items-center shrink-0">
        <div className="w-3 h-3 rounded-full bg-[#630ed4] ring-4 ring-[#630ed4]/10 mt-1.5" />
        {!isLast && <div className="w-0.5 flex-1 bg-gray-200 mt-1" />}
      </div>

      {/* Card */}
      <motion.div
        variants={cardVariants}
        onClick={onClick}
        className="flex-1 bg-white rounded-xl border border-gray-200 p-4 mb-4 cursor-pointer hover:shadow-md transition-shadow"
      >
        {/* User + status row */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleUserClick}
              className="w-9 h-9 rounded-full bg-linear-to-br from-[#630ed4] to-purple-500 flex items-center justify-center text-white font-semibold text-xs shrink-0 hover:ring-2 hover:ring-[#630ed4]/30 transition-all"
            >
              {complaint.User?.name?.[0]?.toUpperCase() || "A"}
            </button>
            <div>
              <button onClick={handleUserClick} className="text-sm font-semibold text-gray-900 hover:text-[#630ed4] transition-colors">
                {complaint.User?.name || "Anonymous"}
              </button>
              <p className="text-xs text-gray-500">
                {getRelativeTime(complaint.submissionDate)}
                {complaint.location?.locality && ` · ${complaint.location.locality}`}
              </p>
            </div>
          </div>
          <span className={cn("px-2.5 py-0.5 text-[10px] font-bold rounded-md uppercase shrink-0", statusConfig.bgColor, statusConfig.color)}>
            {statusConfig.label}
          </span>
        </div>

        {/* Title */}
        <h4 className="font-bold text-gray-900 mb-1">
          {complaint.subCategory || complaint.category?.name || "Untitled"}
        </h4>

        {/* Description */}
        <p className="text-sm text-gray-600 leading-relaxed line-clamp-2 mb-3">
          {complaint.description}
        </p>

        {/* Attachment */}
        {complaint.attachmentUrl && (
          <div className="mb-3 rounded-xl overflow-hidden border border-gray-100">
            <img
              src={complaint.attachmentUrl}
              alt=""
              className="w-full h-40 object-cover"
              onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = "none"; }}
            />
          </div>
        )}

        {/* Footer: likes, view full */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <LikeButton complaintId={complaint.id} />
          <span className="text-xs font-semibold text-[#630ed4] flex items-center gap-1 hover:underline">
            View Full Report <ArrowRight className="w-3 h-3" />
          </span>
        </div>
      </motion.div>
    </div>
  );
}

function RecentTabContent({
  complaints,
  allComplaints,
  onComplaintClick,
  onUserClick,
  filter,
  onFilterChange,
}: {
  complaints: Complaint[];
  allComplaints: Complaint[];
  onComplaintClick: (c: Complaint) => void;
  onUserClick: (userId: string, userName: string) => void;
  filter: FilterState;
  onFilterChange: (f: FilterState) => void;
}) {
  const [showFilter, setShowFilter] = useState(false);

  return (
    <div className="p-4 sm:p-5">
      {/* Header */}
      <div className="mb-5">
        <h2 className="text-2xl font-bold text-gray-900">Recent Activity</h2>
        <div className="flex items-start justify-between gap-4 mt-1">
          <p className="text-sm text-gray-500 max-w-md">
            Stay updated with civic reports in your community as they happen in real-time.
          </p>
          <div className="flex items-center gap-2 shrink-0 relative">
            <button onClick={() => setShowFilter(!showFilter)} className={cn("px-3 py-1.5 text-sm font-medium border rounded-lg transition-colors flex items-center gap-1.5", (filter.status || filter.category) ? "text-[#630ed4] border-[#630ed4] bg-[#630ed4]/5" : "text-gray-600 border-gray-200 hover:bg-gray-50")}>
              <Filter className="w-3.5 h-3.5" /> Filter {(filter.status || filter.category) && "·"}
            </button>
            <FilterPopover isOpen={showFilter} onClose={() => setShowFilter(false)} filter={filter} onFilterChange={(f) => { onFilterChange(f); }} complaints={allComplaints} />
          </div>
        </div>
      </div>

      {/* Timeline - full width */}
      <motion.div variants={containerVariants} initial="hidden" animate="visible">
        {complaints.map((c, i) => (
          <RecentTimelineCard
            key={c.id}
            complaint={c}
            onClick={() => onComplaintClick(c)}
            onUserClick={onUserClick}
            isLast={i === complaints.length - 1}
          />
        ))}
      </motion.div>
    </div>
  );
}

// ─── FOR YOU TAB ────────────────────────────────────────────────────

function ForYouSidebar({ complaints }: { complaints: Complaint[] }) {
  // Calculate popular categories from actual complaint data
  const categoryMap = new Map<string, number>();
  complaints.forEach(c => {
    const cat = c.category?.name || "General";
    categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
  });
  const popularCategories = Array.from(categoryMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const categoryIcons: Record<string, { icon: typeof Droplets; color: string }> = {
    "Water Supply": { icon: Droplets, color: "text-blue-600 bg-blue-50" },
    "Street Lighting": { icon: Lightbulb, color: "text-amber-600 bg-amber-50" },
    "Waste Management": { icon: Trash2, color: "text-emerald-600 bg-emerald-50" },
    "Health": { icon: Heart, color: "text-rose-600 bg-rose-50" },
    "Infrastructure": { icon: Building, color: "text-slate-600 bg-slate-50" },
    "Electricity": { icon: Zap, color: "text-yellow-600 bg-yellow-50" },
  };

  const defaultIcon = { icon: Building, color: "text-gray-600 bg-gray-50" };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4 text-[#630ed4]" />
        <h4 className="font-bold text-sm text-gray-900">Popular in Your Area</h4>
      </div>
      <div className="space-y-2">
        {popularCategories.map(([catName, count]) => {
          const iconConfig = categoryIcons[catName] || defaultIcon;
          const IconComp = iconConfig.icon;
          return (
            <div key={catName} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
              <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", iconConfig.color)}>
                <IconComp className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{catName}</p>
                <p className="text-xs text-gray-500">{count} report{count !== 1 ? "s" : ""}</p>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
            </div>
          );
        })}
        {popularCategories.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">No categories yet</p>
        )}
      </div>
    </div>
  );
}

function ForYouTabContent({
  complaints,
  allComplaints,
  onComplaintClick,
  onUserClick,
  filter,
  onFilterChange,
}: {
  complaints: Complaint[];
  allComplaints: Complaint[];
  onComplaintClick: (c: Complaint) => void;
  onUserClick: (userId: string, userName: string) => void;
  filter: FilterState;
  onFilterChange: (f: FilterState) => void;
}) {
  const [showFilter, setShowFilter] = useState(false);
  const featured = complaints[0];
  const rest = complaints.slice(1);

  return (
    <div className="p-4 sm:p-5">
      {/* Header */}
      <div className="mb-5">
        <span className="flex items-center gap-1.5 text-xs font-bold text-[#630ed4] uppercase tracking-wider mb-1">
          <Sparkles className="w-3.5 h-3.5" /> Personalized Feed
        </span>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">For You</h2>
            <p className="text-sm text-gray-500 mt-1 max-w-md">
              Issues from your district and areas you care about.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 relative">
            <button onClick={() => setShowFilter(!showFilter)} className={cn("px-3 py-1.5 text-sm font-medium border rounded-lg transition-colors flex items-center gap-1.5", (filter.status || filter.category) ? "text-[#630ed4] border-[#630ed4] bg-[#630ed4]/5" : "text-gray-600 border-gray-200 hover:bg-gray-50")}>
              <Filter className="w-3.5 h-3.5" /> Filter {(filter.status || filter.category) && "·"}
            </button>
            <FilterPopover isOpen={showFilter} onClose={() => setShowFilter(false)} filter={filter} onFilterChange={(f) => { onFilterChange(f); }} complaints={allComplaints} />
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-5">
        {/* Main */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Featured if available */}
          {featured && (
            <TrendingFeaturedCard complaint={featured} onClick={() => onComplaintClick(featured)} />
          )}

          {/* Timeline cards for rest */}
          <motion.div variants={containerVariants} initial="hidden" animate="visible">
            {rest.map((c, i) => (
              <RecentTimelineCard
                key={c.id}
                complaint={c}
                onClick={() => onComplaintClick(c)}
                onUserClick={onUserClick}
                isLast={i === rest.length - 1}
              />
            ))}
          </motion.div>
        </div>

        {/* Sidebar - Popular Categories */}
        <div className="lg:w-72 shrink-0">
          <ForYouSidebar complaints={allComplaints} />
        </div>
      </div>
    </div>
  );
}

// ─── Empty state ────────────────────────────────────────────────────

function EmptyState({ type }: { type: CommunitySubTab }) {
  const messages = {
    "for-you": { title: "No local complaints yet", description: "Be the first to report an issue in your district!", icon: Users },
    trending: { title: "No trending complaints", description: "Complaints with the most community support will appear here.", icon: TrendingUp },
    recent: { title: "No recent complaints", description: "New public complaints will show up here.", icon: Clock },
  };
  const config = messages[type];
  const Icon = config.icon;
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{config.title}</h3>
      <p className="text-gray-500 max-w-sm">{config.description}</p>
    </motion.div>
  );
}

// ─── Main CommunityFeed ─────────────────────────────────────────────

export function CommunityFeed({ authToken, onComplaintClick }: CommunityFeedProps) {
  const [activeSubTab, setActiveSubTab] = useState<CommunitySubTab>("for-you");
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterState>({ status: null, category: null });

  // User profile popup state
  const [profilePopup, setProfilePopup] = useState<{
    isOpen: boolean;
    userId: string;
    userName: string;
  }>({ isOpen: false, userId: "", userName: "" });

  const { initializeLikes, isConnected, isAuthenticated } = useLikes();

  const handleUserClick = useCallback((userId: string, userName: string) => {
    setProfilePopup({ isOpen: true, userId, userName });
  }, []);

  const closeProfilePopup = useCallback(() => {
    setProfilePopup({ isOpen: false, userId: "", userName: "" });
  }, []);

  const fetchComplaints = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/complaint/feed/${activeSubTab}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!response.ok) throw new Error("Failed to fetch complaints");
      const data = await response.json();
      const fetched = data.data || [];
      setComplaints(fetched);
      initializeLikes(fetched);
    } catch (err) {
      console.error("Error fetching community feed:", err);
      setError("Failed to load complaints. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [activeSubTab, authToken, initializeLikes]);

  useEffect(() => { fetchComplaints(); }, [fetchComplaints]);

  // Reset filter on tab change
  useEffect(() => { setFilter({ status: null, category: null }); }, [activeSubTab]);

  const handleRefresh = useCallback(() => { fetchComplaints(); }, [fetchComplaints]);

  const filteredComplaints = applyFilter(complaints, filter);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mt-4">
      {/* Tabs */}
      <SubTabNavigation activeTab={activeSubTab} onTabChange={setActiveSubTab} />

      {/* Utility bar */}
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
        <div className={cn("flex items-center gap-1.5 text-xs", isConnected && isAuthenticated ? "text-green-600" : "text-gray-400")}>
          {isConnected && isAuthenticated ? <><Wifi className="w-3 h-3" /><span>Real-time</span></> : <><WifiOff className="w-3 h-3" /><span>Connecting...</span></>}
        </div>
      </div>

      {/* Content */}
      <PullToRefresh onRefresh={handleRefresh} disabled={isLoading} className="flex-1">
        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="m-4 flex items-center gap-3 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-sm">{error}</p>
              <button onClick={fetchComplaints} className="ml-auto px-3 py-1 text-sm font-medium bg-red-100 hover:bg-red-200 rounded-lg transition-colors">Retry</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#630ed4]" />
              <p className="text-gray-500 text-sm">Loading complaints...</p>
            </motion.div>
          </div>
        )}

        {/* Empty */}
        {!isLoading && !error && filteredComplaints.length === 0 && complaints.length === 0 && <EmptyState type={activeSubTab} />}

        {/* No filter results */}
        {!isLoading && !error && filteredComplaints.length === 0 && complaints.length > 0 && (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <Filter className="w-8 h-8 text-gray-300 mb-3" />
            <p className="text-gray-500 text-sm">No complaints match your filters.</p>
            <button onClick={() => setFilter({ status: null, category: null })} className="mt-2 text-sm font-medium text-[#630ed4] hover:underline">Clear filters</button>
          </div>
        )}

        {/* Tab content */}
        {!isLoading && !error && filteredComplaints.length > 0 && (
          <>
            {activeSubTab === "trending" && (
              <TrendingTabContent complaints={filteredComplaints} allComplaints={complaints} onComplaintClick={onComplaintClick} filter={filter} onFilterChange={setFilter} />
            )}
            {activeSubTab === "recent" && (
              <RecentTabContent complaints={filteredComplaints} allComplaints={complaints} onComplaintClick={onComplaintClick} onUserClick={handleUserClick} filter={filter} onFilterChange={setFilter} />
            )}
            {activeSubTab === "for-you" && (
              <ForYouTabContent complaints={filteredComplaints} allComplaints={complaints} onComplaintClick={onComplaintClick} onUserClick={handleUserClick} filter={filter} onFilterChange={setFilter} />
            )}
          </>
        )}

        {/* Footer count - keep as requested */}
        {!isLoading && filteredComplaints.length > 0 && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-500">
              Showing {filteredComplaints.length} complaint{filteredComplaints.length !== 1 ? "s" : ""}{(filter.status || filter.category) ? ` (filtered from ${complaints.length})` : ""}
            </p>
          </div>
        )}
      </PullToRefresh>

      {/* User Profile Popup */}
      <UserProfilePopup
        userId={profilePopup.userId}
        userName={profilePopup.userName}
        isOpen={profilePopup.isOpen}
        onClose={closeProfilePopup}
      />
    </div>
  );
}
