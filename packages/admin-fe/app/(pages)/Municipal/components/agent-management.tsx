"use client"

import { useState, useEffect, useMemo } from "react"
import { AddAgentForm } from "./add-agent-form"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002"

interface Agent {
  id: string
  name: string
  fullName: string
  email: string
  department: string
  accessLevel: string
  status: string
}

const formatDepartment = (dept: string) =>
  dept.split("_").map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(" ")

/* ── Avatar colour palette (deterministic by index) ── */
const AVATAR_COLORS = [
  { bg: "#d7e2ff", text: "#041627" },
  { bg: "#e1c29b", text: "#211200" },
  { bg: "#ffdad6", text: "#ba1a1a" },
  { bg: "#acc7ff", text: "#041627" },
  { bg: "#d2e4fb", text: "#041627" },
  { bg: "#feddb5", text: "#38260b" },
]

const getInitials = (name: string) =>
  name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()

export function AgentManagement() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL")

  const fetchAgents = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem("token")
      if (!token) return
      const res = await fetch(`${API_URL}/api/municipal-admin/all`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setAgents(data.agents || [])
      }
    } catch (err) {
      console.error("Error fetching agents:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAgents() }, [])

  const handleAgentCreated = () => {
    fetchAgents()
    setShowForm(false)
  }

  const handleToggleStatus = async (agentId: string, currentStatus: string) => {
    setUpdatingStatus(agentId)
    try {
      const token = localStorage.getItem("token")
      if (!token) return
      const newStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE"
      const res = await fetch(`${API_URL}/api/municipal-admin/${agentId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        setAgents(agents.map((a) => (a.id === agentId ? { ...a, status: newStatus } : a)))
      }
    } catch (err) {
      console.error("Error updating agent status:", err)
    } finally {
      setUpdatingStatus(null)
    }
  }

  const activeCount = agents.filter((a) => a.status === "ACTIVE").length
  const inactiveCount = agents.filter((a) => a.status === "INACTIVE").length

  const filteredAgents = useMemo(() => {
    if (statusFilter === "ALL") return agents
    return agents.filter((a) => a.status === statusFilter)
  }, [agents, statusFilter])

  // ─── Render ─────────────────────────────────────────────────────
  return (
    <div className="p-6 md:p-8 flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-[#041627] tracking-tight">Agent Management</h2>
          <p className="text-[#44474c] text-sm font-medium mt-1">Configure and manage agents across your jurisdiction.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className={`flex items-center gap-2 px-6 py-2.5 text-sm font-bold rounded-xl transition-all active:scale-95 duration-150 ${
            showForm
              ? "bg-[#e1e3e4] text-[#041627] hover:bg-[#d9dadb]"
              : "bg-gradient-to-br from-[#041627] to-[#1a2b3c] text-white shadow-lg shadow-[#041627]/10 hover:shadow-[#041627]/20"
          }`}
        >
          <span className="material-symbols-outlined text-xl">{showForm ? "group" : "person_add"}</span>
          {showForm ? "View Agents" : "Create New Agent"}
        </button>
      </div>

      {/* Toggle: Form or Agent List */}
      {showForm ? (
        <AddAgentForm onSuccess={handleAgentCreated} onCancel={() => setShowForm(false)} />
      ) : (
        <>
          {/* ── KPI Cards ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl border-t-2 border-[#041627]">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-[#edeeef] rounded-lg"><span className="material-symbols-outlined text-[#041627]">group</span></div>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#44474c]">Total Agents</p>
              <p className="text-4xl font-black text-[#041627] mt-1 tracking-tighter">{agents.length}</p>
            </div>
            <div className="bg-white p-6 rounded-xl border-t-2 border-emerald-400">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-[#edeeef] rounded-lg"><span className="material-symbols-outlined text-emerald-600">person_check</span></div>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#44474c]">Active</p>
              <p className="text-4xl font-black text-emerald-600 mt-1 tracking-tighter">{activeCount}</p>
            </div>
            <div className="bg-white p-6 rounded-xl border-t-2 border-[#74777d]">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-[#edeeef] rounded-lg"><span className="material-symbols-outlined text-[#74777d]">person_off</span></div>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#44474c]">Inactive</p>
              <p className="text-4xl font-black text-[#74777d] mt-1 tracking-tighter">{inactiveCount}</p>
            </div>
          </div>

          {/* ── Agents Table ── */}
          <div className="bg-white rounded-2xl overflow-hidden">
            {/* ── Filter Bar ── */}
            <div className="px-6 py-5 bg-[#f3f4f5] flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-6 flex-wrap">
                {/* Status segmented buttons */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#44474c] uppercase tracking-widest">Status:</span>
                  <div className="flex bg-[#e1e3e4]/30 p-1 rounded-lg">
                    {(["ALL", "ACTIVE", "INACTIVE"] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setStatusFilter(s)}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                          statusFilter === s
                            ? "bg-white shadow-sm text-[#041627]"
                            : "text-[#44474c] hover:text-[#041627]"
                        }`}
                      >
                        {s === "ALL" ? "All" : s === "ACTIVE" ? "Active" : "Inactive"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <button
                onClick={fetchAgents}
                disabled={loading}
                className="flex items-center gap-1 text-[#041627] font-bold text-xs uppercase tracking-widest hover:opacity-70 transition-opacity disabled:opacity-50"
              >
                <span className={`material-symbols-outlined text-sm ${loading ? "animate-spin" : ""}`}>refresh</span>
                Refresh
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <span className="material-symbols-outlined text-3xl text-[#115cb9] animate-spin">progress_activity</span>
              </div>
            ) : filteredAgents.length === 0 ? (
              <div className="text-center py-16 px-6">
                <span className="material-symbols-outlined text-5xl text-[#c4c6cd] mb-4">group</span>
                <p className="text-[#44474c] font-medium">
                  {agents.length === 0 ? "No agents found." : `No ${statusFilter.toLowerCase()} agents.`}
                </p>
                {agents.length === 0 && (
                  <p className="text-sm text-[#74777d] mt-1">Click &quot;Create New Agent&quot; to add your first agent.</p>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#f3f4f5]/50">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-black text-[#44474c] uppercase tracking-widest">Administrator</th>
                      <th className="px-6 py-4 text-[10px] font-black text-[#44474c] uppercase tracking-widest hidden lg:table-cell">Role</th>
                      <th className="px-6 py-4 text-[10px] font-black text-[#44474c] uppercase tracking-widest hidden md:table-cell">Department</th>
                      <th className="px-6 py-4 text-[10px] font-black text-[#44474c] uppercase tracking-widest">Status</th>
                      <th className="px-6 py-4 text-[10px] font-black text-[#44474c] uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#edeeef]">
                    {filteredAgents.map((agent, idx) => {
                      const color = AVATAR_COLORS[idx % AVATAR_COLORS.length]
                      const displayName = agent.name || agent.fullName
                      return (
                        <tr key={agent.id} className="hover:bg-[#f3f4f5] transition-colors group">
                          {/* Administrator -avatar + name + email */}
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-10 h-10 rounded-full flex items-center justify-center font-black text-xs shrink-0"
                                style={{ backgroundColor: color.bg, color: color.text }}
                              >
                                {getInitials(displayName)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-[#041627] truncate">{displayName}</p>
                                <p className="text-xs text-[#44474c] truncate">{agent.email}</p>
                              </div>
                            </div>
                          </td>
                          {/* Role badge */}
                          <td className="px-6 py-5 hidden lg:table-cell">
                            <span className="px-2.5 py-1 rounded-md bg-[#d2e4fb] text-[#041627] text-[10px] font-black tracking-wider uppercase">
                              AGENT
                            </span>
                          </td>
                          {/* Department */}
                          <td className="px-6 py-5 hidden md:table-cell">
                            <p className="text-sm font-semibold text-[#041627]">{formatDepartment(agent.department)}</p>
                          </td>
                          {/* Status dot + label */}
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-2">
                              {updatingStatus === agent.id ? (
                                <span className="material-symbols-outlined text-base text-[#115cb9] animate-spin">progress_activity</span>
                              ) : (
                                <div
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    agent.status === "ACTIVE"
                                      ? "bg-[#115cb9]"
                                      : "bg-[#c4c6cd]"
                                  }`}
                                  style={agent.status === "ACTIVE" ? { boxShadow: "0 0 8px rgba(17,92,185,0.6)" } : undefined}
                                />
                              )}
                              <span className={`text-xs font-bold ${agent.status === "ACTIVE" ? "text-[#041627]" : "text-[#74777d]"}`}>
                                {agent.status === "ACTIVE" ? "Active" : "Inactive"}
                              </span>
                            </div>
                          </td>
                          {/* Hover-reveal actions */}
                          <td className="px-6 py-5 text-right">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              {agent.status === "ACTIVE" ? (
                                <button
                                  onClick={() => handleToggleStatus(agent.id, agent.status)}
                                  disabled={updatingStatus === agent.id}
                                  className="p-2 text-[#44474c] hover:text-[#ba1a1a] transition-colors disabled:opacity-50"
                                  title="Deactivate agent"
                                >
                                  <span className="material-symbols-outlined text-lg">block</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleToggleStatus(agent.id, agent.status)}
                                  disabled={updatingStatus === agent.id}
                                  className="p-2 text-[#115cb9] hover:text-[#041627] transition-colors disabled:opacity-50"
                                  title="Activate agent"
                                >
                                  <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Footer count */}
            {!loading && filteredAgents.length > 0 && (
              <div className="px-6 py-4 flex items-center justify-between bg-[#f3f4f5]/30">
                <span className="text-xs font-semibold text-[#44474c]">Showing {filteredAgents.length} of {agents.length} Agents</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
