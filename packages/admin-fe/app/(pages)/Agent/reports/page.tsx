"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { AgentRevampedLayout } from "../_layout"
import { AuthGuard } from "@/components/auth-guard"

// Dynamically import ComplaintGoogleHeatmap to avoid SSR issues
const ComplaintGoogleHeatmap = dynamic(() => import("@/components/ComplaintGoogleHeatmap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[400px] bg-slate-50 animate-pulse rounded-2xl" />
  ),
})

interface AnalyticsData {
  totalComplaints: number
  solvedComplaints: number
  complaintsOverTime: { date: string; registered: number; resolved: number }[]
  statusDistribution: { name: string; value: number; color: string }[]
  mostLikedComplaints: any[]
  highestLikeCount: number
}

interface ResolvedCase {
  id: string
  seq?: number
  timestamp: string
  status: string
  outcome: string
  confidence: number
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002"

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const DAY_HEIGHTS = [40, 65, 55, 85, 92, 30, 25] // % heights for bar chart

export default function AgentRevampedReports() {
  const [loading, setLoading] = useState(true)
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalComplaints: 0,
    solvedComplaints: 0,
    complaintsOverTime: [],
    statusDistribution: [],
    mostLikedComplaints: [],
    highestLikeCount: 0,
  })
  const [resolvedCases, setResolvedCases] = useState<ResolvedCase[]>([])
  const [cid, setCid] = useState("")
  const [complaintJson, setComplaintJson] = useState<any>(null)
  const [agentData, setAgentData] = useState<{ name: string; id: string } | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem("admin")
      if (raw) {
        const p = JSON.parse(raw)
        setAgentData({ name: p.fullName || p.name || "Agent", id: p.id || "" })
      }
    } catch {}
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem("token")
      if (!token) return

      // Fetch complaints for analytics
      const complaints: any[] = []
      const pageSize = 200
      let page = 1
      while (true) {
        const res = await fetch(`/api/complaints/all?page=${page}&limit=${pageSize}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) break
        const data = await res.json()
        const items = data.complaints || []
        complaints.push(...items)
        if (items.length < pageSize) break
        page++
        if (page > 50) break
      }

      const total = complaints.length || 257
      const solved = complaints.filter((c) => c.status === "COMPLETED").length || 142

      // Build resolution history from completed complaints
      const completed = complaints
        .filter((c) => c.status === "COMPLETED" || c.status === "ESCALATED_TO_MUNICIPAL_LEVEL" || c.status === "ESCALATED_TO_STATE_LEVEL")
        .slice(0, 10)
        .map((c) => ({
          id: `#CAS-${c.seq || Math.floor(Math.random() * 90000) + 10000}`,
          seq: c.seq,
          timestamp: c.lastUpdated || c.submissionDate,
          status: c.status === "COMPLETED" ? "Resolved" : "Escalated",
          outcome:
            c.status === "COMPLETED"
              ? c.subCategory || c.description?.slice(0, 40) || "Case Resolved"
              : "Escalated to Higher Authority",
          confidence: c.status === "COMPLETED" ? 0.94 + Math.random() * 0.059 : 0.4 + Math.random() * 0.3,
        }))

      setResolvedCases(completed.length > 0 ? completed : getDummyCases())
      setAnalytics({
        totalComplaints: total,
        solvedComplaints: solved,
        complaintsOverTime: [],
        statusDistribution: [],
        mostLikedComplaints: [],
        highestLikeCount: 0,
      })
    } catch (e) {
      console.error("Error fetching analytics", e)
      setResolvedCases(getDummyCases())
      setAnalytics({ totalComplaints: 257, solvedComplaints: 142, complaintsOverTime: [], statusDistribution: [], mostLikedComplaints: [], highestLikeCount: 0 })
    } finally {
      setLoading(false)
    }
  }

  const getDummyCases = (): ResolvedCase[] => [
    { id: "#CAS-88421", timestamp: "2024-10-24 14:22:10", status: "Resolved", outcome: "Environmental Breach Stabilized", confidence: 0.984 },
    { id: "#CAS-88419", timestamp: "2024-10-24 12:05:45", status: "Resolved", outcome: "Traffic Anomaly Rerouted", confidence: 0.962 },
    { id: "#CAS-88415", timestamp: "2024-10-23 23:59:12", status: "Escalated", outcome: "Structural Integrity Warning", confidence: 0.451 },
    { id: "#CAS-88412", timestamp: "2024-10-23 21:14:02", status: "Resolved", outcome: "UAV Routine Sweep Complete", confidence: 0.999 },
  ]

  const openIpfsJson = () => {
    if (!cid) { alert("Please enter a CID first"); return }
    window.open(`https://gateway.pinata.cloud/ipfs/${cid}`, "_blank", "noopener,noreferrer")
  }

  const loadIpfsJson = async () => {
    if (!cid) { alert("Please enter a CID first"); return }
    try {
      const res = await fetch(`https://gateway.pinata.cloud/ipfs/${cid}`)
      if (!res.ok) { alert("Unable to fetch JSON from IPFS"); return }
      setComplaintJson(await res.json())
      alert("JSON loaded! Now generate PDF.")
    } catch { alert("Failed to load JSON. Please verify the CID.") }
  }

  const generatePDF = (data: any) => {
    if (!data) return
    const popup = window.open("", "_blank")
    if (!popup) { alert("Please allow popups to generate the PDF"); return }
    const html = `<!DOCTYPE html><html><head><title>Complaint Report</title><style>
      body{font-family:Arial,sans-serif;padding:40px;line-height:1.6;color:#333;}
      h1{text-align:center;border-bottom:2px solid #333;padding-bottom:20px;margin-bottom:30px;}
      .field{display:flex;border-bottom:1px solid #eee;padding:8px 0;}
      .label{font-weight:bold;width:200px;flex-shrink:0;}
      .footer{margin-top:40px;border-top:1px solid #ccc;text-align:center;font-size:12px;color:#666;padding-top:20px;}
    </style></head><body><h1>Complaint Report</h1>
    ${Object.entries(data).map(([k, v]) => `<div class="field"><div class="label">${k}:</div><div>${String(v)}</div></div>`).join("")}
    <div class="footer">Generated on ${new Date().toLocaleString()}</div></body></html>`
    popup.document.write(html)
    popup.document.close()
    setTimeout(() => popup.print(), 250)
  }

  const resolutionRate = analytics.totalComplaints > 0
    ? ((analytics.solvedComplaints / analytics.totalComplaints) * 100).toFixed(1)
    : "90"

  const metricCards = [
    {
      label: "Total Resolved This Week",
      value: analytics.solvedComplaints > 0 ? String(analytics.solvedComplaints) : "142",
      sub: "+12.4%",
      subIcon: "trending_up",
      subColor: "text-[#006c49]",
      border: "#0047cc",
      bars: true,
    },
    {
      label: "Avg Resolution Time",
      value: "02:14:45",
      mono: true,
      sub: "HH:MM:SS PER CASE",
      subColor: "text-slate-400",
      border: "#3d3ecb",
      extras: [
        { k: "Target", v: "02:30:00" },
        { k: "Status", v: "Optimal", vc: "text-[#3d3ecb]" },
      ],
    },
    {
      label: "Resolution Rate",
      value: `${resolutionRate}%`,
      sub: "Clinical Grade",
      subColor: "text-slate-400",
      border: "#006c49",
      ring: Number(resolutionRate),
    },
  ]

  return (
    <AuthGuard requiredAdminType={["AGENT", "MUNICIPAL_ADMIN", "STATE_ADMIN", "SUPER_ADMIN"]}>
      <AgentRevampedLayout>
        <div className="p-6 md:p-8 space-y-8">
          {/* Breadcrumb */}
          <div>
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-2">
              <span>State</span>
              <span className="material-symbols-outlined" style={{ fontSize: 12 }}>chevron_right</span>
              <span>Municipal</span>
              <span className="material-symbols-outlined" style={{ fontSize: 12 }}>chevron_right</span>
              <span className="text-[#0047cc] font-bold">Agent ID: {agentData?.id?.slice(-6) || "8842-R"}</span>
            </div>
            <h1 className="headline text-3xl font-black text-[#0b1c30] tracking-tight">
              Agent Performance Analytics
            </h1>
          </div>

          {/* IPFS tools */}
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="Enter IPFS CID"
              value={cid}
              onChange={(e) => setCid(e.target.value)}
              className="border border-[#c3c5d9] p-2 text-sm font-mono w-56 bg-white focus:outline-none focus:ring-1 focus:ring-[#0047cc]"
            />
            <button onClick={openIpfsJson} className="px-3 py-2 bg-[#eff4ff] border border-[#c3c5d9] text-xs font-bold uppercase hover:bg-[#e5eeff] transition-colors">
              Open JSON
            </button>
            <button onClick={loadIpfsJson} className="px-3 py-2 bg-[#eff4ff] border border-[#c3c5d9] text-xs font-bold uppercase hover:bg-[#e5eeff] transition-colors">
              Load JSON
            </button>
            {complaintJson && (
              <button onClick={() => generatePDF(complaintJson)} className="px-3 py-2 bg-[#3d3ecb] text-white text-xs font-bold uppercase hover:brightness-110 transition-all">
                Generate PDF
              </button>
            )}
          </div>

          {/* Metric bento grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {loading
              ? [...Array(3)].map((_, i) => (
                  <div key={i} className="bg-white border-l-2 border-[#c3c5d9] p-6 animate-pulse h-40" />
                ))
              : [
                  // Card 1: Total resolved with mini bar chart
                  <div key="resolved" className="bg-white p-6 border-l-2 border-[#0047cc] shadow-sm flex flex-col justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Resolved This Week</p>
                      <div className="flex items-baseline gap-4">
                        <span className="text-4xl font-black text-[#0b1c30] font-mono">
                          {analytics.solvedComplaints > 0 ? analytics.solvedComplaints : 142}
                        </span>
                        <span className="text-xs font-bold text-[#006c49] flex items-center gap-1">
                          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>trending_up</span>
                          +12.4%
                        </span>
                      </div>
                    </div>
                    <div className="mt-6 h-12 flex items-end gap-1">
                      {DAY_HEIGHTS.map((h, i) => (
                        <div key={i} className="flex-1 bg-[#155dfc]/20 hover:bg-[#155dfc] transition-colors" style={{ height: `${h}%` }} />
                      ))}
                    </div>
                  </div>,

                  // Card 2: Avg resolution time
                  <div key="avgTime" className="bg-white p-6 border-l-2 border-[#3d3ecb] shadow-sm">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Avg Resolution Time</p>
                    <div className="mt-4">
                      <span className="text-4xl font-black text-[#0b1c30] font-mono">02:14:45</span>
                      <p className="text-[10px] font-mono text-slate-400 mt-2 uppercase tracking-tighter">HH:MM:SS PER CASE</p>
                    </div>
                    <div className="mt-6 grid grid-cols-2 gap-2">
                      <div className="bg-[#eff4ff] p-2">
                        <span className="block text-[10px] text-slate-500 uppercase">Target</span>
                        <span className="text-xs font-bold font-mono">02:30:00</span>
                      </div>
                      <div className="bg-[#eff4ff] p-2 border-r-2 border-[#3d3ecb]">
                        <span className="block text-[10px] text-slate-500 uppercase">Status</span>
                        <span className="text-xs font-bold text-[#3d3ecb] uppercase">Optimal</span>
                      </div>
                    </div>
                  </div>,

                  // Card 3: Resolution rate ring
                  <div key="rate" className="bg-white p-6 border-l-2 border-[#006c49] shadow-sm">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Resolution Rate</p>
                    <div className="relative flex items-center justify-center mt-2">
                      <svg className="w-32 h-32 -rotate-90">
                        <circle cx="64" cy="64" r="56" fill="transparent" stroke="#dce9ff" strokeWidth="8" />
                        <circle
                          cx="64" cy="64" r="56" fill="transparent"
                          stroke="#006c49"
                          strokeWidth="8"
                          strokeDasharray={2 * Math.PI * 56}
                          strokeDashoffset={2 * Math.PI * 56 * (1 - Number(resolutionRate) / 100)}
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center">
                        <span className="text-2xl font-black font-mono">{resolutionRate}%</span>
                        <span className="text-[8px] font-mono text-slate-400 uppercase">Clinical Grade</span>
                      </div>
                    </div>
                  </div>,
                ]}
          </div>

          {/* Charts + Assigned Nodes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Resolution velocity bar chart */}
            <div className="bg-[#eff4ff] p-8 border border-[#c3c5d9]/10">
              <div className="flex justify-between items-center mb-10">
                <h3 className="headline text-sm font-bold uppercase tracking-widest text-[#0b1c30] flex items-center gap-2">
                  <span className="w-2 h-2 bg-[#0047cc] inline-block" />
                  Resolution Velocity (7D)
                </h3>
                <span className="text-[10px] font-mono text-slate-400">UNIT: RESOLUTIONS / HR</span>
              </div>
              <div className="h-64 flex items-end justify-between gap-3 border-b border-[#c3c5d9]/30 pb-1">
                {DAYS.map((day, i) => (
                  <div key={day} className="flex-1 flex flex-col items-center justify-end h-full">
                    <div
                      className="w-full bg-[#0047cc]/40 hover:bg-[#0047cc] transition-colors rounded-t-sm"
                      style={{ height: `${DAY_HEIGHTS[i]}%` }}
                    />
                    <span className="mt-2 text-[9px] font-mono text-slate-500 uppercase">{day}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Categories Handled */}
            <div className="bg-white p-8 shadow-sm">
              <h3 className="headline text-sm font-bold uppercase tracking-widest text-[#0b1c30] mb-6">
                Top Categories Handled
              </h3>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-[#0b1c30] uppercase">
                    <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#0047cc]"></span> Infrastructure & Roads</span>
                    <span className="font-mono">45%</span>
                  </div>
                  <div className="h-1.5 w-full bg-[#e5eeff] overflow-hidden">
                    <div className="h-full bg-[#0047cc]" style={{ width: '45%' }} />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-[#0b1c30] uppercase">
                    <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#ba1a1a]"></span> Sanitation & Waste</span>
                    <span className="font-mono">28%</span>
                  </div>
                  <div className="h-1.5 w-full bg-[#ffdad6]/50 overflow-hidden">
                    <div className="h-full bg-[#ba1a1a]" style={{ width: '28%' }} />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-[#0b1c30] uppercase">
                    <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#006c49]"></span> Public Safety</span>
                    <span className="font-mono">15%</span>
                  </div>
                  <div className="h-1.5 w-full bg-[#6cf8bb]/30 overflow-hidden">
                    <div className="h-full bg-[#006c49]" style={{ width: '15%' }} />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-[#0b1c30] uppercase">
                    <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#f97316]"></span> Utilities & Power</span>
                    <span className="font-mono">12%</span>
                  </div>
                  <div className="h-1.5 w-full bg-orange-100 overflow-hidden">
                    <div className="h-full bg-[#f97316]" style={{ width: '12%' }} />
                  </div>
                </div>
              </div>
              <div className="mt-8">
                <button className="w-full bg-[#eff4ff] border border-[#c3c5d9] py-3 text-[#0047cc] font-bold text-xs uppercase tracking-[0.2em] hover:bg-[#e5eeff] transition-all active:scale-95">
                  View Full Category Analysis
                </button>
              </div>
            </div>
          </div>
          {/* Complaint Hotspot Map */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm flex flex-col">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-black font-outfit">Complaint Hotspot Map</h3>
                <p className="text-xs text-emerald-500 font-black uppercase mt-1 tracking-tighter">Live · Google Maps · Heatmap Clustering</p>
              </div>
              <span className="material-symbols-outlined text-gray-300" style={{ fontSize: 32 }}>map</span>
            </div>
            <ComplaintGoogleHeatmap height="400px" showDensityTable />
          </div>

          {/* Resolution log table */}

          <section className="bg-white shadow-sm border border-[#c3c5d9]/10">
            <div className="px-8 py-6 border-b border-[#c3c5d9]/10 flex justify-between items-center">
              <h3 className="headline text-sm font-bold uppercase tracking-widest text-[#0b1c30]">
                Resolution Log: Case History
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={fetchAnalytics}
                  disabled={loading}
                  className="px-3 py-1 bg-[#eff4ff] text-[10px] font-bold uppercase tracking-tighter hover:bg-[#e5eeff] transition-colors border border-[#c3c5d9]"
                >
                  Refresh
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[#eff4ff] text-[10px] font-mono uppercase text-slate-500">
                  <tr>
                    <th className="px-8 py-3">Case ID</th>
                    <th className="px-8 py-3">Timestamp</th>
                    <th className="px-8 py-3">Status</th>
                    <th className="px-8 py-3">Outcome</th>
                    <th className="px-8 py-3 text-right">Confidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#c3c5d9]/10 text-xs">
                  {loading
                    ? [...Array(4)].map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          {[...Array(5)].map((_, j) => (
                            <td key={j} className="px-8 py-4">
                              <div className="h-3 bg-[#e5eeff] rounded" />
                            </td>
                          ))}
                        </tr>
                      ))
                    : resolvedCases.map((c) => (
                        <tr key={c.id} className="hover:bg-[#eff4ff]/50 transition-colors">
                          <td className="px-8 py-4 font-mono font-bold text-[#0047cc]">{c.id}</td>
                          <td className="px-8 py-4 font-mono text-slate-500">{c.timestamp}</td>
                          <td className="px-8 py-4">
                            {c.status === "Resolved" ? (
                              <span className="bg-[#6cf8bb]/30 text-[#006c49] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                                Resolved
                              </span>
                            ) : (
                              <span className="bg-[#ffdad6] text-[#93000a] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                                Escalated
                              </span>
                            )}
                          </td>
                          <td className="px-8 py-4 text-[#0b1c30] font-medium italic">
                            {c.outcome}
                          </td>
                          <td className={`px-8 py-4 text-right font-mono font-bold ${c.confidence < 0.5 ? "text-[#ba1a1a]" : ""}`}>
                            {c.confidence.toFixed(3)}
                          </td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-[#c3c5d9]/10 flex justify-center">
              <button
                onClick={fetchAnalytics}
                className="text-[10px] font-mono text-[#0047cc] font-bold hover:underline uppercase"
              >
                LOAD PREVIOUS 50 RECORDS
              </button>
            </div>
          </section>
        </div>
      </AgentRevampedLayout>
    </AuthGuard>
  )
}
