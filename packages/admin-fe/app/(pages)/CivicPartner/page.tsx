"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { CivicPartnerLayout } from "./_layout"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002"

interface Survey {
  id: string
  title: string
  status: "DRAFT" | "PUBLISHED" | "CLOSED" | "ARCHIVED"
  createdAt: string
  lastUpdated: string
  _count?: { responses: number; questions: number }
}

interface PortfolioStats {
  totalSurveys: number
  totalResponses: number
  published: number
  draft: number
  closed: number
  avgCompletionRate: number | null
}

export default function CivicPartnerDashboard() {
  const router = useRouter()
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [portfolio, setPortfolio] = useState<PortfolioStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [insightDismissed, setInsightDismissed] = useState(false)

  // Persist whether the weekly insight has been dismissed so it stays closed
  useEffect(() => {
    try {
      const stored = localStorage.getItem("civicPartner_insightDismissed")
      if (stored === "true") setInsightDismissed(true)
    } catch (err) {
      // ignore localStorage errors (e.g., SSR or disabled)
    }
  }, [])

  const dismissInsight = () => {
    try {
      localStorage.setItem("civicPartner_insightDismissed", "true")
    } catch (err) {
      // ignore
    }
    setInsightDismissed(true)
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [surveyRes, portfolioRes] = await Promise.all([
          fetch(`${API}/api/civic-partner/surveys`, { credentials: "include" }),
          fetch(`${API}/api/civic-partner/analytics/portfolio`, { credentials: "include" }),
        ])

        if (surveyRes.ok) {
          const sd = await surveyRes.json()
          setSurveys(sd.surveys ?? sd.data ?? [])
        }

        if (portfolioRes.ok) {
          const pd = await portfolioRes.json()
          setPortfolio(pd.portfolio ?? pd)
        }
      } catch (err) {
        console.error("Failed to load dashboard:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const totalResponses = portfolio?.totalResponses ?? surveys.reduce((s, sv) => s + (sv._count?.responses ?? 0), 0)
  const activeSurveys = portfolio?.published ?? surveys.filter((s) => s.status === "PUBLISHED").length
  const draftSurveys = portfolio?.draft ?? surveys.filter((s) => s.status === "DRAFT").length
  const closedSurveys = portfolio?.closed ?? surveys.filter((s) => s.status === "CLOSED").length
  const completionRate = portfolio?.avgCompletionRate

  const recentSurveys = [...surveys].sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()).slice(0, 5)
  const drafts = surveys.filter((s) => s.status === "DRAFT").slice(0, 3)

  const statusBadge = (status: string) => {
    switch (status) {
      case "PUBLISHED":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#e6fffb] text-[#0b6b59]">
            Published
          </span>
        )
      case "DRAFT":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#fff8e1] text-[#6b4a00]">
            Draft
          </span>
        )
      case "CLOSED":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#eef6ff] text-[#5b6670]">
            Closed
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#eef6ff] text-[#5b6670]">
            {status}
          </span>
        )
    }
  }

  const actionLabel = (status: string) => {
    switch (status) {
      case "PUBLISHED":
        return "Manage Survey"
      case "DRAFT":
        return "Edit Draft"
      case "CLOSED":
        return "View Details"
      case "ARCHIVED":
        return "View Archive"
      default:
        return "View"
    }
  }

  const handleAction = (survey: Survey) => {
    router.push(`/CivicPartner/surveys/${survey.id}`)
  }

  const timeAgo = (dateStr: string) => {
    const now = Date.now()
    const d = new Date(dateStr).getTime()
    const diff = now - d
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d ago`
    return new Date(dateStr).toLocaleDateString()
  }

  return (
    <CivicPartnerLayout>
      <div className="p-8 space-y-10">
        {/* ── Hero Metrics ── */}
        <section className="grid grid-cols-12 gap-6">
          {/* Total Responses */}
          <div
            className="col-span-12 md:col-span-5 p-8 rounded-xl text-white flex flex-col justify-between min-h-[220px]"
            style={{
              background: "linear-gradient(135deg, #003358 0%, #004a7c 100%)",
              boxShadow: "0 12px 32px -4px rgba(7, 30, 39, 0.06)",
            }}
          >
            <div>
              <p className="text-[#87baf3] font-medium tracking-wide uppercase text-[10px]">
                Total Responses
              </p>
              <h2
                className="text-5xl font-extrabold mt-2"
                style={{ fontFamily: "'Manrope', sans-serif" }}
              >
                {loading ? "—" : totalResponses.toLocaleString()}
              </h2>
            </div>
            <div className="flex items-center gap-2 text-[#97f3e2]">
              <span className="material-symbols-outlined text-sm">trending_up</span>
              <span className="text-xs font-semibold">
                Across {portfolio?.totalSurveys ?? surveys.length} survey{(portfolio?.totalSurveys ?? surveys.length) !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          {/* Active Surveys */}
          <div
            className="col-span-12 md:col-span-3 bg-white p-8 rounded-xl"
            style={{ boxShadow: "0 12px 32px -4px rgba(7, 30, 39, 0.06)", border: "1px solid rgba(193,199,208,0.1)" }}
          >
            <p className="text-[#727780] font-medium tracking-wide uppercase text-[10px]">Active Surveys</p>
            <h2
              className="text-4xl font-extrabold mt-2 text-[#003358]"
              style={{ fontFamily: "'Manrope', sans-serif" }}
            >
              {loading ? "—" : activeSurveys}
            </h2>
            <div className="mt-6 flex flex-col gap-2">
              <div className="h-1.5 w-full bg-[#dbf1fe] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#006b5e] rounded-full transition-all"
                  style={{ width: `${Math.min(100, (activeSurveys / Math.max(1, activeSurveys + draftSurveys + closedSurveys)) * 100)}%` }}
                />
              </div>
              <p className="text-[11px] text-[#727780]">
                {draftSurveys} drafts · {closedSurveys} closed
              </p>
            </div>
          </div>

          {/* Completion Rate */}
          <div
            className="col-span-12 md:col-span-4 bg-white p-8 rounded-xl"
            style={{ boxShadow: "0 12px 32px -4px rgba(7, 30, 39, 0.06)", border: "1px solid rgba(193,199,208,0.1)" }}
          >
            <p className="text-[#727780] font-medium tracking-wide uppercase text-[10px]">
              Avg. Completion Rate
            </p>
            <h2
              className="text-4xl font-extrabold mt-2 text-[#003358]"
              style={{ fontFamily: "'Manrope', sans-serif" }}
            >
              {loading ? "—" : completionRate != null ? `${completionRate.toFixed(1)}%` : "N/A"}
            </h2>
            <div className="mt-4 flex items-center gap-4">
              <p className="text-xs text-[#727780] font-medium">
                Based on responses marked complete
              </p>
            </div>
          </div>
        </section>

        {/* ── Main Content Grid ── */}
        <section className="grid grid-cols-12 gap-8">
          {/* Recent Surveys Table */}
          <div className="col-span-12 lg:col-span-8 space-y-6">
            <div className="flex justify-between items-end">
              <div>
                <h3
                  className="text-xl font-extrabold text-[#003358]"
                  style={{ fontFamily: "'Manrope', sans-serif" }}
                >
                  Recent Surveys
                </h3>
                <p className="text-sm text-[#727780]">Real-time overview of your survey campaigns</p>
              </div>
              <button
                onClick={() => router.push("/CivicPartner/surveys")}
                className="text-sm font-bold text-[#006b5e] hover:underline flex items-center gap-1"
              >
                View All Surveys
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>

            <div
              className="bg-white rounded-xl overflow-hidden"
              style={{ boxShadow: "0 12px 32px -4px rgba(7, 30, 39, 0.06)" }}
            >
              {loading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4 px-6 py-5">
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-48 bg-[#e6f6ff] rounded-lg animate-pulse" />
                        <div className="h-3 w-24 bg-[#e6f6ff] rounded animate-pulse" />
                      </div>
                      <div className="h-6 w-16 bg-[#e6f6ff] rounded-full animate-pulse" />
                      <div className="h-4 w-12 bg-[#e6f6ff] rounded animate-pulse" />
                      <div className="h-8 w-24 bg-[#e6f6ff] rounded-lg animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : recentSurveys.length === 0 ? (
                <div className="p-12 text-center">
                  <span className="material-symbols-outlined text-5xl text-[#c1c7d0] mb-4 block">poll</span>
                  <p className="text-[#727780] font-medium">No surveys yet. Create your first one to start collecting community feedback!</p>
                  <button
                    onClick={() => router.push("/CivicPartner/surveys/new")}
                    className="mt-4 px-6 py-3 rounded-xl bg-gradient-to-br from-[#003358] to-[#004a7c] text-white font-bold text-sm"
                  >
                    Create Survey
                  </button>
                </div>
              ) : (
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-[#e6f6ff]/50">
                      <th className="text-left px-6 py-4 text-[10px] font-bold text-[#727780] uppercase tracking-widest">
                        Survey Title
                      </th>
                      <th className="text-center px-6 py-4 text-[10px] font-bold text-[#727780] uppercase tracking-widest">
                        Status
                      </th>
                      <th className="text-center px-6 py-4 text-[10px] font-bold text-[#727780] uppercase tracking-widest">
                        Responses
                      </th>
                      <th className="text-right px-6 py-4 text-[10px] font-bold text-[#727780] uppercase tracking-widest">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e6f6ff]">
                    {recentSurveys.map((sv) => (
                      <tr
                        key={sv.id}
                        className="hover:bg-[#e6f6ff]/30 transition-colors cursor-pointer"
                        onClick={() => handleAction(sv)}
                      >
                        <td className="px-6 py-5">
                          <p className="text-sm font-bold text-[#003358]">{sv.title}</p>
                          <p className="text-[11px] text-[#727780]">Last updated {timeAgo(sv.lastUpdated)}</p>
                        </td>
                        <td className="px-6 py-5 text-center">{statusBadge(sv.status)}</td>
                        <td
                          className="px-6 py-5 font-bold text-[#003358] text-center"
                          style={{ fontFamily: "'Manrope', sans-serif" }}
                        >
                          {sv.status === "DRAFT" ? "—" : (sv._count?.responses ?? 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-5 text-right">
                          <button className="px-4 py-2 rounded-lg text-[11px] font-bold bg-[#d5ecf8] text-[#003358] hover:bg-[#003358] hover:text-white transition-all">
                            {actionLabel(sv.status)}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Drafts Sidebar */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            <h3
              className="text-xl font-extrabold text-[#003358]"
              style={{ fontFamily: "'Manrope', sans-serif" }}
            >
              Drafts in Progress
            </h3>
            <div className="space-y-4">
              {loading ? (
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="bg-[#e6f6ff]/40 p-5 rounded-xl animate-pulse">
                      <div className="h-4 w-32 bg-[#dbf1fe] rounded mb-3" />
                      <div className="h-2 w-full bg-[#dbf1fe] rounded-full mb-2" />
                      <div className="h-3 w-20 bg-[#dbf1fe] rounded" />
                    </div>
                  ))}
                </div>
              ) : drafts.length === 0 ? (
                <div className="bg-[#d5ecf8]/40 p-8 rounded-xl text-center">
                  <p className="text-[#727780] text-sm">No drafts in progress</p>
                </div>
              ) : (
                drafts.map((d) => (
                  <div
                    key={d.id}
                    className="bg-[#d5ecf8]/40 p-5 rounded-xl border-l-4 border-[#ffb95f] hover:bg-[#d5ecf8] transition-all cursor-pointer"
                    onClick={() => router.push(`/CivicPartner/surveys/${d.id}`)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-sm font-bold text-[#003358]">{d.title}</h4>
                      <span className="material-symbols-outlined text-[#727780] text-lg">more_horiz</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-1 bg-[#cfe6f2] rounded-full flex-1 overflow-hidden">
                        <div
                          className="bg-[#ffb95f] h-full"
                          style={{
                            width: `${Math.min(100, ((d._count?.questions ?? 0) / Math.max(1, d._count?.questions ?? 1)) * 100)}%`,
                          }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-[#727780]">
                        {d._count?.questions ?? 0} questions
                      </span>
                    </div>
                    <p className="mt-3 text-[11px] text-[#727780]">
                      Created {timeAgo(d.createdAt)}
                    </p>
                  </div>
                ))
              )}

              {/* Add new placeholder */}
              <div
                className="border-2 border-dashed border-[#c1c7d0]/30 p-8 rounded-xl flex flex-col items-center justify-center gap-3 text-center opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
                onClick={() => router.push("/CivicPartner/surveys/new")}
              >
                <div className="w-10 h-10 rounded-full bg-[#dbf1fe] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#003358]">add</span>
                </div>
                <p className="text-xs font-bold text-[#003358]">Create New Survey</p>
              </div>
            </div>

            {/* Weekly Insight */}
            {!insightDismissed && (
            <div
              className="p-6 rounded-xl text-white relative"
              style={{
                background: "linear-gradient(135deg, #006b5e 0%, #005047 100%)",
                boxShadow: "0 12px 32px -4px rgba(7, 30, 39, 0.06)",
              }}
            >
              <button
                onClick={dismissInsight}
                className="absolute top-3 right-3 p-1 hover:bg-white/20 rounded-lg transition-colors"
                title="Dismiss"
              >
                <span className="material-symbols-outlined text-white/70 text-sm">close</span>
              </button>
              <div className="flex items-center gap-3 mb-4">
                <span className="material-symbols-outlined text-[#ffddb8]">insights</span>
                <p className="text-xs font-bold uppercase tracking-wider">Weekly Insight</p>
              </div>
              <p className="text-sm font-medium leading-relaxed">
                {totalResponses > 0
                  ? `You have collected ${totalResponses.toLocaleString()} responses across ${(portfolio?.totalSurveys ?? surveys.length)} surveys. ${activeSurveys > 0 ? `${activeSurveys} survey${activeSurveys > 1 ? "s" : ""} currently accepting responses.` : "Launch a new survey to start collecting feedback."}`
                  : "Launch your first survey to begin collecting citizen feedback and unlock analytics insights."}
              </p>
              <button
                onClick={() => router.push("/CivicPartner/surveys/new")}
                className="mt-4 text-xs font-bold border-b border-white/40 pb-1 hover:border-white transition-all"
              >
                Launch Survey
              </button>
            </div>
            )}
          </div>
        </section>
      </div>
    </CivicPartnerLayout>
  )
}
