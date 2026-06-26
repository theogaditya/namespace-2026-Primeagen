"use client"

import { useState, useEffect, useMemo } from "react"

// ─── Types ─────────────────────────────────────────────────────────────────────
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
  complainant: {
    id: string
    name: string
    email: string
    phone: string
  } | null
  assignedAgent?: { id: string; name: string; email: string } | null
  managedByMunicipalAdmin?: { id: string; name: string; email: string } | null
  escalatedToStateAdmin?: { id: string; name: string; email: string } | null
  escalationLevel?: string | null
  AIStandardizedSubcategory?: string | null
  AIstandardizedSubCategory?: string | null
}

const API_URL = process.env.NEXT_PUBLIC_API_URL

// ─── Dummy placeholders for empty-state preview ────────────────────────────────
const DUMMY_COMPLAINTS: Complaint[] = [
  {
    id: "dummy-1",
    seq: 9042,
    title: "Broken Water Main — Sector 4",
    description:
      "Major water pipeline leak reported near the residential block. Residents facing severe water shortage for over 2 days. Requires immediate field dispatch.",
    category: { id: "cat-1", name: "Water Supply" },
    subCategory: "Pipeline Leak",
    status: "UNDER_PROCESSING",
    urgency: "CRITICAL",
    department: "Water Supply",
    submissionDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    lastUpdated: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    attachmentUrl: null,
    location: { district: "Central", city: "New Delhi", locality: "Sector 4, Rohini", street: null, pin: "110085" },
    complainant: { id: "u1", name: "Harish Vardhan", email: "harish@example.com", phone: "+91 98765 43210" },
    assignedAgent: null,
    managedByMunicipalAdmin: null,
    escalatedToStateAdmin: { id: "a1", name: "State Admin V.", email: "state@gov.in" }
  },
]

// ─── Utilities ─────────────────────────────────────────────────────────────────
const toTitle = (s: string | undefined) => {
  if (!s) return ""
  return s
    .toLowerCase()
    .split(/_|\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })

const getInitials = (name: string) =>
  name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase()

// SLA hours by urgency
const SLA_HOURS: Record<string, number> = {
  CRITICAL: 24,
  HIGH: 48,
  MEDIUM: 72,
  LOW: 168,
}

function getSlaInfo(submissionDate: string, urgency: string, status: string) {
  const done = status === "COMPLETED" || status === "ESCALATED_TO_NATIONAL_LEVEL"
  if (done) {
    return {
      label: "CLOSED",
      time: "—",
      pct: 100,
      color: "text-[#44474c]",
      barColor: "bg-[#115cb9]",
      breached: false,
    }
  }
  const slaTotalMs = (SLA_HOURS[urgency] || 72) * 60 * 60 * 1000
  const elapsed = Date.now() - new Date(submissionDate).getTime()
  const pct = Math.min(100, Math.round((elapsed / slaTotalMs) * 100))
  const remainingMs = slaTotalMs - elapsed
  const rh = Math.floor(Math.abs(remainingMs) / (1000 * 60 * 60))
  const rm = Math.floor((Math.abs(remainingMs) % (1000 * 60 * 60)) / (1000 * 60))

  if (remainingMs < 0)
    return {
      label: "BREACHED",
      time: `-${rh}h ${rm}m`,
      pct: 100,
      color: "text-[#ba1a1a]",
      barColor: "bg-[#ba1a1a]",
      breached: true,
    }
  if (pct >= 80)
    return {
      label: "WARNING",
      time: `${rh}h ${rm}m left`,
      pct,
      color: "text-amber-600",
      barColor: "bg-amber-500",
      breached: false,
    }
  return {
    label: "ACTIVE",
    time: `${rh}h left`,
    pct,
    color: "text-[#115cb9]",
    barColor: "bg-[#115cb9]",
    breached: false,
  }
}

// ─── Sub-components ────────────────────────────────────────────────────────────
function PriorityPill({ urgency }: { urgency: string }) {
  const map: Record<string, { bg: string; text: string }> = {
    CRITICAL: { bg: "bg-[#ffdad6]", text: "text-[#93000a]" },
    HIGH: { bg: "bg-[#d7e2ff]", text: "text-[#003370]" },
    MEDIUM: { bg: "bg-[#e7e8e9]", text: "text-[#44474c]" },
    LOW: { bg: "bg-[#d2e4fb]", text: "text-[#0b1d2d]" },
  }
  const style = map[urgency] ?? { bg: "bg-[#e7e8e9]", text: "text-[#44474c]" }
  return (
    <span
      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${style.bg} ${style.text}`}
    >
      {urgency}
    </span>
  )
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    REGISTERED: { bg: "bg-[#d7e2ff]", text: "text-[#003370]", label: "Open" },
    UNDER_PROCESSING: { bg: "bg-amber-100", text: "text-amber-800", label: "In Progress" },
    COMPLETED: { bg: "bg-emerald-100", text: "text-emerald-800", label: "Resolved" },
    ON_HOLD: { bg: "bg-[#ffdad6]", text: "text-[#93000a]", label: "On Hold" },
    FORWARDED: { bg: "bg-violet-100", text: "text-violet-800", label: "Forwarded" },
    REJECTED: { bg: "bg-[#e7e8e9]", text: "text-[#74777d]", label: "Rejected" },
    ESCALATED_TO_MUNICIPAL_LEVEL: {
      bg: "bg-orange-100",
      text: "text-orange-800",
      label: "Escalated to Municipal",
    },
    ESCALATED_TO_STATE_LEVEL: {
      bg: "bg-orange-100",
      text: "text-orange-800",
      label: "Escalated to State",
    },
    ESCALATED_TO_NATIONAL_LEVEL: {
      bg: "bg-purple-100",
      text: "text-purple-800",
      label: "Escalated to National",
    },
  }
  const style = map[status] ?? {
    bg: "bg-[#e7e8e9]",
    text: "text-[#44474c]",
    label: toTitle(status),
  }
  return (
    <span
      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${style.bg} ${style.text}`}
    >
      {style.label}
    </span>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── Main Component ────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
export function StateMyComplaints() {
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null)
  const [currentAdminId, setCurrentAdminId] = useState("")
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 25,
  })

  // ── Data fetching ────────────────────────────────────────────────────────────
  const fetchMyComplaints = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem("token")
      if (!token) {
        setLoading(false)
        return
      }
      const res = await fetch(
        `/api/state-admin/my-complaints?page=${pagination.currentPage}&limit=${pagination.itemsPerPage}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setComplaints((data.complaints || []) as Complaint[])
      setPagination((prev) => ({
        ...prev,
        totalPages: data.pagination?.totalPages || 1,
        totalItems: data.pagination?.total || (data.complaints || []).length,
      }))
    } catch (err) {
      console.error("Error fetching complaints:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    try {
      const adminData = localStorage.getItem("admin")
      if (adminData) setCurrentAdminId(JSON.parse(adminData).id || "")
    } catch {}
    fetchMyComplaints()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.currentPage, pagination.itemsPerPage])

  // ── Status update ────────────────────────────────────────────────────────────
  const updateStatus = async (complaintId: string, status: string) => {
    setStatusUpdating(true)
    try {
      const token = localStorage.getItem("token")
      if (!token) return
      const isEscalation = status === "ESCALATED_TO_NATIONAL_LEVEL"
      const endpoint = isEscalation
        ? `${API_URL}/api/state-admin/complaints/${complaintId}/escalate`
        : `${API_URL}/api/state-admin/complaints/${complaintId}/status`

      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: isEscalation ? undefined : JSON.stringify({ status }),
      })
      if (res.ok) {
        fetchMyComplaints()
        setSelectedComplaint(null)
      }
    } catch (err) {
      console.error("Error updating status:", err)
    } finally {
      setStatusUpdating(false)
    }
  }

  // ── Filters ──────────────────────────────────────────────────────────────────
  const filteredComplaints = useMemo(() => {
    return complaints.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false
      if (priorityFilter !== "all" && c.urgency !== priorityFilter) return false
      if (searchTerm) {
        const s = searchTerm.toLowerCase()
        return (
          c.title?.toLowerCase().includes(s) ||
          String(c.seq) === searchTerm ||
          c.category?.name?.toLowerCase().includes(s) ||
          c.complainant?.name?.toLowerCase().includes(s)
        )
      }
      return true
    })
  }, [complaints, statusFilter, priorityFilter, searchTerm])

  const isDummy = !loading && complaints.length === 0
  const displayComplaints = isDummy ? DUMMY_COMPLAINTS : filteredComplaints
  const canUpdate = (c: Complaint) =>
    !!currentAdminId && c.escalatedToStateAdmin?.id === currentAdminId

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 flex flex-col gap-6">
      {/* ── Page Header & Bulk Actions ── */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-black text-[#041627] tracking-tight">
            My Complaints
          </h2>
          <p className="text-[#44474c] text-sm font-medium mt-1">
            Manage and resolve citizen grievances escalated to State Level assigned to you.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchMyComplaints}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#e1e3e4] text-[#041627] text-sm font-semibold rounded-lg hover:bg-[#d9dadb] transition-all active:scale-95 disabled:opacity-50"
          >
            <span
              className={`material-symbols-outlined text-lg ${loading ? "animate-spin" : ""}`}
            >
              refresh
            </span>
            Refresh
          </button>
          {selectedIds.size > 0 && (
            <button className="flex items-center gap-2 px-4 py-2.5 bg-[#041627] text-white text-sm font-semibold rounded-lg shadow-md hover:opacity-90 transition-all active:scale-95">
              <span className="material-symbols-outlined text-lg">publish</span>
              Escalate Selected ({selectedIds.size})
            </button>
          )}
        </div>
      </div>

      {/* ── Advanced Filter Bar ── */}
      <section className="bg-[#f3f4f5] rounded-xl p-4 grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* Search */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-widest text-[#44474c]/70 font-bold block ml-1">
            Search
          </label>
          <div className="relative">
            <input
              className="w-full bg-white border-none rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-1 focus:ring-[#041627] placeholder:text-[#44474c]/50"
              placeholder="ID, title, complainant..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#44474c]/60 text-lg">
              search
            </span>
          </div>
        </div>

        {/* Status */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-widest text-[#44474c]/70 font-bold block ml-1">
            Status
          </label>
          <select
            className="w-full bg-white border-none rounded-lg py-2 text-sm focus:ring-1 focus:ring-[#041627]"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="REGISTERED">Open</option>
            <option value="UNDER_PROCESSING">In-Progress</option>
            <option value="COMPLETED">Resolved</option>
            <option value="ON_HOLD">On Hold</option>
            <option value="FORWARDED">Forwarded</option>
          </select>
        </div>

        {/* Priority */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-widest text-[#44474c]/70 font-bold block ml-1">
            Priority
          </label>
          <select
            className="w-full bg-white border-none rounded-lg py-2 text-sm focus:ring-1 focus:ring-[#041627]"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="all">All Priorities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>

        {/* SLA */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-widest text-[#44474c]/70 font-bold block ml-1">
            SLA Status
          </label>
          <select className="w-full bg-white border-none rounded-lg py-2 text-sm focus:ring-1 focus:ring-[#041627]">
            <option>Any SLA</option>
            <option>Breached</option>
            <option>Warning (2h left)</option>
            <option>On Track</option>
          </select>
        </div>

        {/* Rows per page */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-widest text-[#44474c]/70 font-bold block ml-1">
            Rows Per Page
          </label>
          <select
            className="w-full bg-white border-none rounded-lg py-2 text-sm focus:ring-1 focus:ring-[#041627]"
            value={pagination.itemsPerPage}
            onChange={(e) =>
              setPagination((p) => ({
                ...p,
                itemsPerPage: Number(e.target.value),
                currentPage: 1,
              }))
            }
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </section>

      {/* ── Dummy notice ── */}
      {isDummy && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 text-sm text-amber-700 font-medium flex items-center gap-3">
          <span className="material-symbols-outlined text-amber-500">info</span>
          No escalated complaints assigned to you yet. Showing sample data for preview.
        </div>
      )}

      {/* ── High-Density Table ── */}
      <div className="bg-white rounded-xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#f3f4f5]/50">
              <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-[#44474c] font-bold">
                <input type="checkbox" className="rounded-[2px] text-[#041627] focus:ring-0" />
              </th>
              <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-[#44474c] font-bold">
                Complaint ID
              </th>
              <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-[#44474c] font-bold">
                Complainant
              </th>
              <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-[#44474c] font-bold">
                Category
              </th>
              <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-[#44474c] font-bold">
                Priority
              </th>
              <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-[#44474c] font-bold">
                SLA Status
              </th>
              <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-[#44474c] font-bold">
                Assigned
              </th>
              <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-[#44474c] font-bold text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#c4c6cd]/10">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>
                  <td colSpan={8} className="px-6 py-4">
                    <div className="animate-pulse flex items-center gap-4">
                      <div className="h-4 w-4 bg-[#edeeef] rounded" />
                      <div className="h-4 bg-[#edeeef] rounded w-2/3" />
                    </div>
                  </td>
                </tr>
              ))
            ) : displayComplaints.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-20 text-center">
                  <span className="material-symbols-outlined text-5xl text-[#c4c6cd] block mb-2">
                    inbox
                  </span>
                  <p className="text-sm font-bold text-[#44474c]">No complaints found</p>
                  <p className="text-xs text-[#74777d] mt-1">Try adjusting the filters</p>
                </td>
              </tr>
            ) : (
              displayComplaints.map((c) => {
                const sla = getSlaInfo(c.submissionDate, c.urgency, c.status)
                const initials = c.complainant ? getInitials(c.complainant.name) : "??"
                return (
                  <tr
                    key={c.id}
                    className="hover:bg-[#f3f4f5] transition-colors group cursor-pointer"
                    onClick={() => setSelectedComplaint(c)}
                  >
                    <td
                      className="px-6 py-4"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        className="rounded-[2px] text-[#041627] focus:ring-0"
                        checked={selectedIds.has(c.id)}
                        onChange={() => toggleSelect(c.id)}
                      />
                    </td>
                    <td className="px-6 py-4 font-mono text-sm text-[#041627] font-bold">
                      #{String(c.seq).padStart(4, "0")}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-[#d7e2ff] text-[#003370] flex items-center justify-center text-xs font-bold shrink-0">
                          {initials}
                        </div>
                        <span className="text-sm font-medium">
                          {c.complainant?.name || "Anonymous"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#44474c]">
                      {c.category?.name || c.subCategory || "—"}
                    </td>
                    <td className="px-6 py-4">
                      <PriorityPill urgency={c.urgency} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5">
                        <div
                          className={`flex justify-between items-center text-[10px] font-bold ${sla.color}`}
                        >
                          <span>{sla.label}</span>
                          <span>{sla.time}</span>
                        </div>
                        <div className="w-24 h-1 bg-[#e1e3e4] rounded-full overflow-hidden">
                          <div
                            className={`h-full ${sla.barColor} rounded-full`}
                            style={{
                              width: `${sla.pct}%`,
                              boxShadow: sla.breached ? "0 0 4px #ba1a1a" : undefined,
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-[#44474c]">
                      {c.escalatedToStateAdmin?.name || (
                        <span className="italic text-[#44474c]/40">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        className="p-1.5 hover:bg-[#e1e3e4] rounded-lg transition-colors text-[#44474c]"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedComplaint(c)
                        }}
                      >
                        <span className="material-symbols-outlined text-xl">open_in_new</span>
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      <div className="flex items-center justify-between pt-2 border-t border-[#c4c6cd]/10">
        <div className="flex items-center gap-4">
          <span className="text-xs text-[#44474c] font-medium">
            Showing {displayComplaints.length} of{" "}
            {isDummy ? 2 : pagination.totalItems} complaints
          </span>
        </div>
        {pagination.totalPages > 1 && !isDummy && (
          <div className="flex items-center gap-1">
            <button
              disabled={pagination.currentPage <= 1}
              onClick={() =>
                setPagination((p) => ({ ...p, currentPage: p.currentPage - 1 }))
              }
              className="p-2 hover:bg-[#e7e8e9] rounded-lg transition-colors text-[#44474c] disabled:opacity-30"
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            {[...Array(Math.min(pagination.totalPages, 5))].map((_, i) => {
              const page = i + 1
              return (
                <button
                  key={page}
                  onClick={() =>
                    setPagination((p) => ({ ...p, currentPage: page }))
                  }
                  className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-colors ${
                    page === pagination.currentPage
                      ? "bg-[#041627] text-white"
                      : "hover:bg-[#e7e8e9] text-[#44474c]"
                  }`}
                >
                  {page}
                </button>
              )
            })}
            <button
              disabled={pagination.currentPage >= pagination.totalPages}
              onClick={() =>
                setPagination((p) => ({ ...p, currentPage: p.currentPage + 1 }))
              }
              className="p-2 hover:bg-[#e7e8e9] rounded-lg transition-colors text-[#44474c] disabled:opacity-30"
            >
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {/* ── Detail Triage Panel ────────────────────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {selectedComplaint && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-[#f8f9fa]"
          style={{ marginLeft: "256px" }}
        >
          {/* Sticky header */}
          <header className="sticky top-0 z-10 bg-[#f8f9fa]/80 backdrop-blur-xl flex items-center justify-between px-6 py-3 w-full shadow-sm">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSelectedComplaint(null)}
                className="material-symbols-outlined text-[#191c1d] hover:bg-[#e1e3e4] p-2 rounded-full transition-colors"
              >
                arrow_back
              </button>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#44474c]">
                  Complaint #{String(selectedComplaint.seq).padStart(4, "0")}
                </span>
                <h2 className="text-xl font-black text-[#191c1d] tracking-tighter">
                  {selectedComplaint.title ||
                    selectedComplaint.subCategory ||
                    `Complaint #${selectedComplaint.seq}`}
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <StatusPill status={selectedComplaint.status} />
              <PriorityPill urgency={selectedComplaint.urgency} />
            </div>
          </header>

          {/* Contextual Action Bar */}
          <div className="px-8 py-4 bg-[#f3f4f5] flex items-center justify-between">
            <div className="flex gap-2 flex-wrap">
              {(["UNDER_PROCESSING", "COMPLETED", "ON_HOLD", "FORWARDED"] as const).map(
                (st) => (
                  <button
                    key={st}
                    disabled={
                      statusUpdating ||
                      selectedComplaint.status === st ||
                      !canUpdate(selectedComplaint)
                    }
                    onClick={() => updateStatus(selectedComplaint.id, st)}
                    className={`px-4 py-2 text-sm font-semibold rounded-lg hover:bg-white transition-colors active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                      selectedComplaint.status === st
                        ? "bg-[#041627] text-white"
                        : "bg-white text-[#191c1d]"
                    }`}
                  >
                    {st === "UNDER_PROCESSING" && (
                      <span className="material-symbols-outlined text-sm">pending</span>
                    )}
                    {st === "COMPLETED" && (
                      <span className="material-symbols-outlined text-sm">check_circle</span>
                    )}
                    {st === "ON_HOLD" && (
                      <span className="material-symbols-outlined text-sm">pause_circle</span>
                    )}
                    {st === "FORWARDED" && (
                      <span className="material-symbols-outlined text-sm">forward</span>
                    )}
                    {toTitle(st)}
                  </button>
                )
              )}
            </div>
            {selectedComplaint.status !== "ESCALATED_TO_NATIONAL_LEVEL" && (
              <button
                onClick={() =>
                  updateStatus(selectedComplaint.id, "ESCALATED_TO_NATIONAL_LEVEL")
                }
                disabled={statusUpdating || !canUpdate(selectedComplaint)}
                className="px-6 py-2 bg-gradient-to-br from-[#041627] to-[#1a2b3c] text-white text-sm font-bold rounded-lg hover:shadow-lg transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
              >
                <span
                  className="material-symbols-outlined text-sm"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  priority_high
                </span>
                Escalate to National
              </button>
            )}
          </div>

          {/* Content Grid */}
          <div className="flex-1 overflow-y-auto p-8 grid grid-cols-12 gap-6">
            {/* ── Left column ── */}
            <div className="col-span-8 space-y-6">
              {/* AI tag */}
              {(selectedComplaint.AIStandardizedSubcategory ||
                selectedComplaint.AIstandardizedSubCategory) && (
                <div className="flex items-center gap-2 px-4 py-2 bg-[#d7e2ff] rounded-xl w-fit">
                  <span className="material-symbols-outlined text-sm text-[#003370]">
                    psychology
                  </span>
                  <span className="text-xs font-bold text-[#003370] uppercase tracking-wider">
                    AI Category:{" "}
                    {selectedComplaint.AIStandardizedSubcategory ||
                      selectedComplaint.AIstandardizedSubCategory}
                  </span>
                </div>
              )}

              {/* Description card */}
              <section className="bg-white p-6 rounded-xl space-y-4">
                <div className="flex items-center justify-between border-b border-[#e1e3e4] pb-4">
                  <h3 className="text-sm font-black uppercase tracking-widest text-[#44474c] flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#115cb9]">description</span>
                    Complaint Details
                  </h3>
                  <span className="text-xs text-[#44474c]/70">
                    Filed {formatDate(selectedComplaint.submissionDate)}
                  </span>
                </div>
                <p className="text-sm text-[#191c1d] whitespace-pre-wrap leading-relaxed">
                  {selectedComplaint.description}
                </p>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div className="p-3 bg-[#f3f4f5] rounded-lg">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#44474c] mb-1">
                      Category
                    </p>
                    <p className="text-sm font-semibold text-[#041627]">
                      {selectedComplaint.category?.name || "—"}
                    </p>
                  </div>
                  <div className="p-3 bg-[#f3f4f5] rounded-lg">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#44474c] mb-1">
                      Sub-Category
                    </p>
                    <p className="text-sm font-semibold text-[#041627]">
                      {selectedComplaint.subCategory || "—"}
                    </p>
                  </div>
                </div>
              </section>

              {/* Timeline */}
              <section className="bg-white p-6 rounded-xl space-y-4">
                <div className="flex items-center justify-between border-b border-[#e1e3e4] pb-4">
                  <h3 className="text-sm font-black uppercase tracking-widest text-[#44474c] flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#115cb9]">history</span>
                    Timeline
                  </h3>
                  <span className="text-xs text-[#44474c]/70">
                    Last updated: {formatDate(selectedComplaint.lastUpdated)}
                  </span>
                </div>
                <div className="relative space-y-6 before:content-[''] before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-[#e1e3e4]">
                  <div className="relative pl-10">
                    <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-[#115cb9] flex items-center justify-center text-white z-10">
                      <span
                        className="material-symbols-outlined text-xs"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        assignment_turned_in
                      </span>
                    </div>
                    <div className="bg-[#f3f4f5] p-4 rounded-lg">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="text-sm font-bold text-[#191c1d]">Status Updated</h4>
                        <time className="text-[10px] font-bold text-[#44474c] uppercase tracking-widest">
                          {formatDate(selectedComplaint.lastUpdated)}
                        </time>
                      </div>
                      <p className="text-sm text-[#44474c]">
                        Current status:{" "}
                        <span className="font-bold">{toTitle(selectedComplaint.status)}</span>
                      </p>
                    </div>
                  </div>
                  <div className="relative pl-10 opacity-70">
                    <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-[#041627] flex items-center justify-center text-white z-10">
                      <span className="material-symbols-outlined text-xs">new_releases</span>
                    </div>
                    <div className="bg-[#f3f4f5] p-4 rounded-lg">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="text-sm font-bold text-[#191c1d]">Complaint Filed</h4>
                        <time className="text-[10px] font-bold text-[#44474c] uppercase tracking-widest">
                          {formatDate(selectedComplaint.submissionDate)}
                        </time>
                      </div>
                      <p className="text-sm text-[#44474c]">
                        Initial report filed. Categorized as{" "}
                        <span className="font-bold">
                          {selectedComplaint.category?.name || selectedComplaint.subCategory}
                        </span>
                        .
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Assignment info */}
              <section className="bg-white p-6 rounded-xl">
                <h3 className="text-sm font-black uppercase tracking-widest text-[#44474c] mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#115cb9]">assignment_ind</span>
                  Assignment Info
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-[#f3f4f5] rounded-lg">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#44474c] mb-1">
                      Assigned State Admin
                    </p>
                    <p className="text-sm font-semibold text-[#041627]">
                      {selectedComplaint.escalatedToStateAdmin?.name || (
                        <span className="italic text-[#44474c]/40">Unassigned</span>
                      )}
                    </p>
                  </div>
                  <div className="p-3 bg-[#f3f4f5] rounded-lg">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#44474c] mb-1">
                      Department
                    </p>
                    <p className="text-sm font-semibold text-[#041627]">
                      {toTitle(selectedComplaint.department) || "—"}
                    </p>
                  </div>
                </div>
                {!canUpdate(selectedComplaint) && (
                  <div className="mt-4 bg-amber-50 border border-amber-200 p-4 rounded-xl text-sm text-amber-700 font-medium flex items-center gap-3">
                    <span className="material-symbols-outlined text-amber-500">info</span>
                    This complaint is not directly managed by you. Status updates are restricted.
                  </div>
                )}
              </section>
            </div>

            {/* ── Right sidebar ── */}
            <aside className="col-span-4 space-y-6">
              {/* SLA timer */}
              {(() => {
                const sla = getSlaInfo(
                  selectedComplaint.submissionDate,
                  selectedComplaint.urgency,
                  selectedComplaint.status
                )
                return (
                  <div className="bg-[#041627] text-white p-6 rounded-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                      <span className="material-symbols-outlined text-6xl">timer</span>
                    </div>
                    <h4 className="text-[10px] font-bold uppercase tracking-widest mb-1 text-[#d2e4fb]">
                      SLA Progress
                    </h4>
                    <div className="flex items-end gap-2 mb-4">
                      <span
                        className={`text-3xl font-black tracking-tighter ${
                          sla.breached ? "text-[#ffdad6]" : "text-white"
                        }`}
                      >
                        {sla.time}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${sla.pct}%` }}
                        className={`h-full ${sla.breached ? "bg-[#ba1a1a] shadow-[0_0_8px_#ba1a1a]" : "bg-[#659dfe]"}`}
                      />
                    </div>
                    <p className="text-[10px] mt-4 font-bold uppercase tracking-widest text-[#d2e4fb] flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">report</span>
                      {sla.label} —{" "}
                      {sla.breached ? "SLA exceeded" : `${sla.pct}% elapsed`}
                    </p>
                  </div>
                )
              })()}

              {/* Meta */}
              <section className="bg-white p-6 rounded-xl space-y-3">
                <h3 className="text-sm font-black uppercase tracking-widest text-[#44474c] mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#115cb9]">info</span>
                  Complaint Meta
                </h3>
                <div className="p-3 bg-[#f3f4f5] rounded-lg flex justify-between items-center">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#44474c]">
                    Status
                  </p>
                  <StatusPill status={selectedComplaint.status} />
                </div>
                <div className="p-3 bg-[#f3f4f5] rounded-lg flex justify-between items-center">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#44474c]">
                    Priority
                  </p>
                  <PriorityPill urgency={selectedComplaint.urgency} />
                </div>
                <div className="p-3 bg-[#f3f4f5] rounded-lg">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#44474c] mb-1">
                    Submitted
                  </p>
                  <p className="text-sm font-semibold text-[#041627]">
                    {formatDate(selectedComplaint.submissionDate)}
                  </p>
                </div>
              </section>

              {/* Complainant info */}
              {selectedComplaint.complainant && (
                <section className="bg-white p-6 rounded-xl">
                  <h3 className="text-sm font-black uppercase tracking-widest text-[#44474c] mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#115cb9]">person</span>
                    Complainant Info
                  </h3>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-[#d7e2ff] flex items-center justify-center text-[#003370] text-lg font-bold">
                      {getInitials(selectedComplaint.complainant.name)}
                    </div>
                    <div>
                      <p className="font-bold text-[#191c1d]">
                        {selectedComplaint.complainant.name}
                      </p>
                      <p className="text-xs text-[#44474c]">
                        {selectedComplaint.complainant.phone}
                      </p>
                    </div>
                  </div>
                  <div className="p-3 bg-[#f3f4f5] rounded-lg">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#44474c] mb-1">
                      Email
                    </p>
                    <p className="text-xs font-medium text-[#041627] truncate">
                      {selectedComplaint.complainant.email}
                    </p>
                  </div>
                </section>
              )}

              {/* Location */}
              {selectedComplaint.location && (
                <section className="bg-white p-6 rounded-xl">
                  <h3 className="text-sm font-black uppercase tracking-widest text-[#44474c] mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#ba1a1a]">location_on</span>
                    Location
                  </h3>
                  <div className="p-3 bg-[#f3f4f5] rounded-lg text-sm text-[#041627]">
                    {[
                      selectedComplaint.location.locality,
                      selectedComplaint.location.city,
                      selectedComplaint.location.district,
                      selectedComplaint.location.pin,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </div>
                </section>
              )}
            </aside>
          </div>
        </div>
      )}
    </div>
  )
}
