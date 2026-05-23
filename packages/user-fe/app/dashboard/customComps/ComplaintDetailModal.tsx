"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Complaint,
  STATUS_CONFIG,
  URGENCY_CONFIG,
  DEPARTMENT_CONFIG,
  formatDateTime,
  formatDate,
  Department,
} from "./types";
import {
  X,
  MapPin,
  Calendar,
  Clock,
  User,
  Eye,
  EyeOff,
  ThumbsUp,
  FileText,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  Hash,
  Building,
  Tag,
  Image as ImageIcon,
  UserCheck,
  Building2,
  Landmark,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Variants } from "framer-motion";

interface ComplaintDetailModalProps {
  complaint: Complaint | null;
  isOpen: boolean;
  onClose: () => void;
  isLoading?: boolean;
  hideAssignmentTimeline?: boolean; // Hide for community feed view
}

const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 30 } as const,
  },
  exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2 } },
};

// Embedded Map component using iframe (works without API key)
function EmbeddedMap({ lat, lng }: { lat: number; lng: number }) {
  const [isLoading, setIsLoading] = useState(true);
  const [mapError, setMapError] = useState(false);

  // Use OpenStreetMap embed as it doesn't require API key
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01},${lat - 0.01},${lng + 0.01},${lat + 0.01}&layer=mapnik&marker=${lat},${lng}`;
  
  // Google Maps link for "Open in Google Maps"
  const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;

  return (
    <div className="relative w-full h-48 rounded-xl overflow-hidden bg-gray-100">
      {isLoading && !mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
          <div className="flex flex-col items-center gap-2 text-gray-500">
            <MapPin className="w-6 h-6 animate-pulse" />
            <span className="text-sm">Loading map...</span>
          </div>
        </div>
      )}
      
      {mapError ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 gap-3">
          <MapPin className="w-8 h-8 text-gray-400" />
          <p className="text-sm text-gray-500">Map unavailable</p>
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
          >
            Open in Google Maps
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      ) : (
        <>
          <iframe
            src={mapUrl}
            className="w-full h-full border-0"
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setMapError(true);
            }}
            title="Complaint Location Map"
            loading="lazy"
          />
          {/* Open in Google Maps button overlay */}
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-2 right-2 px-2 py-1 bg-white/90 hover:bg-white text-xs font-medium text-gray-700 rounded-md shadow-sm flex items-center gap-1 transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            Google Maps
          </a>
        </>
      )}
    </div>
  );
}

// Assignment Timeline Component - Highlighted Section
function AssignmentTimeline({ complaint }: { complaint: Complaint }) {
  const hasAgent = !!complaint.assignedAgent;
  const hasMunicipalAdmin = !!complaint.managedByMunicipalAdmin;
  const hasStateAdmin = !!complaint.escalatedToStateAdmin;
  
  // Check status for escalation levels
  const isEscalatedToMunicipal = complaint.status === 'ESCALATED_TO_MUNICIPAL_LEVEL' || 
                                  complaint.escalationLevel === 'MUNICIPAL_ADMIN' ||
                                  hasMunicipalAdmin;
  const isEscalatedToState = complaint.status === 'ESCALATED_TO_STATE_LEVEL' || 
                              complaint.escalationLevel === 'STATE_ADMIN' ||
                              hasStateAdmin;

  // If no one is assigned yet
  if (!hasAgent && !hasMunicipalAdmin && !hasStateAdmin) {
    return (
      <div className="p-5 bg-linear-to-r from-blue-50 to-indigo-50 rounded-2xl border-2 border-blue-200 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 bg-blue-100 rounded-lg">
            <UserCheck className="w-5 h-5 text-blue-600" />
          </div>
          <span className="font-bold text-base text-blue-900">Assignment Status</span>
        </div>
        <div className="flex items-center gap-3 p-3 bg-white/60 rounded-xl">
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
            <User className="w-5 h-5 text-gray-400" />
          </div>
          <div>
            <span className="text-sm font-medium text-gray-600">Awaiting Assignment</span>
            <p className="text-xs text-gray-400">Your complaint will be assigned to an agent soon</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 bg-linear-to-r from-blue-50 to-indigo-50 rounded-2xl border-2 border-blue-200 shadow-sm">
      <div className="flex items-center gap-2 mb-5">
        <div className="p-1.5 bg-blue-100 rounded-lg">
          <UserCheck className="w-5 h-5 text-blue-600" />
        </div>
        <span className="font-bold text-base text-blue-900">Assignment Timeline</span>
        <span className="ml-auto px-2 py-0.5 text-xs bg-blue-600 text-white rounded-full font-medium">
          Live Tracking
        </span>
      </div>
      
      <div className="relative bg-white/60 rounded-xl p-4">
        {/* Timeline line */}
        <div className="absolute left-[22px] top-12 bottom-6 w-0.5 bg-linear-to-b from-blue-300 to-gray-200" />

        {/* Agent Step */}
        <div className="relative flex items-start gap-4 pb-5">
          <div className={cn(
            "relative z-10 w-10 h-10 rounded-full flex items-center justify-center shrink-0 ring-4 ring-white shadow-md",
            hasAgent ? "bg-linear-to-r from-blue-500 to-blue-600" : "bg-gray-200"
          )}>
            <User className={cn("w-5 h-5", hasAgent ? "text-white" : "text-gray-400")} />
          </div>
          <div className="flex-1 pt-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn("text-sm font-semibold", hasAgent ? "text-gray-900" : "text-gray-400")}>
                Field Agent
              </span>
              {hasAgent && (
                <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full font-medium">
                  ✓ Assigned
                </span>
              )}
            </div>
            {hasAgent ? (
              <div className="mt-1.5 p-2 bg-blue-50/50 rounded-lg">
                <p className="text-sm font-bold text-blue-700">{complaint.assignedAgent!.fullName}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Assigned on {formatDate(complaint.assignedAgent!.dateOfCreation)}
                </p>
              </div>
            ) : (
              <p className="text-xs text-gray-400 mt-1">Pending assignment</p>
            )}
          </div>
        </div>

        {/* Municipal Admin Step - show if escalated to municipal or state level */}
        {(isEscalatedToMunicipal || isEscalatedToState) && (
          <div className="relative flex items-start gap-4 pb-5">
            <div className={cn(
              "relative z-10 w-10 h-10 rounded-full flex items-center justify-center shrink-0 ring-4 ring-white shadow-md",
              hasMunicipalAdmin ? "bg-linear-to-r from-indigo-500 to-indigo-600" : "bg-gray-200"
            )}>
              <Building2 className={cn("w-5 h-5", hasMunicipalAdmin ? "text-white" : "text-gray-400")} />
            </div>
            <div className="flex-1 pt-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn("text-sm font-semibold", hasMunicipalAdmin ? "text-gray-900" : "text-gray-400")}>
                  Municipal Admin
                </span>
                {hasMunicipalAdmin && (
                  <span className="px-2 py-0.5 text-xs bg-indigo-100 text-indigo-700 rounded-full font-medium">
                    ⬆ Escalated
                  </span>
                )}
              </div>
              {hasMunicipalAdmin ? (
                <div className="mt-1.5 p-2 bg-indigo-50/50 rounded-lg">
                  <p className="text-sm font-bold text-indigo-700">
                    {complaint.managedByMunicipalAdmin!.fullName}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {complaint.managedByMunicipalAdmin!.municipality}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-gray-400 mt-1">Not escalated to municipal level</p>
              )}
            </div>
          </div>
        )}

        {/* State Admin Step - show if escalated to state level */}
        {isEscalatedToState && (
          <div className="relative flex items-start gap-4">
            <div className={cn(
              "relative z-10 w-10 h-10 rounded-full flex items-center justify-center shrink-0 ring-4 ring-white shadow-md",
              hasStateAdmin ? "bg-linear-to-r from-rose-500 to-rose-600" : "bg-gray-200"
            )}>
              <Landmark className={cn("w-5 h-5", hasStateAdmin ? "text-white" : "text-gray-400")} />
            </div>
            <div className="flex-1 pt-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn("text-sm font-semibold", hasStateAdmin ? "text-gray-900" : "text-gray-400")}>
                  State Admin
                </span>
                {hasStateAdmin && (
                  <span className="px-2 py-0.5 text-xs bg-rose-100 text-rose-700 rounded-full font-medium">
                    ⬆⬆ Priority
                  </span>
                )}
              </div>
              {hasStateAdmin ? (
                <div className="mt-1.5 p-2 bg-rose-50/50 rounded-lg">
                  <p className="text-sm font-bold text-rose-700">
                    {complaint.escalatedToStateAdmin!.fullName}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {complaint.escalatedToStateAdmin!.state}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-gray-400 mt-1">Not escalated to state level</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function ComplaintDetailModal({
  complaint,
  isOpen,
  onClose,
  isLoading = false,
  hideAssignmentTimeline = false,
}: ComplaintDetailModalProps) {
  if (!isOpen) return null;

  const statusConfig = complaint ? STATUS_CONFIG[complaint.status] : null;
  const urgencyConfig = complaint ? URGENCY_CONFIG[complaint.urgency] : null;
  const departmentConfig = complaint
    ? DEPARTMENT_CONFIG[complaint.assignedDepartment as Department]
    : null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-999999 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Loading state */}
            {isLoading && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-gray-500">Loading complaint details...</p>
                </div>
              </div>
            )}

            {/* Header */}
            <div className="relative px-6 py-5 bg-linear-to-r from-blue-600 to-indigo-600 text-white shrink-0">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/20 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {complaint && (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <Hash className="w-4 h-4 opacity-70" />
                    <span className="font-mono text-sm opacity-80">
                      Complaint #{complaint.seq}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold pr-10">
                    {complaint.category?.name || complaint.subCategory}
                  </h2>
                  {complaint.category?.name &&
                    complaint.subCategory !== complaint.category.name && (
                      <p className="text-sm text-white/80 mt-1">
                        {complaint.subCategory}
                      </p>
                    )}
                </>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {complaint && (
                <div className="space-y-6">
                  {/* Status and Badges */}
                  <div className="flex flex-wrap gap-2">
                    {statusConfig && (
                      <span
                        className={cn(
                          "px-3 py-1.5 text-sm font-semibold rounded-full border",
                          statusConfig.bgColor,
                          statusConfig.color,
                          statusConfig.borderColor
                        )}
                      >
                        {statusConfig.label}
                      </span>
                    )}
                    {urgencyConfig && (
                      <span
                        className={cn(
                          "px-3 py-1.5 text-sm font-medium rounded-full",
                          urgencyConfig.bgColor,
                          urgencyConfig.color
                        )}
                      >
                        {urgencyConfig.icon} {urgencyConfig.label} Priority
                      </span>
                    )}
                    <span
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full",
                        complaint.isPublic
                          ? "bg-blue-50 text-blue-600"
                          : "bg-gray-100 text-gray-600"
                      )}
                    >
                      {complaint.isPublic ? (
                        <Eye className="w-4 h-4" />
                      ) : (
                        <EyeOff className="w-4 h-4" />
                      )}
                      {complaint.isPublic ? "Public" : "Private"}
                    </span>
                  </div>

                  {/* Description */}
                  <div className="p-4 bg-gray-50 rounded-2xl">
                    <div className="flex items-center gap-2 mb-2 text-gray-700">
                      <FileText className="w-4 h-4" />
                      <span className="font-semibold text-sm">Description</span>
                    </div>
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {complaint.description}
                    </p>
                  </div>

                  {/* Attachment */}
                  {complaint.attachmentUrl && (
                    <div className="p-4 bg-blue-50 rounded-2xl">
                      <div className="flex items-center gap-2 mb-3 text-blue-700">
                        <ImageIcon className="w-4 h-4" />
                        <span className="font-semibold text-sm">Attachment</span>
                      </div>
                      <a
                        href={complaint.attachmentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        <ExternalLink className="w-4 h-4" />
                        View Attachment
                      </a>
                    </div>
                  )}

                  {/* Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Department */}
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                        <Building className="w-3.5 h-3.5" />
                        <span>Department</span>
                      </div>
                      <p className="font-medium text-gray-900">
                        {departmentConfig?.icon} {departmentConfig?.label || complaint.assignedDepartment}
                      </p>
                    </div>

                    {/* Category */}
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                        <Tag className="w-3.5 h-3.5" />
                        <span>Category</span>
                      </div>
                      <p className="font-medium text-gray-900">
                        {complaint.category?.name || "N/A"}
                      </p>
                    </div>

                    {/* Submission Date */}
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Submitted On</span>
                      </div>
                      <p className="font-medium text-gray-900">
                        {formatDateTime(complaint.submissionDate)}
                      </p>
                    </div>

                    {/* Last Updated */}
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Last Updated</span>
                      </div>
                      <p className="font-medium text-gray-900">
                        {formatDateTime(complaint.lastUpdated)}
                      </p>
                    </div>

                    {/* Resolution Date (if completed) */}
                    {complaint.dateOfResolution && (
                      <div className="p-4 bg-green-50 rounded-xl">
                        <div className="flex items-center gap-2 text-green-600 text-xs mb-1">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Resolved On</span>
                        </div>
                        <p className="font-medium text-green-800">
                          {formatDateTime(complaint.dateOfResolution)}
                        </p>
                      </div>
                    )}

                    {/* Upvotes */}
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                        <ThumbsUp className="w-3.5 h-3.5" />
                        <span>Community Support</span>
                      </div>
                      <p className="font-medium text-gray-900">
                        {complaint.upvoteCount} upvote{complaint.upvoteCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>

                  {/* Assignment Timeline - hidden for community feed */}
                  {!hideAssignmentTimeline && (
                    <AssignmentTimeline complaint={complaint} />
                  )}

                  {/* Location with embedded map */}
                  {complaint.location && (
                    <div className="p-4 bg-emerald-50 rounded-2xl">
                      <div className="flex items-center gap-2 mb-3 text-emerald-700">
                        <MapPin className="w-4 h-4" />
                        <span className="font-semibold text-sm">Location</span>
                      </div>
                      <p className="text-gray-700 mb-3">
                        {[
                          complaint.location.street,
                          complaint.location.locality,
                          complaint.location.city,
                          complaint.location.district,
                          complaint.location.pin,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                      {complaint.location.latitude && complaint.location.longitude && (
                        <EmbeddedMap
                          lat={complaint.location.latitude}
                          lng={complaint.location.longitude}
                        />
                      )}
                    </div>
                  )}

                  {/* AI Analysis (if available) - Highlighted Section */}
                  {(complaint.AIabusedFlag !== null ||
                    complaint.AIimageVarificationStatus !== null ||
                    complaint.AIstandardizedSubCategory) && (
                    <div className="p-5 bg-linear-to-r from-purple-50 to-violet-50 rounded-2xl border-2 border-purple-200 shadow-sm">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="p-1.5 bg-purple-100 rounded-lg">
                          <AlertCircle className="w-5 h-5 text-purple-600" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-base text-purple-900">Swaraj AI</span>
                          <span className="px-2 py-0.5 text-xs bg-purple-600 text-white rounded-full font-medium">
                            Analysis
                          </span>
                        </div>
                        <span className="ml-auto text-xs text-purple-500 font-medium">Powered by AI</span>
                      </div>
                      
                      <div className="space-y-3 bg-white/60 rounded-xl p-4">
                        {complaint.AIstandardizedSubCategory && (
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                              <Tag className="w-4 h-4 text-purple-600" />
                            </div>
                            <div>
                              <p className="text-xs text-purple-500 font-medium">Standardized Category</p>
                              <p className="text-sm font-bold text-gray-900 mt-0.5">
                                {complaint.AIstandardizedSubCategory}
                              </p>
                            </div>
                          </div>
                        )}
                        {complaint.AIimageVarificationStatus !== null && (
                          <div className="flex items-start gap-3">
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                              complaint.AIimageVarificationStatus ? "bg-green-100" : "bg-red-100"
                            )}>
                              {complaint.AIimageVarificationStatus ? (
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              ) : (
                                <AlertCircle className="w-4 h-4 text-red-600" />
                              )}
                            </div>
                            <div>
                              <p className="text-xs text-purple-500 font-medium">Image Verification</p>
                              <p className={cn(
                                "text-sm font-bold mt-0.5",
                                complaint.AIimageVarificationStatus ? "text-green-600" : "text-red-600"
                              )}>
                                {complaint.AIimageVarificationStatus ? "Verified ✓" : "Not Verified ✗"}
                              </p>
                            </div>
                          </div>
                        )}
                        {complaint.AIabusedFlag !== null && complaint.AIabusedFlag && (
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                              <AlertCircle className="w-4 h-4 text-amber-600" />
                            </div>
                            <div>
                              <p className="text-xs text-purple-500 font-medium">Content Flag</p>
                              <p className="text-sm font-bold text-amber-600 mt-0.5">
                                Flagged for Review
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3 shrink-0">
              <Button variant="outline" onClick={onClose} className="rounded-xl">
                Close
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
