"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [selectedSurveyId, setSelectedSurveyId] = useState<string | null>(null);
  const [respondedSurveyIds, setRespondedSurveyIds] = useState<Set<string>>(new Set());
  const [allCategories, setAllCategories] = useState<string[]>([]);

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

      const res = await fetch(`/api/surveys?${params.toString()}`, {
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
  }, [page, categoryFilter, debouncedSearch, authToken]);

  useEffect(() => {
    fetchSurveys();
  }, [fetchSurveys]);

  // Fetch user's responded surveys
  const fetchMyResponses = useCallback(async () => {
    if (!authToken) return;

    try {
      const res = await fetch("/api/surveys/my-responses", {
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
    setSelectedSurveyId(survey.id);
  };

  const handleBack = () => {
    setSelectedSurveyId(null);
    // Refresh the list to get updated response status
    fetchSurveys();
    fetchMyResponses();
  };

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
            <h1 className="text-2xl font-extrabold text-slate-900">
              Share Your Voice
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Participate in surveys from civic organisations and help shape community decisions.
            </p>
          </div>
        )}

        {/* Content */}
        {selectedSurveyId ? (
          <SurveyAttendPanel
            surveyId={selectedSurveyId}
            authToken={authToken}
            onBack={handleBack}
          />
        ) : (
          <SurveyListPanel
            surveys={surveys}
            loading={loading}
            error={error}
            page={page}
            totalPages={totalPages}
            total={total}
            categoryFilter={categoryFilter}
            searchQuery={searchQuery}
            respondedSurveyIds={respondedSurveyIds}
            categories={allCategories}
            onCategoryChange={handleCategoryChange}
            onSearchChange={handleSearchChange}
            onPageChange={handlePageChange}
            onSelectSurvey={handleSelectSurvey}
          />
        )}
      </motion.div>
    </div>
  );
}
