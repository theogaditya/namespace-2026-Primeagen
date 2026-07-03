"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import ActionSuggestionsPanel from "@/components/ActionSuggestionsPanel"

// ── Types ──────────────────────────────────────────────────────────────────

interface ReportStats {
  total: number
  resolved: number
  resolutionRate: number
  avgResolutionDays: number
  slaBreachCount: number
  avgQualityScore: number
  escalatedToState: number
  escalatedToSuperState: number
  duplicateCount: number
  abuseCount: number
  byStatus: Record<string, number>
  byUrgency: Record<string, number>
  byCategory: Record<string, number>
  byDepartment: Record<string, number>
  byDistrict: Record<string, number>
  topDistrictsByVolume: { district: string; count: number }[]
  topCategoryByVolume: string
  mostUrgentDistrict: string
  topSubCategories: { name: string; count: number }[]
  mostUpvotedComplaints: { id: string; seq: number; description: string; upvotes: number; category: string }[]
  monthlyVolume: { month: string; count: number }[]
  qualityDistribution: Record<string, number>
}

interface ComplaintReport {
  executive_summary: string
  comprehensive_overview: string
  systemic_issues: Array<{
    issue_name: string
    description: string
    severity: string
    affected_categories: string[]
    affected_districts?: string[]
  }>
  district_analysis: Array<{
    district: string
    complaint_count: number
    resolution_rate: number
    primary_issues: string[]
    recommendation: string
  }>
  category_insights: Array<{
    category: string
    count: number
    trend: string
    notable_pattern: string
  }>
  resolution_performance: {
    overall_rate: number
    avg_resolution_days: number
    sla_breach_count: number
    bottlenecks: string[]
  }
  quality_assessment: string
  escalation_patterns: string
  strategic_recommendations: Array<{
    rank: number
    recommendation: string
    rationale: string
    priority: string
    timeline: string
  }>
  priority_alerts: Array<{
    alert: string
    district?: string
    category?: string
    count?: number
  }>
  generated_at: string
  stats_snapshot: {
    total: number
    resolved: number
    resolutionRate: number
    avgResolutionDays: number
    slaBreachCount: number
    avgQualityScore: number
    escalatedToState: number
    duplicateCount: number
  }
}

// ── Component ───────────────────────────────────────────────────────────────

interface ReportGeneratorPanelProps {
  onReportComplete?: (report: ComplaintReport) => void
}

export default function ReportGeneratorPanel({ onReportComplete }: ReportGeneratorPanelProps) {
  // ── State ───────────────────────────────────────────────────────────────
  const [reportStatus, setReportStatus] = useState<"idle" | "generating" | "complete" | "error">("idle")
  const [phases, setPhases] = useState<{
    retrieval: "idle" | "active" | "done"
    reranking: "idle" | "active" | "done"
    synthesis: "idle" | "active" | "done"
  }>({ retrieval: "idle", reranking: "idle", synthesis: "idle" })
  const [streamOutput, setStreamOutput] = useState("")
  const [fullReport, setFullReport] = useState<ComplaintReport | null>(null)
  const [cachedStats, setCachedStats] = useState<ReportStats | null>(null)
  const [reportError, setReportError] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const outputRef = useRef<HTMLDivElement>(null)
  const [scrollLocked, setScrollLocked] = useState(false)

  // Modal state
  const [showFullReport, setShowFullReport] = useState(false)
  const [activeTab, setActiveTab] = useState("summary")
  const [showHistory, setShowHistory] = useState(false)
  const [historyList, setHistoryList] = useState<Array<Record<string, unknown>>>([])

  // Toast
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null)

  const HISTORY_KEY = "ai_report_history_state_v2"

  // ── Helpers ─────────────────────────────────────────────────────────────
  const startElapsed = () => {
    setElapsed(0)
    elapsedRef.current = setInterval(() => setElapsed((e) => +(e + 0.1).toFixed(1)), 100)
  }
  const stopElapsed = () => {
    if (elapsedRef.current) clearInterval(elapsedRef.current)
  }

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4000)
  }

  // ── History persistence ─────────────────────────────────────────────────
  const loadHistory = () => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY)
      if (!raw) return setHistoryList([])
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) setHistoryList(parsed)
      else setHistoryList([])
    } catch { setHistoryList([]) }
  }

  const saveReportToHistory = (report: ComplaintReport) => {
    try {
      const entry = { id: String(Date.now()), ts: new Date().toISOString(), elapsed, report }
      const raw = localStorage.getItem(HISTORY_KEY)
      const arr = raw ? (JSON.parse(raw) as Array<Record<string, unknown>>) : []
      arr.unshift(entry)
      localStorage.setItem(HISTORY_KEY, JSON.stringify(arr.slice(0, 50)))
      setHistoryList(arr.slice(0, 50))
    } catch { /* ignore */ }
  }

  const deleteHistoryItem = (id: string) => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY)
      if (!raw) return
      const arr = (JSON.parse(raw) as Array<Record<string, unknown>>).filter((e) => e.id !== id)
      localStorage.setItem(HISTORY_KEY, JSON.stringify(arr))
      setHistoryList(arr)
    } catch { /* ignore */ }
  }

  const clearAllHistory = () => {
    localStorage.removeItem(HISTORY_KEY)
    setHistoryList([])
  }

  // ── Download helpers ────────────────────────────────────────────────────
  const downloadJson = (obj: unknown, name = "ai_report") => {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${name}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const downloadText = (text: string, name = "ai_report") => {
    const blob = new Blob([text], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${name}.txt`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  // ── SSE event handler ─────────────────────────────────────────────────
  const handleSSEEvent = useCallback((eventName: string, data: Record<string, unknown>) => {
    switch (eventName) {
      case "pipeline_start":
        setPhases({ retrieval: "active", reranking: "idle", synthesis: "idle" })
        break

      case "progress": {
        const phase = String(data.phase || "")
        if (phase === "retrieval")
          setPhases({ retrieval: "active", reranking: "idle", synthesis: "idle" })
        else if (phase === "reranking")
          setPhases({ retrieval: "done", reranking: "active", synthesis: "idle" })
        else if (phase === "synthesis")
          setPhases({ retrieval: "done", reranking: "done", synthesis: "active" })
        break
      }

      case "stats":
        if (data.stats) setCachedStats(data.stats as unknown as ReportStats)
        break

      case "token":
        if (data.chunk) {
          setPhases((p) => ({ ...p, retrieval: "done", reranking: "done", synthesis: "active" }))
          setStreamOutput((prev) => prev + String(data.chunk))
        }
        break

      case "complete":
        if (data.report) {
          const report = data.report as unknown as ComplaintReport
          setFullReport(report)
          try { saveReportToHistory(report) } catch { /* ignore */ }
          onReportComplete?.(report)
        }
        setPhases({ retrieval: "done", reranking: "done", synthesis: "done" })
        setReportStatus("complete")
        stopElapsed()
        showToast("success", "Report generated successfully")
        break

      case "error":
        setReportError(String(data.message || "Unknown error"))
        setReportStatus("error")
        stopElapsed()
        showToast("error", String(data.message || "Report generation failed"))
        break
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onReportComplete])

  // ── Generate report (fetch-based SSE) ──────────────────────────────────
  // Use a ref to track completion so the async loop sees fresh state,
  // not a stale closure snapshot of reportStatus.
  const completedRef = useRef(false)

  const generateReport = useCallback(async () => {
    if (reportStatus === "generating") return

    completedRef.current = false
    setReportStatus("generating")
    setPhases({ retrieval: "active", reranking: "idle", synthesis: "idle" })
    setStreamOutput("")
    setFullReport(null)
    setCachedStats(null)
    setReportError(null)
    startElapsed()

    const token = localStorage.getItem("token")

    try {
      const response = await fetch("/api/report/generate", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok || !response.body) {
        throw new Error(`HTTP ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        // SSE blocks are separated by double newlines
        const blocks = buffer.split("\n\n")
        buffer = blocks.pop() ?? ""

        for (const block of blocks) {
          if (!block.trim()) continue
          const lines = block.trim().split("\n")
          const eventLine = lines.find((l) => l.startsWith("event:"))
          const dataLine = lines.find((l) => l.startsWith("data:"))
          if (!dataLine) continue

          const eventName = eventLine ? eventLine.replace("event:", "").trim() : "message"
          try {
            const data = JSON.parse(dataLine.replace(/^data:\s*/, ""))
            if (eventName === "complete") completedRef.current = true
            handleSSEEvent(eventName, data)
          } catch { /* ignore malformed frames */ }
        }
      }

      // Flush any remaining partial block after stream ends
      if (buffer.trim()) {
        const lines = buffer.trim().split("\n")
        const eventLine = lines.find((l) => l.startsWith("event:"))
        const dataLine = lines.find((l) => l.startsWith("data:"))
        if (dataLine) {
          const eventName = eventLine ? eventLine.replace("event:", "").trim() : "message"
          try {
            const data = JSON.parse(dataLine.replace(/^data:\s*/, ""))
            if (eventName === "complete") completedRef.current = true
            handleSSEEvent(eventName, data)
          } catch { /* ignore */ }
        }
      }

      if (!completedRef.current) {
        // Stream closed without a 'complete' event = the agent errored or disconnected
        const errMsg = "Stream ended without a report -check the agents server logs."
        setReportError(errMsg)
        setReportStatus("error")
        stopElapsed()
        showToast("error", "Connection closed before report arrived")
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to connect"
      setReportError(message)
      setReportStatus("error")
      stopElapsed()
      showToast("error", "Report generation failed")
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportStatus, handleSSEEvent])

  // Auto-scroll terminal output
  useEffect(() => {
    if (!scrollLocked && outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [streamOutput, scrollLocked])

  useEffect(() => {
    loadHistory()
    return () => stopElapsed()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Severity badge helper ──────────────────────────────────────────────
  const severityBadge = (severity: string) => {
    const s = severity.toUpperCase()
    const colors: Record<string, string> = {
      CRITICAL: "bg-[#ffdad6] text-[#93000a]",
      HIGH: "bg-[#feddb5]/60 text-[#7a4510]",
      MEDIUM: "bg-[#fff3cd] text-[#856404]",
      LOW: "bg-[#e7e8e9] text-[#44474c]",
    }
    return (
      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${colors[s] || colors.LOW}`}>
        {s}
      </span>
    )
  }

  const priorityIcon = (priority: string) => {
    const icons: Record<string, string> = { CRITICAL: "🔴", HIGH: "🟠", MEDIUM: "🟡", LOW: "🟢" }
    return icons[priority.toUpperCase()] || "⚪"
  }

  // ── Stats KPI sidebar widget ──────────────────────────────────────────
  const StatsKPISidebar = () => {
    const snap = fullReport?.stats_snapshot
    if (!snap) return null
    const kpis = [
      { label: "Total", value: snap.total.toLocaleString() },
      { label: "Resolved %", value: `${snap.resolutionRate.toFixed(1)}%` },
      { label: "Avg Days", value: snap.avgResolutionDays.toFixed(1) },
      { label: "SLA Breaches", value: snap.slaBreachCount.toLocaleString() },
      { label: "Escalations", value: snap.escalatedToState.toLocaleString() },
      { label: "Quality", value: snap.avgQualityScore.toFixed(1) },
    ]
    return (
      <div className="flex flex-wrap gap-2 mb-4">
        {kpis.map(({ label, value }) => (
          <div key={label} className="bg-[#f3f4f5] rounded-lg px-3 py-2 min-w-[90px]">
            <div className="text-[10px] font-bold text-[#74777d] uppercase tracking-wider">{label}</div>
            <div className="text-sm font-black text-[#191c1d]">{value}</div>
          </div>
        ))}
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ── Render ─────────────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <>
      {/* Toast notification */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[100] flex items-center gap-2 px-5 py-3 rounded-xl shadow-2xl text-sm font-bold transition-all animate-slide-in ${
          toast.type === "success" ? "bg-[#e7f5ed] text-[#1a8754] border border-[#1a8754]/20" : "bg-[#ffdad6] text-[#93000a] border border-[#93000a]/20"
        }`}>
          <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
            {toast.type === "success" ? "check_circle" : "error"}
          </span>
          {toast.message}
        </div>
      )}

      <section className="bg-white rounded-xl shadow-sm border border-[#c4c6cd]/10 overflow-hidden">
        {/* ── Animated Hero Banner ── */}
        <div
          className={`p-6 md:p-8 ${reportStatus === "generating" ? "animate-gradient-pulse" : ""}`}
          style={reportStatus === "generating" ? {
            backgroundImage: "linear-gradient(135deg, #f0f7ff 0%, #ffffff 50%, #f0f7ff 100%)",
            backgroundSize: "200% 200%",
          } : undefined}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <span className="bg-[#d2e4fb] text-[#115cb9] px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase">
                  ✦ Active Intelligence
                </span>
                {reportStatus === "generating" && (
                  <span className="flex items-center gap-1.5 text-xs text-[#115cb9] font-semibold">
                    <span className="w-2 h-2 bg-[#115cb9] rounded-full animate-ping inline-block" />
                    Analyzing…
                  </span>
                )}
                {reportStatus === "complete" && (
                  <span className="flex items-center gap-1.5 text-xs text-[#1a8754] font-semibold">
                    <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    Report ready
                  </span>
                )}
              </div>
              <h3 className="text-xl font-black text-[#191c1d] tracking-tight flex items-center gap-2">
                🧠 Consolidated Grievance Intelligence Report
              </h3>
              <p className="text-xs text-[#74777d] mt-1 font-medium">Powered by Gemini · Advanced Multi-Category Analysis</p>
            </div>
            <div className="flex items-center gap-4">
              {reportStatus !== "idle" && (
                <div className="text-right">
                  <div className="text-[10px] text-[#44474c] font-bold uppercase tracking-widest mb-0.5">Elapsed</div>
                  <div className="text-sm font-black text-[#191c1d]">⏱ {elapsed.toFixed(1)}s</div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { loadHistory(); setShowHistory(true) }}
                  className="px-3 py-2 rounded-md text-sm font-bold bg-white border border-[#e7e8e9] hover:shadow-sm transition-all"
                  title="Report History"
                >
                  <span className="material-symbols-outlined text-sm">history</span>
                </button>
                <button
                  onClick={generateReport}
                  disabled={reportStatus === "generating"}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-black transition-all shadow-sm ${
                    reportStatus === "generating"
                      ? "bg-[#e7e8e9] text-[#74777d] cursor-not-allowed"
                      : reportStatus === "complete"
                      ? "bg-[#041627] text-white hover:bg-[#1a2b3c] active:scale-[0.98]"
                      : "bg-[#115cb9] text-white hover:bg-[#004493] active:scale-[0.98]"
                  }`}
                >
                  {reportStatus === "generating" ? (
                    <><span className="material-symbols-outlined text-sm animate-spin">progress_activity</span> Generating…</>
                  ) : reportStatus === "complete" ? (
                    <><span className="material-symbols-outlined text-sm">refresh</span> Re-generate</>
                  ) : (
                    <><span className="material-symbols-outlined text-sm">auto_awesome</span> Generate Report</>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* ── Three-Phase Progress Rail ── */}
          {reportStatus !== "idle" && (
            <div className="flex items-center gap-2 mb-6">
              {([
                { key: "retrieval" as const, label: "Retrieval", desc: "DB fetch" },
                { key: "reranking" as const, label: "Reranking", desc: "Stats compute" },
                { key: "synthesis" as const, label: "LLM Synthesis", desc: "Gemini streaming" },
              ]).map(({ key, label, desc }, idx) => {
                const state = phases[key]
                const isDone = state === "done"
                const isActive = state === "active"
                return (
                  <div key={key} className="flex items-center flex-1">
                    <div className={`flex-1 transition-all ${state === "idle" ? "opacity-40" : ""}`}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                          isDone ? "bg-[#1a8754] text-white" : isActive ? "bg-[#115cb9] text-white animate-pulse" : "bg-[#e7e8e9] text-[#74777d]"
                        }`}>
                          {isDone ? "✓" : isActive ? "⟳" : idx + 1}
                        </div>
                        <div>
                          <span className={`text-[10px] font-black uppercase tracking-widest ${
                            isDone ? "text-[#1a8754]" : isActive ? "text-[#115cb9]" : "text-[#74777d]"
                          }`}>{label}</span>
                          <p className="text-[10px] text-[#74777d]">{desc}</p>
                        </div>
                      </div>
                      <div className="h-1.5 w-full bg-[#e7e8e9] rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-700 ${
                          isDone ? "bg-[#1a8754] w-full" : isActive ? "bg-[#115cb9] w-3/4 animate-pulse" : "w-0"
                        }`} />
                      </div>
                    </div>
                    {idx < 2 && (
                      <div className={`w-8 h-0.5 mx-1 mt-[-8px] transition-colors ${isDone ? "bg-[#1a8754]" : "bg-[#e7e8e9]"}`} />
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* ── Idle State: Rich Placeholder Card ── */}
          {reportStatus === "idle" && (
            <div className="flex flex-col items-center justify-center py-14 text-center border border-dashed border-[#c4c6cd]/40 rounded-xl bg-[#f9f9ff]">
              <span className="text-5xl mb-4">🧠</span>
              <p className="text-sm font-bold text-[#44474c] mb-3">No report generated yet</p>
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-left mb-6 max-w-md">
                {[
                  "Category & district breakdown",
                  "Resolution rates & SLA",
                  "Escalation patterns",
                  "Quality score distribution",
                  "Systemic issues identified",
                  "Strategic recommendations",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-xs text-[#74777d]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#115cb9]/40 shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
              <button
                onClick={generateReport}
                className="flex items-center gap-2 px-6 py-3 bg-[#115cb9] text-white rounded-lg text-sm font-black hover:bg-[#004493] active:scale-[0.98] transition-all shadow-lg shadow-[#115cb9]/20"
              >
                <span className="material-symbols-outlined text-sm">auto_awesome</span>
                Generate Report
              </button>
            </div>
          )}

          {/* ── Error State ── */}
          {reportStatus === "error" && (
            <div className="flex items-center gap-3 p-4 bg-[#ffdad6] rounded-xl text-[#93000a] text-sm font-semibold">
              <span className="material-symbols-outlined">error</span>
              {reportError || "Failed to reach agents service"}
            </div>
          )}

          {/* ── Streaming Terminal Output ── */}
          {(reportStatus === "generating" || reportStatus === "complete") && (
            <>
              <div className="bg-[#0d1117] rounded-xl overflow-hidden shadow-inner">
                {/* Terminal chrome bar */}
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#21262d]">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-[#ff5f57]/60" />
                    <div className="w-3 h-3 rounded-full bg-[#ffbd2e]/60" />
                    <div className="w-3 h-3 rounded-full bg-[#28ca41]/60" />
                  </div>
                  <span className="text-[10px] text-[#58a6ff]/60 font-bold uppercase tracking-widest ml-3">
                    Stream -intelligence_report
                  </span>
                  <div className="ml-auto flex items-center gap-2">
                    <button
                      onClick={() => setScrollLocked(!scrollLocked)}
                      className={`text-[10px] px-2 py-0.5 rounded font-bold transition-colors ${
                        scrollLocked ? "bg-[#da3633]/20 text-[#f85149]" : "bg-[#1a8754]/10 text-[#3fb950]"
                      }`}
                      title={scrollLocked ? "Auto-scroll OFF" : "Auto-scroll ON"}
                    >
                      {scrollLocked ? "🔒 Scroll" : "🔓 Scroll"}
                    </button>
                    <button
                      onClick={() => navigator.clipboard.writeText(streamOutput)}
                      className="text-[10px] text-[#58a6ff]/50 hover:text-[#58a6ff] transition-colors"
                      title="Copy to clipboard"
                    >
                      <span className="material-symbols-outlined text-sm">content_copy</span>
                    </button>
                    {reportStatus === "complete" && (
                      <span className="text-[10px] font-bold text-[#1a8754] bg-[#1a8754]/10 px-2 py-0.5 rounded">✓ COMPLETE</span>
                    )}
                  </div>
                </div>
                <div
                  ref={outputRef}
                  className="p-5 font-mono text-xs leading-relaxed text-[#79c0ff]/90 overflow-y-auto"
                  style={{ minHeight: 200, maxHeight: 360, scrollbarWidth: "thin" }}
                >
                  {streamOutput ? (
                    <pre className="whitespace-pre-wrap break-all">
                      {streamOutput.split("\n").map((line, i) => (
                        <div key={i} className="flex">
                          <span className="text-[#484f58] select-none w-8 text-right mr-3 shrink-0">{i + 1}</span>
                          <span>{line}</span>
                        </div>
                      ))}
                      {reportStatus === "generating" && (
                        <span className="inline-block w-1.5 h-4 bg-[#58a6ff] ml-0.5 align-middle animate-pulse" />
                      )}
                    </pre>
                  ) : (
                    <span className="text-[#58a6ff]/40 italic">Waiting for tokens…</span>
                  )}
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => { setActiveTab("summary"); setShowFullReport(true) }}
                  disabled={reportStatus !== "complete" || !fullReport}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-black transition-all ${
                    reportStatus === "complete" && fullReport
                      ? "bg-[#115cb9] text-white hover:bg-[#004493] shadow-lg shadow-[#115cb9]/20 active:scale-[0.98]"
                      : "bg-[#e7e8e9] text-[#74777d] cursor-not-allowed"
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">visibility</span>
                  View Full Report
                </button>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ── Action Suggestions Panel ── */}
      {reportStatus === "complete" && fullReport && cachedStats && (
        <ActionSuggestionsPanel report={fullReport} stats={cachedStats} />
      )}

      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {/* ── Full Report Modal (Tabbed) ── */}
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {showFullReport && fullReport && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm overflow-y-auto p-4 pt-12"
          onClick={(e) => { if (e.target === e.currentTarget) setShowFullReport(false) }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl mb-16">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#c4c6cd]/20 sticky top-0 bg-white rounded-t-2xl z-10">
              <div>
                <h3 className="font-black text-[#191c1d] text-lg tracking-tight">Consolidated Grievance Intelligence Report</h3>
                <p className="text-xs text-[#74777d] mt-0.5">Generated {fullReport.generated_at ? new Date(fullReport.generated_at).toLocaleString() : "just now"}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => window.print()} className="px-3 py-2 rounded-md text-sm font-bold bg-white border border-[#e7e8e9] hover:shadow-sm" title="Print">
                  <span className="material-symbols-outlined text-sm">print</span>
                </button>
                <button onClick={() => downloadJson(fullReport, `ai_report_${new Date().toISOString().replace(/[:.]/g, "-")}`)} className="px-3 py-2 rounded-md text-sm font-bold bg-white border border-[#e7e8e9] hover:shadow-sm" title="Download JSON">
                  <span className="material-symbols-outlined text-sm">download</span>
                </button>
                <button onClick={() => downloadText(streamOutput, `ai_report_stream_${new Date().toISOString().replace(/[:.]/g, "-")}`)} className="px-3 py-2 rounded-md text-sm font-bold bg-white border border-[#e7e8e9] hover:shadow-sm" title="Download TXT">
                  <span className="material-symbols-outlined text-sm">save</span>
                </button>
                <button onClick={() => setShowFullReport(false)} className="p-2 rounded-lg hover:bg-[#f3f4f5] transition-colors">
                  <span className="material-symbols-outlined text-[#44474c]">close</span>
                </button>
              </div>
            </div>

            {/* Stats KPI bar */}
            <div className="px-6 pt-4">
              <StatsKPISidebar />
            </div>

            {/* Tabs */}
            <div className="px-6 pt-2 border-b border-[#c4c6cd]/10">
              <div className="flex gap-1 overflow-x-auto">
                {[
                  { id: "summary", label: "Summary" },
                  { id: "districts", label: "Districts" },
                  { id: "categories", label: "Categories" },
                  { id: "issues", label: "Issues" },
                  { id: "recommendations", label: "Recommendations" },
                  { id: "alerts", label: "Alerts" },
                  { id: "raw", label: "Raw JSON" },
                ].map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 whitespace-nowrap ${
                      activeTab === id
                        ? "text-[#115cb9] border-[#115cb9]"
                        : "text-[#74777d] border-transparent hover:text-[#44474c]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab content */}
            <div className="p-6 space-y-5 min-h-[300px]">
              {/* Summary tab */}
              {activeTab === "summary" && (
                <>
                  {!!fullReport.executive_summary && (
                    <div className="bg-[#d2e4fb]/30 rounded-xl p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="material-symbols-outlined text-[#115cb9]">summarize</span>
                        <h4 className="font-black text-[#191c1d] uppercase tracking-wider text-xs">Executive Summary</h4>
                      </div>
                      <p className="text-sm text-[#44474c] leading-relaxed">{fullReport.executive_summary}</p>
                    </div>
                  )}
                  {!!fullReport.comprehensive_overview && (
                    <div className="bg-[#f3f4f5] rounded-xl p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="material-symbols-outlined text-[#44474c]">description</span>
                        <h4 className="font-black text-[#44474c] uppercase tracking-wider text-xs">Comprehensive Overview</h4>
                      </div>
                      <p className="text-sm text-[#44474c] leading-relaxed whitespace-pre-line">{fullReport.comprehensive_overview}</p>
                    </div>
                  )}
                  {!!fullReport.quality_assessment && (
                    <div className="bg-[#f3f4f5] rounded-xl p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="material-symbols-outlined text-[#44474c]">assessment</span>
                        <h4 className="font-black text-[#44474c] uppercase tracking-wider text-xs">Quality Assessment</h4>
                      </div>
                      <p className="text-sm text-[#44474c] leading-relaxed">{fullReport.quality_assessment}</p>
                    </div>
                  )}
                  {!!fullReport.escalation_patterns && (
                    <div className="bg-[#f3f4f5] rounded-xl p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="material-symbols-outlined text-[#44474c]">trending_up</span>
                        <h4 className="font-black text-[#44474c] uppercase tracking-wider text-xs">Escalation Patterns</h4>
                      </div>
                      <p className="text-sm text-[#44474c] leading-relaxed">{fullReport.escalation_patterns}</p>
                    </div>
                  )}
                  {!!fullReport.resolution_performance && (
                    <div className="bg-[#f3f4f5] rounded-xl p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="material-symbols-outlined text-[#44474c]">speed</span>
                        <h4 className="font-black text-[#44474c] uppercase tracking-wider text-xs">Resolution Performance</h4>
                      </div>
                      <div className="grid grid-cols-3 gap-4 mb-3">
                        <div className="bg-white rounded-lg p-3">
                          <div className="text-[10px] font-bold text-[#74777d] uppercase">Overall Rate</div>
                          <div className="text-lg font-black text-[#191c1d]">{fullReport.resolution_performance.overall_rate}%</div>
                        </div>
                        <div className="bg-white rounded-lg p-3">
                          <div className="text-[10px] font-bold text-[#74777d] uppercase">Avg Days</div>
                          <div className="text-lg font-black text-[#191c1d]">{fullReport.resolution_performance.avg_resolution_days}</div>
                        </div>
                        <div className="bg-white rounded-lg p-3">
                          <div className="text-[10px] font-bold text-[#74777d] uppercase">SLA Breaches</div>
                          <div className="text-lg font-black text-[#ba1a1a]">{fullReport.resolution_performance.sla_breach_count}</div>
                        </div>
                      </div>
                      {fullReport.resolution_performance.bottlenecks.length > 0 && (
                        <div>
                          <div className="text-[10px] font-bold text-[#74777d] uppercase mb-2">Bottlenecks</div>
                          <div className="space-y-1">
                            {fullReport.resolution_performance.bottlenecks.map((b, i) => (
                              <div key={i} className="flex items-start gap-2 text-xs text-[#44474c]">
                                <span className="text-[#ba1a1a] mt-0.5">•</span> {b}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Districts tab */}
              {activeTab === "districts" && (
                <div className="space-y-4">
                  {fullReport.district_analysis.map((d, i) => (
                    <div key={i} className="border border-[#c4c6cd]/20 rounded-xl p-5">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-black text-[#191c1d]">{d.district}</h4>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-[#44474c]">{d.complaint_count} complaints</span>
                          <span className={`font-bold ${d.resolution_rate >= 70 ? "text-[#1a8754]" : d.resolution_rate >= 40 ? "text-[#856404]" : "text-[#93000a]"}`}>
                            {d.resolution_rate}% resolved
                          </span>
                        </div>
                      </div>
                      <div className="mb-2">
                        <div className="flex flex-wrap gap-1.5">
                          {d.primary_issues.map((issue, j) => (
                            <span key={j} className="text-[10px] bg-[#d2e4fb]/40 text-[#115cb9] font-bold px-2 py-0.5 rounded-full">{issue}</span>
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-[#44474c] italic">{d.recommendation}</p>
                    </div>
                  ))}
                  {fullReport.district_analysis.length === 0 && (
                    <p className="text-sm text-[#74777d] text-center py-8">No district analysis data available.</p>
                  )}
                </div>
              )}

              {/* Categories tab */}
              {activeTab === "categories" && (
                <div className="space-y-4">
                  {fullReport.category_insights.map((c, i) => (
                    <div key={i} className="border border-[#c4c6cd]/20 rounded-xl p-5">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-black text-[#191c1d]">{c.category}</h4>
                        <span className="text-xs text-[#44474c] font-bold">{c.count} complaints</span>
                      </div>
                      <div className="text-xs text-[#44474c] mb-1"><strong>Trend:</strong> {c.trend}</div>
                      <div className="text-xs text-[#44474c]"><strong>Pattern:</strong> {c.notable_pattern}</div>
                    </div>
                  ))}
                  {fullReport.category_insights.length === 0 && (
                    <p className="text-sm text-[#74777d] text-center py-8">No category insights available.</p>
                  )}
                </div>
              )}

              {/* Issues tab */}
              {activeTab === "issues" && (
                <div className="space-y-3">
                  {fullReport.systemic_issues.map((issue, i) => (
                    <div key={i} className="border border-[#c4c6cd]/20 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-black text-[#191c1d]">{issue.issue_name}</p>
                        {severityBadge(issue.severity)}
                      </div>
                      <p className="text-xs text-[#44474c] leading-relaxed mt-1">{issue.description}</p>
                      {issue.affected_categories.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {issue.affected_categories.map((c, j) => (
                            <span key={j} className="text-[10px] bg-[#d2e4fb]/40 text-[#115cb9] font-bold px-2 py-0.5 rounded-full">{c}</span>
                          ))}
                        </div>
                      )}
                      {issue.affected_districts && issue.affected_districts.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {issue.affected_districts.map((d, j) => (
                            <span key={j} className="text-[10px] bg-[#feddb5]/40 text-[#38260b] font-bold px-2 py-0.5 rounded-full">{d}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {fullReport.systemic_issues.length === 0 && (
                    <p className="text-sm text-[#74777d] text-center py-8">No systemic issues identified.</p>
                  )}
                </div>
              )}

              {/* Recommendations tab */}
              {activeTab === "recommendations" && (
                <div className="space-y-3">
                  {fullReport.strategic_recommendations.map((rec, i) => (
                    <div key={i} className="flex items-start gap-3 p-4 bg-[#e7f5ed]/40 rounded-xl border border-[#1a8754]/10">
                      <div className="flex flex-col items-center gap-1 shrink-0">
                        <span className="text-lg">{priorityIcon(rec.priority)}</span>
                        <span className="text-[10px] font-black text-[#74777d]">#{rec.rank}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-black text-[#191c1d]">{rec.recommendation}</p>
                          {severityBadge(rec.priority)}
                        </div>
                        <p className="text-xs text-[#44474c] mb-1">{rec.rationale}</p>
                        <span className="text-[10px] text-[#74777d] font-bold">Timeline: {rec.timeline}</span>
                      </div>
                    </div>
                  ))}
                  {fullReport.strategic_recommendations.length === 0 && (
                    <p className="text-sm text-[#74777d] text-center py-8">No recommendations available.</p>
                  )}
                </div>
              )}

              {/* Alerts tab */}
              {activeTab === "alerts" && (
                <div className="space-y-3">
                  {fullReport.priority_alerts.map((alert, i) => (
                    <div key={i} className="flex items-start gap-3 p-4 bg-[#ffdad6]/30 rounded-xl border border-[#ba1a1a]/10">
                      <span className="material-symbols-outlined text-[#ba1a1a] shrink-0">warning</span>
                      <div>
                        <p className="text-sm font-bold text-[#93000a]">{alert.alert}</p>
                        <div className="flex items-center gap-3 mt-1 text-[10px] text-[#44474c]">
                          {alert.district && <span>District: <strong>{alert.district}</strong></span>}
                          {alert.category && <span>Category: <strong>{alert.category}</strong></span>}
                          {alert.count !== undefined && <span>Count: <strong>{alert.count}</strong></span>}
                        </div>
                      </div>
                    </div>
                  ))}
                  {fullReport.priority_alerts.length === 0 && (
                    <p className="text-sm text-[#74777d] text-center py-8">No priority alerts.</p>
                  )}
                </div>
              )}

              {/* Raw JSON tab */}
              {activeTab === "raw" && (
                <details open className="bg-[#0d1117] rounded-xl overflow-hidden">
                  <summary className="px-5 py-3 text-[10px] font-black text-[#58a6ff]/70 uppercase tracking-widest cursor-pointer select-none flex items-center gap-2 hover:text-[#58a6ff]">
                    <span className="material-symbols-outlined text-sm">data_object</span> Raw JSON Output
                  </summary>
                  <pre className="px-5 pb-5 text-[11px] font-mono text-[#79c0ff]/80 whitespace-pre-wrap break-all leading-relaxed overflow-y-auto" style={{ maxHeight: 500 }}>
                    {JSON.stringify(fullReport, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {/* ── Report History Modal ── */}
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {showHistory && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm overflow-y-auto p-4 pt-16"
          onClick={(e) => { if (e.target === e.currentTarget) setShowHistory(false) }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mb-16">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#c4c6cd]/20 sticky top-0 bg-white rounded-t-2xl z-10">
              <div>
                <h3 className="font-black text-[#191c1d] text-lg tracking-tight">AI Report History</h3>
                <p className="text-xs text-[#74777d] mt-0.5">Previously generated reports (stored locally)</p>
              </div>
              <div className="flex items-center gap-2">
                {historyList.length > 0 && (
                  <button
                    onClick={clearAllHistory}
                    className="px-3 py-2 rounded-md text-xs font-bold bg-[#ffdad6] text-[#93000a] hover:bg-[#ffc9c5] transition-colors"
                  >
                    Clear all
                  </button>
                )}
                <button onClick={() => setShowHistory(false)} className="p-2 rounded-lg hover:bg-[#f3f4f5] transition-colors">
                  <span className="material-symbols-outlined text-[#44474c]">close</span>
                </button>
              </div>
            </div>
            <div className="p-4 space-y-3">
              {historyList.length === 0 && (
                <div className="p-8 text-center text-sm text-[#74777d]">No saved reports yet. Generate a report to persist it locally.</div>
              )}
              {historyList.map((h) => {
                const report = h.report as Record<string, unknown> | undefined
                const excerpt = report?.executive_summary
                  ? String(report.executive_summary).substring(0, 80) + "…"
                  : "No summary available"
                return (
                  <div key={String(h.id)} className="flex items-start justify-between gap-4 p-4 border rounded-lg hover:bg-[#f9f9ff] transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-[#191c1d]">{new Date(String(h.ts)).toLocaleString()}</div>
                      <div className="text-[10px] text-[#74777d] mb-1">
                        Elapsed: {typeof h.elapsed === "number" ? (h.elapsed as number).toFixed(1) + "s" : "—"}
                      </div>
                      <p className="text-xs text-[#44474c] italic truncate">{excerpt}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          if (report) {
                            setFullReport(report as unknown as ComplaintReport)
                            setActiveTab("summary")
                            setShowFullReport(true)
                            setShowHistory(false)
                          }
                        }}
                        className="px-3 py-1.5 bg-[#115cb9] text-white rounded text-xs font-bold hover:bg-[#004493] transition-colors"
                      >
                        Load
                      </button>
                      <button
                        onClick={() => downloadJson(report, `ai_report_${h.ts}`)}
                        className="px-3 py-1.5 bg-white border rounded text-xs font-bold hover:bg-[#f3f4f5] transition-colors"
                      >
                        Download
                      </button>
                      <button
                        onClick={() => deleteHistoryItem(String(h.id))}
                        className="px-3 py-1.5 bg-[#ffefef] border rounded text-xs font-bold text-[#93000a] hover:bg-[#ffdad6] transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Animation styles */}
      <style jsx>{`
        @keyframes gradient-pulse {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient-pulse {
          animation: gradient-pulse 3s ease infinite;
        }
        @keyframes slide-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease;
        }
      `}</style>
    </>
  )
}
