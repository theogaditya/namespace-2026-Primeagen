"use client"

import { useState, useEffect, useMemo } from "react"
import dynamic from "next/dynamic"
import { AgentRevampedLayout } from "./_layout"
import { AuthGuard } from "@/components/auth-guard"
import { ChatModal } from "@/components/chat-modal"

// Complaint heatmap — loaded client-side only
const ComplaintGoogleHeatmap = dynamic(() => import("@/components/ComplaintGoogleHeatmap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[300px] bg-[#edeeef] rounded-xl flex items-center justify-center text-slate-400">
      <span className="material-symbols-outlined mr-2 animate-spin" style={{ fontSize: 20 }}>progress_activity</span>
      Loading heatmap...
    </div>
  ),
})

// Leaflet dynamically imported to avoid SSR issues
const MapContainer = dynamic(() => import("react-leaflet").then((m) => m.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false })
const Marker = dynamic(() => import("react-leaflet").then((m) => m.Marker), { ssr: false })

const AI_API_URL = process.env.NEXT_PUBLIC_API_URL_SELF_MATCH || "http://localhost:3030/api/match"

interface Complaint {
  id: string
  seq: number
  title: string
  description: string
  category: string
  subCategory: string
  status: string
  urgency: string
  department: string
  submissionDate: string
  lastUpdated: string
  attachmentUrl: string | null
  isPublic: boolean
  upvoteCount: number
  location: {
    district: string
    city: string
    locality: string
    street: string | null
    pin: string
    latitude?: number | null
    longitude?: number | null
  } | null
  complainant: {
    id: string
    name: string
    email: string
    phone: string
  } | null
  assignedAgent?: { id: string; name: string; email: string } | null
  managedByMunicipalAdmin?: { id: string; name: string; email: string } | null
  escalationLevel?: string | null
  AIStandardizedSubcategory?: string | null
  AIstandardizedSubCategory?: string | null
  isDuplicate?: boolean | null
}

interface OverviewStats {
  total: number
  registered: number
  inProgress: number
  resolved: number
  closed: number
  highPriority: number
  assigned: number
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002"

// Priority badge config
const PRIORITY_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  CRITICAL: { label: "CRITICAL", bg: "bg-[#ffdad6]", text: "text-[#93000a]" },
  HIGH: { label: "HIGH", bg: "bg-orange-100", text: "text-orange-800" },
  MEDIUM: { label: "MEDIUM", bg: "bg-[#e5eeff]", text: "text-[#0047cc]" },
  LOW: { label: "ROUTINE LOW", bg: "bg-[#6cf8bb]/30", text: "text-[#005236]" },
}

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })

const formatLocation = (loc: Complaint["location"]) => {
  if (!loc) return "N/A"
  const parts: string[] = []
  if (loc.locality) parts.push(loc.locality)
  if (loc.city) parts.push(loc.city)
  if (loc.district) parts.push(loc.district)
  return parts.join(", ") || "N/A"
}

const toTitle = (s?: string) => {
  if (!s) return ""
  return s
    .toLowerCase()
    .split(/_|\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

export default function AgentRevampedDashboard() {
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState<string | null>(null)
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 })
  const [searchTerm, setSearchTerm] = useState("")
  const [urgencyFilter, setUrgencyFilter] = useState<"all" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL">("all")
  const [assignmentFilter, setAssignmentFilter] = useState<"all" | "assigned" | "unassigned" | "escalated">("all")
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null)
  const [isSlideoverOpen, setIsSlideoverOpen] = useState(false)
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [currentAdminId, setCurrentAdminId] = useState<string | null>(null)
  const [adminType, setAdminType] = useState<string | null>(null)
  const [overviewStats, setOverviewStats] = useState<OverviewStats>({
    total: 0, registered: 0, inProgress: 0, resolved: 0, closed: 0, highPriority: 0, assigned: 0,
  })
  const [initialLoadDone, setInitialLoadDone] = useState(false)
  const [compareLoading, setCompareLoading] = useState(false)
  const [compareResult, setCompareResult] = useState<{ match: boolean; confidence: number; reason: string } | null>(null)
  const [compareError, setCompareError] = useState<string | null>(null)
  const [chatComplaint, setChatComplaint] = useState<Complaint | null>(null)
  const [workloadData, setWorkloadData] = useState<{ currentWorkload: number; workloadLimit: number; availabilityStatus?: string } | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem("admin")
      if (raw) {
        const obj = JSON.parse(raw)
        setCurrentAdminId(obj?.id || obj?.userId || obj?.adminId || null)
        setAdminType(obj?.adminType || localStorage.getItem("adminType") || null)
        // Initialize workload from localStorage (login response) as fallback
        if (obj?.workloadLimit !== undefined || obj?.currentWorkload !== undefined) {
          setWorkloadData({
            currentWorkload: obj.currentWorkload ?? 0,
            workloadLimit: obj.workloadLimit ?? 10,
            availabilityStatus: obj.availabilityStatus,
          })
        }
      }
    } catch {}
  }, [])

  // Fetch agent workload data from /api/agent/me (live data, overrides localStorage fallback)
  useEffect(() => {
    const fetchWorkloadData = async () => {
      try {
        const token = localStorage.getItem("token")
        if (!token) return
        const res = await fetch(`${API_URL}/api/agent/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        if (data.agent) {
          const wl = {
            currentWorkload: data.agent.currentWorkload ?? 0,
            workloadLimit: data.agent.workloadLimit ?? 10,
            availabilityStatus: data.agent.availabilityStatus,
          }
          setWorkloadData(wl)
          // Also update localStorage so fallback stays fresh
          try {
            const raw = localStorage.getItem("admin")
            if (raw) {
              const obj = JSON.parse(raw)
              obj.currentWorkload = wl.currentWorkload
              obj.workloadLimit = wl.workloadLimit
              obj.availabilityStatus = wl.availabilityStatus
              localStorage.setItem("admin", JSON.stringify(obj))
            }
          } catch {}
        }
      } catch (e) {
        console.error("Error fetching workload data", e)
        // Fallback: if API fails, try localStorage
        if (!workloadData) {
          try {
            const raw = localStorage.getItem("admin")
            if (raw) {
              const obj = JSON.parse(raw)
              if (obj?.workloadLimit !== undefined) {
                setWorkloadData({
                  currentWorkload: obj.currentWorkload ?? 0,
                  workloadLimit: obj.workloadLimit ?? 10,
                  availabilityStatus: obj.availabilityStatus,
                })
              }
            }
          } catch {}
        }
      }
    }
    fetchWorkloadData()
  }, [assigning])

  const fetchComplaints = async (showLoader = true) => {
    if (showLoader) setLoading(true)
    try {
      const token = localStorage.getItem("token")
      if (!token) return
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      })
      if (searchTerm) params.append("search", searchTerm)
      const res = await fetch(`${API_URL}/api/complaints/all-complaints?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.success) {
        const filtered = (data.data as any[]).filter((c) => !c.isDuplicate)
        const dupsOnPage = (data.data as any[]).length - filtered.length
        const total = Math.max(0, (data.pagination?.total ?? filtered.length) - dupsOnPage)
        setComplaints(filtered)
        setPagination((p) => ({ ...p, total, totalPages: Math.max(1, Math.ceil(total / p.limit)) }))
      }
    } catch (e) {
      console.error("Error fetching complaints", e)
    } finally {
      setLoading(false)
      setInitialLoadDone(true)
    }
  }

  const fetchOverviewStats = async () => {
    try {
      const token = localStorage.getItem("token")
      if (!token) return
      const res = await fetch(`${API_URL}/api/complaints/stats/overview`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.success) setOverviewStats(data.data)
    } catch {}
  }

  useEffect(() => {
    fetchComplaints()
    fetchOverviewStats()
  }, [pagination.page])

  useEffect(() => {
    if (!initialLoadDone) return
    const t = setTimeout(() => {
      if (pagination.page === 1) fetchComplaints(false)
      else setPagination((p) => ({ ...p, page: 1 }))
    }, 300)
    return () => clearTimeout(t)
  }, [searchTerm])

  const handleAssignToMe = async (complaintId: string) => {
    try {
      setAssigning(complaintId)
      const token = localStorage.getItem("token")
      if (!token) return
      const res = await fetch(`${API_URL}/api/agent/complaints/${complaintId}/assign`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      })
      const data = await res.json()
      if (res.ok) {
        setComplaints((prev) => prev.filter((c) => c.id !== complaintId))
        setPagination((p) => ({ ...p, total: p.total - 1 }))
      } else {
        alert(data.message || "Failed to assign complaint")
      }
    } catch {
      alert("Failed to assign complaint")
    } finally {
      setAssigning(null)
    }
  }

  const canUpdateStatus = (complaint: Complaint | null) => {
    if (!complaint) return false
    if (adminType === "MUNICIPAL_ADMIN" || adminType === "STATE_ADMIN" || adminType === "SUPER_ADMIN") return true
    if (adminType === "AGENT") {
      return !!(complaint.assignedAgent?.id && currentAdminId && complaint.assignedAgent.id === currentAdminId)
    }
    return false
  }

  const updateComplaintStatus = async (complaintId: string, newStatus: string) => {
    try {
      setStatusUpdating(true)
      const token = localStorage.getItem("token")
      if (!token) return
      const isEscalation = newStatus === "ESCALATED_TO_MUNICIPAL_LEVEL" || newStatus === "ESCALATED_TO_STATE_LEVEL"
      let endpoint = ""
      if (isEscalation) {
        endpoint = `${API_URL}/api/agent/complaints/${complaintId}/escalate`
      } else {
        endpoint = `${API_URL}/api/agent/complaints/${complaintId}/status`
      }
      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: isEscalation ? undefined : JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        fetchComplaints()
        setIsSlideoverOpen(false)
        setSelectedComplaint(null)
      }
    } catch (e) {
      console.error("Error updating status", e)
    } finally {
      setStatusUpdating(false)
    }
  }

  const handleCompare = async (complaintImageUrl: string) => {
    const refImg = "https://pub-a7deba7d0b9642f8afcfd3aebbcb446f.r2.dev/uploads/1765265732822_pothole_2.jpg"
    setCompareLoading(true)
    setCompareResult(null)
    setCompareError(null)
    try {
      const res = await fetch(AI_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl1: complaintImageUrl, imageUrl2: refImg }),
      })
      const data = await res.json()
      if (data.success) setCompareResult({ match: data.match, confidence: data.confidence, reason: data.reason })
      else setCompareError(data.error || "Comparison failed")
    } catch (err: any) {
      setCompareError(err?.message || "Network error")
    } finally {
      setCompareLoading(false)
    }
  }

  const displayedComplaints = useMemo(
    () =>
      complaints.filter((c) => {
        if (urgencyFilter !== "all" && c.urgency !== urgencyFilter) return false
        if (assignmentFilter === "assigned") return !!(c.assignedAgent?.id || c.managedByMunicipalAdmin?.id)
        if (assignmentFilter === "unassigned") return !c.assignedAgent?.id && !c.managedByMunicipalAdmin?.id
        if (assignmentFilter === "escalated")
          return !!(c.managedByMunicipalAdmin?.id || c.escalationLevel || c.status?.includes("ESCALATED"))
        return true
      }),
    [complaints, urgencyFilter, assignmentFilter]
  )

  const criticalCount = complaints.filter((c) => c.urgency === "CRITICAL").length
  const escalatedCount = complaints.filter(
    (c) => c.status?.includes("ESCALATED") || !!c.managedByMunicipalAdmin?.id || !!c.escalationLevel
  ).length

  const stats = [
    {
      label: "TOTAL REGISTERED",
      value: pagination.total.toString(),
      icon: "folder_open",
      color: "#0047cc",
      sub: `${new Date().getFullYear()} YTD`,
    },
    {
      label: "HIGH PRIORITY",
      value: criticalCount.toString(),
      icon: "warning",
      color: "#ba1a1a",
      sub: criticalCount > 0 ? "↑ Urgent" : "None critical",
    },
    {
      label: "ASSIGNED",
      value: overviewStats.assigned.toString(),
      icon: "group",
      color: "#006c49",
      sub: "In progress",
    },
    {
      label: "ESCALATED",
      value: escalatedCount.toString(),
      icon: "schedule",
      color: "#213145",
      sub: "⚠ Awaiting review",
    },
  ]

  const openSlideover = (complaint: Complaint) => {
    setSelectedComplaint(complaint)
    setCompareResult(null)
    setCompareError(null)
    setIsSlideoverOpen(true)
  }

  const isAssignedToCurrentAgent = !!(
    selectedComplaint?.assignedAgent?.id &&
    currentAdminId &&
    selectedComplaint.assignedAgent.id === currentAdminId
  )

  return (
    <AuthGuard requiredAdminType="AGENT">
      <AgentRevampedLayout>
        <div className="p-6 space-y-6">
          {/* Page header */}
          <div className="flex items-end justify-between">
            <div>
              <h2 className="headline text-2xl font-black text-[#0b1c30] tracking-tighter">
                COMPLAINTS INTELLIGENCE
              </h2>
              <p className="text-xs text-slate-500 font-mono mt-1 uppercase tracking-widest">
                SESSION_TOKEN:{" "}
                <span className="text-[#0047cc]">AGENT-PRIME</span> | LATENCY: 12ms
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => fetchComplaints()}
                className="bg-[#fff] border border-[#c3c5d9] px-4 py-2 text-xs font-bold flex items-center gap-2 hover:bg-[#eff4ff] transition-all uppercase tracking-wider"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                  refresh
                </span>
                Refresh
              </button>
            </div>
          </div>

          {/* Workload Capacity Indicator */}
          {workloadData && (() => {
            const pct = workloadData.workloadLimit > 0
              ? Math.round((workloadData.currentWorkload / workloadData.workloadLimit) * 100)
              : 0
            const remaining = Math.max(0, workloadData.workloadLimit - workloadData.currentWorkload)
            const isNearFull = pct >= 85
            const isMid = pct >= 60 && pct < 85
            const accentColor = isNearFull ? "#ba1a1a" : isMid ? "#c77a00" : "#006c49"
            const accentBg = isNearFull ? "#ffdad6" : isMid ? "#fff3e0" : "#e6f7ef"
            const statusText = isNearFull
              ? "CAPACITY CRITICAL"
              : isMid
              ? "MODERATE LOAD"
              : "CAPACITY AVAILABLE"
            const statusIcon = isNearFull ? "error" : isMid ? "warning" : "check_circle"
            // SVG circular gauge parameters
            const radius = 38
            const circumference = 2 * Math.PI * radius
            const dashOffset = circumference - (pct / 100) * circumference

            return (
              <div className="bg-white border border-[#c3c5d9]/30 shadow-sm p-5 flex items-center gap-6">
                {/* Circular gauge */}
                <div className="relative flex-shrink-0" style={{ width: 96, height: 96 }}>
                  <svg width="96" height="96" viewBox="0 0 96 96">
                    <circle
                      cx="48" cy="48" r={radius}
                      fill="none" stroke="#e5eeff" strokeWidth="7"
                    />
                    <circle
                      cx="48" cy="48" r={radius}
                      fill="none" stroke={accentColor} strokeWidth="7"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={dashOffset}
                      transform="rotate(-90 48 48)"
                      style={{ transition: "stroke-dashoffset 0.8s ease-in-out, stroke 0.5s ease" }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-mono font-black" style={{ color: accentColor }}>
                      {pct}%
                    </span>
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">USED</span>
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: 18, color: accentColor, fontVariationSettings: "'FILL' 1" }}
                    >
                      {statusIcon}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: accentColor }}>
                      {statusText}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    You have <span className="font-mono font-bold text-[#0b1c30]">{workloadData.currentWorkload}</span> of{" "}
                    <span className="font-mono font-bold text-[#0b1c30]">{workloadData.workloadLimit}</span> complaint slots occupied.
                  </p>
                  <div className="mt-2.5 flex items-center gap-4">
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: "#e5eeff" }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(pct, 100)}%`,
                          backgroundColor: accentColor,
                          transition: "width 0.8s ease-in-out, background-color 0.5s ease",
                        }}
                      />
                    </div>
                    <span className="text-[10px] font-mono font-bold whitespace-nowrap" style={{ color: accentColor }}>
                      {remaining} SLOTS FREE
                    </span>
                  </div>
                  {isNearFull && (
                    <p className="text-[10px] text-[#ba1a1a] mt-2 flex items-center gap-1">
                      <span className="material-symbols-outlined" style={{ fontSize: 12 }}>info</span>
                      Complete or escalate existing complaints to free up capacity.
                    </p>
                  )}
                </div>

                {/* Quick stats */}
                <div className="hidden lg:flex flex-col gap-2 text-right flex-shrink-0">
                  <div
                    className="px-3 py-2 rounded-sm"
                    style={{ backgroundColor: accentBg }}
                  >
                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Current</p>
                    <p className="text-xl font-mono font-black" style={{ color: accentColor }}>
                      {workloadData.currentWorkload}
                    </p>
                  </div>
                  <div className="px-3 py-2 bg-[#eff4ff] rounded-sm">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Max Limit</p>
                    <p className="text-xl font-mono font-black text-[#0047cc]">
                      {workloadData.workloadLimit}
                    </p>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {loading
              ? [...Array(4)].map((_, i) => (
                  <div key={i} className="bg-[#eff4ff] p-5 animate-pulse h-24" />
                ))
              : stats.map((s) => (
                  <div
                    key={s.label}
                    className="bg-[#fff] border-l-4 p-5 shadow-sm"
                    style={{ borderLeftColor: s.color }}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{s.label}</p>
                    <div className="flex items-end gap-3 mt-2">
                      <span className="text-3xl font-mono font-black text-[#0b1c30]">{s.value}</span>
                      <span className="text-[10px] font-bold text-slate-400 pb-1">{s.sub}</span>
                    </div>
                  </div>
                ))}
          </div>

          {/* Complaint Heatmap */}
          <div className="bg-white border border-[#c3c5d9]/40 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-[#c3c5d9]/20 flex items-center justify-between bg-[#f8fafc]">
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-[#0b1c30]">Complaint Location Heatmap</h3>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">Real-time density visualisation from registered complaints</p>
              </div>
              <span className="material-symbols-outlined text-slate-300" style={{ fontSize: 20 }}>map</span>
            </div>
            <ComplaintGoogleHeatmap height="320px" showDensityTable />
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="relative flex-1 max-w-sm">
              <span
                className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                style={{ fontSize: 16 }}
              >
                search
              </span>
              <input
                type="text"
                placeholder="Search complaint ID, title, category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#c3c5d9] focus:ring-1 focus:ring-[#0047cc] focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Filter:</span>
              {(["all", "assigned", "unassigned", "escalated"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setAssignmentFilter(f)}
                  className={`px-3 py-1.5 text-[10px] font-bold uppercase border transition-colors ${
                    assignmentFilter === f
                      ? "bg-[#0047cc] text-white border-[#0047cc]"
                      : "bg-white border-[#c3c5d9] hover:border-[#0047cc]"
                  }`}
                >
                  {f}
                </button>
              ))}
              <div className="w-px h-5 bg-[#c3c5d9]/30 mx-1" />
              <select
                value={urgencyFilter}
                onChange={(e) => setUrgencyFilter(e.target.value as any)}
                className="px-3 py-1.5 text-[10px] font-bold uppercase bg-white border border-[#c3c5d9] focus:outline-none focus:ring-1 focus:ring-[#0047cc]"
              >
                <option value="all">All Priorities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border border-[#c3c5d9]/20 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#e5eeff] text-[10px] font-bold uppercase tracking-widest text-[#434656]">
                  <tr>
                    <th className="px-4 py-3 border-b border-[#c3c5d9]/20">ID</th>
                    <th className="px-4 py-3 border-b border-[#c3c5d9]/20">Complaint</th>
                    <th className="px-4 py-3 border-b border-[#c3c5d9]/20">Priority</th>
                    <th className="px-4 py-3 border-b border-[#c3c5d9]/20">Location</th>
                    <th className="px-4 py-3 border-b border-[#c3c5d9]/20">Date</th>
                    <th className="px-4 py-3 border-b border-[#c3c5d9]/20 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-xs divide-y divide-[#c3c5d9]/10">
                  {loading
                    ? [...Array(5)].map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          {[...Array(6)].map((_, j) => (
                            <td key={j} className="px-4 py-3">
                              <div className="h-3 bg-[#e5eeff] rounded" />
                            </td>
                          ))}
                        </tr>
                      ))
                    : displayedComplaints.length === 0
                    ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                            <span className="material-symbols-outlined block mx-auto mb-2" style={{ fontSize: 32 }}>
                              folder_open
                            </span>
                            No complaints match your criteria
                          </td>
                        </tr>
                      )
                    : displayedComplaints.map((c) => {
                        const priority = PRIORITY_CONFIG[c.urgency] || { label: c.urgency, bg: "bg-gray-100", text: "text-gray-700" }
                        const assigned = !!(c.assignedAgent?.id || c.managedByMunicipalAdmin?.id)
                        return (
                          <tr
                            key={c.id}
                            className="hover:bg-[#eff4ff] transition-colors cursor-pointer group"
                            onClick={() => openSlideover(c)}
                          >
                            <td className="px-4 py-3 font-mono text-[11px] text-[#0047cc] font-semibold">
                              #{c.seq}
                            </td>
                            <td className="px-4 py-3 max-w-xs">
                              <p className="font-medium text-[#0b1c30] line-clamp-1">
                                {c.title || c.subCategory || c.description}
                              </p>
                              <p className="text-slate-400 text-[10px] mt-0.5">{toTitle(c.category)}</p>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2 py-0.5 ${priority.bg} ${priority.text} text-[9px] font-bold rounded-sm uppercase tracking-tighter`}
                              >
                                {priority.label}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-[10px] text-slate-500 font-mono">
                              {formatLocation(c.location)}
                            </td>
                            <td className="px-4 py-3 text-[10px] text-slate-400 font-mono">
                              {formatDate(c.submissionDate)}
                            </td>
                            <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-2">
                                {!assigned && (
                                  <button
                                    onClick={() => handleAssignToMe(c.id)}
                                    disabled={assigning === c.id}
                                    className="px-3 py-1 bg-[#0047cc] text-white text-[10px] font-bold uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
                                  >
                                    {assigning === c.id ? "Claiming..." : "Claim"}
                                  </button>
                                )}
                                <button
                                  onClick={() => openSlideover(c)}
                                  className="p-1.5 hover:bg-[#e5eeff] transition-colors"
                                >
                                  <span className="material-symbols-outlined text-[#0047cc]" style={{ fontSize: 16 }}>
                                    open_in_new
                                  </span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-4 py-3 bg-[#eff4ff] border-t border-[#c3c5d9]/20 flex justify-between items-center">
              <span className="text-[10px] font-mono text-slate-500 uppercase">
                Showing {displayedComplaints.length} of {pagination.total} entries
              </span>
              <div className="flex gap-1">
                <button
                  disabled={pagination.page === 1}
                  onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                  className="w-7 h-7 flex items-center justify-center border border-[#c3c5d9]/30 text-[10px] font-bold bg-white hover:bg-[#e5eeff] disabled:opacity-40 transition-colors"
                >
                  ‹
                </button>
                <span className="w-7 h-7 flex items-center justify-center bg-[#0047cc] text-white text-[10px] font-bold">
                  {pagination.page}
                </span>
                <button
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                  className="w-7 h-7 flex items-center justify-center border border-[#c3c5d9]/30 text-[10px] font-bold bg-white hover:bg-[#e5eeff] disabled:opacity-40 transition-colors"
                >
                  ›
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Slide-over complaint dossier */}
        {isSlideoverOpen && selectedComplaint && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/30" onClick={() => setIsSlideoverOpen(false)} />
            <div className="relative w-full max-w-md bg-white shadow-2xl border-l border-[#c3c5d9]/40 flex flex-col overflow-auto h-full z-10">
              <div className="p-6 flex-1">
                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-[#0047cc] uppercase tracking-tighter">
                      Dossier // #{selectedComplaint.seq}
                    </span>
                    <h3 className="headline font-bold text-xl tracking-tight text-[#0b1c30] mt-1">
                      {selectedComplaint.title || selectedComplaint.subCategory || selectedComplaint.description}
                    </h3>
                  </div>
                  <button
                    onClick={() => setIsSlideoverOpen(false)}
                    className="p-2 hover:bg-[#eff4ff] transition-colors"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                      close
                    </span>
                  </button>
                </div>

                {/* Image comparison (if attachment exists) */}
                {selectedComplaint.attachmentUrl && (
                  <div className="mb-5">
                    <div className="aspect-video relative bg-black overflow-hidden rounded-sm">
                      <img
                        src={selectedComplaint.attachmentUrl}
                        alt="Complaint attachment"
                        className="w-full h-full object-cover opacity-80"
                        onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                      />
                      <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-1 text-[9px] font-mono text-white">
                        CITIZEN_UPLOAD // #{selectedComplaint.seq}
                      </div>
                    </div>
                    <button
                      disabled={compareLoading}
                      onClick={() => handleCompare(selectedComplaint.attachmentUrl!)}
                      className="mt-2 w-full py-2 text-[10px] font-bold uppercase tracking-widest border border-[#0047cc] text-[#0047cc] hover:bg-[#eff4ff] transition-colors flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                        compare
                      </span>
                      {compareLoading ? "Running AI Comparison..." : "Compare with Reference"}
                    </button>
                    {compareResult && (
                      <div
                        className={`mt-2 p-3 text-xs border ${
                          compareResult.match
                            ? "bg-[#6cf8bb]/20 border-[#006c49]/30 text-[#005236]"
                            : "bg-[#ffdad6]/30 border-[#ba1a1a]/30 text-[#93000a]"
                        }`}
                      >
                        <p className="font-bold font-mono">
                          AI_CONFIDENCE: {(compareResult.confidence * 100).toFixed(1)}%
                        </p>
                        <p className="mt-1">{compareResult.reason}</p>
                      </div>
                    )}
                    {compareError && (
                      <p className="mt-2 text-xs text-[#ba1a1a] bg-[#ffdad6]/30 p-2 border border-[#ba1a1a]/20">
                        {compareError}
                      </p>
                    )}
                  </div>
                )}

                {/* Details */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] font-bold uppercase text-slate-400 tracking-widest">Priority</label>
                      <p className="text-xs font-mono font-bold text-[#0b1c30] mt-0.5">{selectedComplaint.urgency}</p>
                    </div>
                    <div>
                      <label className="text-[9px] font-bold uppercase text-slate-400 tracking-widest">Status</label>
                      <p className="text-xs font-mono mt-0.5">{toTitle(selectedComplaint.status)}</p>
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] font-bold uppercase text-slate-400 tracking-widest">Description</label>
                    <div className="mt-1 bg-[#eff4ff] p-3 text-[11px] leading-relaxed border-l-2 border-[#c3c5d9] text-[#434656]">
                      {selectedComplaint.description}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] font-bold uppercase text-slate-400 tracking-widest">Category</label>
                      <p className="text-xs mt-0.5">{toTitle(selectedComplaint.category) || "N/A"}</p>
                    </div>
                    <div>
                      <label className="text-[9px] font-bold uppercase text-slate-400 tracking-widest">Department</label>
                      <p className="text-xs mt-0.5">{toTitle(selectedComplaint.department) || "N/A"}</p>
                    </div>
                  </div>

                  {selectedComplaint.location && (
                    <div>
                      <label className="text-[9px] font-bold uppercase text-slate-400 tracking-widest">Location</label>
                      <p className="text-xs font-mono mt-0.5">{formatLocation(selectedComplaint.location)}</p>
                    </div>
                  )}

                  {selectedComplaint.complainant && (
                    <div>
                      <label className="text-[9px] font-bold uppercase text-slate-400 tracking-widest">Reporter</label>
                      <p className="text-xs mt-0.5 font-medium">{selectedComplaint.complainant.name}</p>
                      <p className="text-[10px] text-slate-400">{selectedComplaint.complainant.email}</p>
                    </div>
                  )}

                  {selectedComplaint.assignedAgent && (
                    <div>
                      <label className="text-[9px] font-bold uppercase text-slate-400 tracking-widest">Assigned Agent</label>
                      <p className="text-xs mt-0.5">{selectedComplaint.assignedAgent.name}</p>
                    </div>
                  )}
                </div>

                {/* Status update */}
                {canUpdateStatus(selectedComplaint) && (
                  <div className="mt-6 pt-4 border-t border-[#c3c5d9]/20">
                    <p className="text-[9px] font-bold uppercase text-slate-400 tracking-widest mb-2">Update Status</p>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {["UNDER_PROCESSING", "COMPLETED", "ON_HOLD", "FORWARDED"].map((s) => (
                        <button
                          key={s}
                          disabled={statusUpdating || selectedComplaint.status === s}
                          onClick={() => updateComplaintStatus(selectedComplaint.id, s)}
                          className={`px-3 py-1.5 text-[10px] font-bold uppercase border transition-all active:scale-95 disabled:opacity-40 ${
                            selectedComplaint.status === s
                              ? "bg-[#0047cc] text-white border-[#0047cc]"
                              : "bg-white border-[#c3c5d9] hover:border-[#0047cc] text-[#0047cc]"
                          }`}
                        >
                          {toTitle(s)}
                        </button>
                      ))}
                    </div>
                    {selectedComplaint.status !== "ESCALATED_TO_MUNICIPAL_LEVEL" &&
                      selectedComplaint.status !== "ESCALATED_TO_STATE_LEVEL" && (
                        <button
                          disabled={statusUpdating}
                          onClick={() => updateComplaintStatus(selectedComplaint.id, "ESCALATED_TO_MUNICIPAL_LEVEL")}
                          className="w-full py-2 bg-[#ba1a1a] text-white text-[10px] font-bold uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all disabled:opacity-40"
                        >
                          Escalate to Municipal Admin
                        </button>
                      )}
                  </div>
                )}

                {!canUpdateStatus(selectedComplaint) && selectedComplaint.assignedAgent && (
                  <div className="mt-6 pt-4 border-t border-[#c3c5d9]/20">
                    <p className="text-xs text-amber-700 bg-amber-50 p-3 border border-amber-200">
                      This complaint is not assigned to you. Status updates are disabled.
                    </p>
                  </div>
                )}
              </div>

              {/* Actions footer */}
              <div className="p-6 border-t border-[#c3c5d9]/20 flex flex-col gap-2">
                {!selectedComplaint.assignedAgent?.id && !selectedComplaint.managedByMunicipalAdmin?.id && (
                  <button
                    onClick={() => handleAssignToMe(selectedComplaint.id)}
                    disabled={assigning === selectedComplaint.id}
                    className="w-full py-3 bg-[#0047cc] text-white font-bold tracking-tight flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all disabled:opacity-40 text-sm"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>person_add</span>
                    {assigning === selectedComplaint.id ? "Claiming..." : "Claim Complaint"}
                  </button>
                )}
                {adminType === "AGENT" && isAssignedToCurrentAgent && (
                  <button
                    onClick={() => setChatComplaint(selectedComplaint)}
                    className="w-full py-3 bg-[#eff4ff] border border-[#c3c5d9] text-[#0047cc] font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#e5eeff] transition-colors"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chat</span>
                    Chat with Citizen
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Chat modal */}
        <ChatModal
          isOpen={!!chatComplaint}
          onClose={() => setChatComplaint(null)}
          complaintId={chatComplaint?.id || ""}
          complaintTitle={chatComplaint?.title || chatComplaint?.subCategory || `Complaint #${chatComplaint?.seq}`}
        />
      </AgentRevampedLayout>
    </AuthGuard>
  )
}
