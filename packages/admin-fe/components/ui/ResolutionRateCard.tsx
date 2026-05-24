"use client"
import React, { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Area,
  ReferenceLine,
  Brush,
} from "recharts"

// Detailed point shape reflecting prisma schema intent:
// - agentsRate: resolution rate for primary-assigned agents
// - municipalRate: resolution rate for municipal admins managing the complaints
// - coAssignedRate: resolution rate for complaints where an agent was co-assigned
type Point = { date: string; agentsRate: number; municipalRate: number; coAssignedRate: number }

// Type for controlling which lines are visible
type VisibleLines = {
  agents: boolean
  coAssigned: boolean
  municipal: boolean
}

const mockData: Point[] = [
  { date: "Nov 25", agentsRate: 68, municipalRate: 55, coAssignedRate: 60 },
  { date: "Nov 26", agentsRate: 72, municipalRate: 58, coAssignedRate: 63 },
  { date: "Nov 27", agentsRate: 70, municipalRate: 60, coAssignedRate: 61 },
  { date: "Nov 28", agentsRate: 75, municipalRate: 62, coAssignedRate: 68 },
  { date: "Nov 29", agentsRate: 78, municipalRate: 64, coAssignedRate: 70 },
  { date: "Nov 30", agentsRate: 80, municipalRate: 67, coAssignedRate: 72 },
  { date: "Dec 01", agentsRate: 82, municipalRate: 70, coAssignedRate: 75 },
]

// Simple animated counter for percent values (no external motion deps)
export function SlidingNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(Math.round(value))
  const fromRef = useRef(display)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const from = fromRef.current
    const to = Math.round(value)
    const duration = 600
    const start = performance.now()

    function step(now: number) {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      const cur = Math.round(from + (to - from) * eased)
      setDisplay(cur)
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step)
      } else {
        fromRef.current = to
      }
    }

    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(step)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [value])

  return <span className='tabular-nums'>{display}</span>
}

interface ResolutionRateCardProps {
  data?: Point[]
  visibleLines?: VisibleLines
}

export default function ResolutionRateCard({ 
  data, 
  visibleLines = { agents: true, coAssigned: true, municipal: true } 
}: ResolutionRateCardProps) {
  const chartData = data || mockData
  const last = chartData[chartData.length - 1]
  const prev = chartData.length > 1 ? chartData[chartData.length - 2] : last

  const pctDelta = (current: number, previous: number) => {
    if (!previous) return "0%"
    const diff = current - previous
    const sign = diff >= 0 ? "+" : "-"
    return `${sign}${Math.abs(diff)}%`
  }

  function CustomTooltip({ active, label, payload }: { active?: boolean; label?: string; payload?: any[] }) {
    if (!active || !label) return null

    const allSeries = [
      { key: 'agentsRate', name: 'Agents', color: '#3b82f6', visible: visibleLines.agents },
      { key: 'municipalRate', name: 'Municipal Admins', color: '#8b5cf6', visible: visibleLines.municipal },
      { key: 'coAssignedRate', name: 'Co-assigned Agents', color: '#06b6d4', visible: visibleLines.coAssigned },
    ]

    const series = allSeries.filter(s => s.visible)

    // payload is an array of { dataKey, value, name, color }
    return (
      <div className="bg-white text-sm text-gray-700 p-2 rounded shadow">
        <div className="font-medium">{label}</div>
        <div className="mt-2 flex flex-col gap-1">
          {series.map((s) => {
            const entry = payload && payload.find((p) => p && (p.dataKey === s.key || p.name === s.name || p.dataKey === s.name))
            const value = entry?.value
            return (
              <div key={s.key} className="flex items-center gap-2 text-xs text-gray-600">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="flex-1">{s.name}</span>
                <span className="font-medium">{typeof value === 'number' ? `${Math.round(value)}%` : '—'}</span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Prevent browser focus outlines on SVG / brush elements inside the chart wrapper
  const wrapperRef = React.useRef<HTMLDivElement | null>(null)
  React.useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    const onFocusIn = (ev: FocusEvent) => {
      const target = ev.target as HTMLElement | null
      if (!target) return
      try {
        target.style.outline = 'none'
        // @ts-ignore
        target.style.boxShadow = 'none'
      } catch (e) {
        // ignore
      }
    }
    el.addEventListener('focusin', onFocusIn)
    return () => el.removeEventListener('focusin', onFocusIn)
  }, [])

  // Build description based on visible lines
  const getDescription = () => {
    const parts: string[] = []
    if (visibleLines.agents) parts.push('Primary agents')
    if (visibleLines.coAssigned) parts.push('co-assigned agents')
    if (visibleLines.municipal) parts.push('municipal admins')
    return parts.join(', ')
  }

  return (
    <Card className="focus:outline-none focus:ring-0">
      <CardHeader className="flex items-start justify-between">
        <div>
          <CardTitle className="text-lg font-semibold text-gray-900">Resolution Rates</CardTitle>
          <p className="text-sm text-gray-500">{getDescription()}</p>
        </div>
        <div className="ml-4 flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="inline-block w-6 h-0.5 bg-red-500" />
            <span className="font-medium">SLA Target</span>
            <span className="text-md text-gray-500">75%</span>
            {visibleLines.agents && (
              <>
                <span className="inline-block w-6 h-0.5 bg-blue-500" />
                <span className="text-md text-gray-500">Agent</span>
              </>
            )}
            {visibleLines.municipal && (
              <>
                <span className="inline-block w-6 h-0.5 bg-purple-500 ml-3" />
                <span className="text-md text-gray-500">Municipal</span>
              </>
            )}
            {visibleLines.coAssigned && (
              <>
                <span className="inline-block w-6 h-0.5 bg-teal-500 ml-3" />
                <span className="text-md text-gray-500">Co-assigned</span>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Scoped styles to darken brush endpoints on active/focus */}
        <style>{`.resolution-rate-card .recharts-brush-traveller rect { transition: fill .12s ease; } .resolution-rate-card .recharts-brush-traveller:active rect, .resolution-rate-card .recharts-brush-traveller:focus rect { fill: #6b7280 !important; }`}</style>
        <div
          className="h-80 outline-none resolution-rate-card"
          ref={wrapperRef}
          tabIndex={-1}
          style={{ outline: 'none', boxShadow: 'none', border: 'none' }}
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onMouseUp={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onFocus={(e) => { e.stopPropagation(); }}
          onFocusCapture={(e) => {
            // blur the focused child immediately to avoid any UA/stylesheet focus outline
            try {
              const t = e.target as HTMLElement | null
              if (t && typeof t.blur === 'function') t.blur()
            } catch (err) {
              // ignore
            }
            e.stopPropagation()
          }}
          onKeyDown={(e) => { e.stopPropagation(); }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 20, left: 6, bottom: 6 }}>
              <defs>
                <linearGradient id="gradAgents" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradMunicipal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradCoAssigned" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#6b7280" />
              <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" domain={[40, 100]} unit="%" />
              <Tooltip content={<CustomTooltip />} />

              {/* Areas to emphasize trends - conditionally rendered */}
              {visibleLines.agents && <Area type="monotone" dataKey="agentsRate" stroke="none" fill="url(#gradAgents)" />}
              {visibleLines.municipal && <Area type="monotone" dataKey="municipalRate" stroke="none" fill="url(#gradMunicipal)" />}
              {visibleLines.coAssigned && <Area type="monotone" dataKey="coAssignedRate" stroke="none" fill="url(#gradCoAssigned)" />}

              {/* Lines on top - conditionally rendered */}
              {visibleLines.agents && <Line type="monotone" dataKey="agentsRate" name="Agents" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3 }} activeDot={false} />}
              {visibleLines.municipal && <Line type="monotone" dataKey="municipalRate" name="Municipal Admins" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} activeDot={false} />}
              {visibleLines.coAssigned && <Line type="monotone" dataKey="coAssignedRate" name="Co-assigned Agents" stroke="#06b6d4" strokeWidth={2} dot={{ r: 3 }} activeDot={false} />}

              {/* Reference SLA line (example) */}
              <ReferenceLine y={75} stroke="#ef4444" strokeDasharray="4 4" />
              {/* Brush for range selection */}
                <Brush dataKey="date" height={24} stroke="#ccc" tickFormatter={() => ""} travellerWidth={12} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Conclusions area - conditionally rendered insight cards */}
        <div className={`mt-4 grid grid-cols-1 ${visibleLines.agents && visibleLines.coAssigned ? 'md:grid-cols-2' : ''} gap-4`}>
            {/* Agents insight card (only shown if agents visible) */}
            {visibleLines.agents && (
            <div className="rounded-lg overflow-hidden shadow-md bg-white">
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm text-gray-600">Agents Resolution</div>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="text-4xl font-extrabold text-sky-600">{chartData.length > 0 ? (<><SlidingNumber value={last.agentsRate} /><span className="ml-1">%</span></>) : "No data"}</div>
                      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${last.agentsRate - prev.agentsRate >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {last.agentsRate - prev.agentsRate >= 0 ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 011 1v6a1 1 0 11-2 0v-4H8a1 1 0 01-1-1z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M15 10a1 1 0 00-1-1H6a1 1 0 100 2h8a1 1 0 001-1z" clipRule="evenodd" />
                          </svg>
                        )}
                        <span>{pctDelta(last.agentsRate, prev.agentsRate)}</span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Compared to {prev.agentsRate}% in previous period</div>
                  </div>
                  <div className="ml-4 hidden md:flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <div className="text-xs text-gray-500">Mean Time to Resolve</div>
                      <div className="ml-auto text-sm font-semibold">6 hrs</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-xs text-gray-500">Escalation Rate</div>
                      <div className="ml-auto text-sm font-semibold text-green-600">10%</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            )}

          {/* Co-assigned insight card (only shown if coAssigned visible) */}
          {visibleLines.coAssigned && (
          <div className="rounded-lg overflow-hidden shadow-md bg-white">
            <div className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm text-gray-600">{visibleLines.municipal ? 'Co-assigned vs Municipal' : 'Co-assigned Agents Resolution'}</div>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="text-4xl font-extrabold text-teal-600">{chartData.length > 0 ? (<><SlidingNumber value={last.coAssignedRate} /><span className="ml-1">%</span></>) : "No data"}</div>
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${last.coAssignedRate - prev.coAssignedRate >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {last.coAssignedRate - prev.coAssignedRate >= 0 ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 011 1v6a1 1 0 11-2 0v-4H8a1 1 0 01-1-1z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M15 10a1 1 0 00-1-1H6a1 1 0 100 2h8a1 1 0 001-1z" clipRule="evenodd" />
                        </svg>
                      )}
                      <span>{pctDelta(last.coAssignedRate, prev.coAssignedRate)}</span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{visibleLines.municipal ? 'Co-assigned complaints show collaborative resolution trends; compare with municipal rates for coordination.' : 'Co-assigned complaints show collaborative resolution trends.'}</div>
                </div>
                {visibleLines.municipal && (
                <div className="ml-4 hidden md:flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="text-xs text-gray-500">Avg Agent Collaboration</div>
                    <div className="ml-auto text-sm font-semibold">2.1 agents</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-xs text-gray-500">Municipal Rate</div>
                    <div className="ml-auto text-sm font-semibold text-purple-600">{chartData.length > 0 ? (<><SlidingNumber value={last.municipalRate} /><span className="ml-1">%</span></>) : "No data"}</div>
                  </div>
                </div>
                )}
              </div>
            </div>
          </div>
          )}
        </div>

        {/* Short explanation (2 lines) */}
        <div className="mt-4 text-sm text-gray-600">
          <div className="font-bold">How Metrics Are Calculated?</div>
          <div>( Complaints Resolved in Period ) / ( Total Complaints Assigned to That Role ) × 100. Compared Against SLA Target: 75%.</div>
        </div>
      </CardContent>
    </Card>
  )
}
