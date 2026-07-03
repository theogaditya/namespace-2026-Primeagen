"use client"

import { useState, useEffect, useCallback } from "react"

// ── Types ──────────────────────────────────────────────────────────────────

interface SuggestedAction {
  type: string
  urgency: string
  rationale: string
  // ESCALATE_COMPLAINT / UPDATE_COMPLAINT_STATUS fields
  complaintId?: string
  complaintSeq?: number
  newStatus?: string
  // CREATE_ANNOUNCEMENT fields
  title?: string
  content?: string
  municipality?: string
  priority?: number
  // TRIGGER_AUTO_ASSIGN fields
  batchSize?: number
  // UPDATE_MUNICIPAL_ADMIN_STATUS fields
  municipalAdminId?: string
  municipalAdminName?: string
  // NAVIGATE fields
  destination?: string
  path?: string
}

interface ActionSuggestionsPanelProps {
  report: Record<string, unknown> | object
  stats: Record<string, unknown> | object
  onTabChange?: (tab: string) => void
}

type FetchStatus = "idle" | "loading" | "done" | "error"
type ActionStatus = "idle" | "executing" | "done" | "error"

// ── Action type visual config ───────────────────────────────────────────

const ACTION_CONFIG: Record<string, {
  borderColor: string
  badgeColor: string
  icon: string
  buttonLabel: string
}> = {
  ESCALATE_COMPLAINT: {
    borderColor: "#ba1a1a",
    badgeColor: "bg-[#ffdad6] text-[#93000a]",
    icon: "⬆",
    buttonLabel: "Escalate Now",
  },
  UPDATE_COMPLAINT_STATUS: {
    borderColor: "#115cb9",
    badgeColor: "bg-[#d2e4fb] text-[#115cb9]",
    icon: "✏",
    buttonLabel: "Update Status",
  },
  CREATE_ANNOUNCEMENT: {
    borderColor: "#7a4510",
    badgeColor: "bg-[#feddb5]/60 text-[#38260b]",
    icon: "📢",
    buttonLabel: "Publish Announcement",
  },
  TRIGGER_AUTO_ASSIGN: {
    borderColor: "#1a8754",
    badgeColor: "bg-[#e7f5ed] text-[#1a8754]",
    icon: "⚡",
    buttonLabel: "Trigger Auto-Assign",
  },
  UPDATE_MUNICIPAL_ADMIN_STATUS: {
    borderColor: "#74777d",
    badgeColor: "bg-[#e7e8e9] text-[#44474c]",
    icon: "👤",
    buttonLabel: "Update Admin Status",
  },
  NAVIGATE: {
    borderColor: "#7B61FF",
    badgeColor: "bg-[#ede9fe] text-[#7B61FF]",
    icon: "↗",
    buttonLabel: "Go to Section",
  },
}

const URGENCY_COLORS: Record<string, string> = {
  CRITICAL: "bg-[#ffdad6] text-[#93000a]",
  HIGH: "bg-[#feddb5]/60 text-[#7a4510]",
  MEDIUM: "bg-[#fff3cd] text-[#856404]",
  LOW: "bg-[#e7e8e9] text-[#44474c]",
}

// ── Component ───────────────────────────────────────────────────────────

export default function ActionSuggestionsPanel({ report, stats, onTabChange }: ActionSuggestionsPanelProps) {
  const [fetchStatus, setFetchStatus] = useState<FetchStatus>("idle")
  const [actions, setActions] = useState<SuggestedAction[]>([])
  const [actionStates, setActionStates] = useState<Record<number, ActionStatus>>({})
  const [actionResults, setActionResults] = useState<Record<number, string>>({})
  const [summary, setSummary] = useState("")
  const [fetchError, setFetchError] = useState("")

  // Persisted actions key (stores latest generated actions + metadata)
  const ACTIONS_KEY = "ai_report_last_actions_v2"

  // Editable announcement content
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editedContent, setEditedContent] = useState<Record<number, { title: string; content: string }>>({})

  const fetchActions = useCallback(async () => {
    setFetchStatus("loading")
    setFetchError("")
    try {
      const token = localStorage.getItem("token")
      const res = await fetch("/api/report/actions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ report, stats }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const actionList = data.actions || []
      setActions(actionList)
      setSummary(data.summary || "")
      setFetchStatus("done")
      setActionStates(Object.fromEntries(actionList.map((_: unknown, i: number) => [i, "idle"])))

      // Persist latest actions for this report on the client side
      try {
        const payload = {
          ts: new Date().toISOString(),
          reportSnapshot: report || null,
          summary: data.summary || "",
          actions: actionList,
        }
        localStorage.setItem(ACTIONS_KEY, JSON.stringify(payload))
      } catch { /* ignore */ }
    } catch (err: unknown) {
      setFetchError(err instanceof Error ? err.message : "Failed to fetch action suggestions")
      setFetchStatus("error")
    }
  }, [report, stats])

  useEffect(() => {
    if (report && stats) {
      fetchActions()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report, stats])

  const executeAction = async (index: number, action: SuggestedAction) => {
    if (actionStates[index] === "done" || actionStates[index] === "executing") return

    setActionStates((prev) => ({ ...prev, [index]: "executing" }))
    try {
      const token = localStorage.getItem("token")

      // For announcements, use edited content if available
      let payload = action
      if (action.type === "CREATE_ANNOUNCEMENT" && editedContent[index]) {
        payload = { ...action, title: editedContent[index].title, content: editedContent[index].content }
      }

      if (action.type === "NAVIGATE") {
        onTabChange?.(action.path || "")
        setActionStates((prev) => ({ ...prev, [index]: "done" }))
        setActionResults((prev) => ({ ...prev, [index]: "Navigated successfully" }))
        return
      }

      const res = await fetch("/api/admin/actions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (res.ok) {
        setActionStates((prev) => ({ ...prev, [index]: "done" }))
        setActionResults((prev) => ({ ...prev, [index]: data.message || "Action completed successfully" }))
        // persist state update
        try {
          const raw = localStorage.getItem(ACTIONS_KEY)
          if (raw) {
            const parsed = JSON.parse(raw)
            parsed.actionStates = { ...(parsed.actionStates || {}), [index]: "done" }
            parsed.actionResults = { ...(parsed.actionResults || {}), [index]: data.message || "Action completed successfully" }
            localStorage.setItem(ACTIONS_KEY, JSON.stringify(parsed))
          }
        } catch { /* ignore */ }
      } else {
        setActionStates((prev) => ({ ...prev, [index]: "error" }))
        setActionResults((prev) => ({ ...prev, [index]: data.message || data.error || "Action failed" }))
        try {
          const raw = localStorage.getItem(ACTIONS_KEY)
          if (raw) {
            const parsed = JSON.parse(raw)
            parsed.actionStates = { ...(parsed.actionStates || {}), [index]: "error" }
            parsed.actionResults = { ...(parsed.actionResults || {}), [index]: data.message || data.error || "Action failed" }
            localStorage.setItem(ACTIONS_KEY, JSON.stringify(parsed))
          }
        } catch { /* ignore */ }
      }
    } catch (err: unknown) {
      setActionStates((prev) => ({ ...prev, [index]: "error" }))
      setActionResults((prev) => ({
        ...prev,
        [index]: err instanceof Error ? err.message : "Request failed",
      }))
      try {
        const raw = localStorage.getItem(ACTIONS_KEY)
        if (raw) {
          const parsed = JSON.parse(raw)
          parsed.actionStates = { ...(parsed.actionStates || {}), [index]: "error" }
          parsed.actionResults = { ...(parsed.actionResults || {}), [index]: err instanceof Error ? err.message : "Request failed" }
          localStorage.setItem(ACTIONS_KEY, JSON.stringify(parsed))
        }
      } catch { /* ignore */ }
    }
  }

  // Persist any in-memory changes to actions/states/results so user has latest client-side copy.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(ACTIONS_KEY)
      const base = raw ? JSON.parse(raw) : { ts: new Date().toISOString(), reportSnapshot: report || null }
      base.actions = actions
      base.summary = summary
      base.actionStates = actionStates
      base.actionResults = actionResults
      base.reportSnapshot = report || base.reportSnapshot || null
      localStorage.setItem(ACTIONS_KEY, JSON.stringify(base))
    } catch { /* ignore */ }
  }, [actions, actionStates, actionResults, summary, report])

  const formatType = (type: string) => type.replace(/_/g, " ")

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <section className="bg-white rounded-xl shadow-sm border border-[#c4c6cd]/10 overflow-hidden mt-6">
      {/* Header */}
      <div className="px-6 py-5 border-b border-[#c4c6cd]/10"
        style={{ background: "linear-gradient(135deg, #f8f9ff 0%, #ffffff 100%)" }}
      >
        <div className="flex items-center gap-3 mb-1">
          <span className="text-xl">🎯</span>
          <h3 className="text-lg font-black text-[#191c1d] tracking-tight">AI-Suggested Actions</h3>
          <span className="text-[10px] font-bold text-[#74777d] bg-[#e7e8e9] px-2 py-0.5 rounded-full uppercase">
            Based on this report
          </span>
        </div>
        {summary && fetchStatus === "done" && (
          <p className="text-xs text-[#44474c] ml-9 italic">&ldquo;{summary}&rdquo;</p>
        )}
      </div>

      <div className="p-6">
        {/* Loading skeleton */}
        {fetchStatus === "loading" && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 bg-[#f3f4f5] rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {/* Error */}
        {fetchStatus === "error" && (
          <div className="flex items-center justify-between p-4 bg-[#ffdad6] rounded-xl">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#93000a]">
              <span className="material-symbols-outlined">error</span>
              {fetchError || "Failed to generate action suggestions"}
            </div>
            <button
              onClick={fetchActions}
              className="px-4 py-2 bg-white text-[#93000a] border border-[#93000a]/20 rounded-lg text-xs font-bold hover:bg-[#fff5f5] transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Action cards */}
        {fetchStatus === "done" && actions.length > 0 && (
          <div className="space-y-4">
            {actions.map((action, i) => {
              const config = ACTION_CONFIG[action.type] || ACTION_CONFIG.NAVIGATE!
              const state = actionStates[i] || "idle"
              const result = actionResults[i]

              return (
                <div
                  key={i}
                  className={`rounded-xl border overflow-hidden transition-all ${
                    state === "done" ? "bg-[#f0faf4] border-[#1a8754]/20" :
                    state === "error" ? "bg-[#fff5f5] border-[#ba1a1a]/20" :
                    "bg-white border-[#c4c6cd]/20"
                  }`}
                  style={{ borderLeftWidth: 4, borderLeftColor: config.borderColor }}
                >
                  <div className="p-4">
                    {/* Card header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${config.badgeColor}`}>
                          {config.icon} {formatType(action.type)}
                        </span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${URGENCY_COLORS[action.urgency] || URGENCY_COLORS.LOW}`}>
                          {action.urgency}
                        </span>
                      </div>
                    </div>

                    {/* Card body (varies by type) */}
                    {(action.type === "ESCALATE_COMPLAINT" || action.type === "UPDATE_COMPLAINT_STATUS") && (
                      <p className="text-sm text-[#191c1d] font-bold mb-1">
                        Complaint #{action.complaintSeq}
                        {action.newStatus && <span className="text-xs font-normal text-[#74777d] ml-2">→ {action.newStatus}</span>}
                      </p>
                    )}

                    {action.type === "CREATE_ANNOUNCEMENT" && (
                      <div className="mb-2">
                        {editingIndex === i ? (
                          <div className="space-y-2 bg-[#f9f9ff] p-3 rounded-lg border border-[#c4c6cd]/20">
                            <input
                              type="text"
                              value={editedContent[i]?.title ?? action.title ?? ""}
                              onChange={(e) => setEditedContent((prev) => ({
                                ...prev,
                                [i]: { title: e.target.value, content: prev[i]?.content ?? action.content ?? "" },
                              }))}
                              className="w-full px-3 py-2 text-sm font-bold border border-[#c4c6cd]/30 rounded-lg"
                              placeholder="Announcement title"
                            />
                            <textarea
                              value={editedContent[i]?.content ?? action.content ?? ""}
                              onChange={(e) => setEditedContent((prev) => ({
                                ...prev,
                                [i]: { title: prev[i]?.title ?? action.title ?? "", content: e.target.value },
                              }))}
                              className="w-full px-3 py-2 text-xs border border-[#c4c6cd]/30 rounded-lg resize-none"
                              rows={3}
                              placeholder="Announcement content"
                            />
                            <button onClick={() => setEditingIndex(null)} className="text-[10px] font-bold text-[#115cb9] hover:underline">
                              Done editing
                            </button>
                          </div>
                        ) : (
                          <div className="bg-[#f9f9ff] p-3 rounded-lg border border-[#c4c6cd]/20">
                            <p className="text-sm font-bold text-[#191c1d] mb-1">{editedContent[i]?.title ?? action.title}</p>
                            <p className="text-xs text-[#44474c]">{editedContent[i]?.content ?? action.content}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-[10px] text-[#74777d]">📍 {action.municipality}</span>
                              {state === "idle" && (
                                <button onClick={() => setEditingIndex(i)} className="text-[10px] font-bold text-[#115cb9] hover:underline">
                                  Edit before publishing
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {action.type === "TRIGGER_AUTO_ASSIGN" && (
                      <p className="text-sm text-[#191c1d] font-bold mb-1">
                        Auto-assign {action.batchSize} complaints
                      </p>
                    )}

                    {action.type === "UPDATE_MUNICIPAL_ADMIN_STATUS" && (
                      <p className="text-sm text-[#191c1d] font-bold mb-1">
                        {action.municipalAdminName} → {action.newStatus}
                      </p>
                    )}

                    {action.type === "NAVIGATE" && (
                      <p className="text-sm text-[#191c1d] font-bold mb-1">
                        {action.destination}
                      </p>
                    )}

                    {/* Rationale */}
                    <p className="text-xs text-[#44474c] leading-relaxed mb-3">{action.rationale}</p>

                    {/* Action button / status */}
                    <div className="flex items-center justify-end gap-2">
                      {state === "idle" && (
                        <button
                          onClick={() => executeAction(i, action)}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-black text-white transition-all active:scale-[0.98] hover:opacity-90"
                          style={{ backgroundColor: config.borderColor }}
                        >
                          {config.icon} {config.buttonLabel}
                        </button>
                      )}
                      {state === "executing" && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-[#e7e8e9] rounded-lg text-xs font-bold text-[#74777d]">
                          <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                          Working…
                        </div>
                      )}
                      {state === "done" && (
                        <div className="flex items-center gap-2 text-xs font-bold text-[#1a8754]">
                          <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                          {result || "Done"}
                        </div>
                      )}
                      {state === "error" && (
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1 text-xs font-bold text-[#93000a]">
                            <span className="material-symbols-outlined text-sm">error</span>
                            {result || "Failed"}
                          </span>
                          <button
                            onClick={() => executeAction(i, action)}
                            className="px-3 py-1.5 bg-white border border-[#ba1a1a]/20 rounded text-xs font-bold text-[#ba1a1a] hover:bg-[#fff5f5] transition-colors"
                          >
                            Retry
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {fetchStatus === "done" && actions.length === 0 && (
          <div className="py-8 text-center text-sm text-[#74777d]">
            No action suggestions generated for this report.
          </div>
        )}
      </div>
    </section>
  )
}
