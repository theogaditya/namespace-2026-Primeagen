"use client";

import React from "react";
import { motion } from "framer-motion";
import { Rocket, Eye } from "lucide-react";
import type { UserData } from "@/app/dashboard/customComps/types";

interface DashboardHeroBannerProps {
  user: UserData | null;
  resolvedCount?: number;
}

export default function DashboardHeroBanner({
  user,
  resolvedCount = 0,
}: DashboardHeroBannerProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mb-10"
    >
      <div className="bg-gradient-to-br from-[var(--dash-primary)] to-[var(--dash-primary-container)] p-8 rounded-3xl text-white relative overflow-hidden flex flex-col justify-between min-h-[220px]">
        <div className="relative z-10">
          <h2 className="text-3xl font-[var(--font-headline)] font-extrabold mb-2">
            Welcome back, {user?.name?.split(" ")[0] || "Citizen"}.
          </h2>
          <p className="text-white/80 font-[var(--font-body)] max-w-md">
            {resolvedCount > 0
              ? `Your contributions helped resolve ${resolvedCount} local infrastructure issue${resolvedCount !== 1 ? "s" : ""}. Keep up the great work!`
              : "Start making an impact in your community by reporting local issues."}
          </p>
        </div>
        <div className="relative z-10 mt-8 flex gap-4 flex-wrap">
          <button className="bg-white text-[var(--dash-primary)] px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-[var(--dash-surface)] transition-colors">
            <Rocket className="w-4 h-4" />
            Daily Mission
          </button>
          <button className="bg-[var(--dash-primary-container)]/50 border border-white/20 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-[var(--dash-primary-container)] transition-colors flex items-center gap-2">
            <Eye className="w-4 h-4" />
            View Impact
          </button>
        </div>
        {/* Decorative blur circle */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
      </div>
    </motion.section>
  );
}
