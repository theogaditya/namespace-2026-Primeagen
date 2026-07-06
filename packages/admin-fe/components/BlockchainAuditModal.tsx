"use client"

import { useState, useEffect } from "react"

// ─── Types ────────────────────────────────────────────────────────────
interface BlockchainLogEntry {
  action?: string
  details?: string
  timestamp?: string
  transactionHash?: string
  blockNumber?: number
}

interface BlockchainVerificationResponse {
  databaseLogs?: BlockchainLogEntry[]
  blockchainVerifiedLogs?: BlockchainLogEntry[]
}

interface TimelineEntry extends BlockchainLogEntry {
  proof?: BlockchainLogEntry
  source: "database" | "chain"
}

interface ComplaintInfo {
  title?: string
  description?: string
  category?: string
  subCategory?: string
  department?: string
  status?: string
  urgency?: string
  submissionDate?: string
  complainantName?: string
  location?: {
    district?: string
    city?: string
    locality?: string
    street?: string | null
    pin?: string
  } | null
}

interface Props {
  isOpen: boolean
  onClose: () => void
  complaintId: string
  complaintSeq?: number
  complaint?: ComplaintInfo
}

// ─── Action → icon/colour map ─────────────────────────────────────────
const ACTION_META: Record<string, { icon: string; color: string; label: string }> = {
  STATUS_UPDATE:          { icon: "edit_note",    color: "#115cb9", label: "Status Update" },
  COMPLAINT_REGISTERED:   { icon: "inbox",        color: "#006c49", label: "Complaint Registered" },
  ESCALATION:             { icon: "trending_up",  color: "#c77a00", label: "Escalation" },
  ASSIGNMENT:             { icon: "person_add",   color: "#7c3aed", label: "Assignment" },
  ON_CHAIN_CONFIRMATION:  { icon: "verified",     color: "#006c49", label: "On-Chain Confirmation" },
}

const getActionMeta = (action?: string) => {
  if (!action) return { icon: "receipt_long", color: "#44474c", label: "Audit Event" }
  const key = Object.keys(ACTION_META).find((k) => action.toUpperCase().includes(k))
  return key ? ACTION_META[key] : { icon: "receipt_long", color: "#44474c", label: action.replace(/_/g, ' ') }
}

const formatTimestamp = (ts?: string) => {
  if (!ts) return "—"
  const d = new Date(ts)
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const toTitle = (s?: string) => {
  if (!s) return ''
  return s.toLowerCase().split(/_|\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

const formatLocation = (loc?: ComplaintInfo['location']) => {
  if (!loc) return ''
  const parts: string[] = []
  if (loc.street) parts.push(loc.street)
  if (loc.locality) parts.push(loc.locality)
  if (loc.city) parts.push(loc.city)
  if (loc.district) parts.push(loc.district)
  return parts.join(', ')
}

// Status color map
const statusStyle = (status?: string) => {
  if (!status) return { bg: '#edeeef', text: '#44474c' }
  const m: Record<string, { bg: string; text: string }> = {
    COMPLETED: { bg: '#dcfce7', text: '#166534' },
    UNDER_PROCESSING: { bg: '#fef3c7', text: '#92400e' },
    ON_HOLD: { bg: '#fee2e2', text: '#991b1b' },
    FORWARDED: { bg: '#ede9fe', text: '#5b21b6' },
    REJECTED: { bg: '#fee2e2', text: '#991b1b' },
    REGISTERED: { bg: '#dbeafe', text: '#1e40af' },
    ESCALATED_TO_MUNICIPAL_LEVEL: { bg: '#ffedd5', text: '#9a3412' },
    ESCALATED_TO_STATE_LEVEL: { bg: '#ffedd5', text: '#9a3412' },
  }
  return m[status] ?? { bg: '#edeeef', text: '#44474c' }
}

const urgencyStyle = (urgency?: string) => {
  if (!urgency) return { bg: '#edeeef', text: '#44474c' }
  const m: Record<string, { bg: string; text: string }> = {
    CRITICAL: { bg: '#fee2e2', text: '#991b1b' },
    HIGH: { bg: '#ffedd5', text: '#9a3412' },
    MEDIUM: { bg: '#fef3c7', text: '#92400e' },
    LOW: { bg: '#dcfce7', text: '#166534' },
  }
  return m[urgency] ?? { bg: '#edeeef', text: '#44474c' }
}

export function BlockchainAuditModal({ isOpen, onClose, complaintId, complaintSeq, complaint }: Props) {
  const [logs, setLogs] = useState<BlockchainVerificationResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const doFetch = async () => {
    setLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`/api/complaints/verify/${complaintId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      if (!res.ok) throw new Error(`Verification endpoint returned ${res.status}`)
      const data = (await res.json()) as BlockchainVerificationResponse
      setLogs(data)
    } catch (err: any) {
      console.error("Blockchain fetch error", err)
      setError(err?.message || "Failed to fetch blockchain data")
      setLogs(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isOpen || !complaintId) return
    doFetch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, complaintId])

  if (!isOpen) return null

  // Merge all logs into a unified timeline
  const dbLogs = logs?.databaseLogs || []
  const chainLogs = logs?.blockchainVerifiedLogs || []
  const hasLogs = dbLogs.length > 0 || chainLogs.length > 0

  // Build timeline
  const timeline: TimelineEntry[] = dbLogs.map((log) => {
    const proof = chainLogs.find((entry) => entry.action === log.action)
    return { ...log, proof, source: "database" }
  })

  const dbActions = new Set(dbLogs.map((l) => l.action))
  chainLogs.forEach((log) => {
    if (!dbActions.has(log.action)) {
      timeline.push({ ...log, proof: log, source: "chain" })
    }
  })

  const verifiedCount = timeline.filter((t) => t.proof?.transactionHash).length
  const ss = statusStyle(complaint?.status)
  const us = urgencyStyle(complaint?.urgency)

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Panel */}
      <div
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-white/95 backdrop-blur-2xl shadow-2xl overflow-hidden"
        style={{ borderRadius: 16, border: '1px solid rgba(0,0,0,0.06)' }}
      >
        {/* ── Header ── */}
        <div className="px-6 pt-6 pb-4" style={{ borderBottom: '1px solid #edeeef' }}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #e0f2fe, #dbeafe)' }}
              >
                <span
                  className="material-symbols-outlined text-[#115cb9]"
                  style={{ fontSize: 22, fontVariationSettings: "'FILL' 1" }}
                >
                  verified_user
                </span>
              </div>
              <div>
                <h2 className="text-base font-black text-[#041627] tracking-tight">
                  On-Chain Audit Trail
                </h2>
                <p className="text-[11px] text-[#74777d] font-medium mt-0.5">
                  Complaint #{complaintSeq || "—"} 
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#f3f4f5] transition-colors">
              <span className="material-symbols-outlined text-[#74777d]" style={{ fontSize: 20 }}>close</span>
            </button>
          </div>

          {/* Status chips */}
          {!loading && hasLogs && (
            <div className="flex items-center gap-3 mt-3">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                  {verifiedCount} Verified
                </span>
              </div>
              <span className="text-[10px] text-[#74777d] font-medium">
                {timeline.length} total event{timeline.length !== 1 ? 's' : ''} recorded
              </span>
            </div>
          )}
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>

          {/* ── Complaint Details Card — for cross-verification ── */}
          {complaint && (
            <div className="mx-6 mt-5 p-4 rounded-xl bg-[#f8f9fa] border border-[#edeeef]">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-[#115cb9]" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>
                  fact_check
                </span>
                <p className="text-[10px] font-black text-[#44474c] uppercase tracking-widest">
                  Complaint Data — Cross-Verify with On-Chain Record
                </p>
              </div>

              {/* Title & Description */}
              <div className="mb-3 border-b border-[#e1e3e4] pb-3">
                <p className="text-sm font-bold text-[#041627] leading-snug">
                  {complaint.title || complaint.subCategory || `Complaint #${complaintSeq}`}
                </p>
                {complaint.description && (
                  <p className="text-[11px] text-[#44474c] mt-1 leading-relaxed line-clamp-2">
                    {complaint.description}
                  </p>
                )}
              </div>

              {/* Added Full Location and Pincode Display here */}
              {complaint.location && (
                <div className="mb-3 border-b border-[#e1e3e4] pb-3 flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-[#115cb9] mt-0.5" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>
                    location_on
                  </span>
                  <div className="flex-1">
                    <p className="text-[10px] font-bold text-[#74777d] uppercase tracking-widest">Location</p>
                    <p className="text-xs font-semibold text-[#041627] mt-0.5">{formatLocation(complaint.location)}</p>
                    {complaint.location.pin && (
                      <p className="text-[10px] font-mono font-medium text-[#115cb9] bg-[#e0f2fe] inline-block px-1.5 py-0.5 rounded mt-1">
                        PIN: {complaint.location.pin}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Details grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {/* Status */}
                <div className="bg-white rounded-lg p-2.5 border border-[#edeeef]">
                  <p className="text-[9px] font-bold text-[#74777d] uppercase tracking-widest mb-1">Status</p>
                  <span
                    className="inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider"
                    style={{ background: ss.bg, color: ss.text }}
                  >
                    {toTitle(complaint.status)}
                  </span>
                </div>

                {/* Priority */}
                <div className="bg-white rounded-lg p-2.5 border border-[#edeeef]">
                  <p className="text-[9px] font-bold text-[#74777d] uppercase tracking-widest mb-1">Priority</p>
                  <span
                    className="inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider"
                    style={{ background: us.bg, color: us.text }}
                  >
                    {complaint.urgency}
                  </span>
                </div>

                {/* Category */}
                <div className="bg-white rounded-lg p-2.5 border border-[#edeeef]">
                  <p className="text-[9px] font-bold text-[#74777d] uppercase tracking-widest mb-1">Category</p>
                  <p className="text-[10px] font-semibold text-[#041627]">{toTitle(complaint.category) || '—'}</p>
                </div>

                {/* Department */}
                <div className="bg-white rounded-lg p-2.5 border border-[#edeeef]">
                  <p className="text-[9px] font-bold text-[#74777d] uppercase tracking-widest mb-1">Department</p>
                  <p className="text-[10px] font-semibold text-[#041627]">{toTitle(complaint.department) || '—'}</p>
                </div>
              </div>

              {/* Submission & Complainant */}
              <div className="flex items-center gap-4 mt-2.5 flex-wrap">
                {complaint.submissionDate && (
                  <span className="flex items-center gap-1 text-[10px] text-[#74777d]">
                    <span className="material-symbols-outlined" style={{ fontSize: 12 }}>calendar_today</span>
                    Filed: {formatTimestamp(complaint.submissionDate)}
                  </span>
                )}
                {complaint.complainantName && (
                  <span className="flex items-center gap-1 text-[10px] text-[#74777d]">
                    <span className="material-symbols-outlined" style={{ fontSize: 12 }}>person</span>
                    {complaint.complainantName}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="py-16 flex flex-col items-center gap-4">
              <div className="w-12 h-12 rounded-full border-[3px] border-[#edeeef] border-t-[#115cb9] animate-spin" />
              <div className="text-center">
                <p className="text-sm font-bold text-[#041627]">Fetching blockchain data...</p>
                <p className="text-xs text-[#74777d] mt-1">Querying Sepolia smart contract</p>
              </div>
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="py-14 flex flex-col items-center gap-3 px-6">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                <span className="material-symbols-outlined text-red-500" style={{ fontSize: 24 }}>error</span>
              </div>
              <p className="text-sm font-bold text-[#041627]">Verification Failed</p>
              <p className="text-xs text-[#74777d] text-center max-w-xs">{error}</p>
              <button
                onClick={doFetch}
                className="mt-2 px-4 py-2 bg-[#041627] text-white text-xs font-bold rounded-lg hover:bg-[#0b2d4a] transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {/* Empty */}
          {!loading && !error && !hasLogs && (
            <div className="py-16 flex flex-col items-center gap-3 px-6">
              <div className="w-12 h-12 rounded-full bg-[#f3f4f5] flex items-center justify-center">
                <span className="material-symbols-outlined text-[#74777d]" style={{ fontSize: 24 }}>shield</span>
              </div>
              <p className="text-sm font-bold text-[#041627]">No Blockchain Proofs Yet</p>
              <p className="text-xs text-[#74777d] text-center max-w-xs">
                Blockchain proofs are generated when complaint lifecycle events are processed by the system.
              </p>
            </div>
          )}

          {/* ── Audit Event Timeline ── */}
          {!loading && !error && hasLogs && (
            <div className="px-6 py-5">
              {/* Section title */}
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-[#115cb9]" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>
                  timeline
                </span>
                <p className="text-[10px] font-black text-[#44474c] uppercase tracking-widest">
                  Blockchain Event Log
                </p>
              </div>

              <div className="relative">
                {/* Vertical timeline line */}
                <div className="absolute left-[17px] top-6 bottom-6 w-px bg-gradient-to-b from-[#115cb9]/30 via-[#c4c6cd]/30 to-transparent" />

                <div className="space-y-3">
                  {timeline.map((entry, idx) => {
                    const meta = getActionMeta(entry.action)
                    const isVerified = !!entry.proof?.transactionHash
                    const txHash = entry.proof?.transactionHash

                    return (
                      <div key={idx} className="flex gap-3.5 relative group">
                        {/* Timeline dot */}
                        <div className="relative z-10 flex-shrink-0 mt-3">
                          <div
                            className="w-9 h-9 rounded-lg flex items-center justify-center transition-transform group-hover:scale-105"
                            style={{ backgroundColor: `${meta.color}12` }}
                          >
                            <span
                              className="material-symbols-outlined"
                              style={{ fontSize: 18, color: meta.color, fontVariationSettings: "'FILL' 1" }}
                            >
                              {meta.icon}
                            </span>
                          </div>
                        </div>

                        {/* Card */}
                        <div className="flex-1 bg-white rounded-xl p-4 border border-[#edeeef] hover:border-[#d2e4fb] transition-all hover:shadow-sm">
                          {/* Top row */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-xs font-bold text-[#041627]">{meta.label}</p>
                                {isVerified ? (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-100">
                                    <span className="material-symbols-outlined text-emerald-600" style={{ fontSize: 10, fontVariationSettings: "'FILL' 1" }}>verified</span>
                                    <span className="text-[8px] font-black uppercase tracking-wider text-emerald-700">On-Chain</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-50 border border-amber-100">
                                    <span className="text-[8px] font-black uppercase tracking-wider text-amber-600">Pending</span>
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-[#44474c] mt-1 leading-relaxed">
                                {entry.details || "No details available"}
                              </p>
                            </div>
                          </div>

                          {/* Meta row */}
                          <div className="flex items-center gap-3 mt-2.5 flex-wrap">
                            <span className="flex items-center gap-1 text-[10px] text-[#74777d]">
                              <span className="material-symbols-outlined" style={{ fontSize: 11 }}>schedule</span>
                              {formatTimestamp(entry.timestamp)}
                            </span>
                            {entry.proof?.blockNumber && (
                              <span className="flex items-center gap-1 text-[10px] text-[#74777d]">
                                <span className="material-symbols-outlined" style={{ fontSize: 11 }}>grid_view</span>
                                Block #{entry.proof.blockNumber.toLocaleString()}
                              </span>
                            )}
                          </div>

                          {/* Etherscan link */}
                          {txHash && (
                            <a
                              href={`https://sepolia.etherscan.io/tx/${txHash}`}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-2.5 flex items-center gap-2 px-3 py-2 bg-[#f8f9fa] hover:bg-[#f0f4ff] rounded-lg border border-[#edeeef] hover:border-[#d2e4fb] transition-all group/link"
                            >
                              <span className="material-symbols-outlined text-[#115cb9]" style={{ fontSize: 13 }}>open_in_new</span>
                              <span className="text-[10px] font-semibold text-[#115cb9] group-hover/link:text-[#041627] transition-colors">
                                View on Etherscan
                              </span>
                              <span className="text-[9px] font-mono text-[#74777d] truncate flex-1 text-right">
                                {txHash.slice(0, 10)}...{txHash.slice(-6)}
                              </span>
                            </a>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderTop: '1px solid #edeeef' }}>
          <span className="flex items-center gap-1.5 text-[10px] text-[#74777d]">
            <span className="material-symbols-outlined" style={{ fontSize: 12 }}>info</span>
            Ethereum Sepolia Testnet · Immutable ledger
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#041627] text-white text-xs font-bold rounded-lg hover:bg-[#0b2d4a] transition-colors active:scale-95"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
