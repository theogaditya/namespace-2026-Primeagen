"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Complaint,
  STATUS_CONFIG,
  URGENCY_CONFIG,
  DEPARTMENT_CONFIG,
  formatDate,
  getRelativeTime,
  Department,
} from "./types";
import {
  MapPin,
  Calendar,
  ChevronRight,
  Eye,
  EyeOff,
  ThumbsUp,
  Clock,
} from "lucide-react";

interface ComplaintCardProps {
  complaint: Complaint;
  onClick: () => void;
  index?: number;
}

export function ComplaintCard({ complaint, onClick, index = 0 }: ComplaintCardProps) {
  const statusConfig = STATUS_CONFIG[complaint.status];
  const urgencyConfig = URGENCY_CONFIG[complaint.urgency];
  const departmentConfig = DEPARTMENT_CONFIG[complaint.assignedDepartment as Department];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      whileHover={{ scale: 1.01, y: -2 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className={cn(
        "group relative p-4 sm:p-5 rounded-2xl border-2 bg-white cursor-pointer",
        "transition-all duration-200 hover:shadow-lg hover:border-gray-300",
        "overflow-hidden"
      )}
    >
      {/* Urgency indicator stripe */}
      <div
        className={cn(
          "absolute top-0 left-0 w-1 h-full rounded-l-2xl",
          complaint.urgency === "CRITICAL" && "bg-red-500",
          complaint.urgency === "HIGH" && "bg-orange-500",
          complaint.urgency === "MEDIUM" && "bg-yellow-500",
          complaint.urgency === "LOW" && "bg-green-500"
        )}
      />

      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        {/* Left section - Main content */}
        <div className="flex-1 min-w-0 pl-2">
          {/* Header with ID, Status and Urgency */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-xs font-mono text-gray-400">#{complaint.seq}</span>
            
            {/* Status Badge */}
            <span
              className={cn(
                "px-2.5 py-0.5 text-xs font-semibold rounded-full border",
                statusConfig.bgColor,
                statusConfig.color,
                statusConfig.borderColor
              )}
            >
              {statusConfig.label}
            </span>

            {/* Urgency Badge */}
            <span
              className={cn(
                "px-2 py-0.5 text-xs font-medium rounded-full",
                urgencyConfig.bgColor,
                urgencyConfig.color
              )}
            >
              {urgencyConfig.icon} {urgencyConfig.label}
            </span>

            {/* Public/Private indicator */}
            <span
              className={cn(
                "flex items-center gap-1 px-2 py-0.5 text-xs rounded-full",
                complaint.isPublic
                  ? "bg-blue-50 text-blue-600"
                  : "bg-gray-100 text-gray-500"
              )}
            >
              {complaint.isPublic ? (
                <Eye className="w-3 h-3" />
              ) : (
                <EyeOff className="w-3 h-3" />
              )}
              {complaint.isPublic ? "Public" : "Private"}
            </span>
          </div>

          {/* Category and Sub-category */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{departmentConfig?.icon || "📋"}</span>
            <div>
              <h3 className="font-semibold text-gray-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
                {complaint.category?.name || complaint.subCategory}
              </h3>
              {complaint.category?.name && complaint.subCategory !== complaint.category.name && (
                <p className="text-sm text-gray-500">{complaint.subCategory}</p>
              )}
            </div>
          </div>

          {/* Description preview */}
          <p className="text-sm text-gray-600 line-clamp-2 mb-3">
            {complaint.description}
          </p>

          {/* Location */}
          {complaint.location && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
              <MapPin className="w-3.5 h-3.5" />
              <span className="line-clamp-1">
                {[complaint.location.locality, complaint.location.city, complaint.location.district]
                  .filter(Boolean)
                  .join(", ")}
              </span>
            </div>
          )}

          {/* Footer with dates and upvotes */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {formatDate(complaint.submissionDate)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {getRelativeTime(complaint.lastUpdated)}
            </span>
            {complaint.upvoteCount > 0 && (
              <span className="flex items-center gap-1 text-blue-500">
                <ThumbsUp className="w-3.5 h-3.5" />
                {complaint.upvoteCount}
              </span>
            )}
          </div>
        </div>

        {/* Right section - Arrow indicator */}
        <div className="hidden sm:flex items-center self-center">
          <div className="p-2 rounded-full bg-gray-100 group-hover:bg-blue-100 transition-colors">
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
          </div>
        </div>
      </div>

      {/* Attachment indicator */}
      {complaint.attachmentUrl && (
        <div className="absolute top-3 right-3">
          <div className="w-2 h-2 rounded-full bg-blue-500" title="Has attachment" />
        </div>
      )}
    </motion.div>
  );
}
