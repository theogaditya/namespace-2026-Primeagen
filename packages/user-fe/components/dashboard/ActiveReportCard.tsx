"use client";

import React from "react";
import {
  Droplets,
  Lightbulb,
  Construction,
  MapPin,
  Calendar,
  Zap,
  TreePine,
  Bus,
  Shield,
  Building,
  FileText,
  Heart,
  BookOpen,
  Landmark,
  Users,
  Home,
  FileCheck,
} from "lucide-react";
import type { Complaint, ComplaintStatus } from "@/app/dashboard/customComps/types";

// Category → icon + color map
const CATEGORY_STYLE: Record<string, { icon: React.ReactNode; bg: string; text: string }> = {
  WATER_SUPPLY_SANITATION: { icon: <Droplets className="w-5 h-5" />, bg: "bg-blue-100", text: "text-blue-600" },
  ELECTRICITY_POWER: { icon: <Zap className="w-5 h-5" />, bg: "bg-amber-100", text: "text-amber-600" },
  INFRASTRUCTURE: { icon: <Construction className="w-5 h-5" />, bg: "bg-green-100", text: "text-green-600" },
  ENVIRONMENT: { icon: <TreePine className="w-5 h-5" />, bg: "bg-emerald-100", text: "text-emerald-600" },
  TRANSPORTATION: { icon: <Bus className="w-5 h-5" />, bg: "bg-indigo-100", text: "text-indigo-600" },
  // Shield — same icon used for "security" announcements
  POLICE_SERVICES: { icon: <Shield className="w-5 h-5" />, bg: "bg-red-100", text: "text-red-600" },
  HOUSING_URBAN_DEVELOPMENT: { icon: <Home className="w-5 h-5" />, bg: "bg-orange-100", text: "text-orange-600" },
  // Heart — same icon used for "health" announcements
  HEALTH: { icon: <Heart className="w-5 h-5" />, bg: "bg-pink-100", text: "text-pink-600" },
  EDUCATION: { icon: <BookOpen className="w-5 h-5" />, bg: "bg-violet-100", text: "text-violet-600" },
  MUNICIPAL_SERVICES: { icon: <Landmark className="w-5 h-5" />, bg: "bg-teal-100", text: "text-teal-600" },
  SOCIAL_WELFARE: { icon: <Users className="w-5 h-5" />, bg: "bg-cyan-100", text: "text-cyan-600" },
  PUBLIC_GRIEVANCES: { icon: <FileCheck className="w-5 h-5" />, bg: "bg-slate-100", text: "text-slate-600" },
  REVENUE: { icon: <Lightbulb className="w-5 h-5" />, bg: "bg-yellow-100", text: "text-yellow-600" },
  // catch-all for unmapped department names
  DEFAULT: { icon: <Building className="w-5 h-5" />, bg: "bg-gray-100", text: "text-gray-500" },
};

const DEFAULT_CAT_STYLE = { icon: <FileText className="w-5 h-5" />, bg: "bg-slate-100", text: "text-slate-600" };

// Status → chip style + progress
const STATUS_CHIP: Record<string, { bg: string; text: string; progress: number }> = {
  REGISTERED: { bg: "bg-slate-100", text: "text-slate-600", progress: 33 },
  UNDER_PROCESSING: { bg: "bg-amber-50", text: "text-amber-700", progress: 50 },
  FORWARDED: { bg: "bg-purple-50", text: "text-purple-700", progress: 55 },
  ON_HOLD: { bg: "bg-orange-50", text: "text-orange-700", progress: 40 },
  COMPLETED: { bg: "bg-[var(--dash-tertiary-container)]", text: "text-white", progress: 100 },
  REJECTED: { bg: "bg-red-50", text: "text-[var(--dash-error)]", progress: 100 },
  ESCALATED_TO_MUNICIPAL_LEVEL: { bg: "bg-indigo-50", text: "text-indigo-700", progress: 70 },
  ESCALATED_TO_STATE_LEVEL: { bg: "bg-rose-50", text: "text-rose-700", progress: 80 },
  DELETED: { bg: "bg-gray-100", text: "text-gray-500", progress: 0 },
};

const DEFAULT_STATUS = { bg: "bg-slate-100", text: "text-slate-600", progress: 10 };

function getStatusLabel(status: ComplaintStatus): string {
  const labels: Record<string, string> = {
    REGISTERED: "Registered",
    UNDER_PROCESSING: "Processing",
    FORWARDED: "Forwarded",
    ON_HOLD: "On Hold",
    COMPLETED: "Resolved",
    REJECTED: "Rejected",
    ESCALATED_TO_MUNICIPAL_LEVEL: "Municipal",
    ESCALATED_TO_STATE_LEVEL: "State Level",
    DELETED: "Deleted",
  };
  return labels[status] || status;
}

function formatCardDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface ActiveReportCardProps {
  complaint: Complaint;
  onClick: () => void;
}

export default function ActiveReportCard({ complaint, onClick }: ActiveReportCardProps) {
  const dept = complaint.assignedDepartment || "";
  const catStyle = CATEGORY_STYLE[dept] || DEFAULT_CAT_STYLE;
  const chipStyle = STATUS_CHIP[complaint.status] || DEFAULT_STATUS;
  const progressColor = complaint.status === "COMPLETED" ? "bg-[var(--dash-tertiary)]" : "bg-[var(--dash-primary)]";

  const title = complaint.category?.name || complaint.subCategory || "Untitled Report";
  const location = [complaint.location?.locality, complaint.location?.district].filter(Boolean).join(", ") || "Location not specified";

  return (
    <div
      onClick={onClick}
      className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-lg ${catStyle.bg} flex items-center justify-center ${catStyle.text}`}>
          {catStyle.icon}
        </div>
        <span className={`px-2 py-1 ${chipStyle.bg} ${chipStyle.text} text-[10px] font-bold rounded uppercase`}>
          {getStatusLabel(complaint.status)}
        </span>
      </div>
      <h4 className="font-bold text-[var(--dash-on-surface)] mb-1 line-clamp-1">{title}</h4>
      <div className="space-y-1 mb-4">
        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
          <MapPin className="w-3.5 h-3.5" />
          <span className="line-clamp-1">{location}</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
          <Calendar className="w-3.5 h-3.5" />
          <span>{formatCardDate(complaint.submissionDate)}</span>
        </div>
      </div>
      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
        <div
          className={`${progressColor} h-full rounded-full transition-all duration-500`}
          style={{ width: `${chipStyle.progress}%` }}
        />
      </div>
    </div>
  );
}
