"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useComplaintLike } from "@/contexts/LikeContext";
import {
  Complaint,
  STATUS_CONFIG,
  URGENCY_CONFIG,
  DEPARTMENT_CONFIG,
  formatDate,
  Department,
} from "./types";
import {
  X,
  MapPin,
  FileText,
  ExternalLink,
  ThumbsUp,
  Eye,
  EyeOff,
  User,
  Sparkles,
  Share2,
  Pencil,
  Image as ImageIcon,
  UserCheck,
  Building2,
  Landmark,
  ZoomIn,
} from "lucide-react";
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
  hidden: { opacity: 0, scale: 0.96, y: 30 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 30 } as const,
  },
  exit: { opacity: 0, scale: 0.96, y: 30, transition: { duration: 0.2 } },
};

// Embedded Map component using iframe (works without API key)
function EmbeddedMap({ lat, lng }: { lat: number; lng: number }) {
  const [isLoading, setIsLoading] = useState(true);
  const [mapError, setMapError] = useState(false);

  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01},${lat - 0.01},${lng + 0.01},${lat + 0.01}&layer=mapnik&marker=${lat},${lng}`;
  const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;

  return (
    <div className="relative w-full h-40 overflow-hidden bg-gray-100">
      {isLoading && !mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
          <MapPin className="w-6 h-6 animate-pulse text-gray-400" />
        </div>
      )}
      {mapError ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#e8eeff] gap-2">
          <MapPin className="w-8 h-8 text-[var(--dash-primary)] animate-bounce" />
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
          >
            Open in Google Maps <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      ) : (
        <>
          <iframe
            src={mapUrl}
            className="w-full h-full border-0"
            onLoad={() => setIsLoading(false)}
            onError={() => { setIsLoading(false); setMapError(true); }}
            title="Complaint Location Map"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-[var(--dash-primary)]/10 flex items-center justify-center pointer-events-none">
            <MapPin className="w-9 h-9 text-[var(--dash-primary)] drop-shadow-lg" />
          </div>
        </>
      )}
    </div>
  );
}

// Resolution Timeline per reference design
function ResolutionTimeline({ complaint }: { complaint: Complaint }) {
  const hasAgent = !!complaint.assignedAgent;
  const hasMunicipalAdmin = !!complaint.managedByMunicipalAdmin;
  const hasStateAdmin = !!complaint.escalatedToStateAdmin;
  const isEscalatedToMunicipal =
    complaint.status === "ESCALATED_TO_MUNICIPAL_LEVEL" ||
    complaint.escalationLevel === "MUNICIPAL_ADMIN" ||
    hasMunicipalAdmin;
  const isEscalatedToState =
    complaint.status === "ESCALATED_TO_STATE_LEVEL" ||
    complaint.escalationLevel === "STATE_ADMIN" ||
    hasStateAdmin;

  if (!hasAgent && !hasMunicipalAdmin && !hasStateAdmin) {
    return (
      <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
          <User className="w-4 h-4 text-gray-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-600">Awaiting Assignment</p>
          <p className="text-xs text-gray-400">Your complaint will be assigned to an agent soon</p>
        </div>
      </div>
    );
  }

  const items: {
    icon: React.ReactNode;
    bg: string;
    label: string;
    name: string;
    subtitle: string;
    date: string;
    badge: string;
    badgeClass: string;
  }[] = [];

  if (hasAgent) {
    items.push({
      icon: <User className="w-3.5 h-3.5 text-white" />,
      bg: "bg-[var(--dash-primary)]",
      label: "Field Agent",
      name: complaint.assignedAgent!.fullName,
      subtitle: "Assigned for on-ground verification",
      date: formatDate(complaint.assignedAgent!.dateOfCreation),
      badge: "Assigned",
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    });
  }

  if (isEscalatedToMunicipal && hasMunicipalAdmin) {
    items.push({
      icon: <Building2 className="w-3.5 h-3.5 text-white" />,
      bg: "bg-[#1960a3]",
      label: "Municipal Admin",
      name: complaint.managedByMunicipalAdmin!.fullName,
      subtitle: "Case escalated to Regional HQ",
      date: formatDate(complaint.managedByMunicipalAdmin!.dateOfCreation),
      badge: "Escalated",
      badgeClass: "bg-violet-50 text-violet-700 border-violet-200",
    });
  }

  if (isEscalatedToState && hasStateAdmin) {
    items.push({
      icon: <Landmark className="w-3.5 h-3.5 text-white" />,
      bg: "bg-rose-500",
      label: "State Admin",
      name: complaint.escalatedToStateAdmin!.fullName,
      subtitle: `State: ${complaint.escalatedToStateAdmin!.state}`,
      date: formatDate(complaint.escalatedToStateAdmin!.dateOfCreation),
      badge: "Priority",
      badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
    });
  }

  return (
    <div className="relative pl-8 space-y-8 before:content-[''] before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-gray-200">
      {items.map((item, i) => (
        <div className="relative" key={i}>
          <div
            className={cn(
              "absolute -left-8 w-6 h-6 rounded-full flex items-center justify-center ring-4 ring-white",
              item.bg
            )}
          >
            {item.icon}
          </div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div>
              <p className="font-bold text-[var(--dash-on-surface)] text-sm">
                {item.label}: {item.name}
              </p>
              <p className="text-xs text-slate-500">{item.subtitle}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-slate-400">{item.date}</span>
              <span
                className={cn(
                  "px-2 py-0.5 text-[10px] font-bold rounded-full uppercase border",
                  item.badgeClass
                )}
              >
                {item.badge}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Upvote cell for metadata grid ─── */
function UpvoteCell({ complaintId }: { complaintId: string }) {
  const { liked, count, isLiking, toggle } = useComplaintLike(complaintId);
  return (
    <button
      onClick={() => { if (!isLiking) toggle(); }}
      disabled={isLiking}
      className={cn(
        "p-4 bg-[#f9f9ff] border border-gray-100 rounded-xl text-left transition-colors hover:bg-[#f0f0ff] cursor-pointer",
        liked && "border-[var(--dash-primary)]/30 bg-[var(--dash-primary)]/5"
      )}
    >
      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">
        Upvotes
      </p>
      <div className="flex items-center gap-1">
        <ThumbsUp className={cn("w-4 h-4 transition-colors", liked ? "text-[var(--dash-primary)] fill-current" : "text-[var(--dash-primary)]")} />
        <p className={cn("text-sm font-semibold", liked ? "text-[var(--dash-primary)]" : "text-[var(--dash-on-surface)]")}>
          {count} upvote{count !== 1 ? "s" : ""}
        </p>
      </div>
    </button>
  );
}

/* ─── Share Report button (copies link) ─── */
function ShareReportButton({ complaintId, seq }: { complaintId: string; seq?: number }) {
  const [copied, setCopied] = useState(false);
  const handleShare = async () => {
    const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/complaint/${complaintId}` : "";
    if (navigator.share) {
      try {
        await navigator.share({ title: `Complaint #${seq || ""}`, url: shareUrl });
        return;
      } catch { /* user cancelled */ }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard failed */ }
  };
  return (
    <button
      onClick={handleShare}
      className="w-full py-3.5 bg-[#dde2f3] text-[var(--dash-on-surface)]/80 font-[var(--font-headline)] font-bold rounded-lg hover:bg-[#d4daea] transition-all flex items-center justify-center gap-2 border border-gray-200"
    >
      <Share2 className="w-5 h-5" />
      {copied ? "Link Copied!" : "Share Report"}
    </button>
  );
}

/* ─── Main Modal ─── */
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

  const urgencyBadgeColors: Record<string, string> = {
    LOW: "bg-green-400 text-green-950",
    MEDIUM: "bg-yellow-400 text-yellow-950",
    HIGH: "bg-orange-400 text-orange-950",
    CRITICAL: "bg-red-500 text-white",
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4">
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
            className="relative w-full max-w-5xl max-h-[92vh] bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Loading overlay */}
            {isLoading && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-4 border-[var(--dash-primary)] border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-gray-500">Loading complaint details...</p>
                </div>
              </div>
            )}

            {complaint && (
              <>
                {/* ── Purple Gradient Header ── */}
                <div className="relative bg-gradient-to-r from-[var(--dash-primary)] to-[var(--dash-primary-container)] p-6 md:p-8 text-white shrink-0">
                  <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/20 transition-colors z-10"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <div className="flex flex-wrap justify-between items-start gap-4">
                    <div className="space-y-2 max-w-2xl">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-bold tracking-widest uppercase">
                          Complaint #{complaint.seq}
                        </span>
                        <span className="text-white/80 font-medium text-sm">
                          • {complaint.category?.name || "General"}
                        </span>
                      </div>
                      <h1 className="text-2xl md:text-3xl font-[var(--font-headline)] font-extrabold tracking-tight">
                        {complaint.subCategory || complaint.category?.name || "Complaint Details"}
                      </h1>
                      <p className="text-white/80 text-sm max-w-2xl leading-relaxed line-clamp-2">
                        {complaint.description}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 items-end shrink-0">
                      <div className="flex gap-2 flex-wrap justify-end">
                        {statusConfig && (
                          <span className="px-3 py-1 bg-white text-[var(--dash-primary)] text-xs font-bold rounded-full shadow-sm">
                            {statusConfig.label}
                          </span>
                        )}
                        {urgencyConfig && (
                          <span
                            className={cn(
                              "px-3 py-1 text-xs font-bold rounded-full shadow-sm",
                              urgencyBadgeColors[complaint.urgency] || "bg-yellow-400 text-yellow-950"
                            )}
                          >
                            {urgencyConfig.label} Priority
                          </span>
                        )}
                      </div>
                      <span
                        className={cn(
                          "px-3 py-1 text-xs font-bold rounded-full shadow-sm",
                          complaint.isPublic
                            ? "bg-blue-500 text-white"
                            : "bg-gray-200 text-gray-700"
                        )}
                      >
                        {complaint.isPublic ? "Public" : "Private"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ── Bento Content Grid ── */}
                <div className="flex-1 overflow-y-auto">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 md:p-8">
                    {/* Left Column */}
                    <div className="lg:col-span-8 space-y-8">
                      {/* Description */}
                      <section className="space-y-4">
                        <div className="flex items-center gap-2 text-[var(--dash-on-surface)]">
                          <FileText className="w-5 h-5 text-[var(--dash-primary)]" />
                          <h2 className="font-[var(--font-headline)] font-bold text-lg">
                            Detailed Description
                          </h2>
                        </div>
                        <div className="p-6 bg-[#f1f3ff] rounded-xl border-l-4 border-[var(--dash-primary)]">
                          <p className="text-[var(--dash-on-surface)]/80 leading-relaxed whitespace-pre-wrap">
                            {complaint.description}
                          </p>

                          {/* Attachment inline */}
                          {complaint.attachmentUrl && (
                            <div className="mt-6 space-y-3">
                              <div className="flex items-center gap-2 text-slate-500">
                                <ImageIcon className="w-4 h-4" />
                                <span className="text-xs font-bold uppercase tracking-wider">
                                  Attached Photo
                                </span>
                              </div>
                              <div className="relative group">
                                <img
                                  alt="Complaint evidence"
                                  className="w-full h-64 object-cover rounded-xl border border-gray-200 shadow-sm"
                                  src={complaint.attachmentUrl}
                                />
                                <div className="absolute bottom-3 right-3">
                                  <a
                                    href={complaint.attachmentUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-3 py-1.5 bg-white/90 backdrop-blur-md border border-gray-200 rounded-lg text-[var(--dash-primary)] text-xs font-bold hover:bg-white transition-colors shadow-sm"
                                  >
                                    <ZoomIn className="w-4 h-4" />
                                    View Full Size
                                  </a>
                                </div>
                              </div>
                              <p className="text-[11px] text-slate-400 italic">
                                Evidence uploaded by complainant on{" "}
                                {formatDate(complaint.submissionDate)}
                              </p>
                            </div>
                          )}
                        </div>
                      </section>

                      {/* Metadata Grid */}
                      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-4 bg-[#f9f9ff] border border-gray-100 rounded-xl">
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">
                            Department
                          </p>
                          <p className="text-sm font-semibold text-[var(--dash-on-surface)]">
                            {departmentConfig?.label || complaint.assignedDepartment}
                          </p>
                        </div>
                        <div className="p-4 bg-[#f9f9ff] border border-gray-100 rounded-xl">
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">
                            Submitted On
                          </p>
                          <p className="text-sm font-semibold text-[var(--dash-on-surface)]">
                            {formatDate(complaint.submissionDate)}
                          </p>
                        </div>
                        <div className="p-4 bg-[#f9f9ff] border border-gray-100 rounded-xl">
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">
                            Last Updated
                          </p>
                          <p className="text-sm font-semibold text-[var(--dash-on-surface)]">
                            {formatDate(complaint.lastUpdated)}
                          </p>
                        </div>
                        <UpvoteCell complaintId={complaint.id} />
                      </section>

                      {/* Resolution Timeline */}
                      {!hideAssignmentTimeline && (
                        <section className="space-y-6">
                          <div className="flex items-center gap-2 text-[var(--dash-on-surface)]">
                            <UserCheck className="w-5 h-5 text-[var(--dash-primary)]" />
                            <h2 className="font-[var(--font-headline)] font-bold text-lg">
                              Resolution Timeline
                            </h2>
                          </div>
                          <ResolutionTimeline complaint={complaint} />
                        </section>
                      )}
                    </div>

                    {/* Right Column */}
                    <div className="lg:col-span-4 space-y-6">
                      {/* Location Card */}
                      {complaint.location && (
                        <div className="bg-[#f1f3ff] rounded-xl overflow-hidden border border-gray-100">
                          {complaint.location.latitude && complaint.location.longitude ? (
                            <EmbeddedMap
                              lat={complaint.location.latitude}
                              lng={complaint.location.longitude}
                            />
                          ) : (
                            <div className="h-40 w-full bg-[#e8eeff] flex items-center justify-center">
                              <MapPin className="w-9 h-9 text-[var(--dash-primary)] animate-bounce" />
                            </div>
                          )}
                          <div className="p-4">
                            <div className="flex items-start gap-3">
                              <MapPin className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                              <div>
                                <p className="text-sm font-bold text-[var(--dash-on-surface)]">
                                  Complaint Location
                                </p>
                                <p className="text-sm text-slate-500">
                                  {[
                                    complaint.location.locality,
                                    complaint.location.city,
                                    complaint.location.district,
                                    complaint.location.pin,
                                  ]
                                    .filter(Boolean)
                                    .join(", ")}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* AI Analysis Card */}
                      {(complaint.AIstandardizedSubCategory ||
                        complaint.AIimageVarificationStatus !== null ||
                        complaint.AIabusedFlag !== null) && (
                        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-5 text-white border border-slate-700 shadow-lg relative overflow-hidden group">
                          <div className="absolute -right-4 -top-4 opacity-10 rotate-12 transition-transform group-hover:scale-110">
                            <Sparkles className="w-20 h-20" />
                          </div>

                          <div className="flex items-center gap-2 mb-4">
                            <Sparkles className="w-4 h-4 text-purple-300" />
                            <h3 className="font-[var(--font-headline)] font-bold text-sm tracking-wide">
                              Swaraj AI Analysis
                            </h3>
                          </div>

                          <div className="space-y-3">
                            {complaint.AIstandardizedSubCategory && (
                              <div>
                                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                                  Standardized Category
                                </p>
                                <p className="text-sm font-semibold text-purple-300">
                                  {complaint.AIstandardizedSubCategory}
                                </p>
                              </div>
                            )}

                            {complaint.AIimageVarificationStatus !== null && (
                              <div className="pt-2 border-t border-slate-700/50">
                                <p className="text-xs text-slate-300 italic">
                                  {complaint.AIimageVarificationStatus
                                    ? "&quot;Image verified as authentic evidence. High confidence mapping to complaint category.&quot;"
                                    : "&quot;Image could not be verified. Manual review recommended.&quot;"}
                                </p>
                              </div>
                            )}

                            <div className="flex justify-between items-center pt-2">
                              <span className="text-[9px] text-slate-500 font-bold uppercase">
                                Powered by AI
                              </span>
                              {complaint.AIimageVarificationStatus !== null && (
                                <span
                                  className={cn(
                                    "text-[10px] font-bold",
                                    complaint.AIimageVarificationStatus
                                      ? "text-emerald-400"
                                      : "text-amber-400"
                                  )}
                                >
                                  {complaint.AIimageVarificationStatus ? "Verified" : "Review Needed"}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="space-y-3 pt-2">
                        {complaint.attachmentUrl && (
                          <a
                            href={complaint.attachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-3.5 bg-[var(--dash-primary)] text-white font-[var(--font-headline)] font-bold rounded-lg shadow-lg hover:bg-[var(--dash-primary-container)] transition-all flex items-center justify-center gap-2"
                          >
                            <Pencil className="w-5 h-5" />
                            View Evidence
                          </a>
                        )}
                        <ShareReportButton complaintId={complaint.id} seq={complaint.seq} />
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <footer className="bg-[#f1f3ff] p-6 flex justify-center border-t border-gray-100">
                    <button
                      onClick={onClose}
                      className="px-12 py-3 bg-[var(--dash-on-surface)] text-white font-[var(--font-headline)] font-bold rounded-xl hover:bg-slate-800 transition-all active:scale-95 shadow-md flex items-center gap-2"
                    >
                      <X className="w-5 h-5" />
                      Close Detail View
                    </button>
                  </footer>
                </div>
              </>
            )}

            {/* No complaint data state */}
            {!complaint && !isLoading && (
              <div className="p-12 text-center">
                <p className="text-gray-500">No complaint data available.</p>
                <button
                  onClick={onClose}
                  className="mt-4 px-6 py-2 bg-gray-100 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
