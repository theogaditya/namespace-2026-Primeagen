"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { CivicPartnerLayout } from "../../_layout"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002"

interface Overview {
  totalResponses: number
  completeResponses: number
  uniqueRespondents: number
  completionRate: number
  dropOffRate: number
  avgTimeToCompleteSeconds: number | null
  last24h: number
  last7d: number
  last30d: number
}

interface QuestionSummary {
  questionId: string
  questionText: string
  questionType: string
  order: number
  totalAnswers: number
  responseRate: number
}

interface QuestionBreakdown {
  id: string
  questionText: string
  questionType: string
  totalAnswers: number
  breakdown: any
}

interface TrendData {
  timeSeries: { date: string; count: number }[]
  cumulativeSeries: { date: string; cumulative: number }[]
}

interface SurveyDetail {
  id: string
  title: string
  description: string
  status: string
  category: string
  createdAt: string
}

export default function SurveyAnalyticsPage({ params }: { params: Promise<{ surveyId: string }> }) {
  const { surveyId } = use(params)
  const router = useRouter()
  const [survey, setSurvey] = useState<SurveyDetail | null>(null)
  const [overview, setOverview] = useState<Overview | null>(null)
  const [questions, setQuestions] = useState<QuestionSummary[]>([])
  const [questionDetails, setQuestionDetails] = useState<Record<string, QuestionBreakdown>>({})
  const [trends, setTrends] = useState<TrendData | null>(null)
  const [loading, setLoading] = useState(true)
  const [granularity, setGranularity] = useState<"daily" | "weekly">("daily")

  // Fetch survey, overview, questions, trends
  useEffect(() => {
    const load = async () => {
      try {
        const [svRes, ovRes, qsRes, trRes] = await Promise.all([
          fetch(`${API}/api/civic-partner/surveys/${surveyId}`, { credentials: "include" }),
          fetch(`${API}/api/civic-partner/analytics/${surveyId}/overview`, { credentials: "include" }),
          fetch(`${API}/api/civic-partner/analytics/${surveyId}/questions-summary`, { credentials: "include" }),
          fetch(`${API}/api/civic-partner/analytics/${surveyId}/trends?granularity=${granularity}`, { credentials: "include" }),
        ])

        if (svRes.ok) {
          const d = await svRes.json()
          setSurvey(d.survey)
        }
        if (ovRes.ok) {
          const d = await ovRes.json()
          setOverview(d.overview)
        }
        if (qsRes.ok) {
          const d = await qsRes.json()
          setQuestions(d.questions ?? [])
        }
        if (trRes.ok) {
          const d = await trRes.json()
          setTrends(d.trends)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [surveyId, granularity])

  // Fetch per-question breakdowns
  useEffect(() => {
    if (questions.length === 0) return
    const load = async () => {
      const details: Record<string, QuestionBreakdown> = {}
      await Promise.all(
        questions.map(async (q) => {
          try {
            const res = await fetch(
              `${API}/api/civic-partner/analytics/${surveyId}/question/${q.questionId}`,
              { credentials: "include" }
            )
            if (res.ok) {
              const d = await res.json()
              details[q.questionId] = d.question
            }
          } catch {}
        })
      )
      setQuestionDetails(details)
    }
    load()
  }, [questions, surveyId])

  const formatTime = (seconds: number | null) => {
    if (seconds == null) return "N/A"
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}m ${s}s`
  }

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PUBLISHED: "bg-[#94f0df] text-[#006f62]",
      DRAFT: "bg-[#ffddb8] text-[#2a1700]",
      CLOSED: "bg-[#c7dde9] text-[#727780]",
    }
    return (
      <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded ${styles[status] ?? ""}`}>
        {status}
      </span>
    )
  }

  const handleExport = (format: "csv" | "json") => {
    window.open(`${API}/api/civic-partner/analytics/${surveyId}/export?format=${format}`, "_blank")
  }

  if (loading) {
    return (
      <CivicPartnerLayout>
        <div className="p-8 text-center py-40 text-[#727780]">Loading analytics...</div>
      </CivicPartnerLayout>
    )
  }

  if (!survey) {
    return (
      <CivicPartnerLayout>
        <div className="p-8 text-center py-40">
          <p className="text-[#727780] text-lg">Survey not found.</p>
          <button onClick={() => router.back()} className="mt-4 text-[#006b5e] font-bold underline">
            Go back
          </button>
        </div>
      </CivicPartnerLayout>
    )
  }

  // Chart bar heights
  const maxTrendCount = Math.max(1, ...(trends?.timeSeries.map((t) => t.count) ?? [1]))

  return (
    <CivicPartnerLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-10">
        {/* Survey Header */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              {statusBadge(survey.status)}
              <span className="text-[#727780] text-xs font-medium">
                Created: {new Date(survey.createdAt).toLocaleDateString()}
              </span>
            </div>
            <h2
              className="text-4xl font-extrabold text-[#003358] tracking-tight mb-2"
              style={{ fontFamily: "'Manrope', sans-serif" }}
            >
              {survey.title}
            </h2>
            <p className="text-[#42474f] max-w-2xl leading-relaxed">{survey.description}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 px-5 py-2.5 bg-white text-[#003358] font-bold rounded-xl hover:bg-[#e6f6ff] transition-all"
              style={{ border: "1px solid rgba(193,199,208,0.2)" }}
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              Back
            </button>
            <button
              onClick={() => handleExport("csv")}
              className="flex items-center gap-2 px-5 py-2.5 text-white font-bold rounded-xl hover:translate-y-[-1px] transition-all"
              style={{ background: "#003358", boxShadow: "0 12px 32px -4px rgba(7,30,39,0.1)" }}
            >
              <span className="material-symbols-outlined text-sm">download</span>
              Export CSV
            </button>
          </div>
        </section>

        {/* KPI Grid */}
        {overview && (
          <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl" style={{ boxShadow: "0 12px 32px -4px rgba(7,30,39,0.06)" }}>
              <p className="text-[#727780] text-xs font-bold uppercase tracking-widest mb-4">Total Responses</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-[#003358]" style={{ fontFamily: "'Manrope', sans-serif" }}>
                  {overview.totalResponses.toLocaleString()}
                </span>
                {overview.last7d > 0 && (
                  <span className="text-[#006b5e] text-sm font-bold flex items-center">
                    <span className="material-symbols-outlined text-xs">arrow_upward</span>
                    {overview.last7d} this week
                  </span>
                )}
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl" style={{ boxShadow: "0 12px 32px -4px rgba(7,30,39,0.06)" }}>
              <p className="text-[#727780] text-xs font-bold uppercase tracking-widest mb-4">Completion Rate</p>
              <span className="text-4xl font-extrabold text-[#003358]" style={{ fontFamily: "'Manrope', sans-serif" }}>
                {overview.completionRate}%
              </span>
              <div className="w-full bg-[#e6f6ff] h-1.5 rounded-full mt-4">
                <div className="bg-[#006b5e] h-full rounded-full" style={{ width: `${overview.completionRate}%` }} />
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl" style={{ boxShadow: "0 12px 32px -4px rgba(7,30,39,0.06)" }}>
              <p className="text-[#727780] text-xs font-bold uppercase tracking-widest mb-4">Average Time</p>
              <span className="text-4xl font-extrabold text-[#003358]" style={{ fontFamily: "'Manrope', sans-serif" }}>
                {formatTime(overview.avgTimeToCompleteSeconds)}
              </span>
              <p className="text-[#727780] text-[10px] mt-2 italic">
                {overview.uniqueRespondents} unique respondent{overview.uniqueRespondents !== 1 ? "s" : ""}
              </p>
            </div>
            <div
              className="p-6 rounded-xl relative overflow-hidden"
              style={{ background: "#003358", boxShadow: "0 12px 32px -4px rgba(7,30,39,0.06)" }}
            >
              <div className="relative z-10">
                <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-4">Survey Status</p>
                <span className="text-4xl font-extrabold text-white" style={{ fontFamily: "'Manrope', sans-serif" }}>
                  {overview.totalResponses > 100 ? "High" : overview.totalResponses > 10 ? "Good" : "Low"}
                </span>
                <p className="text-white/60 text-[10px] mt-2">
                  {overview.last24h} responses in last 24h
                </p>
              </div>
              <div className="absolute -right-4 -bottom-4 opacity-10">
                <span className="material-symbols-outlined text-8xl text-white">verified</span>
              </div>
            </div>
          </section>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Charts and Question Breakdowns */}
          <div className="lg:col-span-2 space-y-8">
            {/* Response Velocity */}
            {trends && trends.timeSeries.length > 0 && (
              <div className="bg-white p-8 rounded-xl" style={{ boxShadow: "0 12px 32px -4px rgba(7,30,39,0.06)" }}>
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-xl font-bold text-[#003358]" style={{ fontFamily: "'Manrope', sans-serif" }}>
                    Response Velocity
                  </h3>
                  <div className="flex gap-2 bg-[#dbf1fe] px-1 py-1 rounded-lg">
                    <button
                      onClick={() => setGranularity("daily")}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                        granularity === "daily" ? "bg-white text-[#003358] shadow-sm" : "text-[#727780] hover:text-[#003358]"
                      }`}
                    >
                      Daily
                    </button>
                    <button
                      onClick={() => setGranularity("weekly")}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                        granularity === "weekly" ? "bg-white text-[#003358] shadow-sm" : "text-[#727780] hover:text-[#003358]"
                      }`}
                    >
                      Weekly
                    </button>
                  </div>
                </div>
                <div className="h-64 flex items-end justify-between gap-1 px-2">
                  {trends.timeSeries.slice(-20).map((t, i) => (
                    <div
                      key={i}
                      className="w-full bg-[#003358] rounded-t-sm transition-all hover:bg-[#004a7c]"
                      style={{
                        height: `${Math.max(4, (t.count / maxTrendCount) * 100)}%`,
                        opacity: 0.3 + (t.count / maxTrendCount) * 0.7,
                      }}
                      title={`${t.date}: ${t.count} responses`}
                    />
                  ))}
                </div>
                <div className="flex justify-between mt-4 px-2 text-[10px] font-bold text-[#727780] uppercase tracking-wider">
                  {trends.timeSeries.slice(-20).length > 4 && (
                    <>
                      <span>{trends.timeSeries.slice(-20)[0]?.date}</span>
                      <span>{trends.timeSeries.slice(-20).at(-1)?.date}</span>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Per-Question Breakdowns */}
            {questions.map((q, qi) => {
              const detail = questionDetails[q.questionId]
              if (!detail) return null
              const displayOrder = q.order ?? qi + 1

              return (
                <div
                  key={q.questionId}
                  className="bg-white p-8 rounded-xl"
                  style={{ boxShadow: "0 12px 32px -4px rgba(7,30,39,0.06)" }}
                >
                  <h4 className="text-lg font-bold text-[#003358] mb-6">
                    {displayOrder}. {q.questionText}
                  </h4>

                  {/* MCQ / CHECKBOX */}
                  {(detail.questionType === "MCQ" || detail.questionType === "CHECKBOX") &&
                    detail.breakdown?.distribution && (
                      <div className="space-y-4">
                        {detail.breakdown.distribution.map((d: any, i: number) => (
                          <div key={i} className="space-y-2">
                            <div className="flex justify-between text-sm font-semibold">
                              <span className="text-[#071e27]">{d.option}</span>
                              <span className="text-[#003358]">{d.percentage}%</span>
                            </div>
                            <div className="w-full h-3 bg-[#e6f6ff] rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${d.percentage}%`,
                                  background: i === 0 ? "#003358" : i < 3 ? `rgba(0,51,88,${0.8 - i * 0.15})` : "#006b5e",
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                  {/* RATING */}
                  {detail.questionType === "RATING" && detail.breakdown && (
                    <div className="flex items-center gap-10">
                      <div className="text-center">
                        <div className="text-5xl font-extrabold text-[#006b5e]">
                          {detail.breakdown.avgRating ?? "—"}
                        </div>
                        <div className="flex text-[#ffb95f] mt-2 justify-center">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <span
                              key={star}
                              className="material-symbols-outlined"
                              style={{
                                fontVariationSettings:
                                  star <= Math.round(detail.breakdown.avgRating ?? 0)
                                    ? "'FILL' 1"
                                    : "'FILL' 0",
                              }}
                            >
                              star
                            </span>
                          ))}
                        </div>
                        <p className="text-[#727780] text-[10px] mt-2 font-bold">OUT OF 5.0</p>
                      </div>
                      <div className="flex-1 space-y-1">
                        {[5, 4, 3, 2, 1].map((rating) => {
                          const item = detail.breakdown.distribution?.find((d: any) => d.rating === rating)
                          const count = item?.count ?? 0
                          const maxCount = Math.max(
                            1,
                            ...(detail.breakdown.distribution?.map((d: any) => d.count) ?? [1])
                          )
                          return (
                            <div key={rating} className="flex items-center gap-4">
                              <span className="text-[10px] font-bold text-[#727780] w-4">{rating}</span>
                              <div className="flex-1 h-1 bg-[#dbf1fe] rounded-full">
                                <div
                                  className="h-full bg-[#006b5e] rounded-full"
                                  style={{ width: `${(count / maxCount) * 100}%` }}
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* YES_NO */}
                  {detail.questionType === "YES_NO" && detail.breakdown && (
                    <div className="flex gap-6">
                      <div className="flex-1 bg-[#94f0df]/30 p-6 rounded-xl text-center">
                        <p className="text-3xl font-extrabold text-[#006b5e]">{detail.breakdown.yesPercentage}%</p>
                        <p className="text-sm font-bold text-[#006b5e] mt-1">Yes</p>
                        <p className="text-xs text-[#727780]">{detail.breakdown.yes} responses</p>
                      </div>
                      <div className="flex-1 bg-[#ffdad6]/30 p-6 rounded-xl text-center">
                        <p className="text-3xl font-extrabold text-[#ba1a1a]">{detail.breakdown.noPercentage}%</p>
                        <p className="text-sm font-bold text-[#ba1a1a] mt-1">No</p>
                        <p className="text-xs text-[#727780]">{detail.breakdown.no} responses</p>
                      </div>
                    </div>
                  )}

                  {/* TEXT */}
                  {detail.questionType === "TEXT" && detail.breakdown && (
                    <div className="space-y-4">
                      {detail.breakdown.topKeywords?.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {detail.breakdown.topKeywords.slice(0, 12).map((kw: any, i: number) => (
                            <span
                              key={i}
                              className={`px-3 py-1.5 text-xs font-bold rounded-full ${
                                i < 3
                                  ? "bg-[#006b5e]/10 text-[#006b5e]"
                                  : "bg-[#003358]/10 text-[#003358]"
                              }`}
                            >
                              {kw.word} ({kw.count})
                            </span>
                          ))}
                        </div>
                      )}
                      {detail.breakdown.samples?.slice(0, 3).map((sample: string, i: number) => (
                        <div
                          key={i}
                          className="p-4 bg-[#f3faff] rounded-lg"
                          style={{ borderLeft: `4px solid ${i % 2 === 0 ? "#006b5e" : "#003358"}` }}
                        >
                          <p className="text-xs italic text-[#071e27]">&ldquo;{sample}&rdquo;</p>
                        </div>
                      ))}
                      <p className="text-xs text-[#727780]">
                        {detail.breakdown.totalTextResponses} text responses total
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Right Sidebar */}
          <div className="lg:col-span-1 space-y-8">
            {/* Questions Summary */}
            <div className="bg-white p-8 rounded-xl" style={{ boxShadow: "0 12px 32px -4px rgba(7,30,39,0.06)" }}>
              <h3 className="text-xl font-bold text-[#003358] mb-6" style={{ fontFamily: "'Manrope', sans-serif" }}>
                Questions Overview
              </h3>
              <div className="space-y-4">
                {questions.map((q, qi) => {
                  const displayOrder = q.order ?? qi + 1
                  return (
                    <div key={q.questionId} className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#003358] truncate">
                          Q{displayOrder}. {q.questionText}
                        </p>
                        <p className="text-[10px] text-[#727780]">
                          {q.totalAnswers} answers · {q.responseRate}% response rate
                        </p>
                      </div>
                    <span className="material-symbols-outlined text-sm text-[#727780] ml-2">
                      {q.questionType === "MCQ" || q.questionType === "CHECKBOX"
                        ? "bar_chart"
                        : q.questionType === "RATING"
                          ? "star"
                          : q.questionType === "YES_NO"
                            ? "check_circle"
                            : "text_fields"}
                    </span>
                  </div>
                ); })}
              </div>
            </div>

            {/* Export */}
            <div className="bg-[#dbf1fe] p-6 rounded-xl" style={{ border: "1px solid rgba(193,199,208,0.1)" }}>
              <h3 className="text-sm font-bold text-[#003358] mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">database</span>
                Data Export Center
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleExport("csv")}
                  className="flex items-center justify-center gap-2 p-3 bg-white hover:bg-[#e6f6ff] text-[#003358] rounded-lg transition-all"
                  style={{ border: "1px solid rgba(193,199,208,0.2)" }}
                >
                  <span className="material-symbols-outlined text-sm">description</span>
                  <span className="text-[10px] font-bold">CSV</span>
                </button>
                <button
                  onClick={() => handleExport("json")}
                  className="flex items-center justify-center gap-2 p-3 bg-white hover:bg-[#e6f6ff] text-[#003358] rounded-lg transition-all"
                  style={{ border: "1px solid rgba(193,199,208,0.2)" }}
                >
                  <span className="material-symbols-outlined text-sm">code</span>
                  <span className="text-[10px] font-bold">JSON</span>
                </button>
              </div>
              <p className="text-[10px] text-[#727780] text-center mt-4">
                {overview ? `${overview.totalResponses} total responses` : "Loading..."}
              </p>
            </div>

            {/* Response Buckets */}
            {overview && (
              <div
                className="p-6 rounded-xl text-white"
                style={{ background: "linear-gradient(135deg, #006b5e 0%, #005047 100%)", boxShadow: "0 12px 32px -4px rgba(7,30,39,0.06)" }}
              >
                <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">schedule</span>
                  Response Timeline
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm opacity-80">Last 24 hours</span>
                    <span className="font-bold">{overview.last24h}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm opacity-80">Last 7 days</span>
                    <span className="font-bold">{overview.last7d}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm opacity-80">Last 30 days</span>
                    <span className="font-bold">{overview.last30d}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </CivicPartnerLayout>
  )
}
