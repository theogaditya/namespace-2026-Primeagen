"use client";

import React, { useEffect, useRef, useState } from "react";
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
  statusFilter?: "ALL" | "OPEN" | "CLOSED";
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
  statusFilter = "OPEN",
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

  // Responsive category buttons: show as many as fit, put rest under "More"
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [visibleCount, setVisibleCount] = useState<number>(Math.min(categories.length, 6));
  const [moreOpen, setMoreOpen] = useState(false);

  const visibleCategories = categories.slice(0, visibleCount);
  const overflowCategories = categories.slice(visibleCount);

  useEffect(() => {
    if (!containerRef.current) return;

    let ro: ResizeObserver | null = null;

    const measure = () => {
      const containerWidth = containerRef.current ? containerRef.current.clientWidth : 0;
      if (!containerWidth) return;

      // create offscreen measuring container
      const measurer = document.createElement("div");
      measurer.style.position = "absolute";
      measurer.style.visibility = "hidden";
      measurer.style.top = "0";
      measurer.style.left = "-9999px";
      measurer.style.display = "flex";
      measurer.style.flexWrap = "nowrap";
      document.body.appendChild(measurer);

      const baseClass = "px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap";
      const gap = 8; // gap-2 -> 0.5rem -> 8px

      // measure All button
      const labels = ["All", ...categories];
      const widths: number[] = labels.map((label) => {
        const btn = document.createElement("button");
        btn.className = baseClass;
        btn.style.border = "0";
        btn.style.padding = "0";
        btn.style.font = "inherit";
        btn.textContent = label;
        // apply padding manually to get approximate width
        btn.style.paddingLeft = "12px";
        btn.style.paddingRight = "12px";
        measurer.appendChild(btn);
        const w = btn.getBoundingClientRect().width;
        measurer.removeChild(btn);
        return Math.ceil(w + gap);
      });

      // measure More button
      const moreBtn = document.createElement("button");
      moreBtn.className = baseClass;
      moreBtn.textContent = "More";
      measurer.appendChild(moreBtn);
      const moreWidth = Math.ceil(moreBtn.getBoundingClientRect().width + gap);
      document.body.removeChild(measurer);

      // compute how many labels fit (ensure space for More when overflow)
      let used = 0;
      let fit = 0;
      for (let i = 0; i < widths.length; i++) {
        const remaining = widths.length - (i + 1);
        const needMore = remaining > 0;
        const projected = used + widths[i] + (needMore ? moreWidth : 0);
        if (projected <= containerWidth) {
          used += widths[i];
          fit = i + 1;
        } else {
          break;
        }
      }

      // fit includes the All button; we want to show categories only, so subtract 1
      const categoriesFit = Math.max(0, fit - 1);
      setVisibleCount(categoriesFit);
    };

    measure();
    ro = new ResizeObserver(() => measure());
    ro.observe(containerRef.current);

    return () => {
      if (ro && containerRef.current) ro.unobserve(containerRef.current);
      ro = null;
    };
  }, [categories]);

  // Close More dropdown on outside click or Escape
  useEffect(() => {
    if (!moreOpen) return;
    const onDocClick = (e: MouseEvent) => {
      const el = containerRef.current;
      if (!el) return;
      if (!(e.target instanceof Node)) return;
      if (!el.contains(e.target)) setMoreOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMoreOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [moreOpen]);

  return (
    <div className="space-y-6">
      {/* Header row with search and filter */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
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
        <div className="relative flex-1">
          <div
            ref={(el) => { containerRef.current = el; }}
            className="flex gap-2 items-center overflow-visible pb-1 sm:pb-0"
            style={{ alignItems: "center" }}
          >
            {/* Always show All button */}
            <button
              onClick={() => onCategoryChange("")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all min-w-[64px] text-center ${
                !categoryFilter
                  ? "bg-violet-100 text-violet-700"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All
            </button>

            {visibleCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => onCategoryChange(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all min-w-[64px] text-center ${
                  categoryFilter === cat
                    ? "bg-violet-100 text-violet-700"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {cat}
              </button>
            ))}

            {overflowCategories.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setMoreOpen((s) => !s)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all min-w-[64px] text-center bg-slate-100 text-slate-600 hover:bg-slate-200"
                >
                  More ▾
                </button>
                {moreOpen && (
                  <div className="absolute right-0 mt-2 w-52 z-50">
                    <div className="absolute -top-1 right-4 w-3 h-3 rotate-45 bg-white border-t border-l border-slate-200" />
                    <div className="bg-white border border-slate-200 rounded-lg shadow-xl ring-1 ring-violet-50 overflow-hidden">
                      <div className="px-3 py-2 text-xs text-slate-400 font-semibold">More filters</div>
                      <div className="divide-y divide-slate-100">
                        {overflowCategories.map((cat) => (
                          <button
                            key={cat}
                            onClick={() => {
                              onCategoryChange(cat);
                              setMoreOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-violet-50 hover:text-violet-700 transition-colors`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

          <div className="flex items-center gap-2 ml-2">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('statusFilterChange', { detail: 'OPEN' }))}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all min-w-[64px] text-center ${
              statusFilter === 'OPEN' ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Open
          </button>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('statusFilterChange', { detail: 'CLOSED' }))}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all min-w-[64px] text-center ${
              statusFilter === 'CLOSED' ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Closed
          </button>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('statusFilterChange', { detail: 'ALL' }))}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all min-w-[64px] text-center ${
              statusFilter === 'ALL' ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All
          </button>
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {surveys
              .map((survey, index) => (
              <motion.div
                key={survey.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                layout
              >
                <SurveyCard
                  survey={survey}
                  index={index}
                  isCompleted={respondedSurveyIds.has(survey.id)}
                  onSelect={() => onSelectSurvey(survey)}
                />
              </motion.div>
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
