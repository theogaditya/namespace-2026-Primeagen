"use client"

import { useState, useEffect, useMemo } from "react"
import 'leaflet/dist/leaflet.css'
import { MapContainer, Marker, TileLayer } from 'react-leaflet'
import L from 'leaflet'

// ─── Types ────────────────────────────────────────────────────────────
interface OverviewStats {
  total: number
  registered: number
  inProgress: number
  resolved: number
  closed: number
  highPriority: number
  assigned: number
}

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
  assignedAgent?: {
    id: string
    name: string
    email: string
  } | null
  managedByMunicipalAdmin?: {
    id: string
    name: string
    email: string
  } | null
  escalatedToStateAdmin?: {
    id: string
    name: string
    email: string
  } | null
  escalationLevel?: string | null
  AIStandardizedSubcategory?: string | null
  AIstandardizedSubCategory?: string | null
  isDuplicate?: boolean | null
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'

// ─── Utilities ────────────────────────────────────────────────────────
const toTitle = (s: string | undefined) => {
  if (!s) return ''
  return s.toLowerCase().split(/_|\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

const formatLocation = (loc: Complaint['location'] | null | undefined) => {
  if (!loc) return ''
  const parts: string[] = []
  if (loc.locality) parts.push(loc.locality)
  if (loc.street) parts.push(loc.street)
  if (loc.city) parts.push(loc.city)
  if (loc.district) parts.push(loc.district)
  if (loc.pin) parts.push(loc.pin)
  return parts.join(', ')
}

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })

// ─── Priority / Status / Department badge helpers ─────────────────────
function PriorityPill({ urgency }: { urgency: string }) {
  const map: Record<string, { bg: string; text: string }> = {
    CRITICAL: { bg: 'bg-[#ffdad6]', text: 'text-[#93000a]' },
    HIGH: { bg: 'bg-[#d7e2ff]', text: 'text-[#003370]' },
    MEDIUM: { bg: 'bg-[#e7e8e9]', text: 'text-[#44474c]' },
    LOW: { bg: 'bg-[#d2e4fb]', text: 'text-[#0b1d2d]' },
  }
  const style = map[urgency] ?? { bg: 'bg-[#e7e8e9]', text: 'text-[#44474c]' }
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${style.bg} ${style.text}`}>
      {urgency}
    </span>
  )
}

function StatusPill({ status }: { status?: string }) {
  if (!status) return null
  const map: Record<string, { bg: string; text: string }> = {
    UNDER_PROCESSING: { bg: 'bg-amber-100', text: 'text-amber-800' },
    FORWARDED: { bg: 'bg-violet-100', text: 'text-violet-800' },
    ON_HOLD: { bg: 'bg-[#e7e8e9]', text: 'text-[#44474c]' },
    COMPLETED: { bg: 'bg-emerald-100', text: 'text-emerald-800' },
    REJECTED: { bg: 'bg-[#ffdad6]', text: 'text-[#93000a]' },
    ESCALATED_TO_MUNICIPAL_LEVEL: { bg: 'bg-orange-100', text: 'text-orange-800' },
    ESCALATED_TO_STATE_LEVEL: { bg: 'bg-orange-100', text: 'text-orange-800' },
    ESCALATED_TO_NATIONAL_LEVEL: { bg: 'bg-purple-100', text: 'text-purple-800' },
    DELETED: { bg: 'bg-[#e7e8e9]', text: 'text-[#74777d]' },
  }
  const style = map[status] ?? { bg: 'bg-[#e7e8e9]', text: 'text-[#44474c]' }
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${style.bg} ${style.text}`}>
      {toTitle(status)}
    </span>
  )
}

// ─── Map sub-component ────────────────────────────────────────────────
function ComplaintLocationMap({ lat, lng }: { lat: number; lng: number }) {
  useMemo(() => {
    try {
      // @ts-ignore
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
        iconUrl: require('leaflet/dist/images/marker-icon.png'),
        shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
      })
    } catch {}
  }, [])

  const googleMapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  const googleUrl = `https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&key=${googleMapsKey}`

  return (
    <MapContainer center={[lat, lng]} zoom={15} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
      {googleMapsKey ? (
        <TileLayer url={googleUrl} attribution='&copy; <a href="https://www.google.com/maps">Google Maps</a>' />
      ) : (
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
      )}
      <Marker position={[lat, lng]} />
    </MapContainer>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// ─── Main Component ───────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════
export function StateAvailableComplaints() {
  // ── State ──
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [loading, setLoading] = useState(true)
  const [initialLoadDone, setInitialLoadDone] = useState(false)
  const [assigning, setAssigning] = useState<string | null>(null)
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 })
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'assigned' | 'unassigned' | 'escalated'>('all')
  const [urgencyFilter, setUrgencyFilter] = useState<'all' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [currentAdminId, setCurrentAdminId] = useState<string | null>(null)
  const [adminType, setAdminType] = useState<string | null>(null)
  const [overviewStats, setOverviewStats] = useState<OverviewStats>({ total: 0, registered: 0, inProgress: 0, resolved: 0, closed: 0, highPriority: 0, assigned: 0 })

  // ── Data fetching ──
  const fetchAvailableComplaints = async (showLoader = true) => {
    if (showLoader) setLoading(true)
    try {
      const token = localStorage.getItem("token")
      if (!token) { setLoading(false); return }

      const params = new URLSearchParams({ page: pagination.page.toString(), limit: pagination.limit.toString() })
      if (searchTerm) params.append("search", searchTerm)

      const response = await fetch(`${API_URL}/api/complaints/all-complaints?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()

      if (data.success) {
        const filtered = (data.data as any[]).filter((c) => !c.isDuplicate)
        const duplicatesOnPage = (data.data as any[]).length - filtered.length
        const adjustedTotal = Math.max(0, (data.pagination?.total ?? filtered.length) - duplicatesOnPage)
        const adjustedTotalPages = Math.max(1, Math.ceil(adjustedTotal / pagination.limit))
        setComplaints(filtered)
        setPagination((prev) => ({ ...prev, total: adjustedTotal, totalPages: adjustedTotalPages }))
      }
    } catch (error) {
      console.error("Error fetching available complaints:", error)
    } finally {
      setLoading(false)
      setInitialLoadDone(true)
    }
  }

  const fetchOverviewStats = async () => {
    try {
      const token = localStorage.getItem("token")
      if (!token) return
      const response = await fetch(`${API_URL}/api/complaints/stats/overview`, { headers: { Authorization: `Bearer ${token}` } })
      const data = await response.json()
      if (data.success) setOverviewStats(data.data)
    } catch (error) {
      console.error("Error fetching overview stats:", error)
    }
  }

  useEffect(() => { fetchAvailableComplaints(); fetchOverviewStats() }, [pagination.page])

  useEffect(() => {
    try {
      const adminRaw = localStorage.getItem('admin')
      if (adminRaw) {
        const obj = JSON.parse(adminRaw)
        setCurrentAdminId(obj?.id || obj?.userId || obj?.adminId || null)
        setAdminType(obj?.adminType || localStorage.getItem('adminType') || null)
      }
    } catch {}
  }, [])

  useEffect(() => {
    if (!initialLoadDone) return
    const debounce = setTimeout(() => {
      if (pagination.page === 1) fetchAvailableComplaints(false)
      else setPagination((prev) => ({ ...prev, page: 1 }))
    }, 300)
    return () => clearTimeout(debounce)
  }, [searchTerm])

  // ── Handlers ──
  const handleAssignToMe = async (complaintId: string) => {
    try {
      setAssigning(complaintId)
      const token = localStorage.getItem("token")
      if (!token) return
      const response = await fetch(`${API_URL}/api/state-admin/complaints/${complaintId}/assign`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      })
      const data = await response.json()
      if (response.ok) {
        setComplaints((prev) => prev.filter((c) => c.id !== complaintId))
        setPagination((prev) => ({ ...prev, total: prev.total - 1 }))
      } else {
        alert(data.message || "Failed to assign complaint")
      }
    } catch (error) {
      console.error("Error assigning complaint:", error)
      alert("Failed to assign complaint")
    } finally {
      setAssigning(null)
    }
  }

  const handleStatusUpdate = async () => {
    if (!selectedComplaint || !selectedStatus) return alert('Select a status first')
    setStatusUpdating(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) throw new Error('Not authenticated')
      const res = await fetch(`${API_URL}/api/state-admin/complaints/${selectedComplaint.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: selectedStatus }),
      })
      const body = await res.json()
      if (!res.ok) {
        alert(body.message || 'Unable to update the complaint status at this time')
      } else {
        const updated = body.complaint
        setComplaints((prev) => prev.map((c) => (c.id === updated.id ? { ...c, status: updated.status } : c)))
        setSelectedComplaint((prev) => prev ? { ...prev, status: updated.status } : prev)
        alert(body.message || 'Complaint status updated successfully')
      }
    } catch (err: any) {
      console.error('Status update error', err)
      alert(err?.message || 'Unable to update the complaint status')
    } finally {
      setStatusUpdating(false)
    }
  }

  const handleEscalate = async () => {
    if (!selectedComplaint) return
    setStatusUpdating(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) throw new Error('Not authenticated')
      const res = await fetch(`${API_URL}/api/state-admin/complaints/${selectedComplaint.id}/escalate`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      })
      const body = await res.json()
      if (!res.ok) {
        alert(body.message || 'Unable to escalate the complaint at this time')
      } else {
        const updated = body.complaint
        setComplaints((prev) =>
          prev.map((c) =>
            c.id === updated.id
              ? { ...c, status: updated.status, escalationLevel: 'NATIONAL_ADMIN', escalatedToStateAdmin: null }
              : c
          )
        )
        setSelectedComplaint((prev) =>
          prev ? { ...prev, status: updated.status, escalationLevel: 'NATIONAL_ADMIN', escalatedToStateAdmin: null } : prev
        )
        setSelectedStatus(updated.status)
        alert(body.message || 'Complaint escalated to National level successfully')
      }
    } catch (err: any) {
      console.error('Escalate error', err)
      alert(err?.message || 'Unable to escalate the complaint')
    } finally {
      setStatusUpdating(false)
    }
  }

  // ── Derived ──
  const criticalCount = complaints.filter((c) => c.urgency === 'CRITICAL').length
  const escalatedCount = complaints.filter((c) =>
    c.status?.includes('ESCALATED') || !!c.escalatedToStateAdmin?.id || !!c.escalationLevel
  ).length

  const kpis = [
    { label: "Total Complaints", value: pagination.total, icon: "inbox", accent: "border-[#d2e4fb]", iconBg: "bg-[#edeeef]", iconColor: "text-[#041627]", trend: null },
    { label: "High Priority", value: criticalCount, icon: "warning", accent: "border-[#ba1a1a]", iconBg: "bg-[#ffdad6]/20", iconColor: "text-[#ba1a1a]", trend: criticalCount > 0 ? "Needs attention" : null },
    { label: "Assigned", value: overviewStats.assigned, icon: "task_alt", accent: "border-[#115cb9]", iconBg: "bg-[#edeeef]", iconColor: "text-[#115cb9]", trend: null },
    { label: "Escalated", value: escalatedCount, icon: "priority_high", accent: "border-[#c4c6cd]", iconBg: "bg-[#edeeef]", iconColor: "text-[#74777d]", trend: escalatedCount > 0 ? "Awaiting review" : null },
  ]

  const displayedComplaints = complaints.filter((complaint) => {
    if (urgencyFilter !== 'all' && complaint.urgency !== urgencyFilter) return false
    if (assignmentFilter === 'all') return true
    if (assignmentFilter === 'assigned') return !!complaint.assignedAgent?.id || !!complaint.managedByMunicipalAdmin?.id || !!complaint.escalatedToStateAdmin?.id
    if (assignmentFilter === 'unassigned') return !complaint.assignedAgent?.id && !complaint.managedByMunicipalAdmin?.id && !complaint.escalatedToStateAdmin?.id
    if (assignmentFilter === 'escalated') return (
       !!complaint.escalatedToStateAdmin?.id || !!complaint.escalationLevel ||
      (complaint.status && complaint.status.toString().includes('ESCALATED'))
    )
    return true
  })

  const isAssignedToCurrentStateAdmin = !!(
    selectedComplaint?.escalatedToStateAdmin?.id && currentAdminId && selectedComplaint.escalatedToStateAdmin.id === currentAdminId
  )
  const canUpdateStatus = adminType === 'STATE_ADMIN' || adminType === 'SUPER_ADMIN'

  const openModal = (c: Complaint) => {
    setSelectedComplaint(c)
    setSelectedStatus(c.status || null)
    setIsModalOpen(true)
  }

  // ═══════════════════════════════════════════════════════════════════
  // ─── Render ─────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════
  return (
    <div className="p-6 md:p-8 flex flex-col gap-8">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-[#041627] tracking-tight">State Complaints Registry</h2>
          <p className="text-[#44474c] text-sm font-medium mt-1">Manage and resolve citizen grievances at the state level across departments.</p>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading
          ? [...Array(4)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-xl animate-pulse">
                <div className="h-3 bg-[#edeeef] rounded w-24 mb-4" />
                <div className="h-10 bg-[#edeeef] rounded w-16" />
              </div>
            ))
          : kpis.map((kpi) => (
              <div key={kpi.label} className={`bg-white p-6 rounded-xl relative overflow-hidden group border-t-2 ${kpi.accent}`}>
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-2 ${kpi.iconBg} rounded-lg group-hover:scale-105 transition-transform`}>
                    <span className={`material-symbols-outlined ${kpi.iconColor}`}>{kpi.icon}</span>
                  </div>
                  {kpi.trend && (
                    <span className="text-[10px] font-bold text-[#ba1a1a] bg-[#ffdad6]/30 px-2 py-0.5 rounded-full">
                      {kpi.trend}
                    </span>
                  )}
                </div>
                <p className="text-[10px] font-bold uppercase tracking-[0.05em] text-[#44474c]">{kpi.label}</p>
                <p className="text-4xl font-black text-[#041627] mt-1 tracking-tighter">{kpi.value}</p>
              </div>
            ))}
      </div>

      {/* ── Filter Bar ── */}
      <section className="bg-[#f3f4f5] rounded-xl p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Search */}
        <div className="space-y-1 md:col-span-2">
          <label className="text-[10px] font-bold uppercase tracking-[0.05em] text-[#44474c] block ml-1">Search</label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#74777d] text-lg">search</span>
            <input
              className="w-full bg-white border-none rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-1 focus:ring-[#041627] placeholder:text-[#44474c]/50"
              placeholder="Search by ID, title, category, or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        {/* Assignment */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-[0.05em] text-[#44474c] block ml-1">Status</label>
          <select
            className="w-full bg-white border-none rounded-lg py-2 text-sm focus:ring-1 focus:ring-[#041627]"
            value={assignmentFilter}
            onChange={(e) => setAssignmentFilter(e.target.value as any)}
          >
            <option value="all">All Complaints</option>
            <option value="unassigned">Unassigned</option>
            <option value="assigned">Assigned</option>
            <option value="escalated">Escalated</option>
          </select>
        </div>
        {/* Priority */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-[0.05em] text-[#44474c] block ml-1">Priority</label>
          <select
            className="w-full bg-white border-none rounded-lg py-2 text-sm focus:ring-1 focus:ring-[#041627]"
            value={urgencyFilter}
            onChange={(e) => setUrgencyFilter(e.target.value as any)}
          >
            <option value="all">All Priorities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </section>

      {/* ── Data Table ── */}
      <div className="bg-white rounded-xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#f3f4f5]/50">
              <th className="px-6 py-4 text-[10px] font-bold text-[#44474c] uppercase tracking-[0.05em]">Complaint</th>
              <th className="px-6 py-4 text-[10px] font-bold text-[#44474c] uppercase tracking-[0.05em]">Priority</th>
              <th className="px-6 py-4 text-[10px] font-bold text-[#44474c] uppercase tracking-[0.05em] hidden md:table-cell">Location</th>
              <th className="px-6 py-4 text-[10px] font-bold text-[#44474c] uppercase tracking-[0.05em] hidden lg:table-cell">Assigned To</th>
              <th className="px-6 py-4 text-[10px] font-bold text-[#44474c] uppercase tracking-[0.05em] hidden lg:table-cell">Registered</th>
              <th className="px-6 py-4 text-[10px] font-bold text-[#44474c] uppercase tracking-[0.05em] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#c4c6cd]/5">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-6 py-5"><div className="h-4 bg-[#edeeef] rounded w-3/4" /><div className="h-3 bg-[#edeeef] rounded w-1/2 mt-2" /></td>
                  <td className="px-6 py-5"><div className="h-5 bg-[#edeeef] rounded w-16" /></td>
                  <td className="px-6 py-5 hidden md:table-cell"><div className="h-4 bg-[#edeeef] rounded w-24" /></td>
                  <td className="px-6 py-5 hidden lg:table-cell"><div className="h-4 bg-[#edeeef] rounded w-20" /></td>
                  <td className="px-6 py-5 hidden lg:table-cell"><div className="h-4 bg-[#edeeef] rounded w-20" /></td>
                  <td className="px-6 py-5 text-right"><div className="h-7 bg-[#edeeef] rounded w-8 ml-auto" /></td>
                </tr>
              ))
            ) : displayedComplaints.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-16 text-[#74777d] text-sm">
                  No complaints match your criteria
                </td>
              </tr>
            ) : (
              displayedComplaints.map((c) => {
                const assignedName = c.escalatedToStateAdmin?.name || c.managedByMunicipalAdmin?.name || c.assignedAgent?.name
                return (
                  <tr key={c.id} className="hover:bg-[#f3f4f5] transition-colors group">
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-[#041627] line-clamp-1">{c.description}</p>
                      <p className="text-xs text-[#44474c] mt-0.5">
                        <span className="font-mono font-bold text-[#041627]">#{c.seq}</span> &middot; {c.category}
                      </p>
                    </td>
                    <td className="px-6 py-4"><PriorityPill urgency={c.urgency} /></td>
                    <td className="px-6 py-4 hidden md:table-cell text-sm text-[#44474c]">
                      {c.location ? formatLocation(c.location) || 'N/A' : 'N/A'}
                    </td>
                    <td className="px-6 py-4 hidden lg:table-cell">
                      {assignedName ? (
                        <span className="text-sm font-medium text-[#44474c]">{assignedName}</span>
                      ) : (
                        <span className="text-sm italic text-[#44474c]/40">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 hidden lg:table-cell text-sm text-[#44474c]">{formatDate(c.submissionDate)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openModal(c)}
                          className="p-1.5 hover:bg-[#e1e3e4] rounded-lg transition-colors text-[#44474c]"
                          title="View Details"
                        >
                          <span className="material-symbols-outlined text-xl">open_in_new</span>
                        </button>
                        {!c.assignedAgent?.id && !c.managedByMunicipalAdmin?.id && !c.escalatedToStateAdmin?.id && (
                          <button
                            onClick={() => handleAssignToMe(c.id)}
                            disabled={assigning === c.id}
                            className="p-1.5 hover:bg-[#e1e3e4] rounded-lg transition-colors text-[#115cb9] disabled:opacity-40"
                            title="Claim complaint"
                          >
                            <span className="material-symbols-outlined text-xl">person_add</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      <div className="flex items-center justify-between pt-2">
        <span className="text-xs text-[#44474c] font-medium">
          Showing {displayedComplaints.length} of {pagination.total} complaints
        </span>
        <div className="flex items-center gap-1">
          <button
            disabled={pagination.page <= 1}
            onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
            className="p-2 hover:bg-[#e7e8e9] rounded-lg transition-colors text-[#44474c] disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <div className="flex items-center px-1">
            <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#041627] text-white text-xs font-bold">
              {pagination.page}
            </span>
            {pagination.totalPages > 1 && pagination.page < pagination.totalPages && (
              <>
                <span className="px-1 text-[#44474c] text-xs">...</span>
                <button
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.totalPages }))}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#e7e8e9] text-[#44474c] text-xs font-medium"
                >
                  {pagination.totalPages}
                </button>
              </>
            )}
          </div>
          <button
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
            className="p-2 hover:bg-[#e7e8e9] rounded-lg transition-colors text-[#44474c] disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── Complaint Detail Modal (Triage View) ─────────────────── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {isModalOpen && selectedComplaint && (
        <div className="fixed inset-0 z-50 flex flex-col">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />

          {/* Full-screen Panel */}
          <div className="relative flex-1 flex flex-col bg-[#f8f9fa] max-h-screen overflow-hidden ml-0 lg:ml-64">
            {/* ── Sticky TopBar ── */}
            <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl flex items-center justify-between px-6 py-3 shadow-sm">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <span className="material-symbols-outlined text-[#191c1d]">arrow_back</span>
                </button>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#44474c]">Complaint #{selectedComplaint.seq}</span>
                  <h2 className="text-xl font-black text-[#041627] tracking-tighter line-clamp-1">
                    {selectedComplaint.title || selectedComplaint.subCategory}
                  </h2>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusPill status={selectedComplaint.status} />
                <PriorityPill urgency={selectedComplaint.urgency} />
              </div>
            </header>

            {/* ── Contextual Action Bar ── */}
            <div className="px-8 py-4 bg-[#f3f4f5] flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-2 flex-wrap">
                {!selectedComplaint.escalatedToStateAdmin?.id && !selectedComplaint.managedByMunicipalAdmin?.id && (
                  <button
                    onClick={() => handleAssignToMe(selectedComplaint.id)}
                    disabled={assigning === selectedComplaint.id}
                    className="px-4 py-2 bg-white text-[#191c1d] text-sm font-semibold rounded-lg hover:bg-[#e7e8e9] transition-colors active:scale-95 flex items-center gap-2 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-sm">person_add</span> Assign to Me
                  </button>
                )}
                {canUpdateStatus && (
                  <button
                    onClick={handleStatusUpdate}
                    disabled={statusUpdating}
                    className="px-4 py-2 bg-[#115cb9] text-white text-sm font-semibold rounded-lg hover:bg-opacity-90 transition-colors active:scale-95 flex items-center gap-2 shadow-sm disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    {statusUpdating ? 'Updating...' : 'Save Status'}
                  </button>
                )}
              </div>
              {isAssignedToCurrentStateAdmin ? (
                <button
                   onClick={handleEscalate}
                  disabled={statusUpdating}
                  className="px-6 py-2 bg-gradient-to-br from-[#041627] to-[#1a3a5c] text-white text-sm font-bold rounded-lg hover:shadow-lg transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>priority_high</span>
                  {statusUpdating ? 'Escalating...' : 'Escalate to National'}
                </button>
              ) : (
                <button
                  disabled
                  className="px-6 py-2 bg-[#e7e8e9] text-[#74777d] text-sm font-semibold rounded-lg cursor-not-allowed flex items-center gap-2"
                  title="Only the assigned state admin can escalate"
                >
                  <span className="material-symbols-outlined text-sm">priority_high</span> Escalate to National
                </button>
              )}
            </div>

            {/* ── Content Grid (8+4 layout) ── */}
            <div className="flex-1 overflow-y-auto p-8">
              <div className="grid grid-cols-12 gap-6">
                {/* ── Left Column: Evidence & Details ── */}
                <div className="col-span-12 lg:col-span-8 space-y-6">
                  {/* AI Tag */}
                  {(selectedComplaint.AIStandardizedSubcategory || selectedComplaint.AIstandardizedSubCategory) && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-lg text-sm text-emerald-800 font-medium">
                      <span className="material-symbols-outlined text-sm text-emerald-500">auto_awesome</span>
                      SwarajAI: {selectedComplaint.AIStandardizedSubcategory || selectedComplaint.AIstandardizedSubCategory}
                    </div>
                  )}

                  {/* Description Card */}
                  <section className="bg-white p-6 rounded-xl space-y-4">
                    <div className="flex items-center justify-between pb-4" style={{ borderBottom: '1px solid #edeeef' }}>
                      <h3 className="text-sm font-black uppercase tracking-widest text-[#44474c] flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#115cb9]">description</span> Complaint Details
                      </h3>
                      <span className="text-xs text-[#44474c] font-medium">Submitted: {formatDate(selectedComplaint.submissionDate)}</span>
                    </div>
                    <p className="text-sm text-[#191c1d] whitespace-pre-wrap leading-relaxed">{selectedComplaint.description}</p>
                    <div className="flex flex-wrap gap-2 pt-2">
                       <span className="px-2 py-1 bg-[#edeeef] text-[10px] font-bold rounded uppercase tracking-tighter">{selectedComplaint.category}</span>
                      <span className="px-2 py-1 bg-[#edeeef] text-[10px] font-bold rounded uppercase tracking-tighter">{selectedComplaint.subCategory}</span>
                      {selectedComplaint.department && (
                        <span className="px-2 py-1 bg-[#edeeef] text-[10px] font-bold rounded uppercase tracking-tighter">{toTitle(selectedComplaint.department)}</span>
                      )}
                    </div>
                  </section>

                  {/* Status Update Controls */}
                  {canUpdateStatus && (
                    <section className="bg-white p-6 rounded-xl">
                      <h3 className="text-sm font-black uppercase tracking-widest text-[#44474c] flex items-center gap-2 mb-4">
                        <span className="material-symbols-outlined text-[#115cb9]">edit_note</span> Update Status
                      </h3>
                      <div className="flex flex-wrap items-center gap-3">
                        <select
                          value={selectedStatus || ''}
                          onChange={(e) => setSelectedStatus(e.target.value)}
                          className="bg-[#f3f4f5] border-none rounded-lg py-2 px-4 text-sm focus:ring-1 focus:ring-[#041627] min-w-[200px]"
                        >
                          <option value="" disabled>Select status</option>
                          <option value="UNDER_PROCESSING">Under Processing</option>
                          <option value="FORWARDED">Forwarded</option>
                          <option value="ON_HOLD">On Hold</option>
                          <option value="COMPLETED">Completed</option>
                          <option value="REJECTED">Rejected</option>
                        </select>
                      </div>
                    </section>
                  )}

                  {/* Assignment Info */}
                  {(selectedComplaint.assignedAgent || selectedComplaint.managedByMunicipalAdmin || selectedComplaint.escalatedToStateAdmin) && (
                    <section className="bg-white p-6 rounded-xl">
                      <h3 className="text-sm font-black uppercase tracking-widest text-[#44474c] flex items-center gap-2 mb-4">
                        <span className="material-symbols-outlined text-[#74777d]">assignment_ind</span> Assignment
                      </h3>
                      <div className="space-y-3">
                        {selectedComplaint.assignedAgent && (
                          <div className="flex items-center gap-3 p-3 bg-[#f3f4f5] rounded-lg">
                            <div className="w-8 h-8 rounded-full bg-[#d7e2ff] flex items-center justify-center text-[#041627] text-xs font-bold">
                              {selectedComplaint.assignedAgent.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                            </div>
                            <div>
                               <p className="text-sm font-bold text-[#041627]">{selectedComplaint.assignedAgent.name}</p>
                              <p className="text-[10px] text-[#44474c]">Agent</p>
                            </div>
                          </div>
                        )}
                         {selectedComplaint.managedByMunicipalAdmin && (
                           <div className="flex items-center gap-3 p-3 bg-[#f3f4f5] rounded-lg">
                             <div className="w-8 h-8 rounded-full bg-[#d2e4fb] flex items-center justify-center text-[#041627] text-xs font-bold">
                               {selectedComplaint.managedByMunicipalAdmin.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                             </div>
                             <div>
                               <p className="text-sm font-bold text-[#041627]">{selectedComplaint.managedByMunicipalAdmin.name}</p>
                               <p className="text-[10px] text-[#44474c]">Municipal Admin</p>
                             </div>
                           </div>
                         )}
                         {selectedComplaint.escalatedToStateAdmin && (
                           <div className="flex items-center gap-3 p-3 bg-[#f3f4f5] rounded-lg">
                             <div className="w-8 h-8 rounded-full bg-[#d2e4fb] flex items-center justify-center text-[#041627] text-xs font-bold">
                               {selectedComplaint.escalatedToStateAdmin.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                             </div>
                             <div>
                               <p className="text-sm font-bold text-[#041627]">{selectedComplaint.escalatedToStateAdmin.name}</p>
                               <p className="text-[10px] text-[#44474c]">State Admin</p>
                             </div>
                           </div>
                         )}
                      </div>
                    </section>
                  )}
                </div>

                {/* ── Right Column: Sidebar Meta ── */}
                <aside className="col-span-12 lg:col-span-4 space-y-6">
                  {/* Meta cards */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-xl flex flex-col items-center justify-center border border-[#edeeef]">
                       <p className="text-[10px] font-bold uppercase tracking-widest text-[#44474c] mb-1">Status</p>
                       <StatusPill status={selectedComplaint.status} />
                    </div>
                    <div className="bg-white p-4 rounded-xl flex flex-col items-center justify-center border border-[#edeeef]">
                       <p className="text-[10px] font-bold uppercase tracking-widest text-[#44474c] mb-1">Priority</p>
                       <PriorityPill urgency={selectedComplaint.urgency} />
                    </div>
                  </div>

                  {/* Complainant Info */}
                  <section className="bg-white p-6 rounded-xl">
                    <h3 className="text-sm font-black uppercase tracking-widest text-[#44474c] mb-4 flex items-center gap-2">
                       <span className="material-symbols-outlined text-[#115cb9]">person</span> Complainant Info
                    </h3>
                    {selectedComplaint.complainant ? (
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-full bg-[#d7e2ff] flex items-center justify-center text-[#041627] font-bold">
                          {selectedComplaint.complainant.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-[#041627]">{selectedComplaint.complainant.name}</p>
                          <p className="text-xs text-[#44474c]">Contact information withheld</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-[#74777d]">N/A</p>
                    )}
                    <div className="p-3 bg-[#f3f4f5] rounded-lg">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#44474c] mb-1">Submitted</p>
                      <p className="text-sm font-semibold text-[#041627]">{new Date(selectedComplaint.submissionDate).toLocaleString()}</p>
                    </div>
                  </section>

                  {/* Location Map */}
                  <section className="bg-white p-6 rounded-xl overflow-hidden">
                    <h3 className="text-sm font-black uppercase tracking-widest text-[#44474c] mb-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#ba1a1a]">location_on</span> Location
                    </h3>
                    {selectedComplaint.location?.latitude != null && selectedComplaint.location?.longitude != null ? (
                      <div className="w-full h-40 rounded-lg overflow-hidden relative group">
                        <ComplaintLocationMap
                          lat={selectedComplaint.location.latitude!}
                          lng={selectedComplaint.location.longitude!}
                        />
                        {selectedComplaint.location && (
                          <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest z-[999]">
                            {[selectedComplaint.location.locality, selectedComplaint.location.city].filter(Boolean).join(', ')}
                          </div>
                        )}
                      </div>
                    ) : selectedComplaint.location ? (
                      <div className="p-3 bg-[#f3f4f5] rounded-lg">
                        <p className="text-sm text-[#191c1d]">
                          {[selectedComplaint.location.street, selectedComplaint.location.locality, selectedComplaint.location.city, selectedComplaint.location.district].filter(Boolean).join(', ') || 'N/A'}
                        </p>
                        {selectedComplaint.location.pin && (
                          <p className="text-[10px] text-[#44474c] mt-1">PIN: {selectedComplaint.location.pin}</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-[#74777d]">No location data</p>
                    )}
                  </section>

                  {/* Attachment */}
                  {selectedComplaint.attachmentUrl && (
                    <section className="bg-white p-6 rounded-xl">
                      <h3 className="text-sm font-black uppercase tracking-widest text-[#44474c] mb-4 flex items-center gap-2">
                         <span className="material-symbols-outlined text-[#115cb9]">attachment</span> Evidence
                      </h3>
                      <div className="mt-2 group relative cursor-pointer" onClick={() => window.open(selectedComplaint.attachmentUrl!, '_blank')}>
                         <img src={selectedComplaint.attachmentUrl} alt="Evidence" className="w-full h-auto rounded-lg border border-[#edeeef] group-hover:brightness-90 transition-all" />
                         <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="bg-white/90 backdrop-blur px-4 py-2 rounded-full text-xs font-bold text-[#041627] shadow-xl">View Original</span>
                         </div>
                      </div>
                    </section>
                  )}
                </aside>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
