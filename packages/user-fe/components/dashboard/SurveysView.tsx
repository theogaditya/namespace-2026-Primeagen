"use client";

import React, { useState, useEffect, useCallback } from "react";
import { BACKEND_URL } from "@/lib/backend";
import { motion, AnimatePresence } from "framer-motion";
import type { SurveyListItem, SurveyResponse } from "@/types/survey";
import SurveyListPanel from "./surveys/SurveyListPanel";
import SurveyAttendPanel from "./surveys/SurveyAttendPanel";

interface SurveysViewProps {
  authToken: string | null;
}

export default function SurveysView({ authToken }: SurveysViewProps) {
  const [surveys, setSurveys] = useState<SurveyListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "OPEN" | "CLOSED">("OPEN");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [selectedSurveyId, setSelectedSurveyId] = useState<string | null>(null);
  const [resultsOnly, setResultsOnly] = useState(false);
  const [respondedSurveyIds, setRespondedSurveyIds] = useState<Set<string>>(new Set());
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [trending, setTrending] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1); // Reset to first page on search
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch surveys
  const fetchSurveys = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", "12");
      if (categoryFilter) params.set("category", categoryFilter);
      if (debouncedSearch) params.set("search", debouncedSearch);
      // Forward status filter so the backend returns only the matching surveys
      if (statusFilter === "CLOSED") params.set("status", "CLOSED");
      else if (statusFilter === "OPEN") params.set("status", "OPEN");

      const res = await fetch(`${BACKEND_URL}/api/surveys?${params.toString()}`, {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      });
      const data = await res.json();

      if (data.success) {
        setSurveys(data.data);
        setTotalPages(data.pagination.totalPages);
        setTotal(data.pagination.total);
        // Accumulate unique categories from fetched surveys
        setAllCategories((prev) => {
          const existing = new Set(prev);
          (data.data as SurveyListItem[]).forEach((s) => {
            if (s.category) existing.add(s.category);
          });
          return Array.from(existing).sort();
        });
      } else {
        setError(data.error || "Failed to load surveys");
      }
    } catch {
      setError("Failed to load surveys");
    } finally {
      setLoading(false);
    }
  }, [page, categoryFilter, debouncedSearch, statusFilter, authToken]);

  useEffect(() => {
    fetchSurveys();
  }, [fetchSurveys]);

  // Listen for status filter change events from SurveyListPanel
  useEffect(() => {
    const handler = (e: any) => {
      const val = e?.detail as "ALL" | "OPEN" | "CLOSED" | undefined
      if (val) {
        setStatusFilter(val)
        setPage(1)
      }
    }
    window.addEventListener('statusFilterChange', handler)
    return () => window.removeEventListener('statusFilterChange', handler)
  }, [])

  // Fetch user's responded surveys
  const fetchMyResponses = useCallback(async () => {
    if (!authToken) return;

    try {
      const res = await fetch(`${BACKEND_URL}/api/surveys/my-responses`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();

      if (data.success && Array.isArray(data.data)) {
        const ids = new Set<string>(data.data.map((r: SurveyResponse) => r.surveyId));
        setRespondedSurveyIds(ids);
      }
    } catch {
      // Ignore errors
    }
  }, [authToken]);

  useEffect(() => {
    fetchMyResponses();
  }, [fetchMyResponses]);

  // Handlers
  const handleCategoryChange = (category: string) => {
    setCategoryFilter(category);
    setPage(1);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleSelectSurvey = (survey: SurveyListItem) => {
    // If the survey is closed (explicit status or endsAt in past), open in results-only mode
    const isClosed = survey.status === "CLOSED" || (survey.endsAt && new Date(survey.endsAt) <= new Date());
    setResultsOnly(!!isClosed);
    setSelectedSurveyId(survey.id);
  };

  const handleBack = () => {
    setSelectedSurveyId(null);
    setResultsOnly(false);
    // Refresh the list to get updated response status
    fetchSurveys();
    fetchMyResponses();
  };

  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchSurveys();
      await fetchMyResponses();
    } finally {
      setRefreshing(false);
    }
  };

  function getResponseCount(s: any) {
    if (!s) return 0;
    if (typeof s.responseCount === "number") return s.responseCount;
    if (typeof s.responsesCount === "number") return s.responsesCount;
    if (s._count && typeof s._count.responses === "number") return s._count.responses;
    if (Array.isArray(s.responses)) return s.responses.length;
    return 0;
  }

  const displaySurveys = React.useMemo(() => {
    if (!trending) return surveys;
    return [...surveys].sort((a, b) => getResponseCount(b) - getResponseCount(a));
  }, [surveys, trending]);

  return (
    <div className="pt-8 px-4 lg:px-8 pb-12 max-w-5xl mx-auto w-full">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        {/* Header */}
        {!selectedSurveyId && (
          <div className="mb-8">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-700 mb-1">
              Civic Surveys
            </p>
            <h1 className="text-2xl font-extrabold text-slate-900">Share Your Voice</h1>
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-slate-500">
                Participate in surveys from civic organisations and help shape community decisions.
              </p>
              <div className="ml-4 flex items-center gap-2">
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <span className="hidden sm:inline leading-none">{refreshing ? "Refreshing…" : "Refresh"}</span>
                </button>
                <button
                  onClick={() => { setTrending((s) => { const next = !s; setPage(1); return next }) }}
                  className={`h-9 px-3 rounded-lg border text-sm font-bold ${trending ? 'bg-amber-100 border-amber-200 text-amber-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  Trending
                </button>
              </div>
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {selectedSurveyId ? (
            <motion.div
              key={selectedSurveyId}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.18 }}
            >
              <SurveyAttendPanel
                surveyId={selectedSurveyId}
                authToken={authToken}
                onBack={handleBack}
                resultsOnly={resultsOnly}
              />
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.18 }}
            >
              <SurveyListPanel
                surveys={displaySurveys}
                loading={loading}
                error={error}
                page={page}
                totalPages={totalPages}
                total={total}
                categoryFilter={categoryFilter}
                statusFilter={statusFilter}
                searchQuery={searchQuery}
                respondedSurveyIds={respondedSurveyIds}
                categories={allCategories}
                onCategoryChange={handleCategoryChange}
                onSearchChange={handleSearchChange}
                onPageChange={handlePageChange}
                onSelectSurvey={handleSelectSurvey}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
