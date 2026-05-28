"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Complaint,
  STATUS_CONFIG,
  DEPARTMENT_CONFIG,
  getRelativeTime,
  Department,
} from "./types";
import {
  Heart,
  Share2,
  MapPin,
  Clock,
  TrendingUp,
  Users,
  Sparkles,
  Search,
  Map,
  Loader2,
  AlertCircle,
  ChevronRight,
  Building,
  X,
  Check,
  Wifi,
  WifiOff,
  RefreshCw,
} from "lucide-react";
import { ComplaintHeatmap } from "./ComplaintHeatmap";
import { useLikes, useComplaintLike } from "@/contexts/LikeContext";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";

// Sub-tab types for community feed
export type CommunitySubTab = "for-you" | "trending" | "recent" | "heatmap" | "search";

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

// Twitter-style complaint card for community feed
function CommunityComplaintCard({
  complaint,
  onClick,
}: {
  complaint: Complaint;
  onClick: () => void;
}) {
  const { liked, count, isLiking, toggle } = useComplaintLike(complaint.id);
  const [showCopied, setShowCopied] = useState(false);

  const statusConfig = STATUS_CONFIG[complaint.status];
  const departmentConfig = DEPARTMENT_CONFIG[complaint.assignedDepartment as Department];

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLiking) return;
    toggle();
  };

  const handleShareClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    const shareUrl = `${window.location.origin}/complaint/${complaint.id}`;
    const shareText = `Check out this complaint: ${complaint.description.slice(0, 100)}${complaint.description.length > 100 ? '...' : ''}`;
    
    // Try native share API first (mobile-friendly)
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Complaint: ${complaint.category?.name || 'General'}`,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch (err) {
        // User cancelled or share failed, fallback to clipboard
        if ((err as Error).name !== 'AbortError') {
          console.error('Share failed:', err);
        }
      }
    }
    
    // Fallback: Copy to clipboard
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  return (
    <motion.article
      variants={cardVariants}
      onClick={onClick}
      className="bg-white border-b border-gray-100 hover:bg-gray-50/50 transition-colors cursor-pointer"
    >
      <div className="px-4 py-4">
        {/* Header - User info and timestamp */}
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm shrink-0">
            {complaint.User?.name?.[0]?.toUpperCase() || "A"}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* User info row */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-900 text-sm">
                {complaint.User?.name || "Anonymous User"}
              </span>
              <span className="text-gray-400 text-sm">·</span>
              <span className="text-gray-500 text-sm">
                {getRelativeTime(complaint.submissionDate)}
              </span>
              <span
                className={cn(
                  "ml-auto px-2 py-0.5 text-xs font-medium rounded-full",
                  statusConfig.bgColor,
                  statusConfig.color
                )}
              >
                {statusConfig.label}
              </span>
            </div>

            {/* Category & Sub-category */}
            <div className="flex items-center gap-2 mt-1 text-sm">
              <span className="text-blue-600 font-medium">
                {complaint.category?.name || "General"}
              </span>
              {complaint.subCategory && complaint.subCategory !== complaint.category?.name && (
                <>
                  <ChevronRight className="w-3 h-3 text-gray-400" />
                  <span className="text-gray-600">{complaint.subCategory}</span>
                </>
              )}
            </div>

            {/* Description */}
            <p className="mt-2 text-gray-800 text-[15px] leading-relaxed line-clamp-3">
              {complaint.description}
            </p>

            {/* Attachment preview */}
            {complaint.attachmentUrl && (
              <div className="mt-3 rounded-2xl overflow-hidden border border-gray-200">
                <img
                  src={complaint.attachmentUrl}
                  alt="Complaint attachment"
                  className="w-full h-48 object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            )}

            {/* Meta info - Location & Department */}
            <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
              {complaint.location?.district && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>
                    {complaint.location.locality || complaint.location.city},{" "}
                    {complaint.location.district}
                  </span>
                </div>
              )}
              {departmentConfig && (
                <div className="flex items-center gap-1">
                  <Building className="w-3.5 h-3.5" />
                  <span>{departmentConfig.label}</span>
                </div>
              )}
            </div>

            {/* Action buttons - Twitter style */}
            <div className="flex items-center gap-6 mt-3">
              {/* Like button */}
              <button
                className={cn(
                  "flex items-center gap-2 transition-colors group",
                  liked ? "text-rose-500" : "text-gray-500 hover:text-rose-500"
                )}
                onClick={handleLikeClick}
                disabled={isLiking}
              >
                <div
                  className={cn(
                    "p-2 rounded-full transition-colors",
                    liked ? "bg-rose-50" : "group-hover:bg-rose-50"
                  )}
                >
                  <Heart
                    className={cn("w-4 h-4", liked && "fill-current")}
                  />
                </div>
                <span className="text-sm">{count}</span>
              </button>

              {/* Share */}
              <button
                className={cn(
                  "flex items-center gap-2 transition-colors group",
                  showCopied ? "text-green-500" : "text-gray-500 hover:text-green-500"
                )}
                onClick={handleShareClick}
              >
                <div className={cn(
                  "p-2 rounded-full transition-colors",
                  showCopied ? "bg-green-50" : "group-hover:bg-green-50"
                )}>
                  {showCopied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                </div>
                <span className="text-sm">{showCopied ? "Copied!" : "Share"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

// Sub-tab navigation
function SubTabNavigation({
  activeTab,
  onTabChange,
}: {
  activeTab: CommunitySubTab;
  onTabChange: (tab: CommunitySubTab) => void;
}) {
  const tabs = [
    { id: "for-you" as const, label: "For You", icon: Sparkles },
    { id: "trending" as const, label: "Trending", icon: TrendingUp },
    { id: "recent" as const, label: "Recent", icon: Clock },
    { id: "heatmap" as const, label: "Heatmap", icon: Map },
    { id: "search" as const, label: "Search", icon: Search },
  ];

  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="flex overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex-1 min-w-[100px] flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-medium transition-colors relative",
                isActive
                  ? "text-blue-600"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              {isActive && (
                <motion.div
                  layoutId="communityTabIndicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
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

// Search input component
function SearchInput({
  value,
  onChange,
  onSearch,
  isSearching,
}: {
  value: string;
  onChange: (v: string) => void;
  onSearch: () => void;
  isSearching: boolean;
}) {
  return (
    <div className="p-4 bg-white border-b border-gray-200">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSearch()}
          placeholder="Search complaints by location, category, description..."
          className="w-full pl-12 pr-12 py-3 bg-gray-100 border-0 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
        />
        {value && (
          <button
            onClick={() => onChange("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        )}
      </div>
      {value && (
        <button
          onClick={onSearch}
          disabled={isSearching}
          className="mt-3 w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-sm font-medium transition-colors disabled:opacity-50"
        >
          {isSearching ? (
            <Loader2 className="w-4 h-4 animate-spin mx-auto" />
          ) : (
            "Search"
          )}
        </button>
      )}
    </div>
  );
}

// Empty state component
function EmptyState({
  type,
  searchQuery,
}: {
  type: CommunitySubTab;
  searchQuery?: string;
}) {
  const messages = {
    "for-you": {
      title: "No local complaints yet",
      description: "Be the first to report an issue in your district!",
      icon: Users,
    },
    trending: {
      title: "No trending complaints",
      description: "Complaints with the most community support will appear here.",
      icon: TrendingUp,
    },
    recent: {
      title: "No recent complaints",
      description: "New public complaints will show up here.",
      icon: Clock,
    },
    heatmap: {
      title: "Heatmap coming soon",
      description: "Visualize complaint density across locations.",
      icon: Map,
    },
    search: {
      title: searchQuery ? `No results for "${searchQuery}"` : "Search complaints",
      description: searchQuery
        ? "Try different keywords or check the spelling."
        : "Enter a location, category, or keyword to find complaints.",
      icon: Search,
    },
  };

  const config = messages[type];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
    >
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{config.title}</h3>
      <p className="text-gray-500 max-w-sm">{config.description}</p>
    </motion.div>
  );
}

export function CommunityFeed({ authToken, onComplaintClick }: CommunityFeedProps) {
  const [activeSubTab, setActiveSubTab] = useState<CommunitySubTab>("for-you");
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Complaint[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Get like context for initialization and connection status
  const { initializeLikes, isConnected, isAuthenticated } = useLikes();

  // Fetch complaints based on active tab
  const fetchComplaints = useCallback(async () => {
    if (activeSubTab === "heatmap" || activeSubTab === "search") return;

    setIsLoading(true);
    setError(null);

    try {
      const endpoint = `/api/complaint/feed/${activeSubTab}`;
      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch complaints");
      }

      const data = await response.json();
      const fetchedComplaints = data.data || [];
      setComplaints(fetchedComplaints);
      
      // Initialize like states from fetched complaints
      initializeLikes(fetchedComplaints);
    } catch (err) {
      console.error("Error fetching community feed:", err);
      setError("Failed to load complaints. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [activeSubTab, authToken, initializeLikes]);

  // Search complaints
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/complaint/feed/search?q=${encodeURIComponent(searchQuery)}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Search failed");
      }

      const data = await response.json();
      const fetchedComplaints = data.data || [];
      setSearchResults(fetchedComplaints);
      
      // Initialize like states from search results
      initializeLikes(fetchedComplaints);
    } catch (err) {
      console.error("Search error:", err);
      setError("Search failed. Please try again.");
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, authToken, initializeLikes]);

  // Fetch on tab change
  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  // Clear search when switching away from search tab
  useEffect(() => {
    if (activeSubTab !== "search") {
      setSearchQuery("");
      setSearchResults([]);
    }
  }, [activeSubTab]);

  // Get display complaints
  const displayComplaints =
    activeSubTab === "search" ? searchResults : complaints;

  // Handle refresh based on current tab
  const handleRefresh = useCallback(() => {
    if (activeSubTab === "search" && searchQuery.trim()) {
      handleSearch();
    } else {
      fetchComplaints();
    }
  }, [activeSubTab, searchQuery, handleSearch, fetchComplaints]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mt-4">
      {/* Sub-tab navigation */}
      <SubTabNavigation activeTab={activeSubTab} onTabChange={setActiveSubTab} />
      
      {/* Header bar with refresh and connection status */}
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
        {/* Refresh button */}
        <button
          onClick={handleRefresh}
          disabled={isLoading || isSearching || activeSubTab === "heatmap"}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={cn("w-4 h-4", (isLoading || isSearching) && "animate-spin")} />
          <span className="hidden sm:inline">Refresh</span>
        </button>

        {/* WebSocket connection status */}
        <div className={cn(
          "flex items-center gap-1.5 text-xs",
          isConnected && isAuthenticated ? "text-green-600" : "text-gray-400"
        )}>
          {isConnected && isAuthenticated ? (
            <>
              <Wifi className="w-3 h-3" />
              <span>Real-time</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3" />
              <span>Connecting...</span>
            </>
          )}
        </div>
      </div>

      {/* Pull to refresh wrapper for content */}
      <PullToRefresh
        onRefresh={handleRefresh}
        disabled={isLoading || isSearching || activeSubTab === "heatmap"}
        className="flex-1"
      >
        {/* Search input (only for search tab) */}
        {activeSubTab === "search" && (
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            onSearch={handleSearch}
            isSearching={isSearching}
          />
        )}

        {/* Heatmap */}
        {activeSubTab === "heatmap" && (
          <ComplaintHeatmap
            authToken={authToken}
            onComplaintClick={onComplaintClick}
          />
        )}

        {/* Error state */}
        <AnimatePresence>
          {error && activeSubTab !== "heatmap" && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="m-4 flex items-center gap-3 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl"
            >
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-sm">{error}</p>
              <button
              onClick={fetchComplaints}
              className="ml-auto px-3 py-1 text-sm font-medium bg-red-100 hover:bg-red-200 rounded-lg transition-colors"
            >
              Retry
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading state */}
      {isLoading && activeSubTab !== "heatmap" && (
        <div className="flex items-center justify-center py-12">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-3"
          >
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <p className="text-gray-500 text-sm">Loading complaints...</p>
          </motion.div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading &&
        !error &&
        displayComplaints.length === 0 &&
        activeSubTab !== "heatmap" && (
          <EmptyState
            type={activeSubTab}
            searchQuery={activeSubTab === "search" ? searchQuery : undefined}
          />
        )}

      {/* Complaints list */}
      {!isLoading &&
        !error &&
        displayComplaints.length > 0 &&
        activeSubTab !== "heatmap" && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {displayComplaints.map((complaint) => (
              <CommunityComplaintCard
                key={complaint.id}
                complaint={complaint}
                onClick={() => onComplaintClick(complaint)}
              />
            ))}
          </motion.div>
        )}

      {/* Results count */}
      {!isLoading && displayComplaints.length > 0 && activeSubTab !== "heatmap" && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 text-center">
          <p className="text-sm text-gray-500">
            Showing {displayComplaints.length} complaint
            {displayComplaints.length !== 1 ? "s" : ""}
            {activeSubTab === "search" && searchQuery && ` for "${searchQuery}"`}
          </p>
        </div>
      )}
      </PullToRefresh>
    </div>
  );
}
