"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronRight, Plus } from "lucide-react";
import ActiveReportCard from "./ActiveReportCard";
import type { Complaint } from "@/app/dashboard/customComps/types";

interface ActiveReportsGridProps {
  complaints: Complaint[];
  onComplaintClick: (complaint: Complaint) => void;
  onViewAll?: () => void;
  loading?: boolean;
}

export default function ActiveReportsGrid({
  complaints,
  onComplaintClick,
  onViewAll,
  loading,
}: ActiveReportsGridProps) {
  const router = useRouter();

  // Show up to 3 most recent active complaints
  const activeComplaints = complaints
    .filter((c) => c.status !== "COMPLETED" && c.status !== "REJECTED" && c.status !== "DELETED")
    .slice(0, 3);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-[var(--font-headline)] font-bold text-[var(--dash-on-surface)]">
          Active Reports
        </h3>
        <button
          onClick={onViewAll}
          className="text-[var(--dash-primary)] text-sm font-semibold flex items-center gap-1 hover:underline"
        >
          View all history
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200/60 animate-pulse h-40" />
          ))}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {activeComplaints.map((complaint) => (
            <ActiveReportCard
              key={complaint.id}
              complaint={complaint}
              onClick={() => onComplaintClick(complaint)}
            />
          ))}
          {/* Submit New Report placeholder */}
          <div
            onClick={() => router.push("/regComplaint")}
            className="bg-slate-50/50 p-5 rounded-2xl border border-dashed border-slate-300 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-100 transition-colors min-h-[160px]"
          >
            <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 mb-2">
              <Plus className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-slate-500">Submit New Report</p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
