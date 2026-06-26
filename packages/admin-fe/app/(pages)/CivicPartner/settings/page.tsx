"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { CivicPartnerLayout } from "../_layout"
import { useCivicPartnerAuth } from "@/hooks/useCivicPartnerAuth"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"

interface Survey {
  id: string
  title: string
  description: string
  category: string
  status: "DRAFT" | "PUBLISHED" | "CLOSED" | "ARCHIVED"
  createdAt: string
  lastUpdated: string
  _count?: { responses: number; questions: number }
}

export default function CivicPartnerSettingsPage() {
  const router = useRouter()
  const { partner, isLoading, logout } = useCivicPartnerAuth()
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState("")

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API}/api/civic-partner/surveys`, { credentials: "include" })
        if (res.ok) {
          const data = await res.json()
          setSurveys(data.surveys ?? [])
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(""), 3000)
  }

  const handleCloseArchive = async (surveyId: string, action: "close" | "archive") => {
    setActionLoading(true)
    try {
      let res
      if (action === "archive") {
        res = await fetch(`${API}/api/civic-partner/surveys/${surveyId}`, {
          method: "DELETE",
          credentials: "include",
        })
      } else {
        res = await fetch(`${API}/api/civic-partner/surveys/${surveyId}/${action}`, {
          method: "POST",
          credentials: "include",
        })
      }
      if (res.ok) {
        setSurveys((prev) =>
          prev.map((s) =>
            s.id === surveyId
              ? { ...s, status: action === "close" ? "CLOSED" : "ARCHIVED" }
              : s
          )
        )
        showSuccess(`Survey ${action === "close" ? "closed" : "archived"} successfully.`)
        setSelectedSurvey(null)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setActionLoading(false)
    }
  }

  if (!partner) {
    if (isLoading) {
      return (
        <CivicPartnerLayout>
          <div className="p-8 space-y-8">
            <div>
              <h2 className="text-3xl font-extrabold text-[#003358] tracking-tight" style={{ fontFamily: "'Manrope', sans-serif" }}>
                Settings
              </h2>
              <p className="text-[#727780] mt-1">Manage your organization profile and survey configurations</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-5 space-y-6">
                <section className="bg-white p-8 rounded-xl" style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.04)", border: "1px solid rgba(193,199,208,0.1)" }}>
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-14 h-14 rounded-2xl bg-[#e6eef5] animate-pulse" />
                    <div className="space-y-2 w-full">
                      <div className="h-4 bg-[#e6eef5] rounded w-48 animate-pulse" />
                      <div className="h-3 bg-[#e6eef5] rounded w-32 animate-pulse" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i}>
                        <div className="h-3 bg-[#eef6fb] rounded w-28 mb-2 animate-pulse" />
                        <div className="h-4 bg-[#e6eef5] rounded w-full animate-pulse" />
                      </div>
                    ))}
                  </div>
                </section>

                <section className="bg-white p-8 rounded-xl" style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.04)", border: "1px solid rgba(193,199,208,0.1)" }}>
                  <h3 className="text-lg font-bold text-[#003358] mb-4" style={{ fontFamily: "'Manrope', sans-serif" }}>Session</h3>
                  <div className="h-3 bg-[#e6eef5] rounded w-40 mb-4 animate-pulse" />
                  <div className="h-10 w-40 bg-[#e6eef5] rounded-lg animate-pulse" />
                </section>
              </div>

              <div className="lg:col-span-7">
                <section className="bg-white rounded-xl overflow-hidden" style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.04)", border: "1px solid rgba(193,199,208,0.1)" }}>
                  <div className="p-6 flex items-center justify-between border-b border-[#e6f6ff]">
                    <div>
                      <h3 className="text-lg font-bold text-[#003358]" style={{ fontFamily: "'Manrope', sans-serif" }}>Survey Management</h3>
                      <p className="text-xs text-[#727780] mt-1">&nbsp;</p>
                    </div>
                    <div className="h-8 w-20 bg-[#e6eef5] rounded-lg animate-pulse" />
                  </div>

                  <div className="p-6 space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-14 bg-[#f3faff] rounded-lg animate-pulse" />
                    ))}
                  </div>
                </section>
              </div>
            </div>
          </div>
        </CivicPartnerLayout>
      )
    }

    return null
  }

  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
    PUBLISHED: { bg: "bg-emerald-100", text: "text-emerald-700", label: "Active" },
    DRAFT: { bg: "bg-amber-100", text: "text-amber-700", label: "Draft" },
    CLOSED: { bg: "bg-slate-200", text: "text-slate-600", label: "Closed" },
    ARCHIVED: { bg: "bg-slate-100", text: "text-slate-500", label: "Archived" },
  }

  const activeSurveys = surveys.filter((s) => s.status === "PUBLISHED" || s.status === "DRAFT")

  return (
    <CivicPartnerLayout>
      <div className="p-8 space-y-8">
        {/* Success Toast */}
        {successMsg && (
          <div className="fixed top-6 right-6 z-50 bg-emerald-600 text-white px-6 py-3 rounded-xl font-medium text-sm shadow-2xl flex items-center gap-2">
            <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            {successMsg}
          </div>
        )}

        <div>
          <h2
            className="text-3xl font-extrabold text-[#003358] tracking-tight"
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            Settings
          </h2>
          <p className="text-[#727780] mt-1">Manage your organization profile and survey configurations</p>
        </div>

        {/* Main Grid: Profile + Surveys Table */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Organization Profile */}
          <div className="lg:col-span-5 space-y-6">
            <section
              className="bg-white p-8 rounded-xl"
              style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.04)", border: "1px solid rgba(193,199,208,0.1)" }}
            >
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#003358] to-[#004a7c] flex items-center justify-center text-white font-bold text-xl">
                  {partner.orgName?.charAt(0)?.toUpperCase() || "C"}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#003358]" style={{ fontFamily: "'Manrope', sans-serif" }}>
                    Organisation Profile
                  </h3>
                  <p className="text-xs text-[#727780]">Your registered organization details</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-[10px] font-bold text-[#727780] uppercase tracking-wider mb-1">Organisation Name</p>
                  <p className="text-sm font-semibold text-[#003358]">{partner.orgName}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[#727780] uppercase tracking-wider mb-1">Email</p>
                  <p className="text-sm font-semibold text-[#003358]">{partner.officialEmail}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[#727780] uppercase tracking-wider mb-1">Type</p>
                  <p className="text-sm font-semibold text-[#003358]">{partner.orgType?.replace(/_/g, " ")}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[#727780] uppercase tracking-wider mb-1">State</p>
                  <p className="text-sm font-semibold text-[#003358]">{partner.state}</p>
                </div>
                {partner.district && (
                  <div>
                    <p className="text-[10px] font-bold text-[#727780] uppercase tracking-wider mb-1">District</p>
                    <p className="text-sm font-semibold text-[#003358]">{partner.district}</p>
                  </div>
                )}
                {partner.registrationNo && (
                  <div>
                    <p className="text-[10px] font-bold text-[#727780] uppercase tracking-wider mb-1">Registration No.</p>
                    <p className="text-sm font-semibold text-[#003358]">{partner.registrationNo}</p>
                  </div>
                )}
                <div>
                  <p className="text-[10px] font-bold text-[#727780] uppercase tracking-wider mb-1">Verification</p>
                  <p className="text-sm font-semibold">
                    {partner.isVerified ? (
                      <span className="text-emerald-600 flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                        Verified
                      </span>
                    ) : (
                      <span className="text-amber-500">Pending Verification</span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[#727780] uppercase tracking-wider mb-1">Account Since</p>
                  <p className="text-sm font-semibold text-[#003358]">
                    {new Date(partner.dateOfCreation).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </section>

            {/* Session */}
            <section
              className="bg-white p-8 rounded-xl"
              style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.04)", border: "1px solid rgba(193,199,208,0.1)" }}
            >
              <h3 className="text-lg font-bold text-[#003358] mb-4" style={{ fontFamily: "'Manrope', sans-serif" }}>
                Session
              </h3>
              <p className="text-xs text-[#727780] mb-4">End your current session and return to the login page.</p>
              <button
                onClick={logout}
                className="px-6 py-3 rounded-xl bg-[#ffdad6] text-[#93000a] font-bold text-sm hover:bg-[#ba1a1a] hover:text-white transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">logout</span>
                Logout
              </button>
            </section>
          </div>

          {/* Right: Survey Management Table */}
          <div className="lg:col-span-7">
            <section
              className="bg-white rounded-xl overflow-hidden"
              style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.04)", border: "1px solid rgba(193,199,208,0.1)" }}
            >
              <div className="p-6 flex items-center justify-between border-b border-[#e6f6ff]">
                <div>
                  <h3 className="text-lg font-bold text-[#003358]" style={{ fontFamily: "'Manrope', sans-serif" }}>
                    Survey Management
                  </h3>
                  <p className="text-xs text-[#727780] mt-1">
                    {surveys.length} total · {activeSurveys.length} active
                  </p>
                </div>
                <button
                  onClick={() => router.push("/CivicPartner/surveys/new")}
                  className="flex items-center gap-2 px-4 py-2 bg-[#003358] text-white font-bold rounded-lg text-sm hover:brightness-110 transition-all"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                  New
                </button>
              </div>

              {loading ? (
                <div className="p-6 space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-14 bg-[#f3faff] rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : surveys.length === 0 ? (
                <div className="p-12 text-center">
                  <span className="material-symbols-outlined text-5xl text-[#c1c7d0] mb-4 block">poll</span>
                  <p className="text-[#727780] font-medium">No surveys created yet.</p>
                </div>
              ) : (
                <div className="max-h-[520px] overflow-y-auto">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-[#f3faff] z-10">
                      <tr>
                        <th className="text-left px-6 py-3 text-[10px] font-bold text-[#727780] uppercase tracking-widest">Survey</th>
                        <th className="text-left px-4 py-3 text-[10px] font-bold text-[#727780] uppercase tracking-widest">Status</th>
                        <th className="text-center px-4 py-3 text-[10px] font-bold text-[#727780] uppercase tracking-widest">Responses</th>
                        <th className="text-right px-6 py-3 text-[10px] font-bold text-[#727780] uppercase tracking-widest">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f3faff]">
                      {surveys.map((sv) => {
                        const sc = statusConfig[sv.status] || statusConfig.DRAFT
                        return (
                          <tr
                            key={sv.id}
                            className="hover:bg-[#f3faff] transition-colors cursor-pointer"
                            onClick={() => setSelectedSurvey(sv)}
                          >
                            <td className="px-6 py-4">
                              <p className="text-sm font-bold text-[#003358] truncate max-w-[200px]">{sv.title}</p>
                              <p className="text-[10px] text-[#727780]">{new Date(sv.lastUpdated).toLocaleDateString()}</p>
                            </td>
                            <td className="px-4 py-4">
                              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold ${sc.bg} ${sc.text}`}>
                                {sc.label}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-center">
                              <span className="text-sm font-bold text-[#003358]">
                                {sv._count?.responses ?? 0}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              {(sv.status === "PUBLISHED" || sv.status === "CLOSED") && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleCloseArchive(sv.id, sv.status === "PUBLISHED" ? "close" : "archive")
                                  }}
                                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                                    sv.status === "PUBLISHED"
                                      ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                  }`}
                                >
                                  {sv.status === "PUBLISHED" ? "Close" : "Archive"}
                                </button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </div>

        {/* ══ Glass Survey Detail Modal ══ */}
        {selectedSurvey && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-md" onClick={() => setSelectedSurvey(null)} />
            <div
              className="relative w-full max-w-2xl rounded-3xl overflow-hidden"
              style={{
                background: "rgba(255, 255, 255, 0.85)",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
                border: "1px solid rgba(255, 255, 255, 0.4)",
                boxShadow: "0 32px 64px -12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255,255,255,0.1) inset",
              }}
            >
              {/* Modal Header */}
              <div
                className="p-8 pb-6"
                style={{
                  background: "linear-gradient(135deg, rgba(0,51,88,0.05) 0%, rgba(0,74,124,0.05) 100%)",
                  borderBottom: "1px solid rgba(193,199,208,0.15)",
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold ${(statusConfig[selectedSurvey.status] || statusConfig.DRAFT).bg} ${(statusConfig[selectedSurvey.status] || statusConfig.DRAFT).text}`}>
                        {(statusConfig[selectedSurvey.status] || statusConfig.DRAFT).label}
                      </span>
                      <span className="text-[10px] text-[#727780]">{selectedSurvey.category}</span>
                    </div>
                    <h3
                      className="text-2xl font-extrabold text-[#003358] tracking-tight"
                      style={{ fontFamily: "'Manrope', sans-serif" }}
                    >
                      {selectedSurvey.title}
                    </h3>
                  </div>
                  <button
                    onClick={() => setSelectedSurvey(null)}
                    className="p-2 hover:bg-black/5 rounded-xl transition-colors"
                  >
                    <span className="material-symbols-outlined text-[#727780]">close</span>
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-8 space-y-6">
                {selectedSurvey.description && (
                  <p className="text-sm text-[#42474f] leading-relaxed">{selectedSurvey.description}</p>
                )}

                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl" style={{ background: "rgba(230, 246, 255, 0.6)" }}>
                    <p className="text-[10px] font-bold text-[#727780] uppercase tracking-wider mb-1">Responses</p>
                    <p className="text-2xl font-extrabold text-[#003358]" style={{ fontFamily: "'Manrope', sans-serif" }}>
                      {(selectedSurvey._count?.responses ?? 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl" style={{ background: "rgba(230, 246, 255, 0.6)" }}>
                    <p className="text-[10px] font-bold text-[#727780] uppercase tracking-wider mb-1">Questions</p>
                    <p className="text-2xl font-extrabold text-[#003358]" style={{ fontFamily: "'Manrope', sans-serif" }}>
                      {selectedSurvey._count?.questions ?? 0}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl" style={{ background: "rgba(230, 246, 255, 0.6)" }}>
                    <p className="text-[10px] font-bold text-[#727780] uppercase tracking-wider mb-1">Created</p>
                    <p className="text-sm font-bold text-[#003358]">
                      {new Date(selectedSurvey.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-[10px] font-bold text-[#727780] uppercase tracking-wider mb-1">Category</p>
                    <p className="font-semibold text-[#003358]">{selectedSurvey.category}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-[#727780] uppercase tracking-wider mb-1">Last Updated</p>
                    <p className="font-semibold text-[#003358]">{new Date(selectedSurvey.lastUpdated).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 flex justify-between items-center" style={{ borderTop: "1px solid rgba(193,199,208,0.15)" }}>
                <div className="flex gap-2">
                  {selectedSurvey.status === "PUBLISHED" && (
                    <button
                      onClick={() => handleCloseArchive(selectedSurvey.id, "close")}
                      disabled={actionLoading}
                      className="px-4 py-2.5 bg-amber-100 text-amber-700 font-bold rounded-xl text-sm hover:bg-amber-200 transition-all disabled:opacity-50"
                    >
                      Close Survey
                    </button>
                  )}
                  {(selectedSurvey.status === "PUBLISHED" || selectedSurvey.status === "CLOSED") && (
                    <button
                      onClick={() => handleCloseArchive(selectedSurvey.id, "archive")}
                      disabled={actionLoading}
                      className="px-4 py-2.5 bg-[#ffdad6] text-[#93000a] font-bold rounded-xl text-sm hover:bg-[#ffb4ab] transition-all disabled:opacity-50"
                    >
                      Archive
                    </button>
                  )}
                </div>
                <button
                  onClick={() => {
                    const surveyId = selectedSurvey.id
                    setSelectedSurvey(null)
                    router.push(`/CivicPartner/surveys/${surveyId}`)
                  }}
                  className="px-5 py-2.5 text-white font-bold rounded-xl text-sm hover:brightness-110 transition-all flex items-center gap-2"
                  style={{ background: "linear-gradient(135deg, #003358 0%, #004a7c 100%)" }}
                >
                  Open Full Details
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </CivicPartnerLayout>
  )
}
