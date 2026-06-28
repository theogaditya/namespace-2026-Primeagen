"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { CivicPartnerLayout } from "../../_layout"
import { cn } from "@/lib/utils"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002"

interface Survey {
  id: string
  title: string
  status: "DRAFT" | "PUBLISHED" | "CLOSED" | "ARCHIVED"
  category: string
  createdAt: string
  updatedAt: string
  _count?: { responses: number }
}

const STATUS_STYLE: Record<string, string> = {
  ARCHIVED: "bg-gray-100 text-gray-500",
  CLOSED: "bg-rose-50 text-rose-500",
}

export default function ArchivedSurveysPage() {
  const router = useRouter()
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"ALL" | "CLOSED" | "ARCHIVED">("ALL")
  const [search, setSearch] = useState("")
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmTarget, setConfirmTarget] = useState<Survey | null>(null)
  const [confirmAction, setConfirmAction] = useState<(() => Promise<void>) | null>(null)
  const [confirmTitle, setConfirmTitle] = useState("")
  const [confirmMsg, setConfirmMsg] = useState("")

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  const load = async () => {
    setLoading(true)
    try {
      const [archivedRes, closedRes] = await Promise.all([
        fetch(`${API}/api/civic-partner/surveys?status=ARCHIVED`, { credentials: "include" }),
        fetch(`${API}/api/civic-partner/surveys?status=CLOSED`, { credentials: "include" }),
      ])
      const archivedData = archivedRes.ok ? await archivedRes.json() : { surveys: [] }
      const closedData = closedRes.ok ? await closedRes.json() : { surveys: [] }
      setSurveys([...(closedData.surveys ?? []), ...(archivedData.surveys ?? [])])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = surveys.filter((s) => {
    const matchStatus = filter === "ALL" || s.status === filter
    const matchSearch = s.title.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  const handleReopen = async (sv: Survey) => {
    setActionLoading(sv.id)
    try {
      const res = await fetch(`${API}/api/civic-partner/surveys/${sv.id}/reopen`, {
        method: "POST",
        credentials: "include",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "Failed to reopen")
      showToast("Survey reopened and published!")
      await load()
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Something went wrong", false)
    } finally {
      setActionLoading(null)
    }
  }

  const handleArchive = async (sv: Survey) => {
    setActionLoading(sv.id)
    try {
      const res = await fetch(`${API}/api/civic-partner/surveys/${sv.id}`, {
        method: "DELETE",
        credentials: "include",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "Failed to archive")
      showToast("Survey archived")
      await load()
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Something went wrong", false)
    } finally {
      setActionLoading(null)
    }
  }

  const handleUnarchive = async (sv: Survey) => {
    setActionLoading(sv.id)
    try {
      const res = await fetch(`${API}/api/civic-partner/surveys/${sv.id}/unarchive`, {
        method: "POST",
        credentials: "include",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "Failed to unarchive")
      showToast("Survey moved back to Draft!")
      await load()
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Something went wrong", false)
    } finally {
      setActionLoading(null)
    }
  }

  const openConfirm = (sv: Survey, action: () => Promise<void>, title: string, msg: string) => {
    setConfirmTarget(sv)
    setConfirmAction(() => action)
    setConfirmTitle(title)
    setConfirmMsg(msg)
    setShowConfirm(true)
  }

  const runConfirm = async () => {
    if (!confirmTarget || !confirmAction) return
    setShowConfirm(false)
    await confirmAction()
    setConfirmTarget(null)
    setConfirmAction(null)
  }

  return (
    <CivicPartnerLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Toast */}
        {toast && (
          <div
            className={cn(
              "fixed top-6 right-6 z-50 px-5 py-3 rounded-xl text-sm font-bold shadow-lg transition-all",
              toast.ok ? "bg-emerald-500 text-white" : "bg-[#ba1a1a] text-white"
            )}
          >
            {toast.msg}
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black text-black tracking-tight">Archived &amp; Closed Surveys</h2>
            <p className="text-sm text-gray-400 font-medium">
              Review past surveys. Reopen closed ones or unarchive to start editing again.
            </p>
          </div>
          <button
            onClick={() => router.push("/CivicPartner/surveys")}
            className="h-11 px-6 bg-gray-100 text-gray-600 rounded-xl text-xs font-black uppercase tracking-tighter hover:bg-gray-200 transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Active Surveys
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Filter Bar */}
          <div className="p-8 border-b border-gray-50 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-1.5 p-1 bg-gray-50 rounded-xl border border-gray-100">
                {(["ALL", "CLOSED", "ARCHIVED"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={cn(
                      "px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                      filter === f ? "bg-white text-black shadow-sm" : "text-gray-400 hover:text-gray-600"
                    )}
                  >
                    {f === "ALL" ? "All" : f === "CLOSED" ? "Closed" : "Archived"}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3 bg-white px-5 py-2.5 rounded-xl border border-gray-200 w-80 shadow-xs focus-within:shadow-md transition-all">
                <span className="material-symbols-outlined text-gray-300 text-lg">search</span>
                <input
                  type="text"
                  placeholder="Search surveys..."
                  className="bg-transparent border-none outline-none text-xs text-gray-600 font-bold w-full"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">
              {filtered.length} survey{filtered.length !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50/50">
                <tr className="border-b border-gray-100">
                  <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Survey</th>
                  <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Category</th>
                  <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Responses</th>
                  <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading
                  ? [1, 2, 3].map((i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="px-8 py-6"><div className="h-4 w-48 bg-gray-50 rounded" /></td>
                        <td className="px-8 py-6"><div className="h-4 w-24 bg-gray-50 rounded" /></td>
                        <td className="px-8 py-6"><div className="h-5 w-10 bg-gray-50 rounded-full mx-auto" /></td>
                        <td className="px-8 py-6"><div className="h-8 w-24 bg-gray-50 rounded ml-auto" /></td>
                      </tr>
                    ))
                  : filtered.length === 0
                  ? (
                      <tr>
                        <td colSpan={4} className="px-8 py-16 text-center text-gray-400 text-sm font-bold">
                          No{filter !== "ALL" ? ` ${filter.toLowerCase()}` : ""} surveys found.
                        </td>
                      </tr>
                    )
                  : filtered.map((sv) => (
                      <tr
                        key={sv.id}
                        className="hover:bg-gray-50/30 cursor-pointer group transition-colors"
                        onClick={() => router.push(`/CivicPartner/surveys/${sv.id}`)}
                      >
                        <td className="px-8 py-5">
                          <p className="font-black text-gray-900 group-hover:text-[#465FFF] transition-colors uppercase tracking-tight">
                            {sv.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={cn("px-2 py-0.5 rounded-md text-[9px] font-black uppercase", STATUS_STYLE[sv.status] ?? "bg-gray-100 text-gray-500")}>
                              {sv.status}
                            </span>
                            <span className="text-[10px] text-gray-300 font-bold uppercase tracking-widest">
                              Updated {new Date(sv.updatedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <span className="text-xs font-bold text-gray-500">{sv.category || "—"}</span>
                        </td>
                        <td className="px-8 py-5 text-center">
                          <p className="text-sm font-black text-black">{(sv._count?.responses || 0).toLocaleString()}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase">Citizens</p>
                        </td>
                        <td className="px-8 py-5 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            <div className="flex items-center justify-end gap-2">
                              {sv.status === "CLOSED" && (
                                <>
                                  <button
                                    onClick={() => openConfirm(sv, () => handleReopen(sv), "Reopen survey", `Are you sure you want to reopen "${sv.title}"? This will publish it again.`)}
                                    disabled={actionLoading === sv.id}
                                    className="h-9 px-4 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-all disabled:opacity-50 flex items-center gap-1.5"
                                  >
                                    <span className="material-symbols-outlined text-sm">play_arrow</span>
                                    {actionLoading === sv.id ? "…" : "Reopen"}
                                  </button>
                                  <button
                                    onClick={() => openConfirm(sv, () => handleArchive(sv), "Archive survey", `Are you sure you want to archive "${sv.title}"? This will move it to Archived & Closed.`)}
                                    disabled={actionLoading === sv.id}
                                    className="h-9 px-4 bg-rose-50 text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-100 transition-all disabled:opacity-50 flex items-center gap-1.5"
                                  >
                                    <span className="material-symbols-outlined text-sm">archive</span>
                                    {actionLoading === sv.id ? "…" : "Archive"}
                                  </button>
                                </>
                              )}
                              {sv.status === "ARCHIVED" && (
                                <button
                                  onClick={() => openConfirm(sv, () => handleUnarchive(sv), "Unarchive survey", `Unarchive "${sv.title}" and move it back to Draft?`)}
                                  disabled={actionLoading === sv.id}
                                  className="h-9 px-4 bg-amber-50 text-amber-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-100 transition-all disabled:opacity-50 flex items-center gap-1.5"
                                >
                                  <span className="material-symbols-outlined text-sm">unarchive</span>
                                  {actionLoading === sv.id ? "…" : "Unarchive"}
                                </button>
                              )}
                              <button
                                onClick={() => router.push(`/CivicPartner/surveys/${sv.id}/edit`)}
                                disabled={sv.status === "ARCHIVED"}
                                className="h-9 px-3 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-all disabled:opacity-50"
                                title="Edit survey"
                              >
                                <span className="material-symbols-outlined text-sm">edit</span>
                              </button>
                              <button
                                onClick={() => router.push(`/CivicPartner/surveys/${sv.id}`)}
                                className="h-9 w-9 bg-gray-50 rounded-xl text-gray-400 hover:bg-[#465FFF]/10 hover:text-[#465FFF] transition-all"
                                title="View details"
                              >
                                <span className="material-symbols-outlined text-xl">visibility</span>
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </div>
        {showConfirm && confirmTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowConfirm(false)} />
            <div className="bg-white rounded-xl p-6 z-10 w-full max-w-md">
              <h3 className="text-lg font-black">{confirmTitle}</h3>
              <p className="text-sm text-gray-500 mt-2">{confirmMsg}</p>
              <div className="mt-4 flex justify-end gap-2">
                <button onClick={() => setShowConfirm(false)} className="px-4 py-2 border rounded">Cancel</button>
                <button onClick={runConfirm} className="px-4 py-2 bg-rose-600 text-white rounded">Confirm</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </CivicPartnerLayout>
  )
}
