"use client"

import { useState, useCallback, useRef } from "react"

const SURVEY_API = process.env.NEXT_PUBLIC_SURVEY_REPORT || "http://localhost:8000"

/* ─── Types ─── */
export interface PipelineStep {
  id: string
  label: string
  detail: string
  status: "pending" | "active" | "done"
}

export interface SSEEvent {
  event: string
  data: Record<string, unknown>
}

export interface ReportStreamState {
  /* pipeline progress */
  steps: PipelineStep[]
  /* streamed token text (accumulated per phase) */
  surveyTokens: string
  backendTokens: string
  fusionTokens: string
  analyzeTokens: string
  /* parsed final reports */
  surveyReport: Record<string, unknown> | null
  backendReport: Record<string, unknown> | null
  fusionReport: Record<string, unknown> | null
  analyzeReport: Record<string, unknown> | null
  /* meta */
  isStreaming: boolean
  error: string | null
  pipelineMetadata: Record<string, unknown> | null
  /* console log lines for the live terminal */
  logLines: string[]
}

const INITIAL_SURVEY_STEPS: PipelineStep[] = [
  { id: "retrieval", label: "Retrieval", detail: "MMR Strategy", status: "pending" },
  { id: "deduplication", label: "Deduplication", detail: "Semantic Hash", status: "pending" },
  { id: "reranking", label: "Reranking", detail: "Cross-Encoder", status: "pending" },
  { id: "synthesis", label: "Synthesis", detail: "Gemini Pro", status: "pending" },
]

const INITIAL_ANALYZE_STEPS: PipelineStep[] = [
  { id: "retrieval", label: "Multi-Category Retrieval", detail: "13 Categories", status: "pending" },
  { id: "deduplication", label: "Global Dedup", detail: "Semantic Hash", status: "pending" },
  { id: "severity", label: "Severity Tagging", detail: "Urgency Levels", status: "pending" },
  { id: "synthesis", label: "Global Synthesis", detail: "Gemini Pro", status: "pending" },
]

function timestamp(): string {
  return new Date().toLocaleTimeString("en-US", { hour12: false })
}

/* ─── Hook ─── */
export function useReportStream() {
  const [state, setState] = useState<ReportStreamState>({
    steps: [],
    surveyTokens: "",
    backendTokens: "",
    fusionTokens: "",
    analyzeTokens: "",
    surveyReport: null,
    backendReport: null,
    fusionReport: null,
    analyzeReport: null,
    isStreaming: false,
    error: null,
    pipelineMetadata: null,
    logLines: [],
  })

  const abortRef = useRef<AbortController | null>(null)

  const addLog = useCallback((msg: string) => {
    setState(prev => ({
      ...prev,
      logLines: [...prev.logLines, `[${timestamp()}] ${msg}`],
    }))
  }, [])

  const updateStep = useCallback((stepId: string, status: PipelineStep["status"]) => {
    setState(prev => ({
      ...prev,
      steps: prev.steps.map(s => {
        if (s.id === stepId) return { ...s, status }
        // If marking a step active, ensure previous active steps become done
        if (status === "active" && s.status === "active") return { ...s, status: "done" }
        return s
      }),
    }))
  }, [])

  /* ─── Generic SSE reader ─── */
  const readSSE = useCallback(async (
    response: Response,
    onEvent: (evt: SSEEvent) => void,
    signal: AbortSignal,
  ) => {
    const reader = response.body?.getReader()
    if (!reader) throw new Error("No response body")
    const decoder = new TextDecoder()
    let buffer = ""

    while (true) {
      if (signal.aborted) break
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      // Parse SSE events (double-newline delimited)
      const parts = buffer.split("\n\n")
      buffer = parts.pop() || ""

      for (const part of parts) {
        let eventType = "message"
        let dataStr = ""
        for (const line of part.split("\n")) {
          if (line.startsWith("event:")) eventType = line.slice(6).trim()
          else if (line.startsWith("data:")) dataStr += line.slice(5).trim()
        }
        if (dataStr) {
          try {
            const data = JSON.parse(dataStr)
            onEvent({ event: eventType, data })
          } catch {
            // Non-JSON data, skip
          }
        }
      }
    }
  }, [])

  /* ─── Generate Survey Report (POST /survey-report/stream) ─── */
  const generateSurveyReport = useCallback(async (category: string) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setState(prev => ({
      ...prev,
      steps: INITIAL_SURVEY_STEPS.map(s => ({ ...s })),
      surveyTokens: "",
      backendTokens: "",
      fusionTokens: "",
      surveyReport: null,
      backendReport: null,
      fusionReport: null,
      isStreaming: true,
      error: null,
      pipelineMetadata: null,
      logLines: [],
    }))

    addLog(`Starting survey report generation for "${category}"...`)

    try {
      const res = await fetch(`${SURVEY_API}/survey-report/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category }),
        signal: controller.signal,
      })

      if (!res.ok) throw new Error(`Server error: ${res.status}`)

      await readSSE(res, (evt) => {
        const { event, data } = evt

        switch (event) {
          case "pipeline_start":
            addLog(`Pipeline started: ${data.message || "Initializing..."}`)
            updateStep("retrieval", "active")
            break

          case "progress": {
            const phase = (data.phase as string) || ""
            const msg = (data.message as string) || phase
            addLog(msg)

            if (phase.includes("retriev")) updateStep("retrieval", "active")
            else if (phase.includes("dedup")) {
              updateStep("retrieval", "done")
              updateStep("deduplication", "active")
            } else if (phase.includes("rerank") || phase.includes("severity")) {
              updateStep("deduplication", "done")
              updateStep("reranking", "active")
            } else if (phase.includes("generat") || phase.includes("synth") || phase.includes("llm")) {
              updateStep("reranking", "done")
              updateStep("synthesis", "active")
            }
            break
          }

          case "token": {
            const report = (data.report as string) || ""
            const chunk = (data.chunk as string) || ""
            setState(prev => {
              if (report.includes("survey")) return { ...prev, surveyTokens: prev.surveyTokens + chunk }
              if (report.includes("backend")) return { ...prev, backendTokens: prev.backendTokens + chunk }
              if (report.includes("fusion")) return { ...prev, fusionTokens: prev.fusionTokens + chunk }
              return prev
            })
            // add concise console entry for streaming content (trim to avoid massive logs)
            try {
              const snippet = chunk.replace(/\s+/g, " ").trim().slice(0, 200)
              if (snippet.length > 0) addLog(`[stream:${report}] ${snippet}${chunk.length > 200 ? '…' : ''}`)
            } catch {
              // ignore logging failures
            }
            break
          }

          case "phase_complete": {
            const phase = (data.phase as string) || ""
            const report = data.report as Record<string, unknown> | undefined
            addLog(`Phase complete: ${phase} (${(data.elapsed_s as number)?.toFixed(1) || "?"}s)`)

            setState(prev => {
              const update: Partial<ReportStreamState> = {}
              if (phase.includes("survey") && report) update.surveyReport = report
              if (phase.includes("backend") && report) update.backendReport = report
              if (phase.includes("fusion") && report) update.fusionReport = report
              return { ...prev, ...update }
            })
            break
          }

          case "complete":
            addLog(`Pipeline complete! Total: ${(data.total_time_seconds as number)?.toFixed(1) || "?"}s`)
            setState(prev => ({
              ...prev,
              isStreaming: false,
              pipelineMetadata: data as Record<string, unknown>,
              steps: prev.steps.map(s => ({ ...s, status: "done" as const })),
            }))
            break

          case "error":
            addLog(`ERROR: ${data.message || JSON.stringify(data)}`)
            setState(prev => ({ ...prev, error: (data.message as string) || "Pipeline error", isStreaming: false }))
            break
        }
      }, controller.signal)

      // If stream ends without complete event
      setState(prev => prev.isStreaming ? { ...prev, isStreaming: false } : prev)

    } catch (err: unknown) {
      if ((err as Error).name === "AbortError") return
      const msg = (err as Error).message || "Unknown error"
      addLog(`FATAL: ${msg}`)
      setState(prev => ({ ...prev, error: msg, isStreaming: false }))
    }
  }, [addLog, updateStep, readSSE])

  /* ─── Generate Analyze Report (GET /analyze-report/stream) ─── */
  const generateAnalyzeReport = useCallback(async () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setState(prev => ({
      ...prev,
      steps: INITIAL_ANALYZE_STEPS.map(s => ({ ...s })),
      analyzeTokens: "",
      analyzeReport: null,
      isStreaming: true,
      error: null,
      pipelineMetadata: null,
      logLines: [],
    }))

    addLog("Starting global analysis report...")

    try {
      const res = await fetch(`${SURVEY_API}/analyze-report/stream`, {
        signal: controller.signal,
      })

      if (!res.ok) throw new Error(`Server error: ${res.status}`)

      await readSSE(res, (evt) => {
        const { event, data } = evt

        switch (event) {
          case "pipeline_start":
            addLog(`Pipeline started: ${data.message || "Multi-category analysis..."}`)
            updateStep("retrieval", "active")
            break

          case "progress": {
            const phase = (data.phase as string) || ""
            const msg = (data.message as string) || phase
            addLog(msg)

            if (phase.includes("retriev")) updateStep("retrieval", "active")
            else if (phase.includes("dedup")) {
              updateStep("retrieval", "done")
              updateStep("deduplication", "active")
            } else if (phase.includes("severity") || phase.includes("tag")) {
              updateStep("deduplication", "done")
              updateStep("severity", "active")
            } else if (phase.includes("generat") || phase.includes("synth") || phase.includes("llm")) {
              updateStep("severity", "done")
              updateStep("synthesis", "active")
            }
            break
          }

          case "token": {
            const chunk = (data.chunk as string) || ""
            setState(prev => ({ ...prev, analyzeTokens: prev.analyzeTokens + chunk }))
            break
          }

          case "phase_complete": {
            const report = data.report as Record<string, unknown> | undefined
            addLog(`Analysis complete (${(data.elapsed_s as number)?.toFixed(1) || "?"}s)`)
            if (report) setState(prev => ({ ...prev, analyzeReport: report }))
            break
          }

          case "complete":
            addLog(`Pipeline complete! Total: ${(data.total_time_seconds as number)?.toFixed(1) || "?"}s`)
            setState(prev => ({
              ...prev,
              isStreaming: false,
              pipelineMetadata: data as Record<string, unknown>,
              steps: prev.steps.map(s => ({ ...s, status: "done" as const })),
            }))
            break

          case "error":
            addLog(`ERROR: ${data.message || JSON.stringify(data)}`)
            setState(prev => ({ ...prev, error: (data.message as string) || "Pipeline error", isStreaming: false }))
            break
        }
      }, controller.signal)

      setState(prev => prev.isStreaming ? { ...prev, isStreaming: false } : prev)

    } catch (err: unknown) {
      if ((err as Error).name === "AbortError") return
      const msg = (err as Error).message || "Unknown error"
      addLog(`FATAL: ${msg}`)
      setState(prev => ({ ...prev, error: msg, isStreaming: false }))
    }
  }, [addLog, updateStep, readSSE])

  /* ─── Cancel ─── */
  const cancel = useCallback(() => {
    abortRef.current?.abort()
    setState(prev => ({ ...prev, isStreaming: false }))
  }, [])

  return {
    ...state,
    generateSurveyReport,
    generateAnalyzeReport,
    cancel,
  }
}
