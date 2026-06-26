"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface QualityScoreBadgeProps {
  score: number | null;
  size?: "sm" | "md";
}

const QUALITY_TIERS = [
  { min: 76, label: "Excellent", color: "text-amber-700", bg: "bg-amber-100", border: "border-amber-300" },
  { min: 51, label: "Good", color: "text-green-700", bg: "bg-green-100", border: "border-green-300" },
  { min: 26, label: "Fair", color: "text-orange-700", bg: "bg-orange-100", border: "border-orange-300" },
  { min: 0, label: "Poor", color: "text-red-700", bg: "bg-red-100", border: "border-red-300" },
];

export function QualityScoreBadge({ score, size = "sm" }: QualityScoreBadgeProps) {
  if (score == null || score < 0) return null;

  const tier = QUALITY_TIERS.find((t) => score >= t.min) || QUALITY_TIERS[3];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-semibold",
        tier.bg,
        tier.color,
        tier.border,
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"
      )}
      title={`Quality Score: ${score}/100`}
    >
      {size === "md" && <span className="font-bold">{score}</span>}
      {tier.label}
    </span>
  );
}

export function QualityBreakdownBar({
  breakdown,
}: {
  breakdown: { clarity: number; evidence: number; location: number; completeness: number };
}) {
  const dimensions = [
    { key: "clarity", label: "Clarity", max: 25 },
    { key: "evidence", label: "Evidence", max: 25 },
    { key: "location", label: "Location", max: 25 },
    { key: "completeness", label: "Completeness", max: 25 },
  ] as const;

  return (
    <div className="space-y-2">
      {dimensions.map((dim) => {
        const value = breakdown[dim.key] || 0;
        const pct = Math.round((value / dim.max) * 100);
        return (
          <div key={dim.key}>
            <div className="flex justify-between text-xs text-gray-600 mb-0.5">
              <span>{dim.label}</span>
              <span>{value}/{dim.max}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  pct >= 75 ? "bg-green-500" : pct >= 50 ? "bg-yellow-500" : pct >= 25 ? "bg-orange-500" : "bg-red-500"
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
