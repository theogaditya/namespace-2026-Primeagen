"use client"

import { useState, useEffect } from "react"
import { AuthGuard } from "@/components/auth-guard"
import { AgentRevampedLayout } from "../_layout"

export default function AgentProfile() {
  const [adminData, setAdminData] = useState<any>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem("admin")
      if (raw) setAdminData(JSON.parse(raw))
    } catch {}
  }, [])

  if (!adminData) return null

  const stats = [
    { label: "Role Authority", value: "Verified Agent", icon: "verified_user", color: "text-blue-600" },
    { label: "Department", value: adminData.department || "Operations", icon: "domain", color: "text-indigo-600" },
    { label: "Access Level", value: "Standard Agent", icon: "shield", color: "text-emerald-600" },
    { label: "Workload Status", value: `${adminData.currentWorkload || 0} / ${adminData.workloadLimit || 10}`, icon: "speed", color: "text-orange-600" },
  ]

  const initials = adminData.fullName
    ? adminData.fullName.split(" ").map((n: string) => n[0]).slice(0, 2).join("")
    : "AG"

  return (
    <AuthGuard requiredAdminType="AGENT">
      <AgentRevampedLayout>
        <div className="p-8 space-y-8 w-full">
          {/* Cover / Header */}
          <div className="relative h-48 bg-gradient-to-r from-[#0047cc] to-[#002b7a] rounded-sm border border-[#c3c5d9]/30">
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] rounded-sm overflow-hidden" />
            <div className="absolute -bottom-12 left-8 z-10">
              <div className="w-24 h-24 bg-white p-1 rounded-sm shadow-xl border border-[#c3c5d9]/20">
                <div className="w-full h-full bg-[#eff4ff] border border-[#c3c5d9]/40 flex items-center justify-center text-4xl font-black text-[#0047cc]">
                  {initials}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-8 pl-8 flex justify-between items-start">
            <div>
              <h2 className="headline text-3xl font-black text-[#0b1c30] tracking-tighter uppercase mb-1">
                {adminData.fullName}
              </h2>
              <p className="text-xs text-slate-500 font-mono flex items-center gap-2 uppercase tracking-widest">
                <span className="material-symbols-outlined text-[#0047cc]" style={{ fontSize: 14 }}>id_card</span>
                AGENT_ID: {adminData.employeeId || adminData.id?.slice(-8).toUpperCase()} // STATUS: ACTIVE
              </p>
            </div>
            <button className="px-6 py-2 bg-[#fff] border border-[#c3c5d9] text-[10px] font-bold uppercase tracking-widest hover:bg-[#eff4ff] transition-all">
              Edit Profile
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
            {/* Left: Info Card */}
            <div className="md:col-span-2 space-y-6">
              <div className="bg-white border border-[#c3c5d9]/20 p-6 shadow-sm rounded-sm">
                <h3 className="text-xs font-black uppercase tracking-widest text-[#0047cc] mb-6 border-b border-[#c3c5d9]/20 pb-2">
                  Professional Credentials
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-12">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Official Email</label>
                    <p className="text-sm font-medium text-[#0b1c30] mt-1">{adminData.officialEmail}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contact Number</label>
                    <p className="text-sm font-medium text-[#0b1c30] mt-1">{adminData.phoneNumber || "Not set"}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Municipality</label>
                    <p className="text-sm font-medium text-[#0b1c30] mt-1">{adminData.municipality || "Bhubaneswar"}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Duty Start Date</label>
                    <p className="text-sm font-medium text-[#0b1c30] mt-1">{adminData.dateOfCreation ? new Date(adminData.dateOfCreation).toLocaleDateString() : "N/A"}</p>
                  </div>
                </div>
              </div>

              <div className="bg-[#f8faff] border border-[#dce1ff] p-6 rounded-sm">
                <h3 className="text-xs font-black uppercase tracking-widest text-[#0047cc] mb-4">Security Protocol</h3>
                <p className="text-[11px] text-slate-500 mb-4 leading-relaxed italic">
                  "As a verified agent of SwarajDesk, you are granted access to sensitive citizen data. Any unauthorized distribution or access is tracked via blockchain audit trails."
                </p>
                <button className="text-[10px] font-bold text-[#0047cc] uppercase tracking-widest border-b border-[#0047cc] border-dotted">
                  Change Access Password // Security Key
                </button>
              </div>
            </div>

            {/* Right: Stats Column */}
            <div className="space-y-4">
              {stats.map((s) => (
                <div key={s.label} className="bg-white border border-[#c3c5d9]/20 p-4 shadow-sm flex items-center gap-4 group hover:border-[#0047cc]/30 transition-colors">
                  <div className={`w-10 h-10 bg-[#eff4ff] flex items-center justify-center rounded-sm flex-shrink-0`}>
                    <span className={`material-symbols-outlined ${s.color}`} style={{ fontSize: 20 }}>{s.icon}</span>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{s.label}</p>
                    <p className="text-sm font-black text-[#0b1c30]">{s.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </AgentRevampedLayout>
    </AuthGuard>
  )
}
