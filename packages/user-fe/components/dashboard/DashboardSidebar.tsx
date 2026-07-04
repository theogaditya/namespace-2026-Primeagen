"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Flag,
  Users,
  BarChart2,
  MapIcon,
  ClipboardList,
  PlusCircle,
  HelpCircle,
  LogOut,
  Landmark,
  X,
} from "lucide-react";

export type DashboardView = "dashboard" | "reports" | "community" | "analytics" | "map" | "surveys";

interface NavItem {
  label: string;
  icon: React.ReactNode;
  view: DashboardView;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", icon: <LayoutDashboard className="w-5 h-5" />, view: "dashboard" },
  { label: "Reports", icon: <Flag className="w-5 h-5" />, view: "reports" },
  { label: "Community", icon: <Users className="w-5 h-5" />, view: "community" },
  { label: "Analytics", icon: <BarChart2 className="w-5 h-5" />, view: "analytics" },
  { label: "Map", icon: <MapIcon className="w-5 h-5" />, view: "map" },
  { label: "Surveys", icon: <ClipboardList className="w-5 h-5" />, view: "surveys" },
];

interface DashboardSidebarProps {
  activeView: DashboardView;
  onNavigate: (view: DashboardView) => void;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function DashboardSidebar({
  activeView,
  onNavigate,
  isMobileOpen = false,
  onMobileClose,
}: DashboardSidebarProps) {
  const router = useRouter();

  const handleSignOut = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userData");
    router.push("/loginUser");
  };

  const sidebarContent = (
    <div className="h-screen w-64 bg-slate-50 border-r border-slate-200/60 flex flex-col p-4 space-y-2">
      {/* Logo / Brand */}
      <div className="px-2 py-6 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--dash-primary)] flex items-center justify-center text-white">
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-[var(--font-headline)] font-extrabold text-violet-700 leading-tight">
              Citizen Portal
            </h2>
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
              Verified Resident
            </p>
          </div>
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = activeView === item.view;
          return (
            <button
              key={item.view}
              onClick={() => {
                onNavigate(item.view);
                onMobileClose?.();
              }}
              className={`flex items-center gap-3 px-4 py-3 w-full rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-white text-violet-700 shadow-sm ring-1 ring-slate-200"
                  : "text-slate-600 hover:bg-slate-100 hover:text-violet-600"
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Report Issue CTA */}
      <div className="pt-4 mt-4 border-t border-slate-200/60">
        <button
          onClick={() => router.push("/regComplaint")}
          className="w-full py-3 px-4 bg-[var(--dash-primary)] text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-[var(--dash-primary)]/20 hover:scale-[1.02] active:scale-95 transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          Report Issue
        </button>
      </div>

      {/* Bottom Links */}
      <div className="mt-auto space-y-1">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-4 py-3 w-full text-[var(--dash-error)] hover:bg-red-50 rounded-lg transition-all text-sm font-medium"
        >
          <LogOut className="w-5 h-5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block fixed left-0 top-0 z-50 h-screen">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isMobileOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onMobileClose}
            className="lg:hidden fixed inset-0 bg-black/50 z-50"
          />
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="lg:hidden fixed left-0 top-0 z-50 h-screen"
          >
            <div className="relative">
              <button
                onClick={onMobileClose}
                className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
              {sidebarContent}
            </div>
          </motion.aside>
        </>
      )}
    </>
  );
}
