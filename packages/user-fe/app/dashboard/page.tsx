"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ComplaintCard,
  ComplaintDetailModal,
  ProfileCard,
  SearchBar,
  TabNavigation,
  CommunityFeed,
  Complaint,
  UserData,
  TabType,
} from "./customComps";
import { Loader2, AlertCircle, FolderOpen, Plus, RefreshCw } from "lucide-react";
import Link from "next/link";
import { SwarajAIChat } from "@/components/swaraj-ai-chat";
import { LikeProvider } from "@/contexts/LikeContext";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { NewBadgeNotification } from "@/components/badges/NewBadgeNotification";
import { Footer7 } from "@/components/footer";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 24,
    },
  },
};

export default function DashboardPage() {
  const router = useRouter();

  // Auth state
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authToken, setAuthToken] = useState<string | null>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>("my-dashboard");

  // Complaints state (only for my-dashboard)
  const [myComplaints, setMyComplaints] = useState<Complaint[]>([]);
  const [loadingComplaints, setLoadingComplaints] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search and filter state (only for my-dashboard)
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isSearching, setIsSearching] = useState(false);

  // Modal state
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCommunityComplaint, setIsCommunityComplaint] = useState(false);

  // Mobile profile sheet state
  const [isMobileProfileOpen, setIsMobileProfileOpen] = useState(false);

  // Check authentication on mount
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const userData = localStorage.getItem("userData");

    if (!token) {
      router.push("/loginUser");
      return;
    }

    setAuthToken(token);

    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        setUser(parsed);
      } catch (e) {
        console.error("Failed to parse user data:", e);
      }
    }

    setIsLoading(false);
  }, [router]);

  // Fetch complaints
  const fetchMyComplaints = useCallback(async () => {
    if (!authToken) return;

    setLoadingComplaints(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== "all") {
        params.set("status", statusFilter);
      }

      const response = await fetch(`/api/complaint/my?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("authToken");
          localStorage.removeItem("userData");
          router.push("/loginUser");
          return;
        }
        throw new Error("Failed to fetch complaints");
      }

      const data = await response.json();
      // API returns { success, message, data: [...complaints...] }
      setMyComplaints(data.data || []);
    } catch (err) {
      console.error("Error fetching my complaints:", err);
      setError("Failed to load your complaints. Please try again.");
    } finally {
      setLoadingComplaints(false);
    }
  }, [authToken, statusFilter, router]);

  // Fetch only when my-dashboard is active
  useEffect(() => {
    if (isLoading) return;

    if (activeTab === "my-dashboard") {
      fetchMyComplaints();
    }
  }, [activeTab, isLoading, fetchMyComplaints]);

  // Handle search
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setIsSearching(!!query);
  }, []);

  // Handle status filter
  const handleStatusFilter = useCallback((status: string) => {
    setStatusFilter(status);
  }, []);

  // Handle complaint click (for my-dashboard)
  const handleComplaintClick = useCallback((complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setIsCommunityComplaint(false);
    setIsModalOpen(true);
  }, []);

  // Handle complaint click (for community feed)
  const handleCommunityComplaintClick = useCallback((complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setIsCommunityComplaint(true);
    setIsModalOpen(true);
  }, []);

  // Handle modal close
  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setTimeout(() => {
      setSelectedComplaint(null);
      setIsCommunityComplaint(false);
    }, 300);
  }, []);

  // Filter my complaints based on search query (only for my-dashboard)
  const filteredComplaints = useMemo(() => {
    if (!searchQuery.trim()) {
      return myComplaints;
    }

    const query = searchQuery.toLowerCase();
    return myComplaints.filter((complaint: Complaint) => {
      const searchableFields = [
        complaint.id,
        complaint.seq?.toString(),
        complaint.description,
        complaint.location?.locality,
        complaint.location?.district,
        complaint.category?.name,
        complaint.assignedDepartment,
        complaint.status,
      ];

      return searchableFields.some(
        (field) => field?.toLowerCase().includes(query)
      );
    });
  }, [myComplaints, searchQuery]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
          <p className="text-gray-600">Loading your dashboard...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <LikeProvider authToken={authToken}>
      <div className="min-h-screen bg-gray-50 py-25">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border-b border-gray-200 sticky top-0 z-40"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Mobile Profile Avatar (visible on mobile) */}
                <button
                onClick={() => setIsMobileProfileOpen(true)}
                className="lg:hidden w-10 h-10 rounded-full bg-linear-to-r from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-md hover:shadow-lg transition-shadow"
              >
                {user?.name?.[0]?.toUpperCase() || "U"}
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-sm text-gray-500">
                  Welcome back, {user?.name || "User"}!
                </p>
              </div>
            </div>
            <Link
              href="/regComplaint"
              className="inline-flex items-center gap-2 px-4 py-2 bg-linear-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">New Complaint</span>
            </Link>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar - Profile Card (Desktop) */}
          <motion.aside
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="hidden lg:block lg:w-80 shrink-0"
          >
            <div className="sticky top-24">
              <ProfileCard userData={user} />
            </div>
          </motion.aside>

          {/* Main Content Area */}
          <div className="flex-1 space-y-6">
            {/* Tab Navigation */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <TabNavigation
                activeTab={activeTab}
                onTabChange={setActiveTab}
              />
            </motion.div>

            {/* My Dashboard View */}
            {activeTab === "my-dashboard" && (
              <PullToRefresh
                onRefresh={fetchMyComplaints}
                disabled={loadingComplaints}
                className="space-y-6"
              >
                {/* Section Header with Refresh */}
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="flex items-center justify-between"
                >
                  <h2 className="text-lg font-semibold text-gray-900">My Complaints</h2>
                  <button
                    onClick={fetchMyComplaints}
                    disabled={loadingComplaints}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingComplaints ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">Refresh</span>
                  </button>
                </motion.div>

                {/* Search Bar */}
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <SearchBar
                    onSearch={handleSearch}
                    onStatusFilter={handleStatusFilter}
                    isSearching={loadingComplaints && isSearching}
                    placeholder="Search your complaints..."
                  />
                </motion.div>

                {/* Error State */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl"
                    >
                      <AlertCircle className="w-5 h-5 shrink-0" />
                      <p>{error}</p>
                      <button
                        onClick={fetchMyComplaints}
                        className="ml-auto px-3 py-1 text-sm font-medium bg-red-100 hover:bg-red-200 rounded-lg transition-colors"
                      >
                        Retry
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Loading State */}
                {loadingComplaints && !isSearching && (
                  <div className="flex items-center justify-center py-12">
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-col items-center gap-3"
                    >
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                      <p className="text-gray-500">Loading your complaints...</p>
                    </motion.div>
                  </div>
                )}

                {/* Empty State */}
                {!loadingComplaints && filteredComplaints.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center py-16 text-center"
                  >
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      <FolderOpen className="w-10 h-10 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {searchQuery ? "No complaints found" : "No complaints yet"}
                    </h3>
                    <p className="text-gray-500 max-w-sm mb-6">
                      {searchQuery
                        ? "Try adjusting your search or filters to find what you're looking for."
                        : "You haven't submitted any complaints. Register your first complaint to get started."}
                    </p>
                    {!searchQuery && (
                      <Link
                        href="/regComplaint"
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-linear-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
                      >
                        <Plus className="w-5 h-5" />
                        Register Complaint
                      </Link>
                    )}
                  </motion.div>
                )}

                {/* Complaints Grid */}
                {!loadingComplaints && filteredComplaints.length > 0 && (
                  <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="grid gap-4 sm:grid-cols-2"
                  >
                    {filteredComplaints.map((complaint: Complaint) => (
                      <motion.div
                        key={complaint.id}
                        variants={itemVariants}
                        layout
                      >
                        <ComplaintCard
                          complaint={complaint}
                          onClick={() => handleComplaintClick(complaint)}
                        />
                      </motion.div>
                    ))}
                  </motion.div>
                )}

                {/* Results count */}
                {!loadingComplaints && filteredComplaints.length > 0 && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-sm text-gray-500 text-center pt-4"
                  >
                    Showing {filteredComplaints.length}{" "}
                    {filteredComplaints.length === 1 ? "complaint" : "complaints"}
                    {searchQuery && ` for "${searchQuery}"`}
                  </motion.p>
                )}
              </PullToRefresh>
            )}

            {/* Community Feed View */}
            {activeTab === "community-feed" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <CommunityFeed
                  authToken={authToken}
                  onComplaintClick={handleCommunityComplaintClick}
                />
              </motion.div>
            )}
          </div>
        </div>
      </main>

      {/* Mobile Profile Modal - Full Screen Slide Up */}
      <AnimatePresence>
        {isMobileProfileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileProfileOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/50 z-50"
            />
            
            {/* Profile Sheet */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="lg:hidden fixed bottom-0 left-0 right-0 bg-white z-50 rounded-t-3xl shadow-2xl max-h-[85vh] overflow-hidden"
            >
              {/* Handle bar */}
              <div 
                className="flex justify-center py-3 cursor-pointer border-b border-gray-100"
                onClick={() => setIsMobileProfileOpen(false)}
              >
                <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
              </div>
              
              {/* Profile Header */}
              <div className="px-4 py-3 bg-linear-to-r from-blue-600 to-purple-600">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-xl border-2 border-white/30">
                    {user?.name?.[0]?.toUpperCase() || "U"}
                  </div>
                  <div className="flex-1 min-w-0 text-white">
                    <p className="font-bold text-lg truncate">
                      {user?.name || "User"}
                    </p>
                    <p className="text-sm text-white/80 truncate">
                      {user?.email || ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-white">
                      {myComplaints.length}
                    </p>
                    <p className="text-xs text-white/70">Complaints</p>
                  </div>
                </div>
              </div>

              {/* Profile Content */}
              <div className="overflow-y-auto max-h-[60vh] px-4 py-4">
                <ProfileCard userData={user} />
              </div>
              
              {/* Close Button */}
              <div className="px-4 py-3 border-t border-gray-100">
                <button
                  onClick={() => setIsMobileProfileOpen(false)}
                  className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Complaint Detail Modal */}
      <ComplaintDetailModal
        complaint={selectedComplaint}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        hideAssignmentTimeline={isCommunityComplaint}
      />

      {/* Swaraj AI Chat - Floating chatbot */}
      <SwarajAIChat />

      {/* Badge Achievement Notification */}
      <NewBadgeNotification />

      {/* Footer */}
      <Footer7 />

      {/* Bottom padding for mobile */}
      <div className="h-24 lg:hidden" />
    </div>
    </LikeProvider>
  );
}