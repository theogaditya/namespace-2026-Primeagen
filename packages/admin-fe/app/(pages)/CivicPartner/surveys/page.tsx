"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { CivicPartnerLayout } from "../_layout"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002"

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

type FilterStatus = "ALL" | "DRAFT" | "PUBLISHED" | "CLOSED" | "ARCHIVED"

export default function SurveysListPage() {
  const router = useRouter()
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterStatus>("ALL")

  useEffect(() => {
    const load = async () => {
      try {
        const url = filter === "ALL"
          ? `${API}/api/civic-partner/surveys`
          : `${API}/api/civic-partner/surveys?status=${filter}`
        const res = await fetch(url, { credentials: "include" })
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
  }, [filter])

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PUBLISHED: "bg-[#94f0df] text-[#006f62]",
      DRAFT: "bg-[#ffddb8] text-[#2a1700]",
      CLOSED: "bg-[#c7dde9] text-[#727780]",
      ARCHIVED: "bg-[#cfe6f2] text-[#42474f]",
    }
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${styles[status] ?? styles.ARCHIVED}`}>
        {status.charAt(0) + status.slice(1).toLowerCase()}
      </span>
    )
  }

  const filters: FilterStatus[] = ["ALL", "PUBLISHED", "DRAFT", "CLOSED", "ARCHIVED"]

  return (
    <CivicPartnerLayout>
      <div className="p-8 space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2
              className="text-3xl font-extrabold text-[#003358] tracking-tight"
              style={{ fontFamily: "'Manrope', sans-serif" }}
            >
              Surveys
            </h2>
            <p className="text-[#727780] mt-1">Create, manage, and track all your community engagement surveys</p>
          </div>
          <button
            onClick={() => router.push("/CivicPartner/surveys/new")}
            className="px-6 py-3 rounded-xl bg-gradient-to-br from-[#003358] to-[#004a7c] text-white font-bold text-sm hover:brightness-110 transition-all flex items-center gap-2"
            style={{ boxShadow: "0 12px 32px -4px rgba(7, 30, 39, 0.06)" }}
          >
            <span className="material-symbols-outlined text-sm">add</span>
            New Survey
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => { setLoading(true); setFilter(f) }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                filter === f
                  ? "bg-[#003358] text-white"
                  : "bg-[#e6f6ff] text-[#003358] hover:bg-[#dbf1fe]"
              }`}
            >
              {f === "ALL" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Survey Cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-white p-6 rounded-xl animate-pulse"
                style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.04)", border: "1px solid rgba(193,199,208,0.1)" }}
              >
                <div className="flex justify-between mb-4">
                  <div className="h-5 w-16 bg-[#e6f6ff] rounded-full" />
                  <div className="h-3 w-20 bg-[#e6f6ff] rounded" />
                </div>
                <div className="h-5 w-40 bg-[#e6f6ff] rounded-lg mb-2" />
                <div className="h-3 w-full bg-[#e6f6ff] rounded mb-1" />
                <div className="h-3 w-2/3 bg-[#e6f6ff] rounded mb-4" />
                <div className="pt-3 flex justify-between" style={{ borderTop: "1px solid rgba(193,199,208,0.15)" }}>
                  <div className="flex gap-4">
                    <div className="h-4 w-12 bg-[#e6f6ff] rounded" />
                    <div className="h-4 w-12 bg-[#e6f6ff] rounded" />
                  </div>
                  <div className="h-4 w-4 bg-[#e6f6ff] rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : surveys.length === 0 ? (
          <div className="text-center py-20">
            <span className="material-symbols-outlined text-6xl text-[#c1c7d0] mb-4 block">poll</span>
            <p className="text-[#727780] text-lg font-medium">
              {filter === "ALL" ? "No surveys found. Create your first one!" : `No ${filter.toLowerCase()} surveys found.`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {surveys.map((sv) => (
              <div
                key={sv.id}
                className="bg-white p-6 rounded-xl cursor-pointer hover:translate-y-[-2px] transition-all"
                style={{ boxShadow: "0 12px 32px -4px rgba(7, 30, 39, 0.06)", border: "1px solid rgba(193,199,208,0.1)" }}
                onClick={() => router.push(`/CivicPartner/surveys/${sv.id}`)}
              >
                <div className="flex justify-between items-start mb-3">
                  {statusBadge(sv.status)}
                  <span className="text-[10px] text-[#727780]">
                    {new Date(sv.lastUpdated).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="text-base font-bold text-[#003358] mb-1 line-clamp-2">{sv.title}</h3>
                <p className="text-xs text-[#727780] line-clamp-2 mb-4">{sv.description}</p>
                <div className="flex items-center justify-between pt-3" style={{ borderTop: "1px solid rgba(193,199,208,0.15)" }}>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm text-[#727780]">quiz</span>
                      <span className="text-[11px] font-bold text-[#727780]">{sv._count?.questions ?? 0} Qs</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm text-[#727780]">group</span>
                      <span className="text-[11px] font-bold text-[#727780]">{(sv._count?.responses ?? 0).toLocaleString()}</span>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-[#003358] text-lg">arrow_forward</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </CivicPartnerLayout>
  )
}
