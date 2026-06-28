"use client"

import { useState, useEffect } from "react"
import { AuthGuard } from "@/components/auth-guard"
import { AgentRevampedLayout } from "../_layout"

interface AuditLog {
  id: string
  action: string
  details: string
  timestamp: string
  type: "STATUS_UPDATE" | "ASSIGNMENT" | "ESCALATION" | "SYSTEM"
}

const LOGS: AuditLog[] = [
  { id: "1", action: "Status Updated", details: "Changed status of #1024 to COMPLETED", timestamp: "2026-04-11T12:00:00Z", type: "STATUS_UPDATE" },
  { id: "2", action: "Complaint Assigned", details: "Assigned #1025 to self", timestamp: "2026-04-11T11:45:00Z", type: "ASSIGNMENT" },
  { id: "3", action: "Escalated", details: "Escalated #1020 to Municipal Level", timestamp: "2026-04-11T10:30:00Z", type: "ESCALATION" },
  { id: "4", action: "System Sync", details: "Synchronized with central database", timestamp: "2026-04-11T09:00:00Z", type: "SYSTEM" },
  { id: "5", action: "Status Updated", details: "Changed status of #998 to UNDER_PROCESSING", timestamp: "2026-04-11T08:15:00Z", type: "STATUS_UPDATE" },
]

const TYPE_CONFIG: Record<string, { bg: string; text: string; icon: string }> = {
  STATUS_UPDATE: { bg: "bg-blue-50", text: "text-blue-700", icon: "edit_note" },
  ASSIGNMENT: { bg: "bg-emerald-50", text: "text-emerald-700", icon: "person_add" },
  ESCALATION: { bg: "bg-orange-50", text: "text-orange-700", icon: "trending_up" },
  SYSTEM: { bg: "bg-slate-50", text: "text-slate-700", icon: "sync" },
}

export default function AgentAuditLogs() {
  const [searchTerm, setSearchTerm] = useState("")

  const filteredLogs = LOGS.filter(log => 
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) || 
    log.details.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatDate = (iso: string) => new Date(iso).toLocaleString("en-IN", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
  })

  return (
    <AuthGuard requiredAdminType="AGENT">
      <AgentRevampedLayout>
        <div className="p-6 space-y-6">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="headline text-2xl font-black text-[#0b1c30] tracking-tighter uppercase">
                Audit Protocol
              </h2>
              <p className="text-xs text-slate-500 font-mono mt-1 uppercase tracking-widest">
                Comprehensive Action History // Verified Ledger
              </p>
            </div>
            <div className="relative w-64">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" style={{ fontSize: 16 }}>search</span>
              <input
                type="text"
                placeholder="Search audit trail..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#c3c5d9] focus:ring-1 focus:ring-[#0047cc] focus:outline-none rounded-sm"
              />
            </div>
          </div>

          <div className="bg-white border border-[#c3c5d9]/20 shadow-sm overflow-hidden rounded-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#eff4ff] text-[10px] font-bold uppercase tracking-widest text-[#434656]">
                  <tr>
                    <th className="px-4 py-4 border-b border-[#c3c5d9]/20">Type</th>
                    <th className="px-4 py-4 border-b border-[#c3c5d9]/20">Action</th>
                    <th className="px-4 py-4 border-b border-[#c3c5d9]/20">Trace / Details</th>
                    <th className="px-4 py-4 border-b border-[#c3c5d9]/20">Timestamp</th>
                    <th className="px-4 py-4 border-b border-[#c3c5d9]/20 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="text-xs divide-y divide-[#c3c5d9]/10">
                  {filteredLogs.map((log) => {
                    const cfg = TYPE_CONFIG[log.type]
                    return (
                      <tr key={log.id} className="hover:bg-[#f8faff] transition-colors group">
                        <td className="px-4 py-4">
                          <div className={`w-8 h-8 ${cfg.bg} ${cfg.text} rounded-sm flex items-center justify-center`}>
                            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{cfg.icon}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 font-bold text-[#0b1c30]">
                          {log.action}
                        </td>
                        <td className="px-4 py-4 text-slate-500 font-mono text-[11px] max-w-sm">
                          {log.details}
                        </td>
                        <td className="px-4 py-4 text-slate-400 font-mono text-[10px]">
                          {formatDate(log.timestamp)}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-bold rounded-sm uppercase tracking-tighter">
                            VERIFIED
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {filteredLogs.length === 0 && (
              <div className="py-20 text-center text-slate-400">
                <span className="material-symbols-outlined block mb-2" style={{ fontSize: 48 }}>view_in_ar</span>
                <p className="text-xs font-mono">NO RECORDS FOUND IN ACTIVE LEDGER</p>
              </div>
            )}
          </div>
        </div>
      </AgentRevampedLayout>
    </AuthGuard>
  )
}
