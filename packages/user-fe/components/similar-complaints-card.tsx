"use client";

import React from "react";
import { ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";

interface SimilarComplaintsBadgeProps {
  count: number;
  onClick?: () => void;
}

export function SimilarComplaintsBadge({ count, onClick }: SimilarComplaintsBadgeProps) {
  if (count <= 0) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
        "bg-purple-50 text-purple-700 border border-purple-200",
        "hover:bg-purple-100 transition-colors",
        onClick ? "cursor-pointer" : "cursor-default"
      )}
    >
      <ClipboardList className="w-3 h-3" />
      {count} similar complaint{count !== 1 ? "s" : ""}
    </button>
  );
}
