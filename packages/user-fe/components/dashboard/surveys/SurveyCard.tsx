"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Building2,
  MessageSquare,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
import type { SurveyListItem } from "@/types/survey";

interface SurveyCardProps {
  survey: SurveyListItem;
  index: number;
  isCompleted: boolean;
  onSelect: () => void;
}

function getDaysUntilClose(endsAt: string | null): number | null {
  if (!endsAt) return null;
  const end = new Date(endsAt);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getStatusBadge(endsAt: string | null) {
  const days = getDaysUntilClose(endsAt);
  if (days === null) {
    return { bg: "bg-emerald-100", text: "text-emerald-700", label: "Open", dot: "bg-emerald-500" };
  }
  if (days <= 0) {
    return { bg: "bg-slate-100", text: "text-slate-500", label: "Closed", dot: "bg-slate-400" };
  }
  if (days <= 3) {
    return { bg: "bg-amber-100", text: "text-amber-700", label: `Closes in ${days} day${days > 1 ? "s" : ""}`, dot: "bg-amber-500" };
  }
  return { bg: "bg-emerald-100", text: "text-emerald-700", label: "Open", dot: "bg-emerald-500" };
}

export default function SurveyCard({
  survey,
  index,
  isCompleted,
  onSelect,
}: SurveyCardProps) {
  const statusBadge = getStatusBadge(survey.endsAt);
  const isClosed = survey.status === 'CLOSED' || (getDaysUntilClose(survey.endsAt) !== null && getDaysUntilClose(survey.endsAt)! <= 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`bg-white rounded-2xl border border-slate-200/70 p-5 ${isClosed ? "opacity-60 cursor-pointer" : "cursor-pointer hover:shadow-md hover:border-violet-200"} transition-all relative`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* Completed badge */}
      {isCompleted && (
        <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span className="text-[10px] font-bold text-emerald-700">Completed</span>
        </div>
      )}

      {/* Top row: category + status */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-violet-500"></span>
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
            {survey.category}
          </span>
        </div>
        {!isCompleted && (
          <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full ${statusBadge.bg}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot}`}></span>
            <span className={`text-[10px] font-bold ${statusBadge.text}`}>
              {statusBadge.label}
            </span>
          </div>
        )}
      </div>

      {/* Title */}
      <h3 className="text-sm font-bold text-slate-800 mt-2 line-clamp-2">
        {survey.title}
      </h3>

      {/* Description */}
      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
        {survey.description}
      </p>

      {/* Bottom row */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Building2 className="w-3.5 h-3.5" />
          <span className="truncate max-w-[120px]">{survey.civicPartner.orgName}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>{survey._count.responses}</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </div>
      </div>

      {/* Take Survey button */}
      {!isCompleted && !isClosed && (
        <button
          className="w-full mt-4 py-2.5 px-4 border-2 border-violet-500 text-violet-600 rounded-xl font-semibold text-sm hover:bg-violet-50 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
        >
          Take Survey →
        </button>
      )}

      {isClosed && !isCompleted && (
        <div className="w-full mt-4 py-2.5 px-4 bg-slate-100 text-slate-500 rounded-xl font-semibold text-sm text-center">
          Survey Closed
        </div>
      )}
    </motion.div>
  );
}
