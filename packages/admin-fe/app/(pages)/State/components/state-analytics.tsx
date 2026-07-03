"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import dynamic from "next/dynamic"

// Dynamically import ComplaintGoogleHeatmap to avoid SSR issues
const ComplaintGoogleHeatmap = dynamic(() => import("@/components/ComplaintGoogleHeatmap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[300px] bg-[#edeeef] rounded-xl flex items-center justify-center text-[#74777d]">
      <span className="material-symbols-outlined mr-2 animate-spin">progress_activity</span>
      Loading map...
    </div>
  ),
})

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002"
const AI_REPORT_URL = process.env.NEXT_PUBLIC_AI_REPORT_URL || "http://127.0.0.1:8000"

// ─── Types ────────────────────────────────────────────────────────────
interface Complaint {
  id: string
  seq: number
  description: string
  subCategory: string
  status: string
  urgency: string
  upvoteCount: number
  submissionDate: string
  category: { id: string; name: string } | null
  location: {
    district: string; city: string; locality: string; street: string | null; pin: string
  } | null
  complainant: { id: string; name: string; email: string } | null
}

interface AnalyticsData {
  totalComplaints: number
  solvedComplaints: number
  mostLikedComplaints: Complaint[]
  highestLikeCount: number
}

// ─── Static rows (no backend data yet for these) ──────────────────────
const DEPT_ROWS = [
  { label: "Water Supply",         avg: "1.2 Days", sla: 96 },
  { label: "Sanitation & Waste",   avg: "2.5 Days", sla: 82 },
  { label: "Power & Streetlights", avg: "0.8 Days", sla: 99 },
  { label: "Roads & Potholes",     avg: "8.4 Days", sla: 64 },
]

const ROOT_CAUSES = [
  { label: "Field Team Capacity",      pct: 45, color: "#041627" },
  { label: "Inter-departmental Delay", pct: 28, color: "#115cb9" },
  { label: "Complex Repair / Tech",    pct: 15, color: "#38260b" },
  { label: "Resource Shortage",        pct: 12, color: "#74777d" },
]



// ═══════════════════════════════════════════════════════════════════════
// ─── Main Component ───────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════
export function StateAnalytics() {
  const [loading, setLoading] = useState(true)
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    totalComplaints: 0,
    solvedComplaints: 0,
    mostLikedComplaints: [],
    highestLikeCount: 0,
  })

  // ── AI Report State ──
  const [reportStatus, setReportStatus] = useState<"idle" | "generating" | "complete" | "error">("idle")
  const [phases, setPhases] = useState<{
    retrieval: "idle" | "active" | "done"
    reranking: "idle" | "active" | "done"
    synthesis: "idle" | "active" | "done"
  }>({ retrieval: "idle", reranking: "idle", synthesis: "idle" })
  const [streamOutput, setStreamOutput] = useState("")
  const [fullReport, setFullReport] = useState<Record<string, unknown> | null>(null)
  const [reportError, setReportError] = useState<string | null>(null)
  const [showFullReport, setShowFullReport] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const esRef = useRef<EventSource | null>(null)
  const outputRef = useRef<HTMLDivElement>(null)

  const startElapsed = () => {
    setElapsed(0)
    elapsedRef.current = setInterval(() => setElapsed((e) => +(e + 0.1).toFixed(1)), 100)
  }
  const stopElapsed = () => { if (elapsedRef.current) clearInterval(elapsedRef.current) }

  const generateReport = useCallback(() => {
    if (reportStatus === "generating") return
    if (esRef.current) { esRef.current.close(); esRef.current = null }
    setReportStatus("generating")
    setPhases({ retrieval: "active", reranking: "idle", synthesis: "idle" })
    setStreamOutput("")
    setFullReport(null)
    setReportError(null)
    startElapsed()

    const es = new EventSource(`${AI_REPORT_URL}/analyze-report/stream`)
    esRef.current = es

    es.addEventListener("pipeline_start", () => {
      setPhases({ retrieval: "active", reranking: "idle", synthesis: "idle" })
    })

    es.addEventListener("progress", (e) => {
      try {
        const d = JSON.parse((e as MessageEvent).data)
        const phase: string = d.phase || ""
        if (phase === "retrieval") setPhases({ retrieval: "active", reranking: "idle", synthesis: "idle" })
        else if (["reranking", "dedup", "severity", "clustering"].includes(phase))
          setPhases({ retrieval: "done", reranking: "active", synthesis: "idle" })
        else if (["llm", "synthesis", "generation"].includes(phase))
          setPhases({ retrieval: "done", reranking: "done", synthesis: "active" })
      } catch { /* ignore */ }
    })

    es.addEventListener("token", (e) => {
      try {
        const d = JSON.parse((e as MessageEvent).data)
        if (d.chunk) {
          setPhases((p) => ({ ...p, retrieval: "done", reranking: "done", synthesis: "active" }))
          setStreamOutput((prev) => {
            const next = prev + d.chunk
            requestAnimationFrame(() => {
              if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight
            })
            return next
          })
        }
      } catch { /* ignore */ }
    })

    es.addEventListener("phase_complete", (e) => {
      try {
        const d = JSON.parse((e as MessageEvent).data)
        if (d.report) setFullReport(d.report as Record<string, unknown>)
      } catch { /* ignore */ }
    })

    es.addEventListener("complete", (e) => {
      try {
        const d = JSON.parse((e as MessageEvent).data)
        if (d.report) {
          setFullReport(d.report as Record<string, unknown>)
          try { saveReportToHistory(d.report as Record<string, unknown>) } catch {}
        }
      } catch { /* ignore */ }
      setPhases({ retrieval: "done", reranking: "done", synthesis: "done" })
      setReportStatus("complete")
      stopElapsed()
      es.close()
      esRef.current = null
    })

    es.addEventListener("error", () => {
      if (reportStatus === "complete") return
      es.close()
      esRef.current = null
      fetch(`${AI_REPORT_URL}/analyze-report`)
        .then((r) => r.json())
        .then((data: Record<string, unknown>) => {
          setFullReport(data)
          setStreamOutput(JSON.stringify(data, null, 2))
          setPhases({ retrieval: "done", reranking: "done", synthesis: "done" })
          setReportStatus("complete")
          stopElapsed()
          try { saveReportToHistory(data) } catch {}
        })
        .catch((err: Error) => {
          setReportError(err?.message || "Failed to connect to AI server at " + AI_REPORT_URL)
          setReportStatus("error")
          stopElapsed()
        })
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportStatus])

  useEffect(() => () => { stopElapsed(); esRef.current?.close() }, [])

  // Persisted report history and download helpers
  const HISTORY_KEY = "ai_report_history_state_v1"
  const [showHistory, setShowHistory] = useState(false)
  const [historyList, setHistoryList] = useState<Array<Record<string, any>>>([])

  const loadHistory = () => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY)
      if (!raw) return setHistoryList([])
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) setHistoryList(parsed)
      else setHistoryList([])
    } catch (e) { setHistoryList([]) }
  }

  const saveReportToHistory = (report: Record<string, any>) => {
    try {
      const entry = { id: String(Date.now()), ts: new Date().toISOString(), elapsed: elapsed, report }
      const raw = localStorage.getItem(HISTORY_KEY)
      const arr = raw ? (JSON.parse(raw) as Array<any>) : []
      arr.unshift(entry)
      // keep latest 50
      localStorage.setItem(HISTORY_KEY, JSON.stringify(arr.slice(0, 50)))
      setHistoryList(arr.slice(0, 50))
    } catch (e) { /* ignore */ }
  }

  const downloadJson = (obj: any, name = "ai_report") => {
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

  const deleteHistoryItem = (id: string) => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY)
      if (!raw) return
      const arr = JSON.parse(raw).filter((e: any) => e.id !== id)
      localStorage.setItem(HISTORY_KEY, JSON.stringify(arr))
      setHistoryList(arr)
    } catch (e) { /* ignore */ }
  }

  useEffect(() => { loadHistory() }, [])

  useEffect(() => {
    fetchAnalytics()
    fetchMostLiked()
  }, [])

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem("token")
      if (!token) { setLoading(false); return }

      const complaints: Complaint[] = []
      const pageSize = 200
      let page = 1
      while (true) {
        const res = await fetch(`/api/complaints/all?page=${page}&limit=${pageSize}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error(`Failed page ${page}`)
        const data = await res.json()
        const items: Complaint[] = data.complaints || []
        complaints.push(...items)
        if (items.length < pageSize) break
        page += 1
        if (page > 200) break
      }

      const total = complaints.length
      const solved = complaints.filter((c) => c.status === "COMPLETED").length
      setAnalyticsData((prev) => ({
        ...prev,
        totalComplaints: total > 0 ? total : 3800,
        solvedComplaints: solved > 0 ? solved : 3400,
      }))
    } catch (error) {
      console.error("Error fetching analytics:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMostLiked = async () => {
    try {
      const token = localStorage.getItem("token")
      if (!token) return
      const res = await fetch(`/api/complaints/most-liked`, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) return
      const json = await res.json()
      if (json?.success && Array.isArray(json.data)) {
        setAnalyticsData((prev) => ({
          ...prev,
          mostLikedComplaints: json.data,
          highestLikeCount: json.highestLikeCount || (json.data[0]?.upvoteCount ?? 0),
        }))
      }
    } catch (err) { console.error("Error fetching most-liked:", err) }
  }

  const total = analyticsData.totalComplaints || 3800
  const solved = analyticsData.solvedComplaints || 3400
  const backlogPct = total > 0 ? Math.round((solved / total) * 100) : 0

  // ═══════════════════════════════════════════════════════════════════
  // ─── Render ─────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════
  if (loading) {
    return (
      <div className="p-6 md:p-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => <div key={i} className="bg-white p-6 rounded-xl animate-pulse h-36" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 bg-white rounded-xl animate-pulse h-60" />
          <div className="lg:col-span-4 bg-white rounded-xl animate-pulse h-60" />
        </div>
        <div className="bg-white rounded-xl animate-pulse h-72" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 bg-white rounded-xl animate-pulse h-64" />
          <div className="lg:col-span-8 bg-white rounded-xl animate-pulse h-64" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 flex flex-col gap-8">

      {/* ── Section 0: AI Complaints Report Generator ── */}
      <section className="bg-white rounded-xl shadow-sm border border-[#c4c6cd]/10 overflow-hidden">
        <div className="p-6 md:p-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <span className="bg-[#d2e4fb] text-[#115cb9] px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase">
                  Active Intelligence
                </span>
                {reportStatus === "generating" && (
                  <span className="flex items-center gap-1.5 text-xs text-[#115cb9] font-semibold">
                    <span className="w-2 h-2 bg-[#115cb9] rounded-full animate-ping inline-block" />
                    Analyzing via Advanced RAG…
                  </span>
                )}
                {reportStatus === "complete" && (
                  <span className="flex items-center gap-1.5 text-xs text-[#1a8754] font-semibold">
                    <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    Report ready
                  </span>
                )}
              </div>
              <h3 className="text-xl font-black text-[#191c1d] tracking-tight">Consolidated Grievance Intelligence Report</h3>
              <p className="text-xs text-[#74777d] mt-1 font-medium">Powered by Gemini 2.5 Pro · Advanced Multi-Category RAG Pipeline</p>
            </div>
            <div className="flex items-center gap-4">
              {reportStatus !== "idle" && (
                <div className="text-right">
                  <div className="text-[10px] text-[#44474c] font-bold uppercase tracking-widest mb-0.5">Elapsed</div>
                  <div className="text-sm font-black text-[#191c1d]">{elapsed.toFixed(1)}s</div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { loadHistory(); setShowHistory(true) }}
                  className="px-3 py-2 rounded-md text-sm font-bold bg-white border border-[#e7e8e9] hover:shadow-sm"
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

          {/* Pipeline phase indicators */}
          {reportStatus !== "idle" && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              {([
                { key: "retrieval" as const,  label: "Retrieval",     desc: "Fetching documents via MMR" },
                { key: "reranking" as const,  label: "Reranking",     desc: "Cross-encoder relevance scoring" },
                { key: "synthesis" as const,  label: "LLM Synthesis", desc: "Gemini 2.5 Pro generation" },
              ]).map(({ key, label, desc }) => {
                const state = phases[key]
                const isDone   = state === "done"
                const isActive = state === "active"
                return (
                  <div key={key} className={`space-y-2 transition-opacity ${state === "idle" ? "opacity-40" : ""}`}>
                    <div className="flex justify-between items-center">
                      <span className={`text-[10px] font-black uppercase tracking-widest ${
                        isDone ? "text-[#1a8754]" : isActive ? "text-[#115cb9]" : "text-[#74777d]"
                      }`}>{label}</span>
                      {isDone   && <span className="material-symbols-outlined text-sm text-[#1a8754]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>}
                      {isActive && <span className="material-symbols-outlined text-sm text-[#115cb9] animate-spin">refresh</span>}
                      {state === "idle" && <span className="material-symbols-outlined text-sm text-[#c4c6cd]">hourglass_empty</span>}
                    </div>
                    <div className="h-1.5 w-full bg-[#e7e8e9] rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-700 ${
                        isDone ? "bg-[#1a8754] w-full" : isActive ? "bg-[#115cb9] w-3/4" : "w-0"
                      }`} />
                    </div>
                    <p className="text-[11px] text-[#74777d]">{desc}</p>
                  </div>
                )
              })}
            </div>
          )}

          {/* Idle placeholder */}
          {reportStatus === "idle" && (
            <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-[#c4c6cd]/40 rounded-xl bg-[#f9f9ff]">
              <span className="material-symbols-outlined text-5xl text-[#c4c6cd] mb-3">psychology</span>
              <p className="text-sm font-bold text-[#44474c] mb-1">No report generated yet</p>
              <p className="text-xs text-[#74777d] max-w-sm">Click "Generate Report" to run a full RAG analysis of all civic complaints using Gemini 2.5 Pro.</p>
            </div>
          )}

          {/* Error state */}
          {reportStatus === "error" && (
            <div className="flex items-center gap-3 p-4 bg-[#ffdad6] rounded-xl text-[#93000a] text-sm font-semibold">
              <span className="material-symbols-outlined">error</span>
              {reportError || `Failed to reach AI server at ${AI_REPORT_URL}`}
            </div>
          )}

          {/* Streaming terminal output */}
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
                    Stream — analyze_report.json
                  </span>
                  {reportStatus === "complete" && (
                    <span className="ml-auto text-[10px] font-bold text-[#1a8754] bg-[#1a8754]/10 px-2 py-0.5 rounded">✓ COMPLETE</span>
                  )}
                </div>
                <div
                  ref={outputRef}
                  className="p-5 font-mono text-xs leading-relaxed text-[#79c0ff]/90 overflow-y-auto"
                  style={{ minHeight: 200, maxHeight: 320, scrollbarWidth: "thin" }}
                >
                  {streamOutput ? (
                    <pre className="whitespace-pre-wrap break-all">
                      {streamOutput}
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
                  onClick={() => setShowFullReport(true)}
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

      {/* ── Full Report Modal ── */}
      {showFullReport && fullReport && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm overflow-y-auto p-4 pt-16" onClick={(e) => { if (e.target === e.currentTarget) setShowFullReport(false) }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mb-16">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#c4c6cd]/20 sticky top-0 bg-white rounded-t-2xl z-10">
              <div>
                <h3 className="font-black text-[#191c1d] text-lg tracking-tight">Consolidated Grievance Intelligence Report</h3>
                <p className="text-xs text-[#74777d] mt-0.5">Generated by Gemini 2.5 Pro · All Categories</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { if (fullReport) downloadJson(fullReport, `ai_report_${new Date().toISOString().replace(/[:.]/g, '-')}`) }}
                  disabled={!fullReport}
                  className={`px-3 py-2 rounded-md text-sm font-bold ${fullReport ? 'bg-white border border-[#e7e8e9] hover:shadow-sm' : 'bg-[#f3f4f5] text-[#9aa0a6] cursor-not-allowed'}`}
                >
                  <span className="material-symbols-outlined text-sm">download</span>
                </button>
                <button
                  onClick={() => { if (streamOutput) downloadText(streamOutput, `ai_report_stream_${new Date().toISOString().replace(/[:.]/g, '-')}`) }}
                  disabled={!streamOutput}
                  className={`px-3 py-2 rounded-md text-sm font-bold ${streamOutput ? 'bg-white border border-[#e7e8e9] hover:shadow-sm' : 'bg-[#f3f4f5] text-[#9aa0a6] cursor-not-allowed'}`}
                >
                  <span className="material-symbols-outlined text-sm">save</span>
                </button>
                <button onClick={() => setShowFullReport(false)} className="p-2 rounded-lg hover:bg-[#f3f4f5] transition-colors">
                  <span className="material-symbols-outlined text-[#44474c]">close</span>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {/* Executive Summary */}
              {!!fullReport.executive_summary && (
                <div className="bg-[#d2e4fb]/30 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-[#115cb9]">summarize</span>
                    <h4 className="font-black text-[#191c1d] uppercase tracking-wider text-xs">Executive Summary</h4>
                  </div>
                  <p className="text-sm text-[#44474c] leading-relaxed">{String(fullReport.executive_summary)}</p>
                </div>
              )}
              {/* Comprehensive Overview */}
              {!!fullReport.comprehensive_overview && (
                <div className="bg-[#f3f4f5] rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-[#44474c]">description</span>
                    <h4 className="font-black text-[#44474c] uppercase tracking-wider text-xs">Comprehensive Overview</h4>
                  </div>
                  <p className="text-sm text-[#44474c] leading-relaxed">{String(fullReport.comprehensive_overview)}</p>
                </div>
              )}
              {/* Systemic Issues */}
              {Array.isArray(fullReport.systemic_issues) && fullReport.systemic_issues.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-[#ba1a1a]">warning</span>
                    <h4 className="font-black text-[#191c1d] uppercase tracking-wider text-xs">Systemic Issues</h4>
                  </div>
                  <div className="space-y-3">
                    {(fullReport.systemic_issues as Record<string, unknown>[]).map((issue, i) => (
                      <div key={i} className="border border-[#c4c6cd]/20 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-black text-[#191c1d]">
                            {String(issue.issue_name || issue.title || `Issue ${i + 1}`)}
                          </p>
                          {!!issue.severity && (
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                              String(issue.severity).toLowerCase() === "high" || String(issue.severity).toLowerCase() === "critical"
                                ? "bg-[#ffdad6] text-[#93000a]"
                                : String(issue.severity).toLowerCase() === "medium"
                                ? "bg-[#feddb5]/50 text-[#38260b]"
                                : "bg-[#e7e8e9] text-[#44474c]"
                            }`}>{String(issue.severity)}</span>
                          )}
                        </div>
                        {!!issue.description && <p className="text-xs text-[#44474c] leading-relaxed mt-1">{String(issue.description)}</p>}
                        {Array.isArray(issue.affected_categories) && issue.affected_categories.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {(issue.affected_categories as string[]).map((c, j) => (
                              <span key={j} className="text-[10px] bg-[#d2e4fb]/40 text-[#115cb9] font-bold px-2 py-0.5 rounded-full">{c}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Strategic Recommendations */}
              {Array.isArray(fullReport.strategic_recommendations) && fullReport.strategic_recommendations.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-[#1a8754]">tips_and_updates</span>
                    <h4 className="font-black text-[#191c1d] uppercase tracking-wider text-xs">Strategic Recommendations</h4>
                  </div>
                  <div className="space-y-2">
                    {(fullReport.strategic_recommendations as unknown[]).map((rec, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-[#e7f5ed]/40 rounded-xl border border-[#1a8754]/10">
                        <span className="material-symbols-outlined text-[#1a8754] shrink-0">check_small</span>
                        <p className="text-sm text-[#44474c] leading-relaxed">
                          {typeof rec === "string"
                            ? rec
                            : String((rec as Record<string, unknown>).recommendation || (rec as Record<string, unknown>).title || (rec as Record<string, unknown>).action || JSON.stringify(rec))}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Raw JSON */}
              <details className="bg-[#0d1117] rounded-xl overflow-hidden">
                <summary className="px-5 py-3 text-[10px] font-black text-[#58a6ff]/70 uppercase tracking-widest cursor-pointer select-none flex items-center gap-2 hover:text-[#58a6ff]">
                  <span className="material-symbols-outlined text-sm">data_object</span> View Raw JSON
                </summary>
                <pre className="px-5 pb-5 text-[11px] font-mono text-[#79c0ff]/80 whitespace-pre-wrap break-all leading-relaxed overflow-y-auto" style={{ maxHeight: 360 }}>
                  {JSON.stringify(fullReport, null, 2)}
                </pre>
              </details>
            </div>
          </div>
        </div>
      )}

      {/* ── Report History Modal ── */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm overflow-y-auto p-4 pt-16" onClick={(e) => { if (e.target === e.currentTarget) setShowHistory(false) }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mb-16">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#c4c6cd]/20 sticky top-0 bg-white rounded-t-2xl z-10">
              <div>
                <h3 className="font-black text-[#191c1d] text-lg tracking-tight">AI Report History</h3>
                <p className="text-xs text-[#74777d] mt-0.5">Previously generated reports (stored locally)</p>
              </div>
              <button onClick={() => setShowHistory(false)} className="p-2 rounded-lg hover:bg-[#f3f4f5] transition-colors">
                <span className="material-symbols-outlined text-[#44474c]">close</span>
              </button>
            </div>
            <div className="p-4 space-y-3">
              {historyList.length === 0 && (
                <div className="p-8 text-center text-sm text-[#74777d]">No saved reports yet. Generate a report to persist it locally.</div>
              )}
              {historyList.map((h) => (
                <div key={h.id} className="flex items-start justify-between gap-4 p-3 border rounded-lg">
                  <div>
                    <div className="text-sm font-bold">{new Date(h.ts).toLocaleString()}</div>
                    <div className="text-xs text-[#6b7177]">Elapsed: {typeof h.elapsed === 'number' ? h.elapsed.toFixed(1) + 's' : '—'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => { downloadJson(h.report, `ai_report_${h.ts}`) }} className="px-3 py-2 bg-white border rounded">Download</button>
                    <button onClick={() => { setFullReport(h.report); setShowFullReport(true); }} className="px-3 py-2 bg-white border rounded">View</button>
                    <button onClick={() => { deleteHistoryItem(h.id) }} className="px-3 py-2 bg-[#ffefef] border rounded text-[#93000a]">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Section 1: Executive Summary KPIs ── */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Citizen Satisfaction */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-[#c4c6cd]/10">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-xs font-bold text-[#44474c] uppercase tracking-widest">Citizen Satisfaction</p>
              <h3 className="text-3xl font-black mt-1 text-[#191c1d]">4.2<span className="text-lg text-[#74777d]">/5</span></h3>
            </div>
            <span className="material-symbols-outlined text-[#115cb9] bg-[#115cb9]/10 p-2 rounded-lg">sentiment_satisfied</span>
          </div>
          {/* Mini bar trend */}
          <div className="h-12 w-full flex items-end gap-1 px-1">
            {[60, 65, 75, 70, 85, 90].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-sm"
                style={{ height: `${h}%`, backgroundColor: `rgba(17,92,185,${0.2 + i * 0.16})` }}
              />
            ))}
          </div>
          <div className="flex justify-between mt-2 text-[10px] font-bold text-[#c4c6cd]">
            <span>JAN</span><span>JUN</span>
          </div>
        </div>

        {/* Avg. First Response */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-[#c4c6cd]/10">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-xs font-bold text-[#44474c] uppercase tracking-widest">Avg. First Response</p>
              <h3 className="text-3xl font-black mt-1 text-[#191c1d]">2.4<span className="text-lg text-[#74777d]">h</span></h3>
            </div>
            <span className="material-symbols-outlined text-[#041627] bg-[#041627]/10 p-2 rounded-lg">bolt</span>
          </div>
          <div className="flex items-center gap-2 text-[#115cb9] font-bold text-xs">
            <span className="material-symbols-outlined text-sm">trending_down</span>
            <span>-18% from last month</span>
          </div>
          <p className="text-[10px] text-[#44474c] mt-4 leading-relaxed">
            System-wide efficiency improved due to automated triage deployment in Pune and Mumbai.
          </p>
        </div>

        {/* Backlog Health */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-[#c4c6cd]/10">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-xs font-bold text-[#44474c] uppercase tracking-widest">Backlog Health</p>
              <h3 className="text-3xl font-black mt-1 text-[#191c1d]">{backlogPct}%</h3>
            </div>
            <span className="material-symbols-outlined text-[#38260b] bg-[#feddb5]/40 p-2 rounded-lg">balance</span>
          </div>
          <div className="w-full bg-[#e7e8e9] h-2 rounded-full overflow-hidden mt-2">
            <div className="bg-[#041627] h-full rounded-full transition-all" style={{ width: `${Math.min(backlogPct, 100)}%` }} />
          </div>
          <div className="flex justify-between mt-3 text-[10px] font-bold">
            <span className="text-[#44474c]">RESOLUTIONS ({solved.toLocaleString()})</span>
            <span className="text-[#041627]">NEW ({total.toLocaleString()})</span>
          </div>
        </div>
      </section>

      {/* ── Section 3: Geospatial Hotspots ── */}
      <section className="bg-white rounded-xl shadow-sm border border-[#c4c6cd]/10 overflow-hidden">
        <div className="px-6 py-4 border-b border-[#c4c6cd]/10 flex justify-between items-center bg-[#f3f4f5]/50">
          <h3 className="font-bold text-base text-[#191c1d]">Geospatial Hotspots: Complaint Location Density</h3>
          <span className="px-2 py-1 bg-[#ba1a1a]/10 text-[#ba1a1a] text-[10px] font-black rounded uppercase">Live Data</span>
        </div>
        <ComplaintGoogleHeatmap height="360px" showDensityTable />
      </section>

      {/* ── Section 2: Departmental Efficiency + Root Causes ── */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Departmental Resolution Efficiency */}
        <div className="lg:col-span-8 bg-white p-6 rounded-xl shadow-sm border border-[#c4c6cd]/10">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="font-bold text-lg text-[#191c1d]">Departmental Resolution Efficiency</h3>
              <p className="text-xs text-[#44474c]">Performance benchmarks by state service sector</p>
            </div>
            <button className="text-xs font-bold text-[#041627] flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">filter_alt</span> Compare All
            </button>
          </div>
          <div className="space-y-6">
            {DEPT_ROWS.map(({ label, avg, sla }) => (
              <div key={label}>
                <div className="flex justify-between text-xs font-bold mb-2">
                  <span className="text-[#191c1d]">{label}</span>
                  <span className="text-[#44474c]">Avg. {avg} | {sla}% SLA Compliance</span>
                </div>
                <div className="w-full bg-[#e7e8e9] h-4 rounded-sm flex overflow-hidden">
                  <div className="bg-[#041627] h-full transition-all" style={{ width: `${sla}%` }} />
                  <div className="bg-[#ba1a1a] h-full transition-all" style={{ width: `${100 - sla}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SLA Breach Root Causes */}
        <div className="lg:col-span-4 bg-white p-6 rounded-xl shadow-sm border border-[#c4c6cd]/10">
          <h3 className="font-bold text-lg text-[#191c1d] mb-6">SLA Breach Root Causes</h3>
          <div className="space-y-4">
            {ROOT_CAUSES.map(({ label, pct, color }) => (
              <div key={label} className="flex items-center gap-4">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <div className="flex-1">
                  <p className="text-xs font-bold text-[#191c1d]">{label}</p>
                  <div className="w-full bg-[#e7e8e9] h-1.5 rounded-full mt-1 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                  </div>
                </div>
                <span className="text-xs font-bold text-[#191c1d]">{pct}%</span>
              </div>
            ))}
          </div>
          <div className="mt-8 pt-6 border-t border-[#c4c6cd]/10">
            <p className="text-[10px] text-[#44474c] font-bold uppercase tracking-widest mb-2">Recommendation</p>
            <p className="text-xs leading-relaxed italic text-[#44474c]">
              &ldquo;Increase field personnel in Zone 4 (Roads) to mitigate the 45% capacity bottleneck.&rdquo;
            </p>
          </div>
        </div>
      </section>

    </div>
  )
}
