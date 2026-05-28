"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { UserData, formatDate } from "./types";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  Sparkles,
} from "lucide-react";
import { BadgeShowcase } from "@/components/badges/BadgeShowcase";

interface ProfileCardProps {
  userData: UserData | null;
  isLoading?: boolean;
}

export function ProfileCard({ userData, isLoading = false }: ProfileCardProps) {
  if (isLoading) {
    return (
      <div className="p-5 bg-white rounded-2xl border-2 border-gray-100 shadow-sm">
        <div className="animate-pulse space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-gray-200" />
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded" />
            <div className="h-3 bg-gray-200 rounded w-5/6" />
          </div>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="p-5 bg-white rounded-2xl border-2 border-gray-100 shadow-sm">
        <p className="text-gray-500 text-center">Profile not available</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="p-5 bg-white rounded-2xl border-2 border-gray-100 shadow-sm hover:shadow-md transition-shadow"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4 text-amber-500" />
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          My Profile
        </span>
      </div>

      {/* User Avatar and Name */}
      <div className="flex items-center gap-4 mb-4">
        <div className="relative">
          <div className="w-14 h-14 rounded-full bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold shadow-lg">
            {userData.name.charAt(0).toUpperCase()}
          </div>
          <div
            className={cn(
              "absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center",
              userData.status === "ACTIVE" ? "bg-green-500" : "bg-gray-400"
            )}
          >
            <Shield className="w-3 h-3 text-white" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 truncate">{userData.name}</h3>
          <p className="text-sm text-gray-500 truncate">{userData.email}</p>
        </div>
      </div>

      {/* User Details */}
      <div className="space-y-3">
        {/* Phone */}
        <div className="flex items-center gap-3 text-sm">
          <div className="p-1.5 rounded-lg bg-blue-50">
            <Phone className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <span className="text-gray-700">
            {userData.phoneNumber.startsWith('+91') 
              ? `+91 ${userData.phoneNumber.slice(3)}` 
              : userData.phoneNumber.startsWith('91') 
                ? `+91 ${userData.phoneNumber.slice(2)}`
                : `+91 ${userData.phoneNumber}`}
          </span>
        </div>

        {/* Location */}
        {userData.location && (
          <div className="flex items-start gap-3 text-sm">
            <div className="p-1.5 rounded-lg bg-emerald-50 mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <span className="text-gray-700 line-clamp-2">
              {[
                userData.location.locality,
                userData.location.city,
                userData.location.district,
                userData.location.state,
              ]
                .filter(Boolean)
                .join(", ")}
            </span>
          </div>
        )}

        {/* Account Active Since */}
        <div className="flex items-center gap-3 text-sm">
          <div className="p-1.5 rounded-lg bg-purple-50">
            <Calendar className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <span className="text-gray-700">
            Member since {formatDate(userData.dateOfCreation)}
          </span>
        </div>
      </div>

      {/* Status Badge */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full",
            userData.status === "ACTIVE"
              ? "bg-green-50 text-green-700"
              : "bg-gray-100 text-gray-600"
          )}
        >
          <span
            className={cn(
              "w-2 h-2 rounded-full",
              userData.status === "ACTIVE" ? "bg-green-500" : "bg-gray-400"
            )}
          />
          Account {userData.status === "ACTIVE" ? "Active" : userData.status}
        </span>
      </div>

      {/* Achievements/Badges Section - Eye-catching */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="p-3 bg-linear-to-br from-amber-50/80 via-orange-50/50 to-yellow-50/80 rounded-xl border border-amber-100/50">
          <BadgeShowcase compact maxDisplay={4} showViewAll />
        </div>
      </div>
    </motion.div>
  );
}
