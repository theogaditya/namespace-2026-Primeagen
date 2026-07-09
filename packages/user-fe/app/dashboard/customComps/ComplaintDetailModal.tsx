"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { AbuseFlagBanner } from "@/components/abuse-flag-banner";
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
  User,
  Sparkles,
  Share2,
  Pencil,
  Image as ImageIcon,
  UserCheck,
  Building2,
  Landmark,
  ZoomIn,
  CheckCircle2,
  Loader2,
} from "lucide-react";

import type { Variants } from "framer-motion";

type ChainVerificationStatus =
  | "NO_TX_HASH"
  | "RPC_NOT_CONFIGURED"
  | "TX_NOT_FOUND"
  | "PENDING"
  | "FAILED"
  | "MISMATCH_CONTRACT"
  | "VERIFIED"
  | "ERROR";

interface BlockchainLiveResponse {
  ok: boolean;
  complaintId: string;
  seq: number;
  status: string;
  transactionHash: string | null;
  blockchainHash: string | null;
  blockchainBlock: string | null;
  ipfsHash: string | null;
  isOnChain: boolean;
  explorerUrl: string | null;
  blockchainUpdatedAt: string | null;
  chainVerification: {
    status: ChainVerificationStatus;
    verified: boolean;
    checkedAt: string;
    providerConfigured: boolean;
    message: string;
    expectedContractAddress: string | null;
    toMatchesContract: boolean | null;
    receipt: {
      blockNumber: number | null;
      status: number | null;
      gasUsed: string | null;
      from: string | null;
      to: string | null;
      confirmations: number | null;
    } | null;
  } | null;
  complaint?: {
    subCategory: string;
    description: string;
    urgency: string;
    complaintStatus: string;
    assignedDepartment: string;
    categoryName: string | null;
    isPublic: boolean;
    submissionDate: string;
    location?: {
      district: string | null;
      city: string | null;
      locality: string | null;
      pin: string | null;
      source: string;
    } | null;
  } | null;
}

function getChainBadgeClass(status?: ChainVerificationStatus): string {
  switch (status) {
    case "VERIFIED":
      return "bg-emerald-100 text-emerald-700 border border-emerald-200";
    case "PENDING":
      return "bg-amber-100 text-amber-700 border border-amber-200";
    case "FAILED":
    case "MISMATCH_CONTRACT":
    case "ERROR":
      return "bg-rose-100 text-rose-700 border border-rose-200";
    case "NO_TX_HASH":
    case "TX_NOT_FOUND":
      return "bg-slate-100 text-slate-700 border border-slate-200";
    case "RPC_NOT_CONFIGURED":
      return "bg-indigo-100 text-indigo-700 border border-indigo-200";
    default:
      return "bg-slate-100 text-slate-700 border border-slate-200";
  }
}

function getChainStatusCopy(status?: ChainVerificationStatus): string {
  switch (status) {
    case "VERIFIED":
      return "Transaction verified on blockchain.";
    case "PENDING":
      return "Transaction is submitted and waiting for confirmation.";
    case "NO_TX_HASH":
      return "Complaint is not on chain yet.";
    case "TX_NOT_FOUND":
      return "Blockchain record is not available yet.";
    case "FAILED":
      return "Transaction was found but not confirmed.";
    default:
      return "Blockchain status is currently unavailable.";
  }
}

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
  const isCompleted = complaint.status === "COMPLETED";
  const isEscalatedToMunicipal =
    complaint.status === "ESCALATED_TO_MUNICIPAL_LEVEL" ||
    complaint.escalationLevel === "MUNICIPAL_ADMIN" ||
    hasMunicipalAdmin;
  const isEscalatedToState =
    complaint.status === "ESCALATED_TO_STATE_LEVEL" ||
    complaint.escalationLevel === "STATE_ADMIN" ||
    hasStateAdmin;

  if (!hasAgent && !hasMunicipalAdmin && !hasStateAdmin && !isCompleted) {
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

  if (isCompleted) {
    const resolvedBy = hasStateAdmin
      ? complaint.escalatedToStateAdmin!.fullName
      : hasMunicipalAdmin
        ? complaint.managedByMunicipalAdmin!.fullName
        : hasAgent
          ? complaint.assignedAgent!.fullName
          : "Swaraj Resolution Team";

    items.push({
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-white" />,
      bg: "bg-emerald-500",
      label: "Resolution",
      name: resolvedBy,
      subtitle: "Complaint marked as completed in the system",
      date: formatDate(complaint.dateOfResolution || complaint.lastUpdated),
      badge: "Completed",
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
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
  const [blockchainLive, setBlockchainLive] = useState<BlockchainLiveResponse | null>(null);
  const [blockchainLoading, setBlockchainLoading] = useState(false);
  const [blockchainError, setBlockchainError] = useState<string | null>(null);

  const complaintLookupKey = complaint?.id || (complaint?.seq ? String(complaint.seq) : null);

  useEffect(() => {
    if (!isOpen || !complaintLookupKey) {
      setBlockchainLive(null);
      setBlockchainError(null);
      setBlockchainLoading(false);
      return;
    }

    const controller = new AbortController();

    const fetchBlockchainProof = async () => {
      setBlockchainLoading(true);
      setBlockchainError(null);

      try {
        const response = await fetch(
          `/api/complaint/${encodeURIComponent(complaintLookupKey)}/blockchain/live`,
          {
            method: "GET",
            cache: "no-store",
            signal: controller.signal,
          }
        );


        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || "Failed to load audit proof");
        }

        setBlockchainLive(data);
      } catch (error) {
        if (controller.signal.aborted) return;
        setBlockchainError("Could not load blockchain proofs.");
      } finally {
        if (!controller.signal.aborted) setBlockchainLoading(false);
      }
    };

    fetchBlockchainProof();

    return () => {
      controller.abort();
    };
  }, [complaintLookupKey, isOpen]);

  if (!isOpen) return null;

  const statusConfig = complaint ? STATUS_CONFIG[complaint.status] : null;
  const urgencyConfig = complaint ? URGENCY_CONFIG[complaint.urgency] : null;
  const departmentConfig = complaint
    ? DEPARTMENT_CONFIG[complaint.assignedDepartment as Department]
    : null;
  const blockchainComplaint = blockchainLive?.complaint ?? null;

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

                      {/* NEW: On-Chain Audit Trail Section */}
                      <section className="space-y-6 pt-6 border-t border-slate-100">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-[var(--dash-on-surface)]">
                            <Sparkles className="w-5 h-5 text-indigo-500" />
                            <h2 className="font-[var(--font-headline)] font-bold text-lg">
                              On-Chain Verifiable History
                            </h2>
                            {(blockchainLive as any)?.syncedByFallback && (
                              <span className="text-[9px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full border border-indigo-100 font-bold uppercase tracking-tighter animate-pulse">
                                Decentralized Mode
                              </span>
                            )}
                          </div>
                          {blockchainLoading && <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />}
                        </div>

                        <div className="space-y-4">
                          {/* 1. Main Verifiable Loop (Side-by-Side) */}
                          {(blockchainLive as any)?.databaseLogs?.length > 0 ? (
                            (blockchainLive as any)?.databaseLogs?.map((log: any, idx: number) => {
                              const proof = (blockchainLive as any)?.blockchainVerifiedLogs?.find(
                                (v: any) => v.action === log.action || v.details?.includes(log.action)
                              );
                              return (
                                <div key={idx} className="flex gap-4 items-start p-4 rounded-xl bg-slate-50 border border-slate-100 group hover:border-indigo-200 transition-colors">
                                  <div className="mt-1">
                                    {proof ? (
                                      <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-200">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                      </div>
                                    ) : (
                                      <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center">
                                        <div className="w-2 h-2 rounded-full bg-slate-400" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                      <h4 className="text-sm font-bold text-slate-800">{log.action || "System Action"}</h4>
                                      <span className="text-[10px] text-slate-400 font-medium">{new Date(log.timestamp).toLocaleString()}</span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">{log.details}</p>
                                    {proof && (
                                      <div className="mt-3 flex items-center gap-2">
                                        <a href={`https://sepolia.etherscan.io/tx/${proof.transactionHash}`} target="_blank" className="text-[10px] flex items-center gap-1 bg-white border border-emerald-200 text-emerald-700 px-2 py-1 rounded-md hover:bg-emerald-50 transition-colors font-mono">
                                          <ExternalLink className="w-3 h-3" />
                                          Verified: {proof.transactionHash.slice(0, 10)}...
                                        </a>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            /* 2. Fallback Loop (Blockchain Only) */
                            (blockchainLive as any)?.blockchainVerifiedLogs?.map((proof: any, idx: number) => (
                              <div key={idx} className="flex gap-4 items-start p-4 rounded-xl bg-indigo-50/50 border border-indigo-100 group hover:border-indigo-300 transition-colors">
                                <div className="mt-1">
                                  <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-200">
                                    <Sparkles className="w-3.5 h-3.5 text-white" />
                                  </div>
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-bold text-indigo-900">{proof.action || "On-Chain Event"}</h4>
                                    <span className="text-[10px] text-indigo-400 font-medium whitespace-nowrap">Immutable Record</span>
                                  </div>
                                  <p className="text-xs text-indigo-700/70 mt-1">{proof.details || "This event is permanently recorded on Ethereum Sepolia."}</p>
                                  <div className="mt-3 flex items-center gap-2">
                                    <a href={`https://sepolia.etherscan.io/tx/${proof.transactionHash}`} target="_blank" className="text-[10px] flex items-center gap-1 bg-white border border-indigo-200 text-indigo-700 px-2 py-1 rounded-md hover:bg-indigo-50 transition-colors font-mono">
                                      <ExternalLink className="w-3 h-3" />
                                      View Transaction: {proof.transactionHash.slice(0, 10)}...
                                    </a>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}

                          {!(blockchainLive as any)?.databaseLogs?.length && !(blockchainLive as any)?.blockchainVerifiedLogs?.length && (
                            <p className="text-sm text-slate-400 italic text-center py-4">No audit logs available for this report yet.</p>
                          )}
                        </div>

                      </section>

                    </div>

                    {/* Right Column */}
                    <div className="lg:col-span-4 space-y-6">
                      {/* Live Blockchain Verification */}
                      <div className="rounded-xl p-5 bg-white border border-gray-200 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-[var(--font-headline)] font-bold text-sm tracking-wide text-[var(--dash-on-surface)]">
                            Blockchain Verification
                          </h3>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 border border-emerald-200">
                            Live
                          </span>
                        </div>

                        {blockchainLoading && (
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <span className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                            Checking on-chain proof...
                          </div>
                        )}

                        {!blockchainLoading && blockchainError && (
                          <p className="text-sm text-rose-600">{blockchainError}</p>
                        )}

                        {!blockchainLoading && !blockchainError && blockchainLive && (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className={cn(
                                  "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                  getChainBadgeClass(blockchainLive.chainVerification?.status)
                                )}
                              >
                                {blockchainLive.chainVerification?.status || "UNKNOWN"}
                              </span>
                              <span
                                className={cn(
                                  "text-xs font-semibold",
                                  blockchainLive.isOnChain ? "text-emerald-700" : "text-amber-700"
                                )}
                              >
                                {blockchainLive.isOnChain ? "Stored On-Chain" : "Pending On-Chain"}
                              </span>
                            </div>

                            <div className="rounded-lg bg-[#f8faff] border border-[#e3eafc] p-3">
                              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">
                                Complaint Subject
                              </p>
                              <p className="text-sm font-semibold text-[var(--dash-on-surface)] leading-snug">
                                {blockchainComplaint?.subCategory || complaint.subCategory || complaint.category?.name || "Complaint"}
                              </p>
                            </div>

                            <div className="rounded-lg bg-[#f8faff] border border-[#e3eafc] p-3">
                              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">
                                Description (On-Chain Record)
                              </p>
                              <p className="text-sm text-slate-700 leading-relaxed line-clamp-4">
                                {blockchainComplaint?.description || complaint.description}
                              </p>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="rounded-lg bg-[#f8faff] border border-[#e3eafc] p-2">
                                <p className="text-slate-500">Department</p>
                                <p className="font-semibold text-[var(--dash-on-surface)]">
                                  {blockchainComplaint?.assignedDepartment
                                    ? DEPARTMENT_CONFIG[blockchainComplaint.assignedDepartment as Department]?.label || blockchainComplaint.assignedDepartment
                                    : departmentConfig?.label || complaint.assignedDepartment}
                                </p>
                              </div>
                              <div className="rounded-lg bg-[#f8faff] border border-[#e3eafc] p-2">
                                <p className="text-slate-500">Urgency</p>
                                <p className="font-semibold text-[var(--dash-on-surface)]">
                                  {blockchainComplaint?.urgency || complaint.urgency}
                                </p>
                              </div>
                              <div className="rounded-lg bg-[#f8faff] border border-[#e3eafc] p-2">
                                <p className="text-slate-500">Complaint Status</p>
                                <p className="font-semibold text-[var(--dash-on-surface)]">
                                  {blockchainComplaint?.complaintStatus || complaint.status}
                                </p>
                              </div>
                              <div className="rounded-lg bg-[#f8faff] border border-[#e3eafc] p-2">
                                <p className="text-slate-500">Submitted</p>
                                <p className="font-semibold text-[var(--dash-on-surface)]">
                                  {formatDate(blockchainComplaint?.submissionDate || complaint.submissionDate)}
                                </p>
                              </div>
                            </div>

                            {(blockchainComplaint?.location?.locality || blockchainComplaint?.location?.city || blockchainComplaint?.location?.district) && (
                              <div className="rounded-lg bg-[#f8faff] border border-[#e3eafc] p-3 text-xs">
                                <p className="text-slate-500 mb-1">Location</p>
                                <p className="font-semibold text-[var(--dash-on-surface)]">
                                  {[
                                    blockchainComplaint?.location?.locality,
                                    blockchainComplaint?.location?.city,
                                    blockchainComplaint?.location?.district,
                                  ]
                                    .filter(Boolean)
                                    .join(", ")}
                                </p>
                              </div>
                            )}

                            <p className="text-[11px] text-slate-600 leading-relaxed">
                              {getChainStatusCopy(blockchainLive.chainVerification?.status)}
                            </p>
                          </div>
                        )}
                      </div>

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

                            {complaint.AIabusedFlag && (
                              <div className="pt-2 border-t border-slate-700/50">
                                <AbuseFlagBanner abuseMetadata={complaint.abuseMetadata} />
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
