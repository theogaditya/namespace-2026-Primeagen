"use client"
import React from "react"
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

const mockData: Point[] = [
  { date: "Nov 25", agentsRate: 68, municipalRate: 55, coAssignedRate: 60 },
  { date: "Nov 26", agentsRate: 72, municipalRate: 58, coAssignedRate: 63 },
  { date: "Nov 27", agentsRate: 70, municipalRate: 60, coAssignedRate: 61 },
  { date: "Nov 28", agentsRate: 75, municipalRate: 62, coAssignedRate: 68 },
  { date: "Nov 29", agentsRate: 78, municipalRate: 64, coAssignedRate: 70 },
  { date: "Nov 30", agentsRate: 80, municipalRate: 67, coAssignedRate: 72 },
  { date: "Dec 01", agentsRate: 82, municipalRate: 70, coAssignedRate: 75 },
]

export default function ResolutionRateCard({ data }: { data?: Point[] }) {
  const chartData = data || mockData
  const last = chartData[chartData.length - 1]
  const prev = chartData.length > 1 ? chartData[chartData.length - 2] : last

  const pctDelta = (current: number, previous: number) => {
    if (!previous) return "0%"
    const diff = current - previous
    const sign = diff >= 0 ? "+" : "-"
    return `${sign}${Math.abs(diff)}%`
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

  return (
    <Card className="focus:outline-none focus:ring-0">
      <CardHeader className="flex items-start justify-between">
        <div>
          <CardTitle className="text-lg font-semibold text-gray-900">Resolution Rates</CardTitle>
          <p className="text-sm text-gray-500">Primary agents, municipal admins, and co-assigned agents</p>
        </div>
        <div className="ml-4 flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="inline-block w-6 h-0.5 bg-red-500" />
            <span className="font-medium">SLA Target</span>
            <span className="text-xs text-gray-500">75%</span>
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
              <Tooltip formatter={(value: number) => `${value}%`} />

              {/* Areas to emphasize trends */}
              <Area type="monotone" dataKey="agentsRate" stroke="none" fill="url(#gradAgents)" />
              <Area type="monotone" dataKey="municipalRate" stroke="none" fill="url(#gradMunicipal)" />
              <Area type="monotone" dataKey="coAssignedRate" stroke="none" fill="url(#gradCoAssigned)" />

              {/* Lines on top */}
              <Line type="monotone" dataKey="agentsRate" name="Agents" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3 }} activeDot={false} />
              <Line type="monotone" dataKey="municipalRate" name="Municipal Admins" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} activeDot={false} />
              <Line type="monotone" dataKey="coAssignedRate" name="Co-assigned Agents" stroke="#06b6d4" strokeWidth={2} dot={{ r: 3 }} activeDot={false} />

              {/* Reference SLA line (example) */}
              <ReferenceLine y={75} stroke="#ef4444" strokeDasharray="4 4" />

              {/* Brush for range selection */}
                <Brush dataKey="date" height={24} stroke="#ccc" tickFormatter={() => ""} travellerWidth={12} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Conclusions area - two short highlight cards like the reference image */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Agents insight card (site style) */}
            <div className="rounded-lg overflow-hidden shadow-md bg-white">
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm text-gray-600">Agents Resolution</div>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="text-4xl font-extrabold text-sky-600">{last.agentsRate}%</div>
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

          {/* Co-assigned insight card (styled) */}
          <div className="rounded-lg overflow-hidden shadow-md bg-white">
            <div className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm text-gray-600">Co-assigned vs Municipal</div>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="text-4xl font-extrabold text-teal-600">{last.coAssignedRate}%</div>
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
                  <div className="text-xs text-gray-500 mt-1">Co-assigned complaints show collaborative resolution trends; compare with municipal rates for coordination.</div>
                </div>
                <div className="ml-4 hidden md:flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="text-xs text-gray-500">Avg Agent Collaboration</div>
                    <div className="ml-auto text-sm font-semibold">2.1 agents</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-xs text-gray-500">Municipal Rate</div>
                    <div className="ml-auto text-sm font-semibold text-purple-600">{last.municipalRate}%</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
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
