"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface AbuseFlagBannerProps {
  abuseMetadata?: {
    severity?: string;
    explanation_en?: string;
    explanation_hi?: string;
    flagged_phrases?: Array<
      | string
      | {
          original?: string;
          masked?: string;
          language?: string;
          category?: string;
          severity?: string;
        }
    >;
  } | null;
  preferredLanguage?: string;
  compact?: boolean;
}

const SEVERITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  low: { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200" },
  medium: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  high: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
};

export function AbuseFlagBanner({
  abuseMetadata,
  preferredLanguage = "english",
  compact = false,
}: AbuseFlagBannerProps) {
  const severity = abuseMetadata?.severity?.toLowerCase() || "medium";
  const colors = SEVERITY_COLORS[severity] || SEVERITY_COLORS.medium;

  const explanation =
    preferredLanguage === "hindi" || preferredLanguage === "Hindi"
      ? abuseMetadata?.explanation_hi
      : abuseMetadata?.explanation_en;

  const defaultExplanation =
    "Some content in this complaint was automatically moderated by our AI to maintain community standards.";

  if (compact) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border",
          colors.bg,
          colors.text,
          colors.border
        )}
      >
        <AlertTriangle className="w-3 h-3" />
        AI Moderated
      </span>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border p-3",
        colors.bg,
        colors.border
      )}
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className={cn("w-4 h-4 mt-0.5 shrink-0", colors.text)} />
        <div>
          <p className={cn("text-sm font-medium", colors.text)}>
            AI Moderated Content
          </p>
          <p className="text-xs text-gray-600 mt-1">
            {explanation || defaultExplanation}
          </p>
        </div>
      </div>
    </div>
  );
}
