"use client"

import { useState, useEffect, use, useCallback } from "react"
import { useRouter } from "next/navigation"
import { CivicPartnerLayout } from "../../_layout"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"

type QuestionType = "TEXT" | "MCQ" | "CHECKBOX" | "RATING" | "YES_NO"

interface Question {
  id?: string
  questionText: string
  questionType: QuestionType
  options: string[]
  isRequired: boolean
  order: number
}

interface Survey {
  id: string
  title: string
  description: string
  category: string
  content: string
  status: "DRAFT" | "PUBLISHED" | "CLOSED" | "ARCHIVED"
  startsAt: string | null
  endsAt: string | null
  createdAt: string
  lastUpdated: string
  questions: Question[]
  _count?: { responses: number; questions: number }
}

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

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  TEXT: "Open Text",
  MCQ: "Multiple Choice",
  CHECKBOX: "Checkbox",
  RATING: "Rating (1-5)",
  YES_NO: "Yes / No",
}

const CATEGORIES = [
  "Public Infrastructure",
  "Healthcare Services",
  "Environmental Policy",
  "Education & Youth",
  "Transportation",
  "Housing & Urban Planning",
  "Public Safety",
  "Governance & Civic Engagement",
  "Other",
]

type Tab = "overview" | "questions" | "analytics" | "settings"

export default function SurveyDetailPage({ params }: { params: Promise<{ surveyId: string }> }) {
  const { surveyId } = use(params)
  const router = useRouter()

  const [survey, setSurvey] = useState<Survey | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [successMsg, setSuccessMsg] = useState("")
  const [activeTab, setActiveTab] = useState<Tab>("overview")

  // Editable fields
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [content, setContent] = useState("")
  const [questions, setQuestions] = useState<Question[]>([])
  const [startsAt, setStartsAt] = useState("")
  const [endsAt, setEndsAt] = useState("")

  // Analytics
  const [overview, setOverview] = useState<Overview | null>(null)
  const [questionSummaries, setQuestionSummaries] = useState<QuestionSummary[]>([])
  const [questionDetails, setQuestionDetails] = useState<Record<string, QuestionBreakdown>>({})

  // Modals
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false)
  const [showStopConfirm, setShowStopConfirm] = useState(false)
  const [editingQuestionIdx, setEditingQuestionIdx] = useState<number | null>(null)
  const [showAddQuestion, setShowAddQuestion] = useState(false)

  const loadSurvey = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/civic-partner/surveys/${surveyId}`, { credentials: "include" })
      if (res.ok) {
        const data = await res.json()
        const sv = data.survey as Survey
        setSurvey(sv)
        setTitle(sv.title)
        setDescription(sv.description)
        setCategory(sv.category)
        setContent(sv.content)
        setQuestions(sv.questions || [])
        if (sv.startsAt) setStartsAt(sv.startsAt.slice(0, 16))
        if (sv.endsAt) setEndsAt(sv.endsAt.slice(0, 16))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [surveyId])

  const loadAnalytics = useCallback(async () => {
    if (!survey || survey.status === "DRAFT") return
    try {
      const [ovRes, qsRes] = await Promise.all([
        fetch(`${API}/api/civic-partner/analytics/${surveyId}/overview`, { credentials: "include" }),
        fetch(`${API}/api/civic-partner/analytics/${surveyId}/questions-summary`, { credentials: "include" }),
      ])
      if (ovRes.ok) {
        const d = await ovRes.json()
        setOverview(d.overview)
      }
      if (qsRes.ok) {
        const d = await qsRes.json()
        setQuestionSummaries(d.questions ?? [])
      }
    } catch (err) {
      console.error(err)
    }
  }, [surveyId, survey?.status])

  useEffect(() => { loadSurvey() }, [loadSurvey])
  useEffect(() => { loadAnalytics() }, [loadAnalytics])

  // Load per-question breakdowns for analytics
  useEffect(() => {
    if (questionSummaries.length === 0) return
    const load = async () => {
      const details: Record<string, QuestionBreakdown> = {}
      await Promise.all(
        questionSummaries.map(async (q) => {
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
  }, [questionSummaries, surveyId])

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(""), 3000)
  }

  // ------- Question helpers -------
  const addQuestion = () => {
    setQuestions((q) => [
      ...q,
      { questionText: "", questionType: "MCQ", options: [""], isRequired: true, order: q.length + 1 },
    ])
    setEditingQuestionIdx(questions.length)
    setShowAddQuestion(true)
  }

  const updateQuestion = (idx: number, patch: Partial<Question>) => {
    setQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, ...patch } : q)))
  }

  const removeQuestion = (idx: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== idx).map((q, i) => ({ ...q, order: i + 1 })))
    setEditingQuestionIdx(null)
  }

  const addOption = (qIdx: number) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === qIdx ? { ...q, options: [...q.options, ""] } : q))
    )
  }

  const updateOption = (qIdx: number, oIdx: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIdx ? { ...q, options: q.options.map((o, j) => (j === oIdx ? value : o)) } : q
      )
    )
  }

  const removeOption = (qIdx: number, oIdx: number) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIdx ? { ...q, options: q.options.filter((_, j) => j !== oIdx) } : q
      )
    )
  }

  // ------- Actions -------
  const handleSave = async () => {
    setError("")
    setSaving(true)
    try {
      const res = await fetch(`${API}/api/civic-partner/surveys/${surveyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title,
          description,
          category,
          content: content || description,
          questions: questions.map((q) => ({
            questionText: q.questionText,
            questionType: q.questionType,
            options: ["MCQ", "CHECKBOX"].includes(q.questionType) ? q.options.filter(Boolean) : [],
            isRequired: q.isRequired,
            order: q.order,
          })),
          startsAt: startsAt || undefined,
          endsAt: endsAt || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "Failed to save changes")
      showSuccess("Changes saved successfully!")
      await loadSurvey()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  const handlePublish = async () => {
    setError("")
    setSaving(true)
    try {
      await handleSave()
      const res = await fetch(`${API}/api/civic-partner/surveys/${surveyId}/publish`, {
        method: "POST",
        credentials: "include",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "Failed to publish")
      showSuccess("Survey published successfully!")
      await loadSurvey()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  const handleStop = async () => {
    setError("")
    setSaving(true)
    try {
      const res = await fetch(`${API}/api/civic-partner/surveys/${surveyId}/close`, {
        method: "POST",
        credentials: "include",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "Failed to stop survey")
      showSuccess("Survey has been stopped and closed.")
      setShowStopConfirm(false)
      await loadSurvey()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  const handleRestart = async () => {
    setError("")
    setSaving(true)
    try {
      const res = await fetch(`${API}/api/civic-partner/surveys/${surveyId}/reopen`, {
        method: "POST",
        credentials: "include",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "Failed to restart survey")
      showSuccess("Survey has been restarted and is active.")
      await loadSurvey()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  const handleArchive = async () => {
    setError("")
    setSaving(true)
    try {
      const res = await fetch(`${API}/api/civic-partner/surveys/${surveyId}`, {
        method: "DELETE",
        credentials: "include",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "Failed to archive survey")
      showSuccess("Survey has been archived.")
      setShowArchiveConfirm(false)
      await loadSurvey()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  const handleExport = (format: "csv" | "json") => {
    window.open(`${API}/api/civic-partner/analytics/${surveyId}/export?format=${format}`, "_blank")
  }

  const formatTime = (seconds: number | null) => {
    if (seconds == null) return "N/A"
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}m ${s}s`
  }

  const statusConfig: Record<string, { bg: string; text: string; label: string; icon: string }> = {
    PUBLISHED: { bg: "bg-emerald-100", text: "text-emerald-700", label: "Active", icon: "radio_button_checked" },
    DRAFT: { bg: "bg-amber-100", text: "text-amber-700", label: "Draft", icon: "edit_note" },
    CLOSED: { bg: "bg-slate-200", text: "text-slate-600", label: "Closed", icon: "block" },
    ARCHIVED: { bg: "bg-slate-100", text: "text-slate-500", label: "Archived", icon: "inventory_2" },
  }

  // Loading skeleton
  if (loading) {
    return (
      <CivicPartnerLayout>
        <div className="p-8 space-y-6">
          <div className="flex items-center gap-4">
            <div className="h-8 w-8 bg-[#e6f6ff] rounded-lg animate-pulse" />
            <div className="h-6 w-48 bg-[#e6f6ff] rounded-lg animate-pulse" />
          </div>
          <div className="h-10 w-96 bg-[#e6f6ff] rounded-xl animate-pulse" />
          <div className="grid grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-white rounded-xl animate-pulse" style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }} />)}
          </div>
          <div className="h-96 bg-white rounded-xl animate-pulse" style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }} />
        </div>
      </CivicPartnerLayout>
    )
  }

  if (!survey) {
    return (
      <CivicPartnerLayout>
        <div className="p-8 text-center py-40">
          <span className="material-symbols-outlined text-6xl text-[#c1c7d0] mb-4 block">search_off</span>
          <p className="text-[#727780] text-lg font-medium">Survey not found or access denied.</p>
          <button onClick={() => router.push("/CivicPartner/surveys")} className="mt-4 text-[#003358] font-bold underline">
            Back to Surveys
          </button>
        </div>
      </CivicPartnerLayout>
    )
  }

  const isDraft = survey.status === "DRAFT"
  const isActive = survey.status === "PUBLISHED"
  const isClosed = survey.status === "CLOSED"
  const isArchived = survey.status === "ARCHIVED"
  const sc = statusConfig[survey.status] || statusConfig.DRAFT
  const canEdit = isDraft || isActive

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: "overview", label: "Overview", icon: "info" },
    { key: "questions", label: "Questions", icon: "quiz" },
    ...(isDraft ? [] : [{ key: "analytics" as Tab, label: "Analytics", icon: "insert_chart" }]),
    { key: "settings", label: "Survey Settings", icon: "tune" },
  ]

  return (
    <CivicPartnerLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        {/* ── Success Toast ── */}
        {successMsg && (
          <div className="fixed top-6 right-6 z-50 bg-emerald-600 text-white px-6 py-3 rounded-xl font-medium text-sm shadow-2xl flex items-center gap-2 animate-in slide-in-from-top">
            <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            {successMsg}
          </div>
        )}

        {/* ── Header ── */}
        <section className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex-1">
            <button
              onClick={() => router.push("/CivicPartner/surveys")}
              className="flex items-center gap-1 text-[#727780] hover:text-[#003358] text-sm font-medium mb-3 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              Back to Surveys
            </button>
            <div className="flex items-center gap-3 mb-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${sc.bg} ${sc.text}`}>
                <span className="material-symbols-outlined text-xs">{sc.icon}</span>
                {sc.label}
              </span>
              <span className="text-xs text-[#727780]">
                Created {new Date(survey.createdAt).toLocaleDateString()}
              </span>
            </div>
            <h2
              className="text-3xl font-extrabold text-[#003358] tracking-tight"
              style={{ fontFamily: "'Manrope', sans-serif" }}
            >
              {survey.title}
            </h2>
            <p className="text-[#42474f] mt-1 max-w-2xl">{survey.description}</p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3">
            {isDraft && (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#e6f6ff] text-[#003358] font-bold rounded-xl hover:bg-[#dbf1fe] transition-all disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-sm">save</span>
                  Save Draft
                </button>
                <button
                  onClick={handlePublish}
                  disabled={saving || questions.length === 0}
                  className="flex items-center gap-2 px-5 py-2.5 text-white font-bold rounded-xl hover:brightness-110 transition-all disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #003358 0%, #004a7c 100%)" }}
                >
                  <span className="material-symbols-outlined text-sm">rocket_launch</span>
                  {saving ? "Publishing..." : "Publish"}
                </button>
              </>
            )}
            {isActive && (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#e6f6ff] text-[#003358] font-bold rounded-xl hover:bg-[#dbf1fe] transition-all disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-sm">save</span>
                  Save Changes
                </button>
                <button
                  onClick={() => setShowStopConfirm(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-amber-100 text-amber-700 font-bold rounded-xl hover:bg-amber-200 transition-all"
                >
                  <span className="material-symbols-outlined text-sm">stop_circle</span>
                  Stop Survey
                </button>
                <button
                  onClick={() => setShowArchiveConfirm(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#ffdad6] text-[#93000a] font-bold rounded-xl hover:bg-[#ffb4ab] transition-all"
                >
                  <span className="material-symbols-outlined text-sm">inventory_2</span>
                  Archive
                </button>
              </>
            )}
            {isClosed && (
              <>
                <button
                  onClick={handleRestart}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-100 text-emerald-700 font-bold rounded-xl hover:bg-emerald-200 transition-all disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-sm">autorenew</span>
                  Restart Survey
                </button>
                <button
                  onClick={() => setShowArchiveConfirm(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-300 transition-all"
                >
                  <span className="material-symbols-outlined text-sm">inventory_2</span>
                  Archive
                </button>
              </>
            )}
            {!isDraft && (
              <button
                onClick={() => handleExport("csv")}
                className="flex items-center gap-2 px-5 py-2.5 bg-white text-[#003358] font-bold rounded-xl hover:bg-[#e6f6ff] transition-all"
                style={{ border: "1px solid rgba(193,199,208,0.2)" }}
              >
                <span className="material-symbols-outlined text-sm">download</span>
                Export
              </button>
            )}
          </div>
        </section>

        {/* ── Error ── */}
        {error && (
          <div className="bg-[#ffdad6] text-[#93000a] p-4 rounded-xl text-sm font-medium flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">error</span>
            {error}
            <button onClick={() => setError("")} className="ml-auto">
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        )}

        {/* ── Tabs ── */}
        <div className="flex gap-1 bg-[#e6f6ff] p-1 rounded-xl w-fit">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
                activeTab === tab.key
                  ? "bg-white text-[#003358] shadow-sm"
                  : "text-[#727780] hover:text-[#003358]"
              }`}
            >
              <span className="material-symbols-outlined text-sm">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── TAB: Overview ── */}
        {activeTab === "overview" && (
          <div className="space-y-8">
            {/* Quick Stats for non-draft */}
            {!isDraft && overview && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-xl" style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}>
                  <p className="text-[#727780] text-xs font-bold uppercase tracking-widest mb-3">Total Responses</p>
                  <span className="text-3xl font-extrabold text-[#003358]" style={{ fontFamily: "'Manrope', sans-serif" }}>
                    {overview.totalResponses.toLocaleString()}
                  </span>
                </div>
                <div className="bg-white p-6 rounded-xl" style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}>
                  <p className="text-[#727780] text-xs font-bold uppercase tracking-widest mb-3">Completion Rate</p>
                  <span className="text-3xl font-extrabold text-[#003358]" style={{ fontFamily: "'Manrope', sans-serif" }}>
                    {overview.completionRate}%
                  </span>
                  <div className="w-full bg-[#e6f6ff] h-1.5 rounded-full mt-3">
                    <div className="bg-[#006b5e] h-full rounded-full" style={{ width: `${overview.completionRate}%` }} />
                  </div>
                </div>
                <div className="bg-white p-6 rounded-xl" style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}>
                  <p className="text-[#727780] text-xs font-bold uppercase tracking-widest mb-3">Avg. Time</p>
                  <span className="text-3xl font-extrabold text-[#003358]" style={{ fontFamily: "'Manrope', sans-serif" }}>
                    {formatTime(overview.avgTimeToCompleteSeconds)}
                  </span>
                </div>
                <div className="bg-white p-6 rounded-xl" style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}>
                  <p className="text-[#727780] text-xs font-bold uppercase tracking-widest mb-3">Last 7 Days</p>
                  <span className="text-3xl font-extrabold text-[#003358]" style={{ fontFamily: "'Manrope', sans-serif" }}>
                    {overview.last7d}
                  </span>
                  <p className="text-xs text-[#727780] mt-1">{overview.last24h} in last 24h</p>
                </div>
              </div>
            )}

            {/* Survey details card */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-white p-8 rounded-xl" style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}>
                <h3 className="text-lg font-bold text-[#003358] mb-6" style={{ fontFamily: "'Manrope', sans-serif" }}>
                  Survey Details
                </h3>
                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#727780] uppercase tracking-wider">Title</label>
                    {canEdit ? (
                      <input
                        className="w-full px-5 py-3 bg-[#f3faff] border border-[#e6f6ff] rounded-xl focus:ring-2 focus:ring-[#006b5e]/30 focus:border-[#006b5e] text-[#071e27] transition-all"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                      />
                    ) : (
                      <p className="text-sm font-semibold text-[#003358] px-1">{title}</p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[#727780] uppercase tracking-wider">Category</label>
                      {canEdit ? (
                        <select
                          className="w-full px-5 py-3 bg-[#f3faff] border border-[#e6f6ff] rounded-xl text-[#071e27] focus:ring-2 focus:ring-[#006b5e]/30 transition-all"
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                        >
                          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                        </select>
                      ) : (
                        <p className="text-sm font-semibold text-[#003358] px-1">{category}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[#727780] uppercase tracking-wider">Department</label>
                      {canEdit ? (
                        <input
                          className="w-full px-5 py-3 bg-[#f3faff] border border-[#e6f6ff] rounded-xl text-[#071e27] focus:ring-2 focus:ring-[#006b5e]/30 transition-all"
                          value={content}
                          onChange={(e) => setContent(e.target.value)}
                        />
                      ) : (
                        <p className="text-sm font-semibold text-[#003358] px-1">{content}</p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#727780] uppercase tracking-wider">Description</label>
                    {canEdit ? (
                      <textarea
                        className="w-full px-5 py-3 bg-[#f3faff] border border-[#e6f6ff] rounded-xl text-[#071e27] resize-none focus:ring-2 focus:ring-[#006b5e]/30 transition-all"
                        rows={3}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                      />
                    ) : (
                      <p className="text-sm text-[#42474f] px-1 leading-relaxed">{description}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Sidebar info */}
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-xl" style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}>
                  <h4 className="text-sm font-bold text-[#003358] mb-4">Survey Info</h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[#727780]">Status</span>
                      <span className={`font-bold ${sc.text}`}>{sc.label}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#727780]">Questions</span>
                      <span className="font-bold text-[#003358]">{questions.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#727780]">Category</span>
                      <span className="font-bold text-[#003358]">{category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#727780]">Created</span>
                      <span className="font-bold text-[#003358]">{new Date(survey.createdAt).toLocaleDateString()}</span>
                    </div>
                    {survey.lastUpdated && (
                      <div className="flex justify-between">
                        <span className="text-[#727780]">Last Updated</span>
                        <span className="font-bold text-[#003358]">{new Date(survey.lastUpdated).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Actions */}
                {canEdit && (
                  <div className="p-6 rounded-xl text-white" style={{ background: "linear-gradient(135deg, #003358 0%, #004a7c 100%)" }}>
                    <h4 className="text-sm font-bold mb-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm">bolt</span>
                      Quick Actions
                    </h4>
                    <div className="space-y-2">
                      <button
                        onClick={() => { setActiveTab("questions"); setShowAddQuestion(true); addQuestion() }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-all"
                      >
                        <span className="material-symbols-outlined text-sm">add_circle</span>
                        Add New Question
                      </button>
                      <button
                        onClick={() => setActiveTab("questions")}
                        className="w-full flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-all"
                      >
                        <span className="material-symbols-outlined text-sm">edit</span>
                        Modify Questions
                      </button>
                      {isActive && (
                        <button
                          onClick={() => setShowStopConfirm(true)}
                          className="w-full flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-all"
                        >
                          <span className="material-symbols-outlined text-sm">stop_circle</span>
                          Stop Accepting Responses
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: Questions ── */}
        {activeTab === "questions" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-[#003358]" style={{ fontFamily: "'Manrope', sans-serif" }}>
                  Questions ({questions.length})
                </h3>
                <p className="text-sm text-[#727780] mt-1">
                  {canEdit ? "Click any question to edit it, or add new ones below." : "This survey's questions are shown below."}
                </p>
              </div>
              {canEdit && (
                <button
                  onClick={addQuestion}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#006b5e] text-white font-bold rounded-xl hover:bg-[#005047] transition-all"
                >
                  <span className="material-symbols-outlined text-sm">add_circle</span>
                  Add Question
                </button>
              )}
            </div>

            {questions.length === 0 && (
              <div className="bg-[#e6f6ff] p-12 rounded-xl text-center" style={{ border: "2px dashed rgba(193,199,208,0.5)" }}>
                <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-4xl text-[#727780]">edit_document</span>
                </div>
                <p className="text-[#727780] font-medium">No questions yet. Add your first question to get started.</p>
              </div>
            )}

            {questions.map((q, idx) => {
              const isEditing = editingQuestionIdx === idx
              return (
                <div
                  key={idx}
                  className={`bg-white rounded-xl transition-all ${isEditing ? "ring-2 ring-[#006b5e]/30" : "hover:shadow-lg"}`}
                  style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.04)", border: "1px solid rgba(193,199,208,0.1)" }}
                >
                  {/* Question Header */}
                  <div
                    className={`flex items-center justify-between p-6 ${canEdit ? "cursor-pointer" : ""}`}
                    onClick={() => canEdit && setEditingQuestionIdx(isEditing ? null : idx)}
                  >
                    <div className="flex items-center gap-4">
                      <span
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold"
                        style={{ background: "linear-gradient(135deg, #003358 0%, #004a7c 100%)" }}
                      >
                        {idx + 1}
                      </span>
                      <div>
                        <p className="font-bold text-[#003358]">{q.questionText || "Untitled Question"}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] px-2 py-0.5 bg-[#e6f6ff] text-[#003358] rounded-full font-bold">
                            {QUESTION_TYPE_LABELS[q.questionType]}
                          </span>
                          {q.isRequired && (
                            <span className="text-[10px] px-2 py-0.5 bg-[#ffdad6] text-[#93000a] rounded-full font-bold">
                              Required
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {canEdit && (
                        <span className="material-symbols-outlined text-[#727780] transition-transform" style={{ transform: isEditing ? "rotate(180deg)" : "" }}>
                          expand_more
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Expanded Edit Panel */}
                  {isEditing && canEdit && (
                    <div className="px-6 pb-6 space-y-4 border-t border-[#e6f6ff] pt-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-[#727780] uppercase tracking-wider">Question Text</label>
                        <input
                          className="w-full px-5 py-3 bg-[#f3faff] border border-[#e6f6ff] rounded-xl focus:ring-2 focus:ring-[#006b5e]/30 text-[#071e27]"
                          placeholder="Enter your question..."
                          value={q.questionText}
                          onChange={(e) => updateQuestion(idx, { questionText: e.target.value })}
                        />
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-[#727780] uppercase tracking-wider">Type</label>
                          <select
                            className="px-4 py-2.5 bg-[#f3faff] border border-[#e6f6ff] rounded-xl text-sm font-medium text-[#003358]"
                            value={q.questionType}
                            onChange={(e) =>
                              updateQuestion(idx, {
                                questionType: e.target.value as QuestionType,
                                options: ["MCQ", "CHECKBOX"].includes(e.target.value) ? (q.options.length ? q.options : [""]) : [],
                              })
                            }
                          >
                            {Object.entries(QUESTION_TYPE_LABELS).map(([k, v]) => (
                              <option key={k} value={k}>{v}</option>
                            ))}
                          </select>
                        </div>
                        <label className="flex items-center gap-2 text-sm mt-5">
                          <input
                            type="checkbox"
                            checked={q.isRequired}
                            onChange={(e) => updateQuestion(idx, { isRequired: e.target.checked })}
                            className="w-4 h-4 rounded text-[#006b5e] focus:ring-[#006b5e]/40"
                          />
                          <span className="text-[#003358] font-medium">Required</span>
                        </label>
                      </div>

                      {/* MCQ / CHECKBOX options */}
                      {["MCQ", "CHECKBOX"].includes(q.questionType) && (
                        <div className="space-y-3">
                          <label className="text-xs font-bold text-[#727780] uppercase tracking-wider">Options</label>
                          {q.options.map((opt, oIdx) => (
                            <div key={oIdx} className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full border-2 border-[#c1c7d0] flex items-center justify-center text-[10px] font-bold text-[#727780]">
                                {String.fromCharCode(65 + oIdx)}
                              </span>
                              <input
                                className="flex-1 px-4 py-2.5 bg-[#f3faff] border border-[#e6f6ff] rounded-lg text-sm text-[#071e27] focus:ring-1 focus:ring-[#006b5e]/30"
                                placeholder={`Option ${oIdx + 1}`}
                                value={opt}
                                onChange={(e) => updateOption(idx, oIdx, e.target.value)}
                              />
                              {q.options.length > 1 && (
                                <button onClick={() => removeOption(idx, oIdx)} className="p-1 hover:bg-[#ffdad6] rounded-lg transition-colors">
                                  <span className="material-symbols-outlined text-sm text-[#ba1a1a]">close</span>
                                </button>
                              )}
                            </div>
                          ))}
                          <button
                            onClick={() => addOption(idx)}
                            className="flex items-center gap-1 text-sm font-bold text-[#006b5e] hover:underline"
                          >
                            <span className="material-symbols-outlined text-sm">add</span>
                            Add Option
                          </button>
                        </div>
                      )}

                      {/* Delete question */}
                      <div className="flex justify-end pt-2">
                        <button
                          onClick={() => removeQuestion(idx)}
                          className="flex items-center gap-2 px-4 py-2 text-[#ba1a1a] hover:bg-[#ffdad6] rounded-lg text-sm font-bold transition-all"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                          Remove Question
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ── TAB: Analytics ── */}
        {activeTab === "analytics" && !isDraft && (
          <div className="space-y-8">
            {overview && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-xl" style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}>
                  <p className="text-[#727780] text-xs font-bold uppercase tracking-widest mb-3">Total Responses</p>
                  <span className="text-3xl font-extrabold text-[#003358]" style={{ fontFamily: "'Manrope', sans-serif" }}>
                    {overview.totalResponses.toLocaleString()}
                  </span>
                  {overview.last7d > 0 && (
                    <p className="text-emerald-600 text-xs font-bold mt-2 flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">trending_up</span>
                      +{overview.last7d} this week
                    </p>
                  )}
                </div>
                <div className="bg-white p-6 rounded-xl" style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}>
                  <p className="text-[#727780] text-xs font-bold uppercase tracking-widest mb-3">Completion Rate</p>
                  <span className="text-3xl font-extrabold text-[#003358]" style={{ fontFamily: "'Manrope', sans-serif" }}>
                    {overview.completionRate}%
                  </span>
                  <div className="w-full bg-[#e6f6ff] h-1.5 rounded-full mt-3">
                    <div className="bg-[#006b5e] h-full rounded-full transition-all" style={{ width: `${overview.completionRate}%` }} />
                  </div>
                </div>
                <div className="bg-white p-6 rounded-xl" style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}>
                  <p className="text-[#727780] text-xs font-bold uppercase tracking-widest mb-3">Avg. Time</p>
                  <span className="text-3xl font-extrabold text-[#003358]" style={{ fontFamily: "'Manrope', sans-serif" }}>
                    {formatTime(overview.avgTimeToCompleteSeconds)}
                  </span>
                  <p className="text-[#727780] text-xs mt-2">{overview.uniqueRespondents} unique respondents</p>
                </div>
                <div className="p-6 rounded-xl text-white" style={{ background: "linear-gradient(135deg, #003358 0%, #004a7c 100%)" }}>
                  <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-3">Response Activity</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="opacity-70">Last 24h</span><span className="font-bold">{overview.last24h}</span></div>
                    <div className="flex justify-between"><span className="opacity-70">Last 7d</span><span className="font-bold">{overview.last7d}</span></div>
                    <div className="flex justify-between"><span className="opacity-70">Last 30d</span><span className="font-bold">{overview.last30d}</span></div>
                  </div>
                </div>
              </div>
            )}

            {/* Per-Question Breakdowns */}
            {questionSummaries.map((q, qi) => {
              const detail = questionDetails[q.questionId]
              if (!detail) return null
              const displayOrder = q.order ?? qi + 1
              return (
                <div key={q.questionId} className="bg-white p-8 rounded-xl" style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}>
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="text-lg font-bold text-[#003358]">
                      Q{displayOrder}. {q.questionText}
                    </h4>
                    <span className="text-xs text-[#727780]">{q.totalAnswers} answers · {q.responseRate}% response rate</span>
                  </div>

                  {/* MCQ / CHECKBOX */}
                  {(detail.questionType === "MCQ" || detail.questionType === "CHECKBOX") && detail.breakdown?.distribution && (
                    <div className="space-y-4">
                      {detail.breakdown.distribution.map((d: any, i: number) => (
                        <div key={i} className="space-y-2">
                          <div className="flex justify-between text-sm font-semibold">
                            <span className="text-[#071e27]">{d.option}</span>
                            <span className="text-[#003358]">{d.percentage}%</span>
                          </div>
                          <div className="w-full h-3 bg-[#e6f6ff] rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${d.percentage}%`, background: i === 0 ? "#003358" : i < 3 ? `rgba(0,51,88,${0.8 - i * 0.15})` : "#006b5e" }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* RATING */}
                  {detail.questionType === "RATING" && detail.breakdown && (
                    <div className="flex items-center gap-10">
                      <div className="text-center">
                        <div className="text-5xl font-extrabold text-[#006b5e]">{detail.breakdown.avgRating ?? "—"}</div>
                        <div className="flex text-[#ffb95f] mt-2 justify-center">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <span key={star} className="material-symbols-outlined" style={{ fontVariationSettings: star <= Math.round(detail.breakdown.avgRating ?? 0) ? "'FILL' 1" : "'FILL' 0" }}>star</span>
                          ))}
                        </div>
                        <p className="text-[#727780] text-[10px] mt-2 font-bold">OUT OF 5.0</p>
                      </div>
                      <div className="flex-1 space-y-1">
                        {[5, 4, 3, 2, 1].map((rating) => {
                          const item = detail.breakdown.distribution?.find((d: any) => d.rating === rating)
                          const count = item?.count ?? 0
                          const maxCount = Math.max(1, ...(detail.breakdown.distribution?.map((d: any) => d.count) ?? [1]))
                          return (
                            <div key={rating} className="flex items-center gap-4">
                              <span className="text-[10px] font-bold text-[#727780] w-4">{rating}</span>
                              <div className="flex-1 h-1 bg-[#dbf1fe] rounded-full"><div className="h-full bg-[#006b5e] rounded-full" style={{ width: `${(count / maxCount) * 100}%` }} /></div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* YES_NO */}
                  {detail.questionType === "YES_NO" && detail.breakdown && (
                    <div className="flex gap-6">
                      <div className="flex-1 bg-emerald-50 p-6 rounded-xl text-center">
                        <p className="text-3xl font-extrabold text-emerald-600">{detail.breakdown.yesPercentage}%</p>
                        <p className="text-sm font-bold text-emerald-600 mt-1">Yes</p>
                      </div>
                      <div className="flex-1 bg-red-50 p-6 rounded-xl text-center">
                        <p className="text-3xl font-extrabold text-red-500">{detail.breakdown.noPercentage}%</p>
                        <p className="text-sm font-bold text-red-500 mt-1">No</p>
                      </div>
                    </div>
                  )}

                  {/* TEXT */}
                  {detail.questionType === "TEXT" && detail.breakdown && (
                    <div className="space-y-4">
                      {detail.breakdown.topKeywords?.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {detail.breakdown.topKeywords.slice(0, 12).map((kw: any, i: number) => (
                            <span key={i} className={`px-3 py-1.5 text-xs font-bold rounded-full ${i < 3 ? "bg-emerald-100 text-emerald-700" : "bg-[#e6f6ff] text-[#003358]"}`}>
                              {kw.word} ({kw.count})
                            </span>
                          ))}
                        </div>
                      )}
                      {detail.breakdown.samples?.slice(0, 3).map((sample: string, i: number) => (
                        <div key={i} className="p-4 bg-[#f3faff] rounded-lg" style={{ borderLeft: `4px solid ${i % 2 === 0 ? "#006b5e" : "#003358"}` }}>
                          <p className="text-xs italic text-[#071e27]">&ldquo;{sample}&rdquo;</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Export */}
            <div className="bg-[#e6f6ff] p-6 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#003358]">database</span>
                <div>
                  <p className="text-sm font-bold text-[#003358]">Export Survey Data</p>
                  <p className="text-xs text-[#727780]">Download responses for offline analysis</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => handleExport("csv")} className="px-4 py-2 bg-white text-[#003358] font-bold rounded-lg text-sm hover:bg-[#dbf1fe] transition-all" style={{ border: "1px solid rgba(193,199,208,0.2)" }}>
                  CSV
                </button>
                <button onClick={() => handleExport("json")} className="px-4 py-2 bg-white text-[#003358] font-bold rounded-lg text-sm hover:bg-[#dbf1fe] transition-all" style={{ border: "1px solid rgba(193,199,208,0.2)" }}>
                  JSON
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: Settings ── */}
        {activeTab === "settings" && (
          <div className="space-y-8 max-w-3xl">
            <div className="bg-white p-8 rounded-xl" style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}>
              <h3 className="text-lg font-bold text-[#003358] mb-6" style={{ fontFamily: "'Manrope', sans-serif" }}>
                Schedule
              </h3>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#727780] uppercase tracking-wider">Start Date</label>
                  {canEdit ? (
                    <input
                      type="datetime-local"
                      className="w-full px-5 py-3 bg-[#f3faff] border border-[#e6f6ff] rounded-xl focus:ring-2 focus:ring-[#006b5e]/30 text-[#071e27]"
                      value={startsAt}
                      onChange={(e) => setStartsAt(e.target.value)}
                    />
                  ) : (
                    <p className="text-sm font-semibold text-[#003358]">{startsAt ? new Date(startsAt).toLocaleString() : "Not set"}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#727780] uppercase tracking-wider">End Date</label>
                  {canEdit ? (
                    <input
                      type="datetime-local"
                      className="w-full px-5 py-3 bg-[#f3faff] border border-[#e6f6ff] rounded-xl focus:ring-2 focus:ring-[#006b5e]/30 text-[#071e27]"
                      value={endsAt}
                      onChange={(e) => setEndsAt(e.target.value)}
                    />
                  ) : (
                    <p className="text-sm font-semibold text-[#003358]">{endsAt ? new Date(endsAt).toLocaleString() : "Not set"}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-white p-8 rounded-xl border border-red-200" style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}>
              <h3 className="text-lg font-bold text-[#93000a] mb-4 flex items-center gap-2" style={{ fontFamily: "'Manrope', sans-serif" }}>
                <span className="material-symbols-outlined text-lg">warning</span>
                Danger Zone
              </h3>
              <div className="space-y-4">
                {isActive && (
                  <div className="flex items-center justify-between p-4 bg-amber-50 rounded-xl">
                    <div>
                      <p className="text-sm font-bold text-amber-800">Stop Survey</p>
                      <p className="text-xs text-amber-700">Stop accepting new responses. Existing data is preserved.</p>
                    </div>
                    <button
                      onClick={() => setShowStopConfirm(true)}
                      className="px-4 py-2 bg-amber-600 text-white font-bold rounded-lg text-sm hover:bg-amber-700 transition-all"
                    >
                      Stop Survey
                    </button>
                  </div>
                )}
                {(isActive || isClosed) && (
                  <div className="flex items-center justify-between p-4 bg-red-50 rounded-xl">
                    <div>
                      <p className="text-sm font-bold text-[#93000a]">Archive Survey</p>
                      <p className="text-xs text-[#93000a]/70">Move to archives. This action can be undone from settings.</p>
                    </div>
                    <button
                      onClick={() => setShowArchiveConfirm(true)}
                      className="px-4 py-2 bg-[#ba1a1a] text-white font-bold rounded-lg text-sm hover:bg-[#93000a] transition-all"
                    >
                      Archive
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ════════ Confirmation Modals ════════ */}

        {/* Stop Confirm Modal */}
        {showStopConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowStopConfirm(false)} />
            <div className="relative bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
              <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-3xl text-amber-600">stop_circle</span>
              </div>
              <h3 className="text-xl font-bold text-[#003358] text-center mb-2" style={{ fontFamily: "'Manrope', sans-serif" }}>
                Stop this Survey?
              </h3>
              <p className="text-[#727780] text-center text-sm mb-6">
                This will close the survey and stop accepting new responses. All collected data will be preserved.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowStopConfirm(false)}
                  className="flex-1 px-4 py-3 bg-[#e6f6ff] text-[#003358] font-bold rounded-xl hover:bg-[#dbf1fe] transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStop}
                  disabled={saving}
                  className="flex-1 px-4 py-3 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700 transition-all disabled:opacity-50"
                >
                  {saving ? "Stopping..." : "Yes, Stop Survey"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Archive Confirm Modal */}
        {showArchiveConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowArchiveConfirm(false)} />
            <div className="relative bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-3xl text-[#ba1a1a]">inventory_2</span>
              </div>
              <h3 className="text-xl font-bold text-[#003358] text-center mb-2" style={{ fontFamily: "'Manrope', sans-serif" }}>
                Archive this Survey?
              </h3>
              <p className="text-[#727780] text-center text-sm mb-6">
                The survey will be moved to the archive. You can still view collected data and export reports.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowArchiveConfirm(false)}
                  className="flex-1 px-4 py-3 bg-[#e6f6ff] text-[#003358] font-bold rounded-xl hover:bg-[#dbf1fe] transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleArchive}
                  disabled={saving}
                  className="flex-1 px-4 py-3 bg-[#ba1a1a] text-white font-bold rounded-xl hover:bg-[#93000a] transition-all disabled:opacity-50"
                >
                  {saving ? "Archiving..." : "Yes, Archive"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </CivicPartnerLayout>
  )
}
