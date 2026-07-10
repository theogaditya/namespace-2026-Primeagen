"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { BACKEND_URL } from "@/lib/backend";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Building2,
  Calendar,
  AlertCircle,
} from "lucide-react";
import type {
  SurveyDetail,
  SurveyQuestion,
  AnswerPayload,
  MyResponseCheckResponse,
} from "@/types/survey";
import SurveyQuestionRenderer from "./SurveyQuestionRenderer";

function getDaysUntilClose(endsAt: string | null): number | null {
  if (!endsAt) return null;
  const end = new Date(endsAt);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

interface SurveyAttendPanelProps {
  surveyId: string;
  authToken: string | null;
  onBack: () => void;
  resultsOnly?: boolean;
}

export default function SurveyAttendPanel({
  surveyId,
  authToken,
  onBack,
  resultsOnly = false,
}: SurveyAttendPanelProps) {
  const [survey, setSurvey] = useState<SurveyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [answers, setAnswers] = useState<Record<string, AnswerPayload>>({});
  const [hasSubmitAttempted, setHasSubmitAttempted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const [hasResponded, setHasResponded] = useState(false);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [checkingResponse, setCheckingResponse] = useState(true);
  const [results, setResults] = useState<any | null>(null);
  const [resultsLoading, setResultsLoading] = useState(false);

  const startedAtRef = useRef<string>(new Date().toISOString());

  // Fetch survey details
  useEffect(() => {
    async function fetchSurvey() {
      setLoading(true);
      setError(null);
      try {
        const encodedId = encodeURIComponent(surveyId);
        const res = await fetch(`${BACKEND_URL}/api/surveys/${encodedId}`, {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        });
        const data = await res.json();
        if (data.success) {
          setSurvey(data.data);
        } else {
          setError(data.error || "Failed to load survey");
        }
      } catch {
        setError("Failed to load survey");
      } finally {
        setLoading(false);
      }
    }
    fetchSurvey();
  }, [surveyId, authToken]);

  // Check if user has already responded
  useEffect(() => {
    async function checkResponse() {
      if (!authToken) {
        setCheckingResponse(false);
        return;
      }
      try {
        const encodedId = encodeURIComponent(surveyId);
        const res = await fetch(`${BACKEND_URL}/api/surveys/${encodedId}/my-response`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        const data: MyResponseCheckResponse = await res.json();
        if (data.success) {
          setHasResponded(data.hasResponded);
          setSubmittedAt(data.submittedAt);
        }
      } catch {
        // Ignore errors checking response
      } finally {
        setCheckingResponse(false);
      }
    }
    checkResponse();
  }, [surveyId, authToken]);

  const fetchResults = useCallback(async () => {
    setResultsLoading(true);
    try {
      const encodedId = encodeURIComponent(surveyId);
      const res = await fetch(`${BACKEND_URL}/api/surveys/${encodedId}/results`, {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      });
      if (!res.ok) {
        // If backend doesn't expose results, clear results and return
        setResults(null);
        return;
      }
      const data = await res.json();
      if (data.success) setResults(data.data);
    } catch (err) {
      // ignore network errors
    } finally {
      setResultsLoading(false);
    }
  }, [surveyId, authToken]);

  // When we learn the user has already responded, fetch aggregated results
  useEffect(() => {
    if (hasResponded) {
      fetchResults();
    }
  }, [hasResponded, fetchResults]);

  // If parent requests results-only mode, fetch results immediately
  useEffect(() => {
    if (resultsOnly) fetchResults();
  }, [resultsOnly, fetchResults]);

  // If the survey is closed (endsAt in the past or status === 'CLOSED'), fetch results
  useEffect(() => {
    if (!survey) return;
    const days = getDaysUntilClose(survey.endsAt);
    if (survey.status === 'CLOSED' || (days !== null && days <= 0)) {
      fetchResults();
    }
  }, [survey, fetchResults]);

  const handleAnswerChange = useCallback((payload: AnswerPayload) => {
    setAnswers((prev) => ({
      ...prev,
      [payload.questionId]: payload,
    }));
  }, []);

  // Calculate progress
  const { requiredCount, answeredRequiredCount, progress } = useMemo(() => {
    if (!survey) return { requiredCount: 0, answeredRequiredCount: 0, progress: 0 };
    const required = survey.questions.filter((q) => q.isRequired);
    const answeredRequired = required.filter((q) => {
      const answer = answers[q.id];
      if (!answer) return false;
      switch (q.questionType) {
        case "TEXT":
          return answer.answerText && answer.answerText.trim() !== "";
        case "MCQ":
        case "YES_NO":
          return answer.selectedOpts && answer.selectedOpts.length === 1;
        case "CHECKBOX":
          return answer.selectedOpts && answer.selectedOpts.length > 0;
        case "RATING":
          return typeof answer.ratingValue === "number";
        default:
          return false;
      }
    });
    const count = required.length;
    const answered = answeredRequired.length;
    return {
      requiredCount: count,
      answeredRequiredCount: answered,
      progress: count === 0 ? 100 : (answered / count) * 100,
    };
  }, [survey, answers]);

  const canSubmit = answeredRequiredCount === requiredCount && requiredCount > 0;

  const handleSubmit = async () => {
    setHasSubmitAttempted(true);
    if (!canSubmit) {
      // Scroll to first unanswered required question
      const firstUnanswered = survey?.questions.find((q) => {
        if (!q.isRequired) return false;
        const answer = answers[q.id];
        if (!answer) return true;
        switch (q.questionType) {
          case "TEXT":
            return !answer.answerText || answer.answerText.trim() === "";
          case "MCQ":
          case "YES_NO":
            return !answer.selectedOpts || answer.selectedOpts.length !== 1;
          case "CHECKBOX":
            return !answer.selectedOpts || answer.selectedOpts.length === 0;
          case "RATING":
            return typeof answer.ratingValue !== "number";
          default:
            return true;
        }
      });
      if (firstUnanswered) {
        document.getElementById(`question-${firstUnanswered.id}`)?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
      return;
    }

    if (!authToken) {
      setSubmitError("Please log in to submit your response.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const encodedId = encodeURIComponent(surveyId);
      const res = await fetch(`${BACKEND_URL}/api/surveys/${encodedId}/respond`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          answers: Object.values(answers),
          startedAt: startedAtRef.current,
        }),
      });
      let data: any = null;
      try {
        data = await res.json();
      } catch (e) {
        console.error("Failed to parse submit response as JSON", e);
      }
      if (res.ok && data?.success) {
          setSubmitSuccess(true);
          setHasResponded(true);
          setSubmittedAt(data.submittedAt || new Date().toISOString());
          fetchResults();
      } else {
        const errMsg = data?.error || (data ? JSON.stringify(data) : `HTTP ${res.status}`);
        console.error("Submit failed:", res.status, errMsg);
        setSubmitError(errMsg || "Failed to submit response");
        }
    } catch {
      setSubmitError("Failed to submit response. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  if (loading || checkingResponse) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    );
  }

  if (error || !survey) {
    return (
      <div className="text-center py-24">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <p className="text-slate-600">{error || "Survey not found"}</p>
        <button
          onClick={onBack}
          className="mt-4 text-violet-600 hover:text-violet-800 font-medium"
        >
          ← Back to Surveys
        </button>
      </div>
    );
  }

  // Already responded banner
  if (hasResponded && !submitSuccess) {
    return (
      <div className="space-y-6">
        <button
          onClick={onBack}
          className="text-violet-600 hover:text-violet-800 font-medium flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Surveys
        </button>

        <div className="bg-white rounded-2xl border border-slate-200/70 p-6">
          <h1 className="text-xl font-extrabold text-slate-900">{survey.title}</h1>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
              <Building2 className="w-3.5 h-3.5" />
              {survey.civicPartner.orgName}
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
              {survey.category}
            </span>
          </div>
          <p className="text-sm text-slate-600 mt-4">{survey.description}</p>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-start gap-4">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-800">
              You have already submitted a response to this survey. Thank you for your participation!
            </p>
            {submittedAt && (
              <p className="text-xs text-emerald-600 mt-1">
                Your response was recorded on {formatDate(submittedAt)}.
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onBack} className="px-4 py-2 rounded-xl bg-violet-600 text-white">Back</button>
        </div>

        {results && (
          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <h3 className="font-bold mb-3">Survey Results</h3>
            <div className="space-y-4">
              <div className="text-sm text-slate-500">Total responses: {results?.totalResponses ?? "—"}</div>
              {results?.perQuestion?.map((q: any) => {
                const distribution = q.distribution || {};
                const entries = (Object.entries(distribution) as [string, number][]).sort((a, b) => (b[1] || 0) - (a[1] || 0));
                const top = entries[0];
                return (
                  <div key={q.questionId} className="p-3 bg-slate-50 rounded">
                    <div className="font-semibold text-sm">{q.questionText}</div>
                    {entries.length > 0 ? (
                      <div className="mt-2 text-sm">
                        <div className="text-sm font-medium">Most selected: <span className="font-semibold">{top[0]}</span> — <span className="text-slate-500">{top[1]} responses</span></div>
                        <ul className="text-sm mt-2">
                          {entries.map(([opt, cnt]) => (
                            <li key={opt} className="flex justify-between">
                              <span>{opt}</span>
                              <span className="text-slate-500">{cnt}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : q.average !== undefined ? (
                      <div className="text-sm mt-2">Average rating: {q.average} ({q.count} responses)</div>
                    ) : (
                      <div className="text-sm mt-2">Responses: {q.count}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // If opened in results-only mode by parent, show only header + results (no form)
  if (resultsOnly) {
    return (
      <div className="space-y-6">
        <button
          onClick={onBack}
          className="text-violet-600 hover:text-violet-800 font-medium flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Surveys
        </button>

        <div className="bg-white rounded-2xl border border-slate-200/70 p-6">
          <h1 className="text-xl font-extrabold text-slate-900">{survey?.title ?? "Survey"}</h1>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
              <Building2 className="w-3.5 h-3.5" />
              {survey?.civicPartner?.orgName}
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
              {survey?.category}
            </span>
          </div>
          <p className="text-sm text-slate-600 mt-4">{survey?.description}</p>
        </div>

        {resultsLoading && !results ? (
          <div className="mt-4 text-sm text-slate-500">Loading results…</div>
        ) : null}

        {results ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <h3 className="font-bold mb-3">Survey Results</h3>
            <div className="space-y-4">
              <div className="text-sm text-slate-500">Total responses: {results?.totalResponses ?? "—"}</div>
              {results?.perQuestion?.map((q: any) => {
                const distribution = q.distribution || {};
                const entries = (Object.entries(distribution) as [string, number][]).sort((a, b) => (b[1] || 0) - (a[1] || 0));
                const top = entries[0];
                return (
                  <div key={q.questionId} className="p-3 bg-slate-50 rounded">
                    <div className="font-semibold text-sm">{q.questionText}</div>
                    {entries.length > 0 ? (
                      <div className="mt-2 text-sm">
                        <div className="text-sm font-medium">Most selected: <span className="font-semibold">{top[0]}</span> — <span className="text-slate-500">{top[1]} responses</span></div>
                        <ul className="text-sm mt-2">
                          {entries.map(([opt, cnt]) => (
                            <li key={opt} className="flex justify-between">
                              <span>{opt}</span>
                              <span className="text-slate-500">{cnt}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : q.average !== undefined ? (
                      <div className="text-sm mt-2">Average rating: {q.average} ({q.count} responses)</div>
                    ) : (
                      <div className="text-sm mt-2">Responses: {q.count}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-sm text-slate-500">Results are not available for this survey.</div>
        )}
      </div>
    );
  }

  // Success state
  if (submitSuccess) {
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl border border-emerald-200 p-8 flex flex-col items-center text-center"
      >
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="text-xl font-extrabold text-slate-900 mt-4">
          Thank you for your response!
        </h2>
        <p className="text-sm text-slate-500 mt-2">
          Your feedback for the{" "}
          <span className="font-semibold">{survey.category}</span> survey by{" "}
          <span className="font-semibold">{survey.civicPartner.orgName}</span> has been
          recorded.
        </p>
        <button
          onClick={onBack}
          className="mt-6 px-6 py-2.5 border border-violet-500 text-violet-600 rounded-xl font-semibold hover:bg-violet-50 transition-colors"
        >
          Back to Surveys
        </button>
      </motion.div>
    );
  }

  // Survey form
  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={onBack}
        className="text-violet-600 hover:text-violet-800 font-medium flex items-center gap-1"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Surveys
      </button>

      {/* Survey header card */}
      <div className="bg-white rounded-2xl border border-slate-200/70 p-6">
        <h1 className="text-xl font-extrabold text-slate-900">{survey.title}</h1>
        <div className="flex flex-wrap items-center gap-3 mt-2">
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
            <Building2 className="w-3.5 h-3.5" />
            {survey.civicPartner.orgName}
          </span>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
            {survey.category}
          </span>
        </div>
        <p className="text-sm text-slate-600 mt-4">{survey.description}</p>
        {survey.endsAt && (
          <p className="text-xs text-slate-400 mt-3 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            Open until {formatDate(survey.endsAt)}
          </p>
        )}
      </div>

      {/* Progress bar */}
      <div className="bg-white rounded-2xl border border-slate-200/70 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-slate-600">Progress</span>
          <span className="text-xs font-medium text-violet-600">
            {answeredRequiredCount} / {requiredCount} required questions
          </span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-1.5">
          <div
            className="bg-violet-500 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Not logged in warning */}
      {!authToken && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            You need to{" "}
            <a
              href={`/loginUser?redirect=/dashboard&tab=surveys`}
              className="font-semibold underline"
            >
              log in
            </a>{" "}
            to submit your response.
          </p>
        </div>
      )}

      {/* Questions */}
      <div className="space-y-4">
        {survey.questions.map((question, index) => (
          <div key={question.id} id={`question-${question.id}`}>
            <SurveyQuestionRenderer
              question={question}
              index={index}
              value={answers[question.id]}
              onChange={handleAnswerChange}
              showValidation={hasSubmitAttempted}
            />
          </div>
        ))}
      </div>

      {/* Submit error */}
      {submitError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500" />
          <p className="text-sm text-red-700">{submitError}</p>
        </div>
      )}

      {/* Submit / Results buttons */}
      {getDaysUntilClose(survey.endsAt) !== null && getDaysUntilClose(survey.endsAt)! <= 0 ? (
        <div>
          <div className="flex gap-3 mb-3">
            <button
              onClick={onBack}
              className="py-3 px-4 rounded-xl font-bold bg-slate-200 text-slate-600"
            >
              Back
            </button>
          </div>
          {/* fetchResults will be triggered automatically for closed surveys */}
        </div>
      ) : (
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !authToken}
          className={`w-full py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
            canSubmit && authToken
              ? "bg-[var(--dash-primary)] text-white shadow-lg shadow-[var(--dash-primary)]/20 hover:scale-[1.01] active:scale-[0.99]"
              : "bg-slate-200 text-slate-500 cursor-not-allowed"
          }`}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Submitting...
            </>
          ) : (
            "Submit Response"
          )}
        </button>
      )}
      {/* Results panel: shown automatically when available (after submit, if already responded, or when survey closed) */}
      {resultsLoading && !results ? (
        <div className="mt-4 text-sm text-slate-500">Loading results…</div>
      ) : null}
      {results && (
        <div className="mt-4">
          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <h3 className="font-bold mb-3">Survey Results</h3>
            <div className="space-y-4">
              <div className="text-sm text-slate-500">Total responses: {results?.totalResponses ?? "—"}</div>
              {results?.perQuestion?.map((q: any) => {
                const distribution = q.distribution || {};
                const entries = (Object.entries(distribution) as [string, number][]).sort((a, b) => (b[1] || 0) - (a[1] || 0));
                const top = entries[0];
                return (
                  <div key={q.questionId} className="p-3 bg-slate-50 rounded">
                    <div className="font-semibold text-sm">{q.questionText}</div>
                    {entries.length > 0 ? (
                      <div className="mt-2 text-sm">
                        <div className="text-sm font-medium">Most selected: <span className="font-semibold">{top[0]}</span> — <span className="text-slate-500">{top[1]} responses</span></div>
                        <ul className="text-sm mt-2">
                          {entries.map(([opt, cnt]) => (
                            <li key={opt} className="flex justify-between">
                              <span>{opt}</span>
                              <span className="text-slate-500">{cnt}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : q.average !== undefined ? (
                      <div className="text-sm mt-2">Average rating: {q.average} ({q.count} responses)</div>
                    ) : (
                      <div className="text-sm mt-2">Responses: {q.count}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
