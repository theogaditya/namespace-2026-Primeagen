"use client"

import { useState, useEffect, use, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { CivicPartnerLayout } from "../../_layout"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002"
const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || ""

type QuestionType = "TEXT" | "MCQ" | "CHECKBOX" | "RATING" | "YES_NO"

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  TEXT: "Open Text",
  MCQ: "Multiple Choice",
  CHECKBOX: "Checkbox",
  RATING: "Rating (1–5)",
  YES_NO: "Yes / No",
}

const CATEGORIES = [
  "Public Infrastructure", "Healthcare Services", "Environmental Policy",
  "Education & Youth", "Transportation", "Housing & Urban Planning",
  "Public Safety", "Governance & Civic Engagement", "Other",
]

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
  isPublic: boolean
  startsAt: string | null
  endsAt: string | null
  createdAt: string
  lastUpdated: string
  questions: Question[]
  _count?: { responses: number; questions: number }
}

type Tab = "overview" | "questions" | "analytics"

interface Toast {
  id: number
  type: "success" | "error"
  message: string
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string; icon: string; dot: string }> = {
  PUBLISHED: { bg: "bg-emerald-50", text: "text-emerald-600", label: "Live",     icon: "rss_feed",  dot: "bg-emerald-500" },
  DRAFT:     { bg: "bg-amber-50",   text: "text-amber-600",   label: "Draft",    icon: "edit_note", dot: "bg-amber-400"   },
  CLOSED:    { bg: "bg-gray-100",   text: "text-gray-500",    label: "Closed",   icon: "lock",      dot: "bg-gray-400"    },
  ARCHIVED:  { bg: "bg-red-50",     text: "text-red-400",     label: "Archived", icon: "archive",   dot: "bg-red-300"     },
}

export default function SurveyDetailPage({ params }: { params: Promise<{ surveyId: string }> }) {
  const { surveyId } = use(params)
  const router = useRouter()
  const mapRef = useRef<HTMLDivElement>(null)
  const toastIdRef = useRef(0)

  const [survey, setSurvey]         = useState<Survey | null>(null)
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [transitioning, setTransitioning] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmType, setConfirmType] = useState<"close" | "reopen" | "archive" | "delete" | null>(null)
  const [confirmInput, setConfirmInput] = useState("")
  const confirmCbRef = useRef<(() => void) | null>(null)
  const [activeTab, setActiveTab]   = useState<Tab>("overview")
  const [toasts, setToasts]         = useState<Toast[]>([])

  // Editable fields
  const [title, setTitle]             = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory]       = useState("")
  const [content, setContent]         = useState("")
  const [startsAt, setStartsAt]       = useState("")
  const [endsAt, setEndsAt]           = useState("")
  const [questions, setQuestions]     = useState<Question[]>([])
  const [isDirty, setIsDirty]         = useState(false)

  // ── Toast helpers ──────────────────────────────────────────────────────
  const showToast = useCallback((type: "success" | "error", message: string) => {
    const id = ++toastIdRef.current
    setToasts((prev) => [...prev, { id, type, message }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500)
  }, [])

  // ── Load survey ────────────────────────────────────────────────────────
  const loadSurvey = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/civic-partner/surveys/${surveyId}`, { credentials: "include" })
      if (res.ok) {
        const data = await res.json()
        const sv: Survey = data.survey
        setSurvey(sv)
        setTitle(sv.title)
        setDescription(sv.description)
        setCategory(sv.category)
        setContent(sv.content)
        setQuestions(sv.questions)
        if (sv.startsAt) setStartsAt(sv.startsAt.slice(0, 16))
        if (sv.endsAt)   setEndsAt(sv.endsAt.slice(0, 16))
        setIsDirty(false)
      }
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }, [surveyId])

  useEffect(() => { loadSurvey() }, [loadSurvey])

  // ── Google Maps heatmap ────────────────────────────────────────────────
  useEffect(() => {
    if (activeTab !== "analytics" || !mapRef.current) return
    const script = document.createElement("script")
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_API_KEY}&libraries=visualization`
    script.async = true; script.defer = true
    script.onload = () => {
      if (!mapRef.current) return
      const g = (globalThis as any).google
      if (!g || !g.maps) {
        console.warn('[Survey] google maps not available after script load')
        return
      }
      const map = new g.maps.Map(mapRef.current, {
        center: { lat: 19.076, lng: 72.8777 }, zoom: 12,
        styles: [
          { featureType: "all",   elementType: "labels.text.fill", stylers: [{ color: "#7c93a3" }] },
          { featureType: "water", elementType: "all",               stylers: [{ color: "#465FFF" }, { opacity: 0.1 }] },
        ],
        mapTypeControl: true,
        streetViewControl: true,
        rotateControl: true,
        zoomControl: true,
        fullscreenControl: true,
      })
      const pts = [
        new g.maps.LatLng(19.076, 72.878), new g.maps.LatLng(19.08, 72.88),
        new g.maps.LatLng(19.1,   72.85),  new g.maps.LatLng(19.05, 72.9),
      ]
      new g.maps.visualization.HeatmapLayer({ data: pts, map, radius: 40 })
    }
    document.head.appendChild(script)
    return () => { try { document.head.removeChild(script) } catch {} }
  }, [activeTab])

  // ── Save Draft ─────────────────────────────────────────────────────────
  const handleSaveDraft = async () => {
    if (!survey) return
    setSaving(true)
    try {
      const res = await fetch(`${API}/api/civic-partner/surveys/${surveyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title, description, category,
          content: content || description,
          questions: questions.map((q) => ({
            questionText: q.questionText,
            questionType: q.questionType,
            options: ["MCQ", "CHECKBOX"].includes(q.questionType) ? q.options.map(o => o.trim()).filter(Boolean) : [],
            isRequired: q.isRequired,
            order: q.order,
          })),
          startsAt: startsAt || undefined,
          endsAt:   endsAt   || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "Failed to save")
      showToast("success", "Draft saved successfully.")
      setIsDirty(false)
      setSurvey((prev) => prev ? { ...prev, title, description, category } : prev)
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Failed to save draft")
    } finally { setSaving(false) }
  }

  // ── Status transitions ─────────────────────────────────────────────────
  const callStatusEndpoint = async (endpoint: string, successMsg: string) => {
    setTransitioning(true)
    try {
      const res = await fetch(`${API}/api/civic-partner/surveys/${surveyId}/${endpoint}`, {
        method: "POST", credentials: "include",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "Action failed")
      showToast("success", successMsg)
      await loadSurvey()
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Action failed")
    } finally { setTransitioning(false) }
  }

  const openConfirm = (type: "close" | "reopen" | "archive" | "delete", cb: () => void) => {
    setConfirmType(type)
    confirmCbRef.current = cb
    setConfirmInput("")
    setShowConfirm(true)
  }

  const runConfirm = async () => {
    if (!confirmType) return
    if (confirmType === 'close') {
      if (confirmInput.trim() !== 'CLOSE') return
    }
    setShowConfirm(false)
    const cb = confirmCbRef.current
    confirmCbRef.current = null
    if (cb) cb()
  }

  // ── Question helpers ───────────────────────────────────────────────────
  const addQuestion = () => {
    setQuestions((q) => [...q, { questionText: "", questionType: "MCQ", options: [""], isRequired: true, order: q.length + 1 }])
    setIsDirty(true)
  }
  const updateQuestion = (idx: number, patch: Partial<Question>) => {
    setQuestions((prev) => prev.map((q, i) => i === idx ? { ...q, ...patch } : q))
    setIsDirty(true)
  }
  const removeQuestion = (idx: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== idx).map((q, i) => ({ ...q, order: i + 1 })))
    setIsDirty(true)
  }
  const addOption = (qIdx: number) => {
    setQuestions((prev) => prev.map((q, i) => i === qIdx ? { ...q, options: [...q.options, ""] } : q))
    setIsDirty(true)
  }
  const updateOption = (qIdx: number, oIdx: number, value: string) => {
    setQuestions((prev) => prev.map((q, i) => i === qIdx ? { ...q, options: q.options.map((o, j) => j === oIdx ? value : o) } : q))
    setIsDirty(true)
  }
  const removeOption = (qIdx: number, oIdx: number) => {
    setQuestions((prev) => prev.map((q, i) => i === qIdx ? { ...q, options: q.options.filter((_, j) => j !== oIdx) } : q))
    setIsDirty(true)
  }

  // ── Loading / not-found ────────────────────────────────────────────────
  if (loading) return (
    <CivicPartnerLayout>
      <div className="max-w-7xl mx-auto p-8 animate-pulse space-y-4">
        <div className="h-6 w-40 bg-gray-100 rounded" />
        <div className="h-10 w-96 bg-gray-100 rounded" />
        <div className="h-32 bg-white rounded-2xl border border-gray-100" />
      </div>
    </CivicPartnerLayout>
  )

  if (!survey) return (
    <CivicPartnerLayout>
      <div className="p-20 text-center">
        <p className="text-gray-400 font-medium">Survey not found or access denied.</p>
        <button onClick={() => router.push("/CivicPartner/surveys")} className="mt-4 text-[#465FFF] text-sm font-bold hover:underline">← Back to Campaigns</button>
      </div>
    </CivicPartnerLayout>
  )

  const sc         = STATUS_CONFIG[survey.status] ?? STATUS_CONFIG.DRAFT
  const isDraft    = survey.status === "DRAFT"
  const isPublished = survey.status === "PUBLISHED"
  const isClosed   = survey.status === "CLOSED"
  const isEditable = isDraft || isPublished

  return (
    <CivicPartnerLayout>
      {/* ── Toast stack ───────────────────────────────────────────────── */}
      <div className="fixed top-6 right-6 z-50 space-y-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0,   scale: 1    }}
              exit={{    opacity: 0, y: -8,   scale: 0.95 }}
              className={cn(
                "px-5 py-3.5 rounded-xl shadow-xl text-sm font-bold flex items-center gap-2",
                t.type === "success" ? "bg-white border border-emerald-200 text-emerald-700" : "bg-white border border-red-200 text-red-600"
              )}
            >
              <span className="material-symbols-outlined text-sm">
                {t.type === "success" ? "check_circle" : "error"}
              </span>
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="max-w-7xl mx-auto pb-20">
        {/* ── Page header ───────────────────────────────────────────── */}
        <div className="flex flex-col lg:flex-row justify-between items-start gap-6 mb-8">
          <div className="flex-1 min-w-0">
            <button onClick={() => router.push("/CivicPartner/surveys")} className="flex items-center gap-1 text-gray-400 hover:text-[#465FFF] text-xs font-bold mb-4 transition-colors">
              <span className="material-symbols-outlined text-sm">arrow_back</span> Back to Campaigns
            </button>
            <div className="flex items-center gap-3 mb-2">
              <div className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1.5", sc.bg, sc.text)}>
                <span className={cn("w-1.5 h-1.5 rounded-full", sc.dot)} />
                {sc.label}
              </div>
              <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">ID: {surveyId.slice(0, 8)}</span>
              {isDirty && isDraft && (
                <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest bg-amber-50 px-2 py-0.5 rounded-md">Unsaved changes</span>
              )}
            </div>
            <h1 className="text-4xl font-black text-black tracking-tight truncate">{survey.title}</h1>
          </div>

          {/* ── Action buttons ──────────────────────────────────────── */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {isEditable && (
              <>
                <button
                  onClick={handleSaveDraft}
                  disabled={saving || !isDirty}
                  className="h-11 px-6 bg-white border border-gray-200 rounded-xl text-xs font-black text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {saving ? "Saving…" : (isDraft ? "Save Draft" : "Save Changes")}
                </button>
                {isDraft && (
                  <button
                    onClick={() => callStatusEndpoint("publish", "Survey published and now live!")}
                    disabled={transitioning || questions.length === 0}
                    title={questions.length === 0 ? "Add at least one question before publishing" : undefined}
                    className="h-11 px-8 bg-[#465FFF] text-white rounded-xl text-xs font-black shadow-lg shadow-[#465FFF]/20 hover:bg-[#3451D1] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 uppercase tracking-tighter"
                  >
                    <span className="material-symbols-outlined text-sm">publish</span>
                    {transitioning ? "Publishing…" : "Publish Survey"}
                  </button>
                )}
                <button
                  onClick={() => router.push(`/CivicPartner/surveys/${surveyId}/edit`)}
                  className="h-11 px-4 bg-white border border-gray-200 rounded-xl text-xs font-black text-gray-600 hover:bg-gray-50 transition-all"
                  title="Open full editor"
                >
                  <span className="material-symbols-outlined text-sm">edit</span>
                </button>
              </>
            )}
            {isPublished && (
              <button
                onClick={() => openConfirm('close', () => callStatusEndpoint("close", "Survey closed. Responses are no longer accepted."))}
                disabled={transitioning}
                className="h-11 px-8 bg-white border border-gray-200 rounded-xl text-xs font-black text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all disabled:opacity-40 flex items-center gap-2 uppercase tracking-tighter"
              >
                <span className="material-symbols-outlined text-sm">lock</span>
                {transitioning ? "Closing…" : "Close Survey"}
              </button>
            )}
            {isClosed && (
              <button
                onClick={() => openConfirm('reopen', () => callStatusEndpoint("reopen", "Survey reopened and accepting responses again."))}
                disabled={transitioning}
                className="h-11 px-8 bg-[#465FFF] text-white rounded-xl text-xs font-black shadow-lg shadow-[#465FFF]/20 hover:bg-[#3451D1] transition-all disabled:opacity-40 flex items-center gap-2 uppercase tracking-tighter"
              >
                <span className="material-symbols-outlined text-sm">restart_alt</span>
                {transitioning ? "Reopening…" : "Reopen Survey"}
              </button>
            )}
            {/* Permanent Delete button */}
            <button
              onClick={() => openConfirm('delete', async () => {
                setTransitioning(true)
                try {
                  const res = await fetch(`${API}/api/civic-partner/surveys/${surveyId}/permanent`, {
                    method: 'DELETE',
                    credentials: 'include',
                  })
                  const data = await res.json()
                  if (!res.ok) throw new Error(data.message || 'Failed to delete')
                  showToast('success', 'Survey permanently deleted.')
                  router.push('/CivicPartner/surveys')
                } catch (err) {
                  showToast('error', err instanceof Error ? err.message : 'Failed to delete')
                } finally { setTransitioning(false) }
              })}
              disabled={transitioning}
              className="h-11 px-4 bg-white border border-gray-200 rounded-xl text-xs font-black text-rose-600 hover:bg-rose-50 transition-all disabled:opacity-40"
              title="Permanently delete this survey and all its data"
            >
              <span className="material-symbols-outlined text-sm">delete_forever</span>
            </button>
          </div>
        </div>

        {/* ── Tabs ──────────────────────────────────────────────────── */}
        <div className="flex gap-2 bg-white p-1.5 rounded-2xl border border-gray-200 w-fit mb-8 shadow-sm">
          {([
            { id: "overview",  label: "Overview",  icon: "dashboard" },
            { id: "questions", label: "Questions", icon: "quiz"      },
            { id: "analytics", label: "Heatmap",   icon: "map"       },
          ] as { id: Tab; label: string; icon: string }[]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
                activeTab === tab.id ? "bg-[#EEF1FF] text-[#465FFF] shadow-sm" : "text-gray-400 hover:text-gray-700"
              )}
            >
              <span className="material-symbols-outlined text-sm">{tab.icon}</span>
              {tab.label}
              {tab.id === "questions" && (
                <span className="ml-0.5 text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md font-black">
                  {questions.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Content grid ──────────────────────────────────────────── */}
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-12 lg:col-span-8">
            <AnimatePresence mode="wait">

              {/* ── Overview tab ──────────────────────────────────── */}
              {activeTab === "overview" && (
                <motion.div key="overview" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Campaign Title</label>
                    <input
                      className="w-full h-12 px-5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-black outline-none focus:ring-2 focus:ring-[#465FFF]/20 focus:border-[#465FFF] transition-all disabled:opacity-50"
                      value={title}
                      onChange={(e) => { setTitle(e.target.value); setIsDirty(true) }}
                      disabled={!isEditable}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Description</label>
                      <textarea
                      className="w-full p-5 bg-gray-50 border border-gray-200 rounded-xl font-medium text-black outline-none h-32 resize-none focus:ring-2 focus:ring-[#465FFF]/20 focus:border-[#465FFF] transition-all disabled:opacity-50"
                      value={description}
                      onChange={(e) => { setDescription(e.target.value); setIsDirty(true) }}
                      disabled={!isEditable}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Category</label>
                      <select
                        className="w-full h-12 px-5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-black outline-none focus:ring-2 focus:ring-[#465FFF]/20 focus:border-[#465FFF] transition-all disabled:opacity-50"
                        value={category}
                        onChange={(e) => { setCategory(e.target.value); setIsDirty(true) }}
                        disabled={!isEditable}
                      >
                        {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Target Department</label>
                      <input
                        className="w-full h-12 px-5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-black outline-none focus:ring-2 focus:ring-[#465FFF]/20 focus:border-[#465FFF] transition-all disabled:opacity-50"
                        value={content}
                        onChange={(e) => { setContent(e.target.value); setIsDirty(true) }}
                        disabled={!isEditable}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Start Date (Optional)</label>
                      <input
                        type="datetime-local"
                        className="w-full h-12 px-5 bg-gray-50 border border-gray-200 rounded-xl font-medium text-black outline-none focus:ring-2 focus:ring-[#465FFF]/20 focus:border-[#465FFF] transition-all disabled:opacity-50"
                        value={startsAt}
                        onChange={(e) => { setStartsAt(e.target.value); setIsDirty(true) }}
                        disabled={!isDraft}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">End Date (Optional)</label>
                      <input
                        type="datetime-local"
                        className="w-full h-12 px-5 bg-gray-50 border border-gray-200 rounded-xl font-medium text-black outline-none focus:ring-2 focus:ring-[#465FFF]/20 focus:border-[#465FFF] transition-all disabled:opacity-50"
                        value={endsAt}
                        onChange={(e) => { setEndsAt(e.target.value); setIsDirty(true) }}
                        disabled={!isDraft}
                      />
                    </div>
                  </div>
                  {!isDraft && (
                    <p className="text-xs text-gray-400 bg-gray-50 rounded-xl px-4 py-3 flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm">info</span>
                      Fields are read-only while the survey is {survey.status.toLowerCase()}. Close the survey to re-enter draft mode.
                    </p>
                  )}
                  {isDraft && isDirty && (
                    <button
                      onClick={handleSaveDraft}
                      disabled={saving}
                      className="w-full h-11 bg-[#465FFF] text-white rounded-xl text-xs font-black shadow-sm hover:bg-[#3451D1] transition-all disabled:opacity-50"
                    >
                      {saving ? "Saving…" : "Save Changes"}
                    </button>
                  )}
                </motion.div>
              )}

              {/* ── Questions tab ──────────────────────────────────── */}
              {activeTab === "questions" && (
                <motion.div key="questions" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      {questions.length} Question{questions.length !== 1 ? "s" : ""}
                    </p>
                    {isDraft && (
                      <button
                        onClick={addQuestion}
                        className="h-9 px-5 bg-[#465FFF] text-white rounded-xl text-xs font-black flex items-center gap-1.5 hover:bg-[#3451D1] transition-all shadow-md shadow-[#465FFF]/20"
                      >
                        <span className="material-symbols-outlined text-sm">add</span>
                        Add Question
                      </button>
                    )}
                  </div>

                  {questions.length === 0 && (
                    <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
                      <span className="material-symbols-outlined text-4xl text-gray-200 block mb-3">quiz</span>
                      <p className="text-sm font-bold text-gray-400">No questions yet.</p>
                      {isDraft && <p className="text-xs text-gray-300 mt-1">Click "Add Question" to get started.</p>}
                    </div>
                  )}

                  {questions.map((q, idx) => (
                    <div key={idx} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                      <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
                          <span className="h-8 w-8 bg-[#EEF1FF] text-[#465FFF] rounded-xl flex items-center justify-center font-black text-sm">{idx + 1}</span>
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-gray-50 text-gray-400">
                            {QUESTION_TYPE_LABELS[q.questionType]}
                          </span>
                          {q.isRequired && <span className="px-2 py-0.5 rounded-md text-[10px] font-black text-red-500 bg-red-50">Required</span>}
                        </div>
                        {isDraft && (
                          <button onClick={() => removeQuestion(idx)} className="h-8 w-8 rounded-xl text-gray-300 hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-all">
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        )}
                      </div>

                      <input
                        className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-black outline-none focus:ring-2 focus:ring-[#465FFF]/20 focus:border-[#465FFF] transition-all mb-4 disabled:opacity-50"
                        placeholder={`Question ${idx + 1} text…`}
                        value={q.questionText}
                        onChange={(e) => updateQuestion(idx, { questionText: e.target.value })}
                        disabled={!isDraft}
                      />

                      <div className="flex items-center gap-4 mb-4">
                        <select
                          className="h-9 px-4 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 outline-none focus:ring-2 focus:ring-[#465FFF]/20 disabled:opacity-50"
                          value={q.questionType}
                          disabled={!isDraft}
                          onChange={(e) =>
                            updateQuestion(idx, {
                              questionType: e.target.value as QuestionType,
                              options: ["MCQ", "CHECKBOX"].includes(e.target.value)
                                ? (q.options.length ? q.options : [""])
                                : [],
                            })
                          }
                        >
                          {Object.entries(QUESTION_TYPE_LABELS).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                          ))}
                        </select>
                        <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={q.isRequired}
                            disabled={!isDraft}
                            onChange={(e) => updateQuestion(idx, { isRequired: e.target.checked })}
                            className="w-4 h-4 rounded accent-[#465FFF]"
                          />
                          <span className="font-bold text-gray-600">Required</span>
                        </label>
                      </div>

                      {["MCQ", "CHECKBOX"].includes(q.questionType) && (
                        <div className="space-y-2 pl-2 border-l-2 border-[#EEF1FF]">
                          {q.options.map((opt, oIdx) => (
                            <div key={oIdx} className="flex items-center gap-2">
                              <span className={cn("w-4 h-4 flex-shrink-0 border-2 border-gray-200", q.questionType === "CHECKBOX" ? "rounded" : "rounded-full")} />
                              <input
                                className="flex-1 h-9 px-4 bg-gray-50 border border-gray-100 rounded-xl text-sm text-black outline-none focus:ring-1 focus:ring-[#465FFF]/20 disabled:opacity-50"
                                placeholder={`Option ${oIdx + 1}`}
                                value={opt}
                                onChange={(e) => updateOption(idx, oIdx, e.target.value)}
                                disabled={!isDraft}
                              />
                              {isDraft && q.options.length > 1 && (
                                <button onClick={() => removeOption(idx, oIdx)} className="text-gray-300 hover:text-red-400 transition-colors">
                                  <span className="material-symbols-outlined text-sm">close</span>
                                </button>
                              )}
                            </div>
                          ))}
                          {isDraft && (
                            <button onClick={() => addOption(idx)} className="text-xs font-bold text-[#465FFF] hover:underline flex items-center gap-1 mt-1">
                              <span className="material-symbols-outlined text-sm">add</span> Add option
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  {isDraft && isDirty && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl px-6 py-4 flex items-center justify-between">
                      <p className="text-xs font-bold text-amber-700 flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">pending</span>
                        Unsaved changes to your questions.
                      </p>
                      <button
                        onClick={handleSaveDraft}
                        disabled={saving}
                        className="h-9 px-5 bg-[#465FFF] text-white rounded-xl text-xs font-black hover:bg-[#3451D1] transition-all disabled:opacity-50"
                      >
                        {saving ? "Saving…" : "Save Draft"}
                      </button>
                    </div>
                  )}
                </motion.div>
              )}

              {/* ── Analytics tab ──────────────────────────────────── */}
              {activeTab === "analytics" && (
                <motion.div key="analytics" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                    <div className="p-8 border-b border-gray-50 flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-black text-black">Citizen Interaction Heatmap</h3>
                        <p className="text-xs text-emerald-500 font-black uppercase tracking-widest mt-1">Live -Google Maps API</p>
                      </div>
                      <div className="flex items-center gap-2 text-gray-300">
                        <span className="material-symbols-outlined text-sm">info</span>
                        <span className="text-[10px] font-bold">Regional clustering active</span>
                      </div>
                    </div>
                    <div ref={mapRef} className="h-[500px] w-full bg-slate-50" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Right sidebar ─────────────────────────────────────── */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Performance</h3>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Total Responses</p>
                    <p className="text-3xl font-black text-black mt-0.5">{(survey._count?.responses ?? 0).toLocaleString()}</p>
                  </div>
                  <div className="h-12 w-12 bg-[#EEF1FF] text-[#465FFF] rounded-xl flex items-center justify-center">
                    <span className="material-symbols-outlined">group</span>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-gray-50 pt-6">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Questions</p>
                    <p className="text-3xl font-black text-black mt-0.5">{questions.length}</p>
                  </div>
                  <div className="h-12 w-12 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center">
                    <span className="material-symbols-outlined">quiz</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-3">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Status Control</h3>
              <div className={cn("flex items-center gap-3 p-4 rounded-xl", sc.bg)}>
                <span className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", sc.dot)} />
                <div>
                  <p className={cn("text-xs font-black uppercase tracking-wide", sc.text)}>{sc.label}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {isDraft      && "Not yet visible to citizens."}
                    {isPublished  && "Visible and accepting responses."}
                    {isClosed     && "Closed -no new responses."}
                    {survey.status === "ARCHIVED" && "Archived and removed from all views."}
                  </p>
                </div>
              </div>
              {isDraft      && <p className="text-[10px] text-gray-400 leading-relaxed">Publish the survey to make it visible to citizens. You can close it at any time.</p>}
              {isPublished  && <p className="text-[10px] text-gray-400 leading-relaxed">Close the survey to stop accepting new responses. You can reopen it later.</p>}
              {isClosed     && <p className="text-[10px] text-gray-400 leading-relaxed">Reopen to resume accepting responses, or keep it closed to preserve the data snapshot.</p>}
            </div>

            {(survey.startsAt || survey.endsAt) && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Schedule</h3>
                {survey.startsAt && (
                  <div className="flex items-center justify-between text-xs mb-3">
                    <span className="text-gray-400 font-bold">Opens</span>
                    <span className="font-black text-black">{new Date(survey.startsAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                  </div>
                )}
                {survey.endsAt && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400 font-bold">Closes</span>
                    <span className="font-black text-black">{new Date(survey.endsAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Confirm Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4">
            <h3 className="text-lg font-bold mb-3">
              {confirmType === 'close' ? 'Confirm close survey' : confirmType === 'reopen' ? 'Confirm reopen' : confirmType === 'delete' ? 'Permanently delete survey' : 'Confirm archive'}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {confirmType === 'close'
                ? 'Type CLOSE to confirm you want to close this survey. Closing will stop accepting responses.'
                : confirmType === 'reopen'
                ? 'Are you sure you want to reopen this survey? Reopening will make it live again.'
                : confirmType === 'delete'
                ? 'Type DELETE to permanently remove this survey and all associated data. This action is irreversible.'
                : 'Are you sure you want to archive this survey? This will move it to the Archived list.'}
            </p>
            {(confirmType === 'close' || confirmType === 'delete') && (
              <input value={confirmInput} onChange={(e) => setConfirmInput(e.target.value)} placeholder={confirmType === 'delete' ? "Type DELETE to confirm" : "Type CLOSE to confirm"} className="w-full px-4 py-2 border rounded mb-4" />
            )}
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowConfirm(false)} className="px-4 py-2 rounded bg-gray-100">Cancel</button>
              <button
                onClick={runConfirm}
                disabled={confirmType === 'close' ? confirmInput.trim() !== 'CLOSE' : confirmType === 'delete' ? confirmInput.trim() !== 'DELETE' : false}
                className="px-4 py-2 rounded bg-emerald-600 text-white disabled:opacity-50"
              >Confirm</button>
            </div>
          </div>
        </div>
      )}
    </CivicPartnerLayout>
  )
}
