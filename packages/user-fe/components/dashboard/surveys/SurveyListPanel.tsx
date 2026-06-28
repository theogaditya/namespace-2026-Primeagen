"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
} from "lucide-react";
import type { SurveyListItem } from "@/types/survey";
import SurveyCard from "./SurveyCard";

interface SurveyListPanelProps {
  surveys: SurveyListItem[];
  loading: boolean;
  error: string | null;
  page: number;
  totalPages: number;
  total: number;
  categoryFilter: string;
  searchQuery: string;
  respondedSurveyIds: Set<string>;
  categories: string[];
  onCategoryChange: (category: string) => void;
  onSearchChange: (query: string) => void;
  onPageChange: (page: number) => void;
  onSelectSurvey: (survey: SurveyListItem) => void;
}

export default function SurveyListPanel({
  surveys,
  loading,
  error,
  page,
  totalPages,
  total,
  categoryFilter,
  searchQuery,
  respondedSurveyIds,
  categories,
  onCategoryChange,
  onSearchChange,
  onPageChange,
  onSelectSurvey,
}: SurveyListPanelProps) {
  const limit = 12;
  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  return (
    <div className="space-y-6">
      {/* Header row with search and filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search bar */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search surveys..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-400 transition-all"
          />
        </div>

        {/* Category filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
          {/* Always show All button */}
          <button
            onClick={() => onCategoryChange("")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              !categoryFilter
                ? "bg-violet-100 text-violet-700"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => onCategoryChange(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                categoryFilter === cat
                  ? "bg-violet-100 text-violet-700"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-slate-100 animate-pulse rounded-2xl h-44"
            />
          ))}
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="text-center py-12">
          <p className="text-red-500">{error}</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && surveys.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <ClipboardList className="w-10 h-10 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            No surveys available right now.
          </h3>
          <p className="text-slate-500 max-w-sm">
            Check back later for new surveys from civic organisations.
          </p>
        </div>
      )}

      {/* Survey grid */}
      {!loading && !error && surveys.length > 0 && (
        <>
          {/* Pagination info */}
          <div className="text-xs text-slate-500">
            Showing {startItem}–{endItem} of {total} surveys
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {surveys.map((survey, index) => (
              <SurveyCard
                key={survey.id}
                survey={survey}
                index={index}
                isCompleted={respondedSurveyIds.has(survey.id)}
                onSelect={() => onSelectSurvey(survey)}
              />
            ))}
          </div>

          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 pt-4">
              <button
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
                className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  page <= 1
                    ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
                Prev
              </button>
              <span className="text-sm text-slate-600">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages}
                className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  page >= totalPages
                    ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
