"use client";

import React, { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Plus,
  ChevronRight,
  ChevronLeft,
  MapPin,
  Calendar,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  FileText,
  Droplets,
  Zap,
  Construction,
  TreePine,
  Bus,
  ShieldAlert,
  Building,
  Lightbulb,
  Loader2,
  FolderOpen,
} from "lucide-react";
import Link from "next/link";
import type { Complaint, ComplaintStatus } from "@/app/dashboard/customComps/types";

/* ─── Category icon + colour ─── */
const CATEGORY_STYLE: Record<string, { icon: React.ReactNode; bg: string; text: string }> = {
  WATER_SUPPLY_SANITATION: { icon: <Droplets className="w-7 h-7" />, bg: "bg-blue-50", text: "text-blue-500" },
  ELECTRICITY_POWER: { icon: <Zap className="w-7 h-7" />, bg: "bg-amber-50", text: "text-amber-500" },
  INFRASTRUCTURE: { icon: <Construction className="w-7 h-7" />, bg: "bg-green-50", text: "text-green-500" },
  ENVIRONMENT: { icon: <TreePine className="w-7 h-7" />, bg: "bg-emerald-50", text: "text-emerald-600" },
  TRANSPORTATION: { icon: <Bus className="w-7 h-7" />, bg: "bg-indigo-50", text: "text-indigo-500" },
  POLICE_SERVICES: { icon: <ShieldAlert className="w-7 h-7" />, bg: "bg-red-50", text: "text-red-500" },
  HOUSING_URBAN_DEVELOPMENT: { icon: <Building className="w-7 h-7" />, bg: "bg-orange-50", text: "text-orange-500" },
  HEALTH: { icon: <Lightbulb className="w-7 h-7" />, bg: "bg-pink-50", text: "text-pink-500" },
};
const DEFAULT_CAT = { icon: <FileText className="w-7 h-7" />, bg: "bg-slate-100", text: "text-slate-500" };

/* ─── Status badge style ─── */
const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  REGISTERED: { bg: "bg-slate-200/60", text: "text-slate-600", label: "Registered" },
  UNDER_PROCESSING: { bg: "bg-blue-100", text: "text-blue-700", label: "Processing" },
  FORWARDED: { bg: "bg-purple-100", text: "text-purple-700", label: "Forwarded" },
  ON_HOLD: { bg: "bg-orange-100", text: "text-orange-700", label: "On Hold" },
  COMPLETED: { bg: "bg-emerald-100", text: "text-emerald-700", label: "Resolved" },
  REJECTED: { bg: "bg-red-100", text: "text-red-700", label: "Rejected" },
  ESCALATED_TO_MUNICIPAL_LEVEL: { bg: "bg-rose-100", text: "text-rose-700", label: "Escalated" },
  ESCALATED_TO_STATE_LEVEL: { bg: "bg-red-500", text: "text-white", label: "Escalated" },
  DELETED: { bg: "bg-gray-200", text: "text-gray-500", label: "Deleted" },
};
const DEFAULT_STATUS_BADGE = { bg: "bg-slate-100", text: "text-slate-500", label: "Unknown" };

/* ─── Priority badge ─── */
function getPriorityBadge(urgency: string) {
  switch (urgency) {
    case "HIGH":
    case "CRITICAL":
      return { bg: "bg-red-100", text: "text-red-700", label: "High Priority" };
    case "MEDIUM":
      return { bg: "bg-slate-100", text: "text-slate-600", label: "Medium Priority" };
    case "LOW":
    default:
      return { bg: "bg-slate-100", text: "text-slate-600", label: "Low Priority" };
  }
}

function getStatusIcon(status: ComplaintStatus) {
  switch (status) {
    case "COMPLETED":
      return <CheckCircle2 className="w-7 h-7" />;
    case "UNDER_PROCESSING":
    case "FORWARDED":
      return <RefreshCw className="w-7 h-7" />;
    case "ESCALATED_TO_MUNICIPAL_LEVEL":
    case "ESCALATED_TO_STATE_LEVEL":
      return <AlertTriangle className="w-7 h-7" />;
    default:
      return <FileText className="w-7 h-7" />;
  }
}

function getStatusIconStyle(status: ComplaintStatus) {
  switch (status) {
    case "COMPLETED":
      return { bg: "bg-emerald-50", text: "text-emerald-500" };
    case "UNDER_PROCESSING":
    case "FORWARDED":
      return { bg: "bg-blue-50", text: "text-blue-500" };
    case "ESCALATED_TO_MUNICIPAL_LEVEL":
    case "ESCALATED_TO_STATE_LEVEL":
      return { bg: "bg-red-50", text: "text-red-500" };
    case "REGISTERED":
      return { bg: "bg-slate-100", text: "text-slate-400" };
    default:
      return { bg: "bg-slate-100", text: "text-slate-400" };
  }
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return (
    d.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" }) +
    " • " +
    d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
  );
}

const ITEMS_PER_PAGE = 6;

const CATEGORY_OPTIONS = [
  "All Categories",
  "Infrastructure",
  "Water & Sanitation",
  "Electricity",
  "Public Health",
  "Environment",
  "Transportation",
  "Police Services",
  "Housing",
];

const STATUS_OPTIONS = [
  "All Statuses",
  "Registered",
  "Processing",
  "Resolved",
  "Escalated",
  "Rejected",
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
};

interface ReportHistoryViewProps {
  complaints: Complaint[];
  loading: boolean;
  onComplaintClick: (c: Complaint) => void;
  onRefresh: () => void;
  onNavigateDashboard: () => void;
}

export default function ReportHistoryView({
  complaints,
  loading,
  onComplaintClick,
  onRefresh,
  onNavigateDashboard,
}: ReportHistoryViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  /* ─── Filtering logic ─── */
  const filtered = useMemo(() => {
    let result = [...complaints];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.seq?.toString().includes(q) ||
          c.description?.toLowerCase().includes(q) ||
          c.category?.name?.toLowerCase().includes(q) ||
          c.subCategory?.toLowerCase().includes(q) ||
          c.location?.locality?.toLowerCase().includes(q)
      );
    }

    // Status
    if (statusFilter !== "All Statuses") {
      const map: Record<string, string[]> = {
        Registered: ["REGISTERED"],
        Processing: ["UNDER_PROCESSING", "FORWARDED"],
        Resolved: ["COMPLETED"],
        Escalated: ["ESCALATED_TO_MUNICIPAL_LEVEL", "ESCALATED_TO_STATE_LEVEL"],
        Rejected: ["REJECTED"],
      };
      const statuses = map[statusFilter] || [];
      result = result.filter((c) => statuses.includes(c.status));
    }

    // Category
    if (categoryFilter !== "All Categories") {
      const map: Record<string, string> = {
        Infrastructure: "INFRASTRUCTURE",
        "Water & Sanitation": "WATER_SUPPLY_SANITATION",
        Electricity: "ELECTRICITY_POWER",
        "Public Health": "HEALTH",
        Environment: "ENVIRONMENT",
        Transportation: "TRANSPORTATION",
        "Police Services": "POLICE_SERVICES",
        Housing: "HOUSING_URBAN_DEVELOPMENT",
      };
      const dept = map[categoryFilter];
      if (dept) result = result.filter((c) => c.assignedDepartment === dept);
    }

    // Priority
    if (priorityFilter !== "All") {
      const map: Record<string, string[]> = {
        High: ["HIGH", "CRITICAL"],
        Medium: ["MEDIUM"],
        Low: ["LOW"],
      };
      const levels = map[priorityFilter] || [];
      result = result.filter((c) => levels.includes(c.urgency));
    }

    // Dates
    if (fromDate) {
      const from = new Date(fromDate);
      result = result.filter((c) => new Date(c.submissionDate) >= from);
    }
    if (toDate) {
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      result = result.filter((c) => new Date(c.submissionDate) <= to);
    }

    return result;
  }, [complaints, searchQuery, statusFilter, categoryFilter, priorityFilter, fromDate, toDate]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paged = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Reset page on filter change
  const handleFilterChange = useCallback(
    (setter: (v: string) => void) => (val: string) => {
      setter(val);
      setCurrentPage(1);
    },
    []
  );

  const pageNumbers = useMemo(() => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  }, [totalPages, currentPage]);

  return (
    <div className="pt-12 pb-20 px-4 lg:px-8 max-w-7xl mx-auto w-full">
      {/* Breadcrumb */}
      <motion.nav
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-2"
      >
        <button onClick={onNavigateDashboard} className="hover:text-[var(--dash-primary)] transition-colors">
          Dashboard
        </button>
        <ChevronRight className="w-3 h-3" />
        <span className="text-[var(--dash-on-surface)]">My Reports</span>
      </motion.nav>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8"
      >
        <div>
          <h2 className="text-3xl font-[var(--font-headline)] font-bold text-[var(--dash-on-surface)] tracking-tight">
            Report History
          </h2>
          <p className="text-slate-500 mt-1">Track and manage your submitted civic concerns.</p>
        </div>
        <Link
          href="/regComplaint"
          className="flex items-center gap-2 bg-gradient-to-r from-[var(--dash-primary)] to-[var(--dash-primary-container)] text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-[var(--dash-primary)]/20 hover:shadow-[var(--dash-primary)]/30 active:scale-95 transition-all"
        >
          <Plus className="w-5 h-5" />
          File New Report
        </Link>
      </motion.div>

      {/* Filter Bar */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-xl p-6 mb-8 shadow-sm border border-slate-200/40"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Search */}
          <div className="lg:col-span-2">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Search Reports
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="w-full bg-[var(--dash-surface)] border-none rounded-xl pl-10 py-3 text-sm focus:ring-2 focus:ring-[var(--dash-primary)]/20 transition-all outline-none"
                placeholder="Search by ID, Title or Keyword..."
                type="text"
              />
            </div>
          </div>
          {/* Status */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => handleFilterChange(setStatusFilter)(e.target.value)}
              className="w-full bg-[var(--dash-surface)] border-none rounded-xl py-3 text-sm focus:ring-2 focus:ring-[var(--dash-primary)]/20 transition-all outline-none"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </div>
          {/* Category */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => handleFilterChange(setCategoryFilter)(e.target.value)}
              className="w-full bg-[var(--dash-surface)] border-none rounded-xl py-3 text-sm focus:ring-2 focus:ring-[var(--dash-primary)]/20 transition-all outline-none"
            >
              {CATEGORY_OPTIONS.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Second row: dates + priority */}
        <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Date range */}
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-[140px]">
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">From Date</label>
              <input
                value={fromDate}
                onChange={(e) => { setFromDate(e.target.value); setCurrentPage(1); }}
                className="w-full bg-[var(--dash-surface)] border-none rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-[var(--dash-primary)]/20 outline-none"
                type="date"
              />
            </div>
            <span className="mt-5 text-slate-400">to</span>
            <div className="flex-1 min-w-[140px]">
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">To Date</label>
              <input
                value={toDate}
                onChange={(e) => { setToDate(e.target.value); setCurrentPage(1); }}
                className="w-full bg-[var(--dash-surface)] border-none rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-[var(--dash-primary)]/20 outline-none"
                type="date"
              />
            </div>
          </div>

          {/* Priority pills */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-2">Priority:</span>
            {["All", "High", "Medium", "Low"].map((p) => (
              <button
                key={p}
                onClick={() => handleFilterChange(setPriorityFilter)(p)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  priorityFilter === p
                    ? "bg-[var(--dash-primary)] text-white"
                    : "bg-[var(--dash-surface)] text-slate-600 hover:bg-slate-200"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Reports list */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--dash-primary)]" />
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <FolderOpen className="w-10 h-10 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            {searchQuery || statusFilter !== "All Statuses" || categoryFilter !== "All Categories"
              ? "No reports match your filters"
              : "No reports yet"}
          </h3>
          <p className="text-slate-500 max-w-sm mb-6">
            {searchQuery ? "Try adjusting your search or filters." : "File your first report to get started."}
          </p>
        </motion.div>
      )}

      {!loading && paged.length > 0 && (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 gap-4 mb-8">
          {paged.map((complaint) => {
            const catKey = complaint.assignedDepartment || "";
            const catStyle = CATEGORY_STYLE[catKey] || DEFAULT_CAT;
            const statusBadge = STATUS_BADGE[complaint.status] || DEFAULT_STATUS_BADGE;
            const priorityBadge = getPriorityBadge(complaint.urgency);
            const iconStyle = getStatusIconStyle(complaint.status);
            const title = complaint.category?.name || complaint.subCategory || "Untitled Report";
            const location = [complaint.location?.locality, complaint.location?.district].filter(Boolean).join(", ") || "Location not specified";
            const categoryLabel = complaint.category?.name || catKey.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());

            return (
              <motion.div
                key={complaint.id}
                variants={cardVariants}
                layout
                className="bg-white rounded-xl p-5 shadow-sm border border-slate-200/40 flex flex-col md:flex-row gap-6 items-start md:items-center group hover:bg-slate-50/80 transition-all duration-300 cursor-pointer"
                onClick={() => onComplaintClick(complaint)}
              >
                {/* Status icon */}
                <div className={`flex-shrink-0 w-14 h-14 rounded-xl ${iconStyle.bg} flex items-center justify-center ${iconStyle.text}`}>
                  {getStatusIcon(complaint.status)}
                </div>

                {/* Content */}
                <div className="flex-grow min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-xs font-bold text-[var(--dash-primary)]">#{complaint.seq}</span>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
                      {categoryLabel}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-[var(--dash-on-surface)] truncate group-hover:text-[var(--dash-primary)] transition-colors">
                    {title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-y-2 gap-x-4 mt-2">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <MapPin className="w-3.5 h-3.5" />
                      {location}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(complaint.submissionDate)}
                    </div>
                  </div>
                </div>

                {/* Right: badges + CTA */}
                <div className="flex flex-col items-end gap-3 flex-shrink-0 w-full md:w-auto">
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full ${statusBadge.bg} ${statusBadge.text} text-[10px] font-bold uppercase tracking-wide`}>
                      {statusBadge.label}
                    </span>
                    <span className={`px-3 py-1 rounded-full ${priorityBadge.bg} ${priorityBadge.text} text-[10px] font-bold uppercase tracking-wide`}>
                      {priorityBadge.label}
                    </span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); onComplaintClick(complaint); }}
                    className="w-full md:w-auto px-4 py-2 rounded-lg bg-slate-100 text-[var(--dash-primary)] text-xs font-bold hover:bg-[var(--dash-primary)] hover:text-white transition-all"
                  >
                    View Details
                  </button>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Pagination */}
      {!loading && filtered.length > 0 && (
        <motion.nav
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex items-center justify-between border-t border-slate-200/40 pt-6"
        >
          <p className="text-xs text-slate-500">
            Showing{" "}
            <span className="font-bold text-[var(--dash-on-surface)]">
              {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)}
            </span>{" "}
            of <span className="font-bold text-[var(--dash-on-surface)]">{filtered.length}</span> reports
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="w-10 h-10 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {pageNumbers.map((p, i) =>
              p === "..." ? (
                <span key={`dots-${i}`} className="px-1 text-slate-400">
                  ...
                </span>
              ) : (
                <button
                  key={p}
                  onClick={() => setCurrentPage(p as number)}
                  className={`w-10 h-10 flex items-center justify-center rounded-lg text-xs font-bold transition-colors ${
                    currentPage === p
                      ? "bg-[var(--dash-primary)] text-white"
                      : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {p}
                </button>
              )
            )}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="w-10 h-10 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </motion.nav>
      )}
    </div>
  );
}
