"use client"

import { useState, useEffect } from "react"
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
export function MunicipalAnalytics() {
  const [loading, setLoading] = useState(true)
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    totalComplaints: 0,
    solvedComplaints: 0,
    mostLikedComplaints: [],
    highestLikeCount: 0,
  })


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

      {/* ── Section 2: Departmental Efficiency + Root Causes ── */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Departmental Resolution Efficiency */}
        <div className="lg:col-span-8 bg-white p-6 rounded-xl shadow-sm border border-[#c4c6cd]/10">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="font-bold text-lg text-[#191c1d]">Departmental Resolution Efficiency</h3>
              <p className="text-xs text-[#44474c]">Performance benchmarks by municipal service sector</p>
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

      {/* ── Section 3: Geospatial Hotspots ── */}
      <section className="bg-white rounded-xl shadow-sm border border-[#c4c6cd]/10 overflow-hidden">
        <div className="px-6 py-4 border-b border-[#c4c6cd]/10 flex justify-between items-center bg-[#f3f4f5]/50">
          <h3 className="font-bold text-base text-[#191c1d]">Geospatial Hotspots: Complaint Location Density</h3>
          <span className="px-2 py-1 bg-[#ba1a1a]/10 text-[#ba1a1a] text-[10px] font-black rounded uppercase">Live Data</span>
        </div>
        <ComplaintGoogleHeatmap height="360px" showDensityTable />
      </section>

      {/* ── Section 4: Intelligence Hub + Export Protocol ── */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Intelligence Hub */}
        <div className="lg:col-span-4 bg-white p-6 rounded-xl shadow-sm border border-[#c4c6cd]/10">
          <h3 className="font-bold text-lg text-[#191c1d] mb-6">Intelligence Hub</h3>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-[#44474c] mb-2 block">Financial Year</label>
              <select className="w-full bg-[#f3f4f5] border-none rounded-lg py-2.5 px-4 text-sm font-medium focus:ring-2 focus:ring-[#d2e4fb]/40">
                <option>FY 2025-26 (Current)</option>
                <option>FY 2024-25</option>
                <option>FY 2023-24</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-[#44474c] mb-2 block">Department Segment</label>
              <select className="w-full bg-[#f3f4f5] border-none rounded-lg py-2.5 px-4 text-sm font-medium focus:ring-2 focus:ring-[#d2e4fb]/40">
                <option>All Departments</option>
                <option>Water &amp; Sanitation</option>
                <option>Public Works (PWD)</option>
                <option>Healthcare Services</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-[#44474c] mb-2 block">SLA Compliance Status</label>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2 bg-[#f3f4f5] p-2.5 rounded-lg cursor-pointer">
                  <input defaultChecked type="checkbox" className="rounded text-[#041627] focus:ring-[#041627] border-none" />
                  <span className="text-xs font-bold text-[#191c1d]">Compliant</span>
                </label>
                <label className="flex items-center gap-2 bg-[#f3f4f5] p-2.5 rounded-lg cursor-pointer">
                  <input defaultChecked type="checkbox" className="rounded text-[#ba1a1a] focus:ring-[#ba1a1a] border-none" />
                  <span className="text-xs font-bold text-[#191c1d]">Breached</span>
                </label>
              </div>
            </div>
            <button
              onClick={() => { fetchAnalytics(); fetchMostLiked() }}
              className="w-full bg-[#041627] text-white py-3 rounded-lg font-bold text-sm mt-2 hover:bg-[#1a2b3c] transition-colors shadow-lg shadow-[#041627]/10 active:scale-[0.98]"
            >
              Apply Intelligence Filters
            </button>
          </div>
        </div>

        {/* Export Protocol */}
        <div className="lg:col-span-8 bg-[#f3f4f5] p-8 rounded-xl relative overflow-hidden">
          <div className="relative z-10 h-full flex flex-col justify-between">
            <div>
              <h2 className="font-black text-2xl tracking-tighter text-[#041627] mb-2">Export Protocol</h2>
              <p className="text-sm text-[#44474c] max-w-lg mb-8">
                Securely retrieve administrative governance data in structured formats for ministerial auditing or archiving.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button className="bg-white p-6 rounded-xl flex items-center justify-between group hover:shadow-md transition-all border border-transparent hover:border-[#c4c6cd]/20">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-[#115cb9]/5 text-[#115cb9] rounded-lg">
                    <span className="material-symbols-outlined">table_view</span>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-[#041627]">Download CSV</p>
                    <p className="text-[10px] text-[#44474c]">Compatible with Excel/Sheets</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-[#74777d] group-hover:text-[#041627] transition-colors">download</span>
              </button>
              <button className="bg-white p-6 rounded-xl flex items-center justify-between group hover:shadow-md transition-all border border-transparent hover:border-[#c4c6cd]/20">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-[#041627]/5 text-[#041627] rounded-lg">
                    <span className="material-symbols-outlined">data_object</span>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-[#041627]">Download JSON</p>
                    <p className="text-[10px] text-[#44474c]">Optimized for API ingest</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-[#74777d] group-hover:text-[#041627] transition-colors">download</span>
              </button>
            </div>
          </div>
          <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-[#041627]/5 rounded-full blur-3xl" />
        </div>
      </section>

    </div>
  )
}
