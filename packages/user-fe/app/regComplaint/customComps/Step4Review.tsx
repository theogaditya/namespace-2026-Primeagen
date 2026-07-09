"use client";

import React, { useCallback, useEffect, useState } from "react";
import { motion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  ComplaintFormField,
  ComplaintFormState,
  URGENCY_OPTIONS,
  CATEGORY_DISPLAY,
  type AbuseMetadata,
  type DedupMatch,
  type QualityBreakdown,
  type QualityRating,
} from "./types";
import {
  CheckCircle,
  MapPin,
  FileText,
  Building2,
  AlertTriangle,
  Globe,
  Lock,
  Image,
  Edit2,
  Sparkles,
  Clock,
  Shield,
  BarChart3,
  Loader2,
  CircleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AbuseFlagBanner } from "@/components/abuse-flag-banner";
import { DedupResultsCard } from "@/components/dedup-results-card";
import { QualityScoreBadge, QualityBreakdownBar } from "@/components/quality-score-badge";
import { ComplaintDetailModal } from "@/app/dashboard/customComps/ComplaintDetailModal";
import { LikeProvider } from "@/contexts/LikeContext";
import type { Complaint } from "@/app/dashboard/customComps/types";

interface Step4Props {
  formData: ComplaintFormState;
  goToStep: (step: number) => void;
  updateField: <K extends ComplaintFormField>(field: K, value: ComplaintFormState[K]) => void;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15,
    },
  },
};

const headerVariants: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 20,
    },
  },
};

const MIN_QUALITY_SCORE_TO_SUBMIT = 50;

const EMPTY_BREAKDOWN: QualityBreakdown = {
  clarity: 0,
  evidence: 0,
  location: 0,
  completeness: 0,
};

const EMPTY_ABUSE_METADATA: AbuseMetadata = {
  severity: "none",
  clean_text: "",
  explanation_en: "",
  explanation_hi: "",
  flagged_spans: [],
  flagged_phrases: [],
};

export function Step4Review({ formData, goToStep, updateField }: Step4Props) {
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingComplaint, setLoadingComplaint] = useState(false);

  const handleDedupResult = useCallback(
    (result: {
      status: "idle" | "checking" | "ready" | "error";
      hasSimilarComplaints: boolean;
      isDuplicate: boolean;
      matches: DedupMatch[];
      suggestion: string;
      confidence: number;
    }) => {
      updateField(
        "dedupStatus",
        result.status === "checking"
          ? "checking"
          : result.status === "error"
            ? "error"
            : result.status === "ready"
              ? "ready"
              : "idle"
      );
      updateField("dedupMatches", result.matches as DedupMatch[]);
      updateField("dedupSuggestion", result.suggestion);
      updateField("dedupConfidence", result.confidence);
      updateField("hasSimilarComplaints", result.hasSimilarComplaints);
      updateField("isDuplicate", result.isDuplicate);
    },
    [updateField]
  );

  useEffect(() => {
    setAuthToken(localStorage.getItem("authToken"));
  }, []);

  useEffect(() => {
    const hasEnoughData = formData.description.trim().length >= 5 && Boolean(authToken);

    if (!hasEnoughData) {
      updateField("abuseStatus", "idle");
      updateField("abuseDetected", false);
      updateField("abuseSeverity", null);
      updateField("abuseSanitizedText", "");
      updateField("abuseMetadata", null);
      return;
    }

    let cancelled = false;
    updateField("abuseStatus", "checking");
    updateField("abuseDetected", false);
    updateField("abuseSeverity", null);
    updateField("abuseSanitizedText", "");
    updateField("abuseMetadata", null);

    const timer = setTimeout(async () => {
      try {
        const response = await fetch("/api/agents/abuse", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            text: formData.description,
          }),
        });

        if (!response.ok) {
          throw new Error(`Abuse request failed with status ${response.status}`);
        }

        const data = await response.json();
        if (cancelled) return;

        const sanitizedText =
          typeof data.clean_text === "string" && data.clean_text.trim().length > 0
            ? data.clean_text
            : formData.description;
        const abuseDetected = data.has_abuse === true;
        const metadata: AbuseMetadata = {
          severity: data.severity || (abuseDetected ? "medium" : "none"),
          clean_text: sanitizedText,
          explanation_en: data.explanation_en || "",
          explanation_hi: data.explanation_hi || "",
          flagged_spans: Array.isArray(data.flagged_spans) ? data.flagged_spans : [],
          flagged_phrases: Array.isArray(data.flagged_phrases) ? data.flagged_phrases : [],
          source: "review-step",
        };

        updateField("abuseStatus", "ready");
        updateField("abuseDetected", abuseDetected);
        updateField("abuseSeverity", metadata.severity || "none");
        updateField("abuseSanitizedText", sanitizedText);
        updateField("abuseMetadata", metadata);
      } catch (error) {
        if (cancelled) return;
        console.error("[Step4Review] Abuse moderation failed:", error);
        updateField("abuseStatus", "error");
        updateField("abuseDetected", false);
        updateField("abuseSeverity", null);
        updateField("abuseSanitizedText", formData.description);
        updateField("abuseMetadata", null);
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [authToken, formData.description, updateField]);

  useEffect(() => {
    const hasEnoughData =
      formData.description.trim().length >= 20 &&
      Boolean(formData.categoryName) &&
      Boolean(formData.subCategory) &&
      Boolean(formData.pin) &&
      Boolean(formData.district) &&
      Boolean(authToken) &&
      formData.abuseStatus !== "checking";

    if (!hasEnoughData) {
      updateField("qualityStatus", "idle");
      updateField("qualityScore", null);
      updateField("qualityBreakdown", null);
      updateField("qualitySuggestions", []);
      updateField("qualityRating", null);
      return;
    }

    let cancelled = false;

    const timer = setTimeout(async () => {
      updateField("qualityStatus", "checking");

      try {
        const response = await fetch("/api/agents/quality", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            description:
              formData.abuseDetected && formData.abuseSanitizedText
                ? formData.abuseSanitizedText
                : formData.description,
            category: formData.categoryName,
            subCategory: formData.subCategory,
            urgency: formData.urgency,
            hasAttachment: Boolean(formData.photo || formData.photoPreview),
            locationDetails: {
              district: formData.district,
              city: formData.city,
              locality: formData.locality,
              street: formData.street,
              pincode: formData.pin,
              latitude: formData.latitude ? Number(formData.latitude) : undefined,
              longitude: formData.longitude ? Number(formData.longitude) : undefined,
            },
            hasSimilarComplaints: formData.hasSimilarComplaints,
            isDuplicate: formData.isDuplicate,
            abuseDetected: formData.abuseDetected,
          }),
        });

        if (!response.ok) {
          throw new Error(`Quality request failed with status ${response.status}`);
        }

        const data = await response.json();
        if (cancelled) return;

        updateField("qualityStatus", "ready");
        updateField("qualityScore", typeof data.score === "number" ? data.score : 0);
        updateField("qualityBreakdown", data.breakdown || EMPTY_BREAKDOWN);
        updateField("qualitySuggestions", Array.isArray(data.suggestions) ? data.suggestions : []);
        updateField("qualityRating", (data.rating as QualityRating) || "poor");
      } catch (error) {
        if (cancelled) return;
        console.error("[Step4Review] Quality scoring failed:", error);
        updateField("qualityStatus", "error");
        updateField("qualityScore", null);
        updateField("qualityBreakdown", null);
        updateField("qualitySuggestions", []);
        updateField("qualityRating", null);
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    authToken,
    formData.categoryName,
    formData.city,
    formData.description,
    formData.abuseDetected,
    formData.abuseSanitizedText,
    formData.abuseStatus,
    formData.district,
    formData.hasSimilarComplaints,
    formData.isDuplicate,
    formData.locality,
    formData.latitude,
    formData.longitude,
    formData.photo,
    formData.photoPreview,
    formData.pin,
    formData.street,
    formData.subCategory,
    formData.urgency,
    updateField,
  ]);

  const formatDepartment = (dept: string) => {
    return dept.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const getCategoryDisplay = (categoryName: string) => {
    return CATEGORY_DISPLAY.find(
      (c) => c.name.toLowerCase() === categoryName.toLowerCase()
    ) || { icon: "📋", color: "text-gray-600", bgColor: "bg-gray-50" };
  };

  const getUrgencyDisplay = (urgency: string) => {
    return URGENCY_OPTIONS.find((u) => u.value === urgency) || URGENCY_OPTIONS[0];
  };

  const categoryDisplay = getCategoryDisplay(formData.categoryName);
  const urgencyDisplay = getUrgencyDisplay(formData.urgency);
  const displayDescription =
    formData.abuseDetected && formData.abuseSanitizedText
      ? formData.abuseSanitizedText
      : formData.description;
  const displayQualityScore =
    typeof formData.qualityScore === "number" ? (formData.qualityScore / 10).toFixed(1) : null;
  const qualityNeedsImprovement =
    typeof formData.qualityScore === "number" && formData.qualityScore < MIN_QUALITY_SCORE_TO_SUBMIT;
  const primaryDuplicate = formData.dedupMatches[0];
  const flaggedPhraseCount = formData.abuseMetadata?.flagged_phrases?.length || 0;

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div className="text-center mb-8" variants={headerVariants}>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-linear-to-r from-purple-100 to-pink-100 text-purple-700 text-sm font-medium mb-4">
          <Sparkles className="w-4 h-4" />
          Final Step
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Review Your Complaint</h2>
        <p className="text-gray-500">Please verify all details before submitting</p>
      </motion.div>

      {/* Category & Department */}
      <motion.div
        variants={itemVariants}
        className="bg-white border-2 border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
      >
        <div className="flex items-center justify-between px-5 py-4 bg-linear-to-r from-orange-50 to-amber-50 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-xl">
              <Building2 className="h-5 w-5 text-orange-600" />
            </div>
            <span className="font-semibold text-gray-800">Category & Department</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => goToStep(1)}
            className="text-orange-600 hover:text-orange-700 hover:bg-orange-100 gap-1.5 h-auto py-1.5 px-3 rounded-xl"
          >
            <Edit2 className="h-3.5 w-3.5" />
            Edit
          </Button>
        </div>
        <div className="p-5">
          <div className="flex items-center gap-4">
            <motion.div
              whileHover={{ scale: 1.05, rotate: 5 }}
              className={cn("p-3 rounded-2xl", categoryDisplay.bgColor)}
            >
              <span className="text-4xl">{categoryDisplay.icon}</span>
            </motion.div>
            <div>
              <p className="font-bold text-lg text-gray-900">{formData.categoryName}</p>
              <p className="text-sm text-gray-500">
                Assigned to{" "}
                <span className="font-semibold text-orange-600">
                  {formatDepartment(formData.assignedDepartment)}
                </span>
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Complaint Details */}
      <motion.div
        variants={itemVariants}
        className="bg-white border-2 border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
      >
        <div className="flex items-center justify-between px-5 py-4 bg-linear-to-r from-blue-50 to-cyan-50 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-xl">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <span className="font-semibold text-gray-800">Complaint Details</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => goToStep(2)}
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-100 gap-1.5 h-auto py-1.5 px-3 rounded-xl"
          >
            <Edit2 className="h-3.5 w-3.5" />
            Edit
          </Button>
        </div>
        <div className="p-5 space-y-5">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">Sub-category</p>
            <p className="text-gray-900 font-medium">{formData.subCategory}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">Description</p>
            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed bg-gray-50 rounded-xl p-4 border border-gray-100">
              {displayDescription}
            </p>
            {formData.abuseDetected && (
              <p className="mt-2 text-xs text-amber-700">
                Preview shows the AI-moderated description that will be submitted.
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">Urgency</p>
              <motion.span
                whileHover={{ scale: 1.05 }}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold",
                  urgencyDisplay.bgColor,
                  urgencyDisplay.color
                )}
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                {urgencyDisplay.label}
              </motion.span>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">Visibility</p>
              <motion.span
                whileHover={{ scale: 1.05 }}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold",
                  formData.isPublic
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-600"
                )}
              >
                {formData.isPublic ? (
                  <>
                    <Globe className="h-3.5 w-3.5" />
                    Public
                  </>
                ) : (
                  <>
                    <Lock className="h-3.5 w-3.5" />
                    Private
                  </>
                )}
              </motion.span>
            </div>
          </div>
          {formData.photoPreview && (
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Attached Photo</p>
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="relative inline-block"
              >
                <img
                  src={formData.photoPreview}
                  alt="Complaint attachment"
                  className="max-h-40 rounded-xl border-2 border-gray-200 object-cover shadow-md"
                />
                <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1 text-xs font-medium text-gray-600 flex items-center gap-1">
                  <Image className="h-3 w-3" />
                  Attached
                </div>
              </motion.div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Location */}
      <motion.div
        variants={itemVariants}
        className="bg-white border-2 border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
      >
        <div className="flex items-center justify-between px-5 py-4 bg-linear-to-r from-emerald-50 to-teal-50 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-xl">
              <MapPin className="h-5 w-5 text-emerald-600" />
            </div>
            <span className="font-semibold text-gray-800">Location</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => goToStep(3)}
            className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100 gap-1.5 h-auto py-1.5 px-3 rounded-xl"
          >
            <Edit2 className="h-3.5 w-3.5" />
            Edit
          </Button>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">District</p>
              <p className="text-gray-900 font-semibold mt-1">{formData.district}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">PIN Code</p>
              <p className="text-gray-900 font-semibold font-mono mt-1">{formData.pin}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">City</p>
              <p className="text-gray-900 font-medium mt-1">{formData.city}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Locality</p>
              <p className="text-gray-900 font-medium mt-1">{formData.locality}</p>
            </div>
            {(formData.latitude || formData.longitude) && (
              <div className="col-span-2 bg-gray-50 rounded-xl p-3 border border-gray-100">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">GPS Coordinates</p>
                <p className="text-gray-900 font-mono text-sm mt-1">
                  {formData.latitude && `${formData.latitude}° N`}
                  {formData.latitude && formData.longitude && ", "}
                  {formData.longitude && `${formData.longitude}° E`}
                </p>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* AI Duplicate Check */}
      <motion.div variants={itemVariants}>
        <DedupResultsCard
          description={formData.description}
          category={formData.categoryName}
          district={formData.district}
          pin={formData.pin}
          onUpvoteInstead={async (id) => {
            setLoadingComplaint(true);
            setIsModalOpen(true);

            try {
              const token = localStorage.getItem("authToken");
              const res = await fetch(`/api/complaint/${id}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
              });

              if (res.ok) {
                const data = await res.json();
                console.log("[Step4Review] Fetched complaint data:", data);

                // The API might return { success: true, data: {...} } or just the complaint
                const complaint = data.data || data;
                console.log("[Step4Review] Setting complaint:", complaint);
                setSelectedComplaint(complaint);
              } else {
                console.error("[Step4Review] Failed to fetch complaint:", res.status);
              }
            } catch (error) {
              console.error("[Step4Review] Error fetching complaint:", error);
            } finally {
              setLoadingComplaint(false);
            }
          }}
          onResult={handleDedupResult}
        />
      </motion.div>

      {/* Abuse Moderation Preview */}
      {formData.description && formData.description.length >= 5 && (
        <motion.div
          variants={itemVariants}
          className="bg-white border-2 border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between px-5 py-4 bg-linear-to-r from-rose-50 to-amber-50 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-100 rounded-xl">
                <Shield className="h-5 w-5 text-rose-600" />
              </div>
              <span className="font-semibold text-gray-800">AI Abuse Check</span>
            </div>
          </div>
          <div className="p-5">
            {formData.abuseStatus === "checking" && (
              <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm font-medium">
                  Abuse AI is checking the complaint text and preparing a safe preview.
                </span>
              </div>
            )}

            {formData.abuseStatus === "error" && (
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                Abuse moderation preview is unavailable right now. Server-side moderation will still run after submission.
              </div>
            )}

            {formData.abuseStatus === "ready" && formData.abuseDetected && (
              <div className="space-y-4">
                <AbuseFlagBanner abuseMetadata={formData.abuseMetadata || EMPTY_ABUSE_METADATA} />

                <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                        Sanitized Preview
                      </p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
                        {formData.abuseSanitizedText || formData.description}
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-amber-700 border border-amber-200">
                      {flaggedPhraseCount} flagged
                    </span>
                  </div>
                </div>
              </div>
            )}

            {formData.abuseStatus === "ready" && !formData.abuseDetected && (
              <div className="flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700">
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="text-sm">
                  No abusive language was detected in the complaint description.
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Quality Score Preview */}
      {formData.description && formData.description.length >= 20 && (
        <motion.div
          variants={itemVariants}
          className="bg-white border-2 border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between px-5 py-4 bg-linear-to-r from-violet-50 to-purple-50 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-violet-100 rounded-xl">
                <BarChart3 className="h-5 w-5 text-violet-600" />
              </div>
              <span className="font-semibold text-gray-800">AI Quality Preview</span>
            </div>
          </div>
          <div className="p-5">
            {formData.qualityStatus === "checking" && (
              <div className="flex items-center gap-3 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-violet-700">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm font-medium">Quality AI is evaluating clarity, evidence, location, and mismatch risk.</span>
              </div>
            )}

            {formData.qualityStatus === "error" && (
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                Quality preview is unavailable right now. You can still continue.
              </div>
            )}

            {formData.qualityStatus === "ready" && (
              <div className="space-y-4">
                <div className="flex flex-col gap-3 rounded-2xl border border-violet-100 bg-violet-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-violet-500">Current Score</p>
                    <div className="mt-1 flex items-end gap-3">
                      <span className="text-3xl font-bold text-violet-900">{displayQualityScore}/10</span>
                      <QualityScoreBadge score={formData.qualityScore} size="md" />
                    </div>
                    {primaryDuplicate && formData.isDuplicate && (
                      <p className="mt-2 text-sm text-amber-700">
                        This looks like a duplicate of complaint #{primaryDuplicate.seq}.
                      </p>
                    )}
                  </div>

                  <div className="sm:w-64">
                    <QualityBreakdownBar breakdown={formData.qualityBreakdown || EMPTY_BREAKDOWN} />
                  </div>
                </div>

                {qualityNeedsImprovement && (
                  <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
                    <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                    <div className="text-sm">
                      The current score is below 5/10, so submit stays disabled until the complaint is improved.
                    </div>
                  </div>
                )}

                {formData.dedupSuggestion && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    {formData.dedupSuggestion}
                  </div>
                )}

                {formData.qualitySuggestions.length > 0 && (
                  <div>
                    <p className="mb-2 text-sm font-semibold text-gray-800">How to improve this complaint</p>
                    <ul className="space-y-2 text-sm text-gray-600">
                      {formData.qualitySuggestions.map((suggestion, index) => (
                        <li
                          key={`${suggestion}-${index}`}
                          className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2"
                        >
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Confirmation Notice */}
      <motion.div
        variants={itemVariants}
        className="p-5 bg-linear-to-r from-amber-50 via-orange-50 to-amber-50 border-2 border-amber-200 rounded-2xl"
      >
        <div className="flex gap-4">
          <motion.div
            initial={{ rotate: -10 }}
            animate={{ rotate: 0 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="p-3 bg-amber-100 rounded-xl h-fit"
          >
            <CheckCircle className="h-6 w-6 text-amber-600" />
          </motion.div>
          <div>
            <p className="font-bold text-amber-800 text-lg">Ready to Submit</p>
            <p className="text-sm text-amber-700 mt-1.5 leading-relaxed">
              Please review all the information above. Once submitted, your complaint
              will be processed and assigned to the appropriate department for resolution.
            </p>
            <div className="flex flex-wrap gap-4 mt-4">
              <div className="flex items-center gap-2 text-sm text-amber-700">
                <Clock className="h-4 w-4" />
                <span>Expected response: 24-48 hours</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-amber-700">
                <Shield className="h-4 w-4" />
                <span>Your data is secure</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Complaint Detail Modal */}
      <LikeProvider authToken={authToken || null}>
        <ComplaintDetailModal
          complaint={selectedComplaint}
          isOpen={isModalOpen}
          isLoading={loadingComplaint}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedComplaint(null);
          }}
          hideAssignmentTimeline={true}
        />
      </LikeProvider>
    </motion.div>
  );
}
