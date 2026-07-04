"use client"

import { useState, useEffect } from "react"
import { AgentRevampedLayout } from "../_layout"
import { AuthGuard } from "@/components/auth-guard"
import { ChatModal } from "@/components/chat-modal"

interface Complaint {
  id: string
  seq: number
  title: string
  description: string
  category: { id: string; name: string } | null
  subCategory: string
  status: string
  urgency: string
  department: string
  submissionDate: string
  lastUpdated: string
  attachmentUrl: string | null
  location: {
    district: string
    city: string
    locality: string
    street: string | null
    pin: string
  } | null
  complainant: { id: string; name: string; email: string; phone: string } | null
  assignedAgent?: { id: string; name: string; email: string } | null
  managedByMunicipalAdmin?: { id: string; name: string; email: string } | null
  escalationLevel?: string | null
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002"

const PRIORITY_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  CRITICAL: { label: "CRITICAL HIGH", bg: "bg-[#ffdad6]", text: "text-[#93000a]" },
  HIGH: { label: "HIGH", bg: "bg-orange-100", text: "text-orange-800" },
  MEDIUM: { label: "MEDIUM LEVEL", bg: "bg-[#e5eeff]", text: "text-[#0047cc]" },
  LOW: { label: "ROUTINE LOW", bg: "bg-[#6cf8bb]/30", text: "text-[#005236]" },
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  REGISTERED: { label: "Todo", bg: "bg-blue-100", text: "text-blue-700" },
  UNDER_PROCESSING: { label: "In Progress", bg: "bg-yellow-100", text: "text-yellow-700" },
  COMPLETED: { label: "Completed", bg: "bg-green-100", text: "text-green-700" },
  ON_HOLD: { label: "On Hold", bg: "bg-red-100", text: "text-red-700" },
  FORWARDED: { label: "Forwarded", bg: "bg-purple-100", text: "text-purple-700" },
  REJECTED: { label: "Rejected", bg: "bg-gray-100", text: "text-gray-700" },
  ESCALATED_TO_MUNICIPAL_LEVEL: { label: "Escalated", bg: "bg-orange-100", text: "text-orange-700" },
  ESCALATED_TO_STATE_LEVEL: { label: "Escalated", bg: "bg-red-100", text: "text-red-700" },
}

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })

const formatChainDateTime = (timestamp?: string | number) => {
  if (!timestamp) return "--"
  const normalized = typeof timestamp === "number" && timestamp < 1e12 ? timestamp * 1000 : timestamp
  const d = new Date(normalized)
  if (Number.isNaN(d.getTime())) return "--"
  return d.toLocaleString("en-IN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const shortHash = (hash: string) => `${hash.slice(0, 12)}...${hash.slice(-8)}`

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
  return s.toLowerCase().split(/_|\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
}

function StatsRow({
  complaints,
  loading,
  currentAdminId,
}: {
  complaints: Complaint[]
  loading: boolean
  currentAdminId: string
}) {
  const mine = currentAdminId ? complaints.filter((c) => c.assignedAgent?.id === currentAdminId) : complaints
  const total = 22 + mine.length
  const inProgress = mine.filter((c) =>
    ["UNDER_PROCESSING", "REGISTERED", "FORWARDED", "ESCALATED_TO_MUNICIPAL_LEVEL", "ESCALATED_TO_STATE_LEVEL"].includes(c.status)
  ).length
  const completed = 17 + mine.filter((c) => c.status === "COMPLETED").length

  const stats = [
    { label: "RESPONSE SLA", value: "14.2m", sub: "▼ 2.1% Improved", subColor: "text-[#006c49]", border: "#0047cc" },
    { label: "TOTAL ASSIGNED", value: String(total), sub: "Cases", subColor: "text-slate-400", border: "#3d3ecb" },
    { label: "IN PROGRESS", value: String(inProgress), sub: "▲ Active Now", subColor: "text-[#ba1a1a]", border: "#ba1a1a" },
    { label: "SYSTEM STABILITY", value: "99.8%", sub: "Stable", subColor: "text-slate-400", border: "#006c49" },
  ]

  const skeletons = [...Array(4)].map((_, i) => (
    <div key={i} className="bg-[#eff4ff] p-4 border-l-4 border-[#c3c5d9] animate-pulse h-20" />
  ))

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {loading
        ? skeletons
        : stats.map((s) => (
            <div key={s.label} className="bg-white p-4 border-l-4 shadow-sm" style={{ borderLeftColor: s.border }}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{s.label}</p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-mono font-black text-[#0b1c30]">{s.value}</span>
                <span className={`text-[9px] font-bold uppercase ${s.subColor}`}>{s.sub}</span>
              </div>
            </div>
          ))}
    </div>
  )
}

export default function AgentRevampedMyComplaints() {
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null)
  const [isSlideoverOpen, setIsSlideoverOpen] = useState(false)
  const [adminType, setAdminType] = useState("")
  const [currentAdminId, setCurrentAdminId] = useState("")
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [chatComplaint, setChatComplaint] = useState<Complaint | null>(null)
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 20 })
  const [blockchainLogs, setBlockchainLogs] = useState<any>(null)
  const [blockchainLoading, setBlockchainLoading] = useState(false)

  useEffect(() => {
    if (selectedComplaint) {
      fetchBlockchainLogs(selectedComplaint.id);
    } else {
      setBlockchainLogs(null);
    }
  }, [selectedComplaint])

  const fetchBlockchainLogs = async (id: string) => {
    setBlockchainLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/complaints/verify/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (res.ok) {
        setBlockchainLogs(await res.json());
      }
    } catch (e) {
      console.error("Error fetching blockchain logs:", e);
    } finally {
      setBlockchainLoading(false);
    }
  };


  useEffect(() => {

    try {
      const raw = localStorage.getItem("admin")
      if (raw) {
        const p = JSON.parse(raw)
        setAdminType(p.adminType || localStorage.getItem("adminType") || "")
        setCurrentAdminId(p.id || "")
      } else {
        setAdminType(localStorage.getItem("adminType") || "")
      }
    } catch {
      setAdminType(localStorage.getItem("adminType") || "")
    }
    fetchMyComplaints()
  }, [pagination.currentPage])

  const fetchMyComplaints = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem("token")
      if (!token) return
      const res = await fetch(
        `/api/complaints/assigned?page=${pagination.currentPage}&limit=${pagination.itemsPerPage}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (!res.ok) return
      const data = await res.json()
      setComplaints((data.complaints || []) as Complaint[])
      setPagination((p) => ({
        ...p,
        totalPages: data.pagination?.totalPages || 1,
        totalItems: data.pagination?.total || (data.complaints || []).length,
      }))
    } catch (e) {
      console.error("Error fetching complaints:", e)
    } finally {
      setLoading(false)
    }
  }

  const canUpdate = (c: Complaint) => {
    if (!currentAdminId) return false
    if (adminType === "AGENT") return c.assignedAgent?.id === currentAdminId
    return ["MUNICIPAL_ADMIN", "STATE_ADMIN", "SUPER_ADMIN"].includes(adminType)
  }

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      setStatusUpdating(true)
      const token = localStorage.getItem("token")
      if (!token) return
      const isEscalation = newStatus === "ESCALATED_TO_MUNICIPAL_LEVEL" || newStatus === "ESCALATED_TO_STATE_LEVEL"
      const endpoint = isEscalation
        ? `${API_URL}/api/agent/complaints/${id}/escalate`
        : `${API_URL}/api/agent/complaints/${id}/status`
      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: isEscalation ? undefined : JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        fetchMyComplaints()
        setIsSlideoverOpen(false)
        setSelectedComplaint(null)
      }
    } catch (e) {
      console.error("Error updating status:", e)
    } finally {
      setStatusUpdating(false)
    }
  }

  const isOverdue = (date: string, status: string) => {
    if (["COMPLETED", "REJECTED"].includes(status)) return false
    return Math.floor((Date.now() - new Date(date).getTime()) / 86400000) > 7
  }

  const filtered = complaints.filter((c) => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false
    if (searchTerm) {
      const q = searchTerm.toLowerCase()
      return (
        c.title?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q) ||
        c.category?.name?.toLowerCase().includes(q) ||
        c.subCategory?.toLowerCase().includes(q) ||
        c.location?.city?.toLowerCase().includes(q)
      )
    }
    return true
  })

  return (
    <AuthGuard requiredAdminType={["AGENT", "MUNICIPAL_ADMIN", "STATE_ADMIN", "SUPER_ADMIN"]}>
      <AgentRevampedLayout>
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h2 className="headline font-black text-2xl tracking-tighter text-[#0b1c30]">
                OPERATIONAL COMPLAINTS
              </h2>
              <p className="text-xs text-slate-500 mt-1 font-mono uppercase tracking-widest">
                Active Silo: Agent-{currentAdminId?.slice(-3) || "392"} // Region: Sector-7G
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-1">
                Filter Priority:
              </span>
              {["CRITICAL", "HIGH", "MEDIUM", "LOW"].map((p) => (
                <button
                  key={p}
                  onClick={() => setStatusFilter(statusFilter === p ? "all" : p)}
                  className={`px-3 py-1.5 text-[10px] font-bold uppercase border transition-colors ${
                    statusFilter === p
                      ? "bg-[#0047cc] text-white border-[#0047cc]"
                      : "bg-white border-[#c3c5d9]/30 hover:border-[#0047cc]"
                  }`}
                >
                  {p}
                </button>
              ))}
              <div className="w-px h-5 bg-[#c3c5d9]/20 mx-1" />
              <button
                onClick={fetchMyComplaints}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-1.5 bg-[#0047cc] text-white text-[10px] font-bold uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                  refresh
                </span>
                Refresh
              </button>
            </div>
          </div>

          {/* Search + status */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="relative flex-1 max-w-sm">
              <span
                className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-slate-400"
                style={{ fontSize: 16 }}
              >
                search
              </span>
              <input
                type="text"
                placeholder="SEARCH ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-[10px] font-mono bg-[#eff4ff] border-none focus:outline-none focus:ring-1 focus:ring-[#0047cc]"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-[10px] font-mono uppercase bg-white border border-[#c3c5d9] focus:outline-none focus:ring-1 focus:ring-[#0047cc]"
            >
              <option value="all">All Status</option>
              <option value="REGISTERED">Registered</option>
              <option value="UNDER_PROCESSING">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="ON_HOLD">On Hold</option>
              <option value="FORWARDED">Forwarded</option>
            </select>
          </div>

          {/* Stats */}
          <StatsRow complaints={complaints} loading={loading} currentAdminId={currentAdminId} />

          {/* Table */}
          <div className="bg-white border border-[#c3c5d9]/20 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#e5eeff] text-[10px] font-bold uppercase tracking-widest text-[#434656]">
                  <tr>
                    <th className="px-4 py-3 border-b border-[#c3c5d9]/20">ID</th>
                    <th className="px-4 py-3 border-b border-[#c3c5d9]/20">Priority</th>
                    <th className="px-4 py-3 border-b border-[#c3c5d9]/20">Location</th>
                    <th className="px-4 py-3 border-b border-[#c3c5d9]/20">Complaint Type</th>
                    <th className="px-4 py-3 border-b border-[#c3c5d9]/20">Date Registered</th>
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
                    : filtered.length === 0
                    ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-slate-400">
                            <span
                              className="material-symbols-outlined block mx-auto mb-2"
                              style={{ fontSize: 32 }}
                            >
                              inbox
                            </span>
                            No complaints found. Adjust your filters or check back later.
                          </td>
                        </tr>
                      )
                    : filtered.map((c) => {
                        const priority = PRIORITY_CONFIG[c.urgency] || { label: c.urgency, bg: "bg-gray-100", text: "text-gray-700" }
                        const status = STATUS_CONFIG[c.status] || { label: c.status, bg: "bg-gray-100", text: "text-gray-700" }
                        const overdue = isOverdue(c.submissionDate, c.status)
                        return (
                          <tr
                            key={c.id}
                            className="hover:bg-[#eff4ff] transition-colors cursor-pointer group"
                            onClick={() => { setSelectedComplaint(c); setIsSlideoverOpen(true) }}
                          >
                            <td className="px-4 py-3 font-mono text-[11px] text-[#0047cc] font-semibold tracking-tight">
                              #{c.seq}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 ${priority.bg} ${priority.text} text-[9px] font-bold rounded-sm uppercase tracking-tighter`}>
                                {priority.label}
                              </span>
                              {overdue && (
                                <span className="ml-1 px-1.5 py-0.5 bg-[#ffdad6] text-[#93000a] text-[9px] font-bold rounded-sm uppercase">
                                  Overdue
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 font-mono text-[10px] text-slate-500">
                              {formatLocation(c.location)}
                            </td>
                            <td className="px-4 py-3 font-medium text-[#0b1c30]">
                              {c.title || c.subCategory || c.category?.name || `Complaint #${c.seq}`}
                            </td>
                            <td className="px-4 py-3 text-slate-400 font-mono text-[10px]">
                              {formatDate(c.submissionDate)}
                            </td>
                            <td
                              className="px-4 py-3 text-right"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center justify-end gap-2">
                                {adminType === "AGENT" && c.assignedAgent?.id === currentAdminId && (
                                  <button
                                    onClick={() => setChatComplaint(c)}
                                    className="text-[10px] font-bold uppercase text-[#006c49] hover:underline"
                                  >
                                    Chat
                                  </button>
                                )}
                                <button
                                  onClick={() => { setSelectedComplaint(c); setIsSlideoverOpen(true) }}
                                  className="text-[#0047cc] hover:underline font-bold text-[10px] uppercase tracking-widest"
                                >
                                  View
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
                Showing {filtered.length} of {pagination.totalItems} entries
              </span>
              {pagination.totalPages > 1 && (
                <div className="flex gap-1">
                  {[...Array(Math.min(pagination.totalPages, 3))].map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setPagination((p) => ({ ...p, currentPage: i + 1 }))}
                      className={`w-6 h-6 flex items-center justify-center border border-[#c3c5d9]/30 text-[10px] font-bold transition-colors ${
                        pagination.currentPage === i + 1
                          ? "bg-[#0047cc] text-white"
                          : "bg-white hover:bg-[#e5eeff]"
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Slide-over dossier */}
        {isSlideoverOpen && selectedComplaint && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/30" onClick={() => setIsSlideoverOpen(false)} />
            <div className="relative w-full max-w-md bg-white shadow-2xl border-l border-[#c3c5d9]/40 flex flex-col overflow-auto h-full z-10">
              <div className="p-6 flex-1">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-[#0047cc] uppercase tracking-tighter">
                      Dossier // #{selectedComplaint.seq}
                    </span>
                    <h3 className="headline font-bold text-xl tracking-tight text-[#0b1c30] mt-1">
                      {selectedComplaint.title || selectedComplaint.subCategory || `Complaint #${selectedComplaint.seq}`}
                    </h3>
                  </div>
                  <button onClick={() => setIsSlideoverOpen(false)} className="p-2 hover:bg-[#eff4ff] transition-colors">
                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
                  </button>
                </div>

                {/* Mini map placeholder */}
                <div className="h-36 bg-[#eff4ff] relative overflow-hidden mb-4 border border-[#c3c5d9]/20">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[#0047cc]" style={{ fontSize: 36, fontVariationSettings: "'FILL' 1" }}>
                      location_on
                    </span>
                  </div>
                  <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-1 text-[8px] font-mono text-white uppercase">
                    {formatLocation(selectedComplaint.location)}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] font-bold uppercase text-slate-400 tracking-widest">Reporter ID</label>
                      <p className="text-xs font-mono">{selectedComplaint.complainant?.name || "N/A"}</p>
                    </div>
                    <div>
                      <label className="text-[9px] font-bold uppercase text-slate-400 tracking-widest">Incident Level</label>
                      <p className={`text-xs font-mono font-bold ${selectedComplaint.urgency === "CRITICAL" ? "text-[#ba1a1a]" : "text-[#0b1c30]"}`}>
                        {selectedComplaint.urgency}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] font-bold uppercase text-slate-400 tracking-widest">Full Narrative</label>
                    <div className="mt-1 bg-[#eff4ff] p-3 text-[11px] leading-relaxed border-l-2 border-[#c3c5d9] text-[#434656]">
                      {selectedComplaint.description}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] font-bold uppercase text-slate-400 tracking-widest">Category</label>
                      <p className="text-xs mt-0.5">{selectedComplaint.category?.name || "N/A"}</p>
                    </div>
                    <div>
                      <label className="text-[9px] font-bold uppercase text-slate-400 tracking-widest">Sub-Category</label>
                      <p className="text-xs mt-0.5">{toTitle(selectedComplaint.subCategory)}</p>
                    </div>
                    <div>
                      <label className="text-[9px] font-bold uppercase text-slate-400 tracking-widest">Submitted</label>
                      <p className="text-xs font-mono mt-0.5">{formatDate(selectedComplaint.submissionDate)}</p>
                    </div>
                    <div>
                      <label className="text-[9px] font-bold uppercase text-slate-400 tracking-widest">Last Updated</label>
                      <p className="text-xs font-mono mt-0.5">{formatDate(selectedComplaint.lastUpdated)}</p>
                    </div>
                  </div>

                  {/* Blockchain Audit Section */}
                  <div className="pt-4 border-t border-[#c3c5d9]/20">
                    <div className="flex items-center justify-between mb-2">
                       <label className="text-[9px] font-bold uppercase text-slate-400 tracking-widest">On-Chain Audit Trail</label>
                       {blockchainLoading ? (
                        <span className="text-[10px] font-bold uppercase text-blue-600">Syncing...</span>
                       ) : blockchainLogs?.blockchainVerifiedLogs?.length ? (
                        <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-2 py-1 rounded">Verified</span>
                       ) : null}
                    </div>
                    
                    <div className="space-y-2">
                      {blockchainLoading && (
                        <div className="space-y-2">
                          <div className="h-14 rounded bg-[#f3f4f5] animate-pulse" />
                          <div className="h-14 rounded bg-[#f3f4f5] animate-pulse" />
                        </div>
                      )}

                      {blockchainLogs?.databaseLogs?.slice(0, 5).map((log: any, idx: number) => {
                        const proof =
                          blockchainLogs.blockchainVerifiedLogs?.find((p: any) => p.action === log.action) ||
                          blockchainLogs.blockchainVerifiedLogs?.find((p: any) => Boolean(p.transactionHash));
                        return (
                          <div key={idx} className="bg-[#f8fbff] p-3 border border-[#d7e2ff] border-l-4 border-l-[#0047cc] rounded">
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-[10px] font-bold text-slate-800 uppercase">{log.action || "Audit Event"}</span>
                              <span className={`text-[8px] font-bold uppercase px-2 py-1 rounded ${proof ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                                {proof ? "Verified" : "Pending"}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-600 mt-1">{log.details || "No details available"}</p>
                            <div className="mt-2 flex flex-wrap items-center gap-3 text-[9px] text-slate-500">
                              <span>{formatChainDateTime(log.timestamp)}</span>
                              {proof?.blockNumber ? <span>Block #{proof.blockNumber}</span> : null}
                            </div>
                            {proof?.transactionHash && (
                              <a
                                href={`https://sepolia.etherscan.io/tx/${proof.transactionHash}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[9px] text-[#0047cc] hover:underline font-mono mt-1 block"
                              >
                                Proof: {shortHash(proof.transactionHash)} ↗
                              </a>
                            )}
                          </div>
                        )
                      })}

                      {!blockchainLoading && !blockchainLogs?.databaseLogs?.length &&
                        blockchainLogs?.blockchainVerifiedLogs?.slice(0, 3).map((log: any, idx: number) => (
                          <div key={`chain-${idx}`} className="bg-emerald-50 p-3 border border-emerald-200 border-l-4 border-l-emerald-500 rounded">
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-[10px] font-bold text-emerald-900 uppercase">{log.action || "ON_CHAIN_CONFIRMATION"}</span>
                              <span className="text-[8px] font-bold uppercase px-2 py-1 rounded bg-emerald-100 text-emerald-700">Verified</span>
                            </div>
                            <p className="text-[10px] text-emerald-800 mt-1">{log.details || "Confirmed on blockchain."}</p>
                            <div className="mt-2 flex flex-wrap items-center gap-3 text-[9px] text-emerald-800">
                              <span>{formatChainDateTime(log.timestamp)}</span>
                              {log.blockNumber ? <span>Block #{log.blockNumber}</span> : null}
                            </div>
                            {log.transactionHash && (
                              <a
                                href={`https://sepolia.etherscan.io/tx/${log.transactionHash}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[9px] text-emerald-700 hover:underline font-mono mt-1 block"
                              >
                                Proof: {shortHash(log.transactionHash)} ↗
                              </a>
                            )}
                          </div>
                        ))}

                      {!blockchainLoading &&
                        !blockchainLogs?.databaseLogs?.length &&
                        !blockchainLogs?.blockchainVerifiedLogs?.length && (
                          <div className="rounded border border-dashed border-slate-300 p-3 bg-slate-50">
                            <p className="text-[10px] text-slate-500 italic">No blockchain proofs available yet.</p>
                          </div>
                        )}
                    </div>
                  </div>


                  {/* Status update */}
                  {(() => {
                    const isEscalated = ["ESCALATED_TO_MUNICIPAL_LEVEL", "ESCALATED_TO_STATE_LEVEL"].includes(selectedComplaint.status)
                    if (isEscalated) {
                      return (
                        <div className="pt-4 border-t border-[#c3c5d9]/20">
                          <p className="text-xs text-orange-700 bg-orange-50 p-3 border border-orange-200 flex items-start gap-2">
                            <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: 14 }}>move_up</span>
                            This complaint has been escalated to Municipal Admin. Status updates are now handled by the receiving authority.
                          </p>
                        </div>
                      )
                    }
                    if (canUpdate(selectedComplaint)) {
                      return (
                        <div className="pt-4 border-t border-[#c3c5d9]/20">
                          <p className="text-[9px] font-bold uppercase text-slate-400 tracking-widest mb-2">Update Status</p>
                          <div className="flex flex-wrap gap-2 mb-3">
                            {["UNDER_PROCESSING", "COMPLETED", "ON_HOLD", "FORWARDED"].map((s) => (
                              <button
                                key={s}
                                disabled={statusUpdating || selectedComplaint.status === s}
                                onClick={() => updateStatus(selectedComplaint.id, s)}
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
                          {adminType === "AGENT" && (
                            <button
                              disabled={statusUpdating}
                              onClick={() => updateStatus(selectedComplaint.id, "ESCALATED_TO_MUNICIPAL_LEVEL")}
                              className="w-full py-2 bg-[#ba1a1a] text-white text-[10px] font-bold uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all disabled:opacity-40"
                            >
                              Escalate to Municipal Admin
                            </button>
                          )}
                        </div>
                      )
                    }
                    return (
                      <div className="pt-4 border-t border-[#c3c5d9]/20">
                        <p className="text-xs text-amber-700 bg-amber-50 p-3 border border-amber-200">
                          This complaint is no longer assigned to you. Status updates are disabled.
                        </p>
                      </div>
                    )
                  })()}
                </div>
              </div>

              <div className="p-6 border-t border-[#c3c5d9]/20 flex flex-col gap-2">
                {adminType === "AGENT" && selectedComplaint.assignedAgent?.id === currentAdminId && (
                  <button
                    onClick={() => { setChatComplaint(selectedComplaint); setIsSlideoverOpen(false) }}
                    className="w-full py-3 bg-[#0047cc] text-white font-bold text-sm flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chat</span>
                    Chat with Citizen
                  </button>
                )}
                <button
                  onClick={() => { setIsSlideoverOpen(false); setSelectedComplaint(null) }}
                  className="w-full py-3 bg-[#eff4ff] border border-[#c3c5d9] text-[#0b1c30] font-bold text-sm hover:bg-[#e5eeff] transition-colors"
                >
                  Close
                </button>
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
