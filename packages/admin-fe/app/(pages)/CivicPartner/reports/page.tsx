"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { CivicPartnerLayout } from "../_layout"
import { useReportStream, PipelineStep } from "@/hooks/useReportStream"
import { cn } from "@/lib/utils"
import { Download, Share2, Sparkles, Globe, ChevronRight, AlertTriangle, CheckCircle, Loader2, Activity } from "lucide-react"
import { Folder, Trash2, Eye } from "lucide-react"

const SURVEY_API = process.env.NEXT_PUBLIC_SURVEY_REPORT || "http://localhost:8000"

/* ─── Category Definitions ─── */
interface CivicCategory {
  key: string
  label: string
  short: string
  icon: string
}

const CATEGORIES: CivicCategory[] = [
  { key: "Health", label: "Health", short: "Health", icon: "health_and_safety" },
  { key: "Water Supply & Sanitation", label: "Water Supply & Sanitation", short: "Water", icon: "water_drop" },
  { key: "Infrastructure", label: "Infrastructure", short: "Infra", icon: "foundation" },
  { key: "Education", label: "Education", short: "Education", icon: "school" },
  { key: "Electricity & Power", label: "Electricity & Power", short: "Energy", icon: "bolt" },
  { key: "Transportation", label: "Transportation", short: "Transport", icon: "directions_bus" },
  { key: "Municipal Services", label: "Municipal Services", short: "Municipal", icon: "recycling" },
  { key: "Police Services", label: "Police Services", short: "Safety", icon: "security" },
  { key: "Environment", label: "Environment", short: "Environ", icon: "eco" },
  { key: "Housing & Urban Development", label: "Housing & Urban Development", short: "Housing", icon: "apartment" },
  { key: "Social Welfare", label: "Social Welfare", short: "Welfare", icon: "diversity_3" },
  { key: "Public Grievances", label: "Public Grievances", short: "Grievance", icon: "report" },
  { key: "Revenue", label: "Revenue", short: "Revenue", icon: "payments" },
  { key: "Agriculture", label: "Agriculture", short: "Agri", icon: "agriculture" },
  { key: "Fire & Emergency", label: "Fire & Emergency", short: "Fire", icon: "local_fire_department" },
  { key: "Sports & Youth Affairs", label: "Sports & Youth Affairs", short: "Sports", icon: "sports" },
  { key: "Tourism & Culture", label: "Tourism & Culture", short: "Tourism", icon: "tour" },
]

/* ─── Health / Metrics types ─── */
interface HealthData {
  docs_in_pipeline?: string
  survey?: number
  backend?: number
  formatted?: string
  status?: string
}

/* ─── Report Tabs ─── */
type ReportTab = "fusion" | "backend" | "survey"

interface SavedReport {
  id: string
  title: string
  type: string
  category?: string
  createdAt: number
  report: Record<string, unknown>
}

/* ─── PDF Generation ─── */
async function downloadReportPDF(
  report: Record<string, unknown>,
  title: string,
) {
  // Dynamically generate a clean PDF from the report JSON
  const printWindow = window.open("", "_blank")
  if (!printWindow) return

  const htmlContent = buildPrintHTML(title, report)
  printWindow.document.write(htmlContent)
  printWindow.document.close()
  // Give it time to render, then print as PDF
  setTimeout(() => {
    printWindow.print()
  }, 600)
}

function buildPrintHTML(title: string, report: Record<string, unknown>): string {
  const renderValue = (val: unknown, depth: number = 0): string => {
    if (val === null || val === undefined) return '<span class="null">null</span>'
    if (typeof val === "boolean") return `<span class="bool">${val}</span>`
    if (typeof val === "number") return `<span class="num">${val}</span>`
    if (typeof val === "string") {
      if (val.length > 200) return `<p class="str">${escapeHtml(val)}</p>`
      return `<span class="str">"${escapeHtml(val)}"</span>`
    }
    if (Array.isArray(val)) {
      if (val.length === 0) return "<span>[]</span>"
      return `<ul class="arr">${val.map((v, i) => `<li><strong>${i + 1}.</strong> ${renderValue(v, depth + 1)}</li>`).join("")}</ul>`
    }
    if (typeof val === "object") {
      const entries = Object.entries(val as Record<string, unknown>)
      if (entries.length === 0) return "<span>{}</span>"
      return `<div class="obj" style="margin-left:${depth > 0 ? 16 : 0}px">${entries.map(([k, v]) => {
        const label = k.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
        return `<div class="field"><strong class="key">${escapeHtml(label)}:</strong> ${renderValue(v, depth + 1)}</div>`
      }).join("")}</div>`
    }
    return String(val)
  }

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${title}</title><style>
    body{font-family:system-ui,-apple-system,sans-serif;max-width:800px;margin:0 auto;padding:40px 24px;color:#1e293b;font-size:13px;line-height:1.6}
    h1{font-size:22px;margin-bottom:4px;color:#1e3a8a} h2{font-size:14px;color:#64748b;font-weight:500;margin-bottom:24px}
    .field{margin:8px 0;padding:4px 0;border-bottom:1px solid #f1f5f9} .key{color:#1e40af;font-size:12px;text-transform:uppercase;letter-spacing:0.5px}
    .str{color:#334155} .num{color:#c2410c;font-weight:600} .bool{color:#059669;font-weight:600} .null{color:#94a3b8;font-style:italic}
    .arr{padding-left:20px;margin:4px 0} .arr li{margin:4px 0} .obj{margin:4px 0}
    @media print{body{padding:20px}}
  </style></head><body><h1>${escapeHtml(title)}</h1><h2>Generated on ${new Date().toLocaleString()}</h2><hr/>${renderValue(report)}</body></html>`
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

/* ═══════════════════════════════════════════════════════════ */
/*                    REPORT PAGE                             */
/* ═══════════════════════════════════════════════════════════ */

export default function CivicPartnerReportsPage() {
  const stream = useReportStream()
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<ReportTab>("fusion")
  const [health, setHealth] = useState<HealthData | null>(null)
  const [healthLoading, setHealthLoading] = useState(true)
  const [serviceHealth, setServiceHealth] = useState<{ status?: string } | null>(null)
  const [metricsLoading, setMetricsLoading] = useState(false)
  const [mode, setMode] = useState<"survey" | "analyze">("survey")
  const consoleRef = useRef<HTMLDivElement>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [historyReports, setHistoryReports] = useState<SavedReport[]>([])
  const lastSavedRef = useRef<Record<string, string>>({})

  // Auto-scroll console
  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight
    }
  }, [stream.logLines, stream.surveyTokens, stream.backendTokens, stream.fusionTokens, stream.analyzeTokens])

  // LocalStorage helpers
  const STORAGE_KEY = "swaraj_reports_v1"

  const loadSavedReports = useCallback((): SavedReport[] => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return []
      return JSON.parse(raw) as SavedReport[]
    } catch {
      return []
    }
  }, [])

  const persistSavedReports = useCallback((arr: SavedReport[]) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)) } catch { }
    setHistoryReports(arr)
  }, [])

  const saveReportToLocal = useCallback((r: Record<string, unknown> | null, meta: { title: string, type: string, category?: string }) => {
    if (!r) return
    try {
      const payload = JSON.stringify(r)
      // avoid saving duplicates by content
      const last = lastSavedRef.current[meta.type + (meta.category||"")]
      if (last === payload) return
      lastSavedRef.current[meta.type + (meta.category||"")] = payload

      const all = loadSavedReports()
      const item: SavedReport = {
        id: String(Date.now()),
        title: meta.title,
        type: meta.type,
        category: meta.category,
        createdAt: Date.now(),
        report: r,
      }
      const next = [item, ...all].slice(0, 200)
      persistSavedReports(next)
    } catch (e) { /* ignore */ }
  }, [loadSavedReports, persistSavedReports])

  // load history on mount
  useEffect(() => { setHistoryReports(loadSavedReports()) }, [loadSavedReports])

  // Fetch metrics and health on mount (and allow manual refresh)
  const fetchAllMetrics = useCallback(async () => {
    setMetricsLoading(true)
    try {
      try {
        const res = await fetch(`${SURVEY_API}/metrics`)
        if (res.ok) {
          const data = await res.json()
          setHealth(data)
        }
      } catch {
        // ignore
      }

      try {
        const res2 = await fetch(`${SURVEY_API}/health`)
        if (res2.ok) {
          const data2 = await res2.json()
          setServiceHealth(data2)
        }
      } catch {
        // ignore
      }
    } finally {
      setHealthLoading(false)
      setMetricsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAllMetrics()
  }, [fetchAllMetrics])

  // Persist completed reports when they become available
  useEffect(() => {
    // Fusion report (final)
    if (stream.fusionReport) {
      saveReportToLocal(stream.fusionReport, { title: `${selectedCategory || "Civic"} -Fusion Report`, type: "fusion", category: selectedCategory || undefined })
      setHistoryReports(loadSavedReports())
    }
    // Analyze report (global)
    if (stream.analyzeReport) {
      saveReportToLocal(stream.analyzeReport, { title: `Global Analysis Report`, type: "analyze" })
      setHistoryReports(loadSavedReports())
    }
  }, [stream.fusionReport, stream.analyzeReport, saveReportToLocal, loadSavedReports, selectedCategory])

  const handleGenerateSurvey = useCallback(() => {
    if (!selectedCategory) return
    setMode("survey")
    setActiveTab("fusion")
    stream.generateSurveyReport(selectedCategory)
  }, [selectedCategory, stream])

  const handleGlobalAnalysis = useCallback(() => {
    setMode("analyze")
    stream.generateAnalyzeReport()
  }, [stream])

  // Current active report for the tab
  const currentReport = activeTab === "fusion" ? stream.fusionReport
    : activeTab === "backend" ? stream.backendReport
    : stream.surveyReport

  const currentTokens = activeTab === "fusion" ? stream.fusionTokens
    : activeTab === "backend" ? stream.backendTokens
    : stream.surveyTokens

  // For analyze mode, use analyzeReport
  const displayReport = mode === "analyze" ? stream.analyzeReport : currentReport
  const displayTokens = mode === "analyze" ? stream.analyzeTokens : currentTokens

  const totalDocs = health
    ? (health.survey || 0) + (health.backend || 0)
    : 0

  return (
    <CivicPartnerLayout>
      <div className="max-w-[1400px] mx-auto space-y-8 pb-20">

        {/* ═══ Hero Section: Control Center ═══ */}
        <section>
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
              <div>
                <h2 className="text-3xl font-black text-black tracking-tight">
                  Civic Intelligence Hub
                </h2>
                <p className="text-sm text-gray-400 font-medium max-w-xl mt-1">
                  Architect deep civic reports by selecting a domain. Gemini AI synthesizes multi-source data into actionable governance insights.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleGlobalAnalysis}
                  disabled={stream.isStreaming}
                  className="h-11 px-6 bg-slate-50 text-[#465FFF] font-bold rounded-xl text-xs border border-[#465FFF]/20 hover:bg-[#465FFF]/5 transition-all tracking-tight disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Globe className="inline-block w-4 h-4 mr-1.5 -mt-0.5" />
                  Global Analysis
                </button>
                <button
                  onClick={handleGenerateSurvey}
                  disabled={!selectedCategory || stream.isStreaming}
                  className="h-11 px-8 bg-[#465FFF] text-white rounded-xl text-xs font-black shadow-lg shadow-[#465FFF]/20 hover:bg-[#3451D1] transition-all flex items-center gap-2 uppercase tracking-tighter disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {stream.isStreaming ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  {stream.isStreaming ? "Generating..." : "Generate AI Report"}
                </button>
                <button
                  onClick={() => setShowHistory(true)}
                  className="h-11 px-4 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold shadow-sm hover:bg-slate-50 flex items-center gap-2"
                  title="Report History"
                >
                  <Folder className="w-4 h-4" /> History
                </button>
              </div>
            </div>

            {/* Category Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-9 gap-3">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => setSelectedCategory(cat.key)}
                  className={cn(
                    "flex flex-col items-center justify-center p-4 rounded-xl border transition-all group",
                    selectedCategory === cat.key
                      ? "border-[#465FFF] bg-[#465FFF]/5 text-[#465FFF]"
                      : "border-slate-200 bg-white hover:border-[#465FFF] hover:text-[#465FFF] text-slate-500"
                  )}
                >
                  <span
                    className={cn(
                      "material-symbols-outlined mb-2 text-xl",
                      selectedCategory === cat.key ? "text-[#465FFF]" : "text-slate-400 group-hover:text-[#465FFF]"
                    )}
                  >
                    {cat.icon}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider">{cat.short}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ Bento Grid: Pipeline + Analytics ═══ */}
        <div className="grid grid-cols-12 gap-6">

          {/* ── Interactive RAG Pipeline Visualization ── */}
          <div className="col-span-12 lg:col-span-8 bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-black text-black flex items-center gap-2">
                  <span className={cn(
                    "w-2 h-2 rounded-full",
                    stream.isStreaming ? "bg-emerald-500 animate-pulse" : stream.error ? "bg-red-500 animate-pulse" : stream.pipelineMetadata ? "bg-emerald-500" : "bg-slate-300"
                  )} />
                  Active RAG Pipeline
                </h3>
              {stream.isStreaming && (
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Processing...
                </span>
              )}
            </div>

            {/* Steps */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 relative">
              {/* Progress line */}
              <div className="absolute top-1/2 left-0 w-full h-[2px] bg-slate-100 hidden md:block -translate-y-1/2 z-0" />

              {(stream.steps.length > 0 ? stream.steps : [
                { id: "retrieval", label: "Retrieval", detail: "MMR Strategy", status: "pending" as const },
                { id: "deduplication", label: "Deduplication", detail: "Semantic Hash", status: "pending" as const },
                { id: "reranking", label: "Reranking", detail: "Cross-Encoder", status: "pending" as const },
                { id: "synthesis", label: "Synthesis", detail: "Gemini Pro", status: "pending" as const },
              ]).map((step) => (
                <PipelineStepNode key={step.id} step={step} />
              ))}
            </div>

            {/* Live Stream Console */}
            <div
              ref={consoleRef}
              className="mt-10 bg-slate-900 rounded-xl p-4 font-mono text-[12px] text-emerald-400/80 h-36 overflow-y-auto border border-slate-800"
            >
              {/* Logs */}
              {stream.logLines.length > 0 ? (
                stream.logLines.map((line, i) => (
                  <p key={`log-${i}`} className="mb-1">
                    <span className="text-slate-500">{line.substring(0, 10)}</span>
                    {line.substring(10)}
                  </p>
                ))
              ) : (
                <p className="text-slate-500">Waiting for pipeline execution...</p>
              )}

              {/* Streaming content preview (full token streams) */}
              {(stream.surveyTokens || stream.backendTokens || stream.fusionTokens || stream.analyzeTokens) && (
                <div className="mt-2 text-left text-[11px] text-emerald-300">
                  {stream.surveyTokens && (
                    <div className="mb-1">
                      <div className="text-xs text-slate-400">[survey stream]</div>
                      <div className="whitespace-pre-wrap break-words">{stream.surveyTokens.slice(-2000)}</div>
                    </div>
                  )}
                  {stream.backendTokens && (
                    <div className="mb-1">
                      <div className="text-xs text-slate-400">[backend stream]</div>
                      <div className="whitespace-pre-wrap break-words">{stream.backendTokens.slice(-2000)}</div>
                    </div>
                  )}
                  {stream.fusionTokens && (
                    <div className="mb-1">
                      <div className="text-xs text-slate-400">[fusion stream]</div>
                      <div className="whitespace-pre-wrap break-words">{stream.fusionTokens.slice(-2000)}</div>
                    </div>
                  )}
                  {stream.analyzeTokens && (
                    <div className="mb-1">
                      <div className="text-xs text-slate-400">[analyze stream]</div>
                      <div className="whitespace-pre-wrap break-words">{stream.analyzeTokens.slice(-2000)}</div>
                    </div>
                  )}
                </div>
              )}

              {stream.isStreaming && <p className="animate-pulse text-white">_</p>}
            </div>
          </div>

          {/* ── Analytics Cards ── */}
          <div className="col-span-12 lg:col-span-4 space-y-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Pipeline Status</p>
                <h4 className="text-2xl font-black text-black">
                  {healthLoading ? "..." : serviceHealth?.status === "healthy" ? (
                    <span className="flex items-center gap-2">
                      Live <span className="text-xs text-emerald-500 font-medium">● Healthy</span>
                    </span>
                  ) : (
                    <span className="text-red-500">Offline</span>
                  )}
                </h4>
              </div>
              <Activity className="w-8 h-8 text-[#465FFF]/20" />
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Docs in Vector Store</p>
                    <h4 className="text-2xl font-black text-black">
                      {healthLoading ? "..." : totalDocs > 0 ? totalDocs.toLocaleString() : "N/A"}
                    </h4>
                    {health && (
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {health.formatted ? health.formatted : `Survey: ${(health.survey || 0).toLocaleString()} · Backend: ${(health.backend || 0).toLocaleString()}`}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={() => fetchAllMetrics()}
                  disabled={metricsLoading}
                  title="Refresh metrics"
                  className="p-2 rounded-lg hover:bg-slate-50 transition-colors text-slate-500 disabled:opacity-40"
                >
                  {metricsLoading ? (
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.2"/><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/></svg>
                  ) : (
                    <span className="material-symbols-outlined">refresh</span>
                  )}
                </button>
                <span className="material-symbols-outlined text-[#465FFF]/20 text-4xl">description</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Pipeline Time</p>
                <h4 className="text-2xl font-black text-black">
                  {stream.pipelineMetadata?.total_time_seconds
                    ? `${(stream.pipelineMetadata.total_time_seconds as number).toFixed(1)}s`
                    : "—"}
                </h4>
                {stream.pipelineMetadata && mode === "survey" && (
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    P1+P2: {((stream.pipelineMetadata.phase_1_2_time_seconds as number) || 0).toFixed(1)}s ·
                    P3: {((stream.pipelineMetadata.phase_3_time_seconds as number) || 0).toFixed(1)}s
                  </p>
                )}
              </div>
              <span className="material-symbols-outlined text-[#465FFF]/20 text-4xl">timer</span>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">AI Model</p>
                <h4 className="text-lg font-black text-black">Gemini 2.5 Pro</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">gemini-embedding-001</p>
              </div>
              <span className="material-symbols-outlined text-[#465FFF]/20 text-4xl">model_training</span>
            </div>
          </div>
        </div>

        {/* ═══ Report Result Area ═══ */}
        <section className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
          {/* Tab Header */}
          <div className="bg-slate-50/60 px-6 py-4 flex items-center justify-between border-b border-slate-100">
            {mode === "survey" ? (
              <div className="flex gap-8">
                {(["fusion", "backend", "survey"] as ReportTab[]).map((tab) => {
                  const labels: Record<ReportTab, string> = {
                    fusion: "Fusion Report",
                    backend: "Backend Analytics",
                    survey: "Survey Analysis",
                  }
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={cn(
                        "text-sm pb-4 -mb-4 font-medium transition-all",
                        activeTab === tab
                          ? "text-[#465FFF] font-bold border-b-2 border-[#465FFF]"
                          : "text-slate-400 hover:text-black"
                      )}
                    >
                      {labels[tab]}
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="flex gap-8">
                <button className="text-[#465FFF] font-bold text-sm border-b-2 border-[#465FFF] pb-4 -mb-4">
                  Global Analysis Report
                </button>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (displayReport) {
                    const title = mode === "analyze"
                      ? "Global Analysis Report"
                      : `${selectedCategory || "Civic"} -${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Report`
                    downloadReportPDF(displayReport, title)
                  }
                }}
                disabled={!displayReport}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Download as PDF"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  if (displayReport) {
                    navigator.clipboard.writeText(JSON.stringify(displayReport, null, 2))
                  }
                }}
                disabled={!displayReport}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Copy JSON to clipboard"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Report Content */}
          <div className="p-8">
            {!displayReport && !stream.isStreaming && !displayTokens ? (
              /* Empty State */
              <div className="text-center py-20">
                <span className="material-symbols-outlined text-6xl text-slate-200 mb-4">analytics</span>
                <h3 className="text-xl font-black text-slate-300 mb-2">No Report Generated Yet</h3>
                <p className="text-sm text-slate-400 max-w-md mx-auto">
                  Select a civic category above and click &quot;Generate AI Report&quot;, or run a &quot;Global Analysis&quot; to see comprehensive insights.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-12 gap-8">
                {/* ── Data Grid Analysis ── */}
                <div className="col-span-12 lg:col-span-7 space-y-6">
                  <ReportContent
                    report={displayReport}
                    tokens={displayTokens}
                    isStreaming={stream.isStreaming}
                    category={mode === "analyze" ? "All Categories" : selectedCategory || ""}
                    mode={mode}
                    activeTab={activeTab}
                  />
                </div>

                {/* ── JSON Preview / Metadata ── */}
                <div className="col-span-12 lg:col-span-5 bg-slate-50 p-6 rounded-2xl relative overflow-hidden">
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="material-symbols-outlined text-[#465FFF]">data_object</span>
                      <h4 className="text-sm font-black uppercase tracking-widest text-black">Raw JSON Output</h4>
                    </div>
                    <div className="bg-slate-900 rounded-xl p-4 font-mono text-[11px] text-blue-300 max-h-[400px] overflow-y-auto">
                      {displayReport ? (
                        <pre className="whitespace-pre-wrap break-words">
                          {JSON.stringify(displayReport, null, 2).substring(0, 3000)}
                          {JSON.stringify(displayReport, null, 2).length > 3000 && "\n...truncated"}
                        </pre>
                      ) : displayTokens ? (
                        <pre className="whitespace-pre-wrap break-words text-emerald-400/80">
                          {displayTokens}
                          {stream.isStreaming && <span className="animate-pulse text-white">▋</span>}
                        </pre>
                      ) : (
                        <p className="text-slate-500">Waiting for data...</p>
                      )}
                    </div>

                    {/* Pipeline Metadata */}
                    {stream.pipelineMetadata && (
                      <div className="mt-6 space-y-3">
                        <div className="flex justify-between text-[11px] font-bold uppercase tracking-wide text-black">
                          <span>Generation Progress</span>
                          <span>{stream.isStreaming ? "In Progress" : "100%"}</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#465FFF] rounded-full transition-all duration-500"
                            style={{ width: stream.isStreaming ? "60%" : "100%" }}
                          />
                        </div>
                      </div>
                    )}
                    {!stream.pipelineMetadata && stream.isStreaming && (
                      <div className="mt-6 space-y-3">
                        <div className="flex justify-between text-[11px] font-bold uppercase tracking-wide text-black">
                          <span>Generation Progress</span>
                          <span>In Progress</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-[#465FFF] rounded-full animate-pulse" style={{ width: "40%" }} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Error Banner */}
        {stream.error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex items-start gap-4">
            <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
            <div>
              <h4 className="text-sm font-black text-red-700">Pipeline Error</h4>
              <p className="text-sm text-red-600 mt-1">{stream.error}</p>
              <p className="text-xs text-red-400 mt-2">Ensure the AI server is running at {SURVEY_API}</p>
            </div>
          </div>
        )}

        {/* History Modal */}
        {showHistory && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowHistory(false)} />
            <div className="relative bg-white w-full max-w-4xl mx-4 rounded-2xl shadow-2xl p-6 z-10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-black">Saved Reports</h3>
                <div className="flex items-center gap-2">
                  <button onClick={() => { setHistoryReports(loadSavedReports()); }} className="px-3 py-1 rounded bg-slate-50">Refresh</button>
                  <button onClick={() => setShowHistory(false)} className="px-3 py-1 rounded bg-slate-50">Close</button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto">
                {historyReports.length === 0 ? (
                  <div className="p-6 text-center text-slate-400">No saved reports yet.</div>
                ) : historyReports.map((h) => (
                  <div key={h.id} className="p-4 rounded-xl border shadow-sm bg-slate-50">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-bold">{h.title}</div>
                        <div className="text-xs text-slate-500">{h.type.toUpperCase()} · {h.category || "All"}</div>
                        <div className="text-xs text-slate-400 mt-2">{new Date(h.createdAt).toLocaleString()}</div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { setShowHistory(false); /* load into viewer */ setTimeout(() => { if (h.type === 'analyze') { setMode('analyze'); stream.cancel(); } else { setMode('survey'); setActiveTab(h.type as ReportTab); } }, 50); setTimeout(() => { /* set display using state: directly put into stream replacement area */ stream.cancel(); /* temporarily set display via local state by setting history report as displayReport via download flow */ }, 100); }} className="p-2 rounded bg-white border"> <Eye className="w-4 h-4"/> </button>
                        <button onClick={() => downloadReportPDF(h.report, h.title)} className="p-2 rounded bg-white border"> <Download className="w-4 h-4"/> </button>
                        <button onClick={() => { const next = loadSavedReports().filter(x => x.id !== h.id); persistSavedReports(next); }} className="p-2 rounded bg-white border text-red-500"> <Trash2 className="w-4 h-4"/> </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </CivicPartnerLayout>
  )
}

/* ═══════════════════════════════════════════════════════ */
/*              PIPELINE STEP NODE                        */
/* ═══════════════════════════════════════════════════════ */

function PipelineStepNode({ step }: { step: PipelineStep }) {
  return (
    <div className="z-10 flex flex-col items-center text-center">
      <div
        className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center mb-3 transition-all",
          step.status === "done" && "bg-[#465FFF] text-white shadow-lg shadow-[#465FFF]/20",
          step.status === "active" && "w-12 h-12 bg-white border-2 border-[#465FFF] text-[#465FFF] shadow-xl relative",
          step.status === "pending" && "bg-slate-100 text-slate-400"
        )}
      >
        {step.status === "done" && <CheckCircle className="w-4 h-4" />}
        {step.status === "active" && (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <div className="absolute inset-0 rounded-full border-4 border-[#465FFF]/20 animate-ping" />
          </>
        )}
        {step.status === "pending" && <span className="material-symbols-outlined text-sm">radio_button_unchecked</span>}
      </div>
      <span
        className={cn(
          "text-[10px] font-bold uppercase tracking-wider",
          step.status === "active" ? "text-[#465FFF]" : step.status === "done" ? "text-black" : "text-slate-400"
        )}
      >
        {step.label}
      </span>
      <p
        className={cn(
          "text-[10px]",
          step.status === "active" ? "text-[#465FFF]/70" : "text-slate-400"
        )}
      >
        {step.detail}
      </p>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════ */
/*              REPORT CONTENT RENDERER                   */
/* ═══════════════════════════════════════════════════════ */

interface ReportContentProps {
  report: Record<string, unknown> | null
  tokens: string
  isStreaming: boolean
  category: string
  mode: "survey" | "analyze"
  activeTab: ReportTab
}

function ReportContent({ report, tokens, isStreaming, category, mode, activeTab }: ReportContentProps) {
  if (!report && isStreaming) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-[#465FFF]" />
          <h2 className="text-2xl font-black text-black">Generating Report...</h2>
        </div>
        <p className="text-slate-500 leading-relaxed">
          The AI is analyzing data and synthesizing insights. Streaming tokens will appear in real-time on the right panel.
        </p>
        {/* Skeleton cards */}
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-slate-50 p-4 rounded-xl border-l-4 border-slate-200 animate-pulse">
            <div className="h-3 bg-slate-200 rounded w-1/4 mb-3" />
            <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
            <div className="h-3 bg-slate-200 rounded w-1/2" />
          </div>
        ))}
      </div>
    )
  }

  if (!report) return null

  // Extract meaningful fields from the report for structured display
  const reportType = (report.report_type as string) || activeTab
  const executiveSummary = (report.executive_summary as string) || (report.comprehensive_overview as string) || ""
  const severity = extractSeverity(report)
  const observations = extractObservations(report)
  const recommendations = extractRecommendations(report)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-black">
          {category} {mode === "analyze" ? "Global" : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Report
        </h2>
        {severity && (
          <span
            className={cn(
              "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter",
              severity === "high" || severity === "critical"
                ? "bg-red-50 text-red-600"
                : severity === "medium"
                  ? "bg-amber-50 text-amber-600"
                  : "bg-emerald-50 text-emerald-600"
            )}
          >
            Severity: {severity}
          </span>
        )}
      </div>

      {executiveSummary && (
        <p className="text-slate-600 leading-relaxed text-sm">{executiveSummary}</p>
      )}

      {/* Observations */}
      {observations.length > 0 && (
        <div className="space-y-4">
          {observations.map((obs, i) => (
            <div key={i} className="bg-slate-50 p-4 rounded-xl border-l-4 border-[#465FFF]">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-bold text-[#465FFF] uppercase">
                  {obs.label || `Finding #${String(i + 1).padStart(2, "0")}`}
                </span>
                {obs.confidence && (
                  <span className="text-[10px] text-slate-400">CONFIDENCE: {obs.confidence}</span>
                )}
              </div>
              <p className="text-sm font-semibold text-black mb-1">{obs.title}</p>
              {obs.detail && <p className="text-xs text-slate-500">{obs.detail}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-black text-black uppercase tracking-wider flex items-center gap-2">
            <ChevronRight className="w-4 h-4 text-[#465FFF]" />
            Strategic Recommendations
          </h3>
          {recommendations.map((rec, i) => (
            <div key={i} className="bg-slate-50 p-4 rounded-xl border-l-4 border-emerald-500">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-bold text-emerald-600 uppercase">
                  Recommendation #{String(i + 1).padStart(2, "0")}
                </span>
                {rec.impact && (
                  <span className="text-[10px] text-slate-400">EST. IMPACT: {rec.impact}</span>
                )}
              </div>
              <p className="text-sm font-semibold text-black mb-1">{rec.title}</p>
              {rec.detail && <p className="text-xs text-slate-500">{rec.detail}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Fallback: render top-level string/number fields */}
      {observations.length === 0 && recommendations.length === 0 && (
        <div className="space-y-4">
          {Object.entries(report).map(([key, value]) => {
            if (key === "report_type" || key === "executive_summary" || key === "comprehensive_overview") return null
            if (typeof value === "string" && value.length > 0) {
              return (
                <div key={key} className="bg-slate-50 p-4 rounded-xl border-l-4 border-[#465FFF]">
                  <span className="text-[10px] font-bold text-[#465FFF] uppercase">
                    {key.replace(/_/g, " ")}
                  </span>
                  <p className="text-sm text-slate-700 mt-1">{value}</p>
                </div>
              )
            }
            if (typeof value === "number") {
              return (
                <div key={key} className="bg-slate-50 p-4 rounded-xl border-l-4 border-[#465FFF]">
                  <span className="text-[10px] font-bold text-[#465FFF] uppercase">
                    {key.replace(/_/g, " ")}
                  </span>
                  <p className="text-lg font-black text-black mt-1">{value}</p>
                </div>
              )
            }
            if (Array.isArray(value) && value.length > 0) {
              return (
                <div key={key} className="space-y-3">
                  <h3 className="text-sm font-black text-black uppercase tracking-wider flex items-center gap-2">
                    <ChevronRight className="w-4 h-4 text-[#465FFF]" />
                    {key.replace(/_/g, " ")}
                  </h3>
                  {value.slice(0, 8).map((item, idx) => (
                    <div key={idx} className="bg-slate-50 p-4 rounded-xl border-l-4 border-slate-300">
                      {typeof item === "string" ? (
                        <p className="text-sm text-slate-700">{item}</p>
                      ) : typeof item === "object" && item !== null ? (
                        <div className="space-y-1">
                          {Object.entries(item as Record<string, unknown>).map(([k, v]) => (
                            <div key={k}>
                              <span className="text-[10px] font-bold text-slate-500 uppercase">{k.replace(/_/g, " ")}: </span>
                              <span className="text-sm text-slate-700">{typeof v === "string" ? v : JSON.stringify(v)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-700">{JSON.stringify(item)}</p>
                      )}
                    </div>
                  ))}
                  {value.length > 8 && (
                    <p className="text-xs text-slate-400 pl-4">...and {value.length - 8} more items</p>
                  )}
                </div>
              )
            }
            return null
          })}
        </div>
      )}
    </div>
  )
}

/* ─── Helper extractors ─── */
interface Observation {
  label?: string
  title: string
  detail?: string
  confidence?: string
}

interface Recommendation {
  title: string
  detail?: string
  impact?: string
}

function extractSeverity(report: Record<string, unknown>): string | null {
  // Walk top-level looking for severity-related keys
  for (const key of Object.keys(report)) {
    if (key.toLowerCase().includes("severity") || key.toLowerCase().includes("priority")) {
      const val = report[key]
      if (typeof val === "string") return val.toLowerCase()
    }
  }
  return null
}

function extractObservations(report: Record<string, unknown>): Observation[] {
  const results: Observation[] = []
  const arrKeys = ["systemic_issues", "key_findings", "findings", "observations", "issues", "categorical_breakdown", "root_cause_analysis"]

  for (const key of arrKeys) {
    const arr = report[key]
    if (Array.isArray(arr)) {
      for (const item of arr.slice(0, 5)) {
        if (typeof item === "string") {
          results.push({ title: item, label: key.replace(/_/g, " ") })
        } else if (typeof item === "object" && item !== null) {
          const obj = item as Record<string, unknown>
          const title = (obj.title || obj.issue || obj.finding || obj.name || obj.category || obj.description || JSON.stringify(obj)) as string
          const detail = (obj.description || obj.detail || obj.details || obj.explanation || obj.impact || "") as string
          const confidence = (obj.confidence || obj.match_confidence || "") as string
          results.push({
            title: typeof title === "string" ? title : JSON.stringify(title),
            detail: typeof detail === "string" ? detail : "",
            label: key.replace(/_/g, " "),
            confidence: confidence ? String(confidence) : undefined,
          })
        }
      }
      break // Only use the first matching key
    }
  }
  return results
}

function extractRecommendations(report: Record<string, unknown>): Recommendation[] {
  const results: Recommendation[] = []
  const arrKeys = ["strategic_recommendations", "recommendations", "action_items", "suggested_actions"]

  for (const key of arrKeys) {
    const arr = report[key]
    if (Array.isArray(arr)) {
      for (const item of arr.slice(0, 5)) {
        if (typeof item === "string") {
          results.push({ title: item })
        } else if (typeof item === "object" && item !== null) {
          const obj = item as Record<string, unknown>
          const title = (obj.title || obj.recommendation || obj.action || obj.name || JSON.stringify(obj)) as string
          const detail = (obj.description || obj.detail || obj.details || obj.rationale || "") as string
          const impact = (obj.impact || obj.priority || obj.estimated_impact || "") as string
          results.push({
            title: typeof title === "string" ? title : JSON.stringify(title),
            detail: typeof detail === "string" ? detail : "",
            impact: impact ? String(impact).toUpperCase() : undefined,
          })
        }
      }
      break
    }
  }
  return results
}
