"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import {
  ComplaintDetailModal,
  CommunityFeed,
  Complaint,
  UserData,
} from "./customComps";
import { LikeProvider } from "@/contexts/LikeContext";
import { NewBadgeNotification } from "@/components/badges/NewBadgeNotification";
import LandingFooter from "@/components/landing/LandingFooter";
import DashboardSidebar, { type DashboardView } from "@/components/dashboard/DashboardSidebar";
import DashboardTopBar from "@/components/dashboard/DashboardTopBar";
import DashboardAIChatHub from "@/components/dashboard/DashboardAIChatHub";
import CivicStandingSection from "@/components/dashboard/CivicStandingSection";
import ActiveReportsGrid from "@/components/dashboard/ActiveReportsGrid";
import AnnouncementsWidget from "@/components/dashboard/AnnouncementsWidget";
import BlockchainWidget from "@/components/dashboard/BlockchainWidget";
import ReportHistoryView from "@/components/dashboard/ReportHistoryView";
import AllBadgesModal from "@/components/dashboard/AllBadgesModal";
import ProfileSettingsModal from "@/components/dashboard/ProfileSettingsModal";
import SurveysView from "@/components/dashboard/SurveysView";
import CivicMapView from "@/components/dashboard/CivicMapView";

interface StatsData {
  civicScore: number;
  scoreDelta: number;
  levelName: string;
  levelNumber: number;
  currentXP: number;
  xpToNextLevel: number;
  totalComplaints: number;
  resolvedComplaints: number;
  earnedBadges: number;
  complaintsByStatus: Record<string, number>;
}

interface BadgeData {
  id: string;
  name: string;
  icon: string;
  description?: string;
  rarity?: string;
  earned: boolean;
  earnedAt?: string | null;
}


export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<DashboardView>("dashboard");

  const [myComplaints, setMyComplaints] = useState<Complaint[]>([]);
  const [loadingComplaints, setLoadingComplaints] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [stats, setStats] = useState<StatsData | null>(null);
  const [badges, setBadges] = useState<BadgeData[]>([]);

  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCommunityComplaint, setIsCommunityComplaint] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isBadgesModalOpen, setIsBadgesModalOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

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
        setUser(JSON.parse(userData));
      } catch (e) {
        console.error("Failed to parse user data:", e);
      }
    }

    setIsLoading(false);
  }, [router]);

  const fetchMyComplaints = useCallback(async () => {
    if (!authToken) return;

    setLoadingComplaints(true);
    setError(null);

    try {
      const response = await fetch(`/api/complaint/my`, {
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
      setMyComplaints(data.data || []);
    } catch (err) {
      console.error("Error fetching my complaints:", err);
      setError("Failed to load your complaints. Please try again.");
    } finally {
      setLoadingComplaints(false);
    }
  }, [authToken, router]);

  const fetchStats = useCallback(async () => {
    if (!authToken) return;

    try {
      const response = await fetch("/api/users/stats", {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!response.ok) return;
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (err) {
      console.error("Error fetching user stats:", err);
    }
  }, [authToken]);

  const fetchBadges = useCallback(async () => {
    if (!authToken) return;

    try {
      const response = await fetch("/api/badges", {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!response.ok) return;
      const data = await response.json();
      if (data.success && Array.isArray(data.badges)) {
        const mapped = data.badges.map((badge: any) => ({
          id: badge.id,
          name: badge.name,
          icon: badge.icon || "",
          description: badge.description || "",
          rarity: badge.rarity || "common",
          category: badge.category || "",
          earned: Boolean(badge.earnedAt) || badge.earned === true,
          earnedAt: badge.earnedAt || null,
        }));
        setBadges(mapped);
      }
    } catch (err) {
      console.error("Error fetching badges:", err);
    }
  }, [authToken]);

  useEffect(() => {
    if (isLoading || !authToken) return;
    fetchMyComplaints();
    fetchStats();
    fetchBadges();
  }, [isLoading, authToken, fetchMyComplaints, fetchStats, fetchBadges]);

  const handleComplaintClick = useCallback((complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setIsCommunityComplaint(false);
    setIsModalOpen(true);
  }, []);

  const handleCommunityComplaintClick = useCallback((complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setIsCommunityComplaint(true);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setTimeout(() => {
      setSelectedComplaint(null);
      setIsCommunityComplaint(false);
    }, 300);
  }, []);

  const handleSearchResultClick = useCallback(
    async (id: string) => {
      const found = myComplaints.find((c) => c.id === id);
      if (found) {
        handleComplaintClick(found);
      } else {
        // Fetch the full complaint from the API
        try {
          const token = localStorage.getItem("authToken");
          const res = await fetch(`/api/complaint/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const json = await res.json();
          if (json.success && json.data) {
            setSelectedComplaint(json.data);
          } else {
            setSelectedComplaint({ id } as Complaint);
          }
        } catch {
          setSelectedComplaint({ id } as Complaint);
        }
        setIsCommunityComplaint(true);
        setIsModalOpen(true);
      }
    },
    [myComplaints, handleComplaintClick]
  );

  const handleUserUpdated = useCallback((updated: UserData) => {
    setUser(updated);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--dash-surface)]">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Loader2 className="w-10 h-10 animate-spin text-[var(--dash-primary)]" />
          <p className="text-slate-600">Loading your dashboard...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <LikeProvider authToken={authToken}>
      <div className="min-h-screen bg-[var(--dash-surface)] flex">
        <DashboardSidebar
          activeView={activeView}
          onNavigate={setActiveView}
          isMobileOpen={isMobileSidebarOpen}
          onMobileClose={() => setIsMobileSidebarOpen(false)}
        />

        <div className="flex-1 flex flex-col lg:pl-64 min-h-screen">
          <DashboardTopBar
            user={user}
            onMenuToggle={() => setIsMobileSidebarOpen((prev) => !prev)}
            onSettingsClick={() => setIsProfileOpen(true)}
            onSearchResultClick={handleSearchResultClick}
          />

          <main className="flex-1 overflow-auto">
            <div className="min-h-screen flex flex-col">
              {activeView === "dashboard" && (
              <div className="pt-8 px-4 lg:px-8 pb-12 max-w-7xl mx-auto w-full">
                <DashboardAIChatHub
                  user={user}
                />

                <CivicStandingSection
                  stats={stats}
                  badges={badges}
                  userLocality={user?.location?.locality || user?.location?.city || "your region"}
                  onViewAllBadges={() => setIsBadgesModalOpen(true)}
                />

                <div className="grid grid-cols-12 gap-6">
                  <div className="col-span-12 lg:col-span-8 space-y-8">
                    <ActiveReportsGrid
                      complaints={myComplaints}
                      onComplaintClick={handleComplaintClick}
                      onViewAll={() => setActiveView("reports")}
                      loading={loadingComplaints}
                    />

                    <AnnouncementsWidget />
                  </div>

                  <div className="col-span-12 lg:col-span-4 space-y-6">
                    <BlockchainWidget />
                  </div>
                </div>
              </div>
            )}

            {activeView === "reports" && (
              <ReportHistoryView
                complaints={myComplaints}
                loading={loadingComplaints}
                onComplaintClick={handleComplaintClick}
                onRefresh={fetchMyComplaints}
                onNavigateDashboard={() => setActiveView("dashboard")}
              />
            )}

            {activeView === "community" && (
              <div className="pt-8 px-4 lg:px-8 pb-12 max-w-5xl mx-auto w-full">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <CommunityFeed
                    authToken={authToken}
                    onComplaintClick={handleCommunityComplaintClick}
                  />
                </motion.div>
              </div>
            )}

            {activeView === "analytics" && (
              <div className="pt-8 px-4 lg:px-8 pb-12 max-w-5xl mx-auto w-full">
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-10 h-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Analytics Coming Soon</h3>
                  <p className="text-slate-500 max-w-sm">
                    Community analytics and insights will be available here in a future update.
                  </p>
                </div>
              </div>
            )}

            {activeView === "map" && (
              <CivicMapView />
            )}

            {activeView === "surveys" && (
              <SurveysView authToken={authToken} />
            )}
            </div>

            <LandingFooter />
          </main>
        </div>

        <ComplaintDetailModal
          complaint={selectedComplaint}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          hideAssignmentTimeline={isCommunityComplaint}
        />

        <NewBadgeNotification />

        <AllBadgesModal
          isOpen={isBadgesModalOpen}
          onClose={() => setIsBadgesModalOpen(false)}
          badges={badges}
          stats={stats}
          onNavigateDashboard={() => { setIsBadgesModalOpen(false); setActiveView("dashboard"); }}
        />

        <ProfileSettingsModal
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          user={user}
          onUserUpdated={handleUserUpdated}
        />
      </div>
    </LikeProvider>
  );
}
