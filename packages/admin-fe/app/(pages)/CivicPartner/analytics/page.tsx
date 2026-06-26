"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { CivicPartnerLayout } from "../_layout"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002"

interface Survey {
  id: string
  title: string
  status: string
  category: string
  createdAt: string
  _count?: { responses: number }
}

export default function AnalyticsListPage() {
  const router = useRouter()
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API}/api/civic-partner/surveys`, { credentials: "include" })
        if (res.ok) {
          const data = await res.json()
          // Only show surveys with at least PUBLISHED/CLOSED status (they have responses)
          const all = (data.surveys ?? []) as Survey[]
          setSurveys(all.filter((s) => s.status !== "DRAFT" && s.status !== "ARCHIVED"))
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <CivicPartnerLayout>
      <div className="p-8 space-y-8">
        <div>
          <h2
            className="text-3xl font-extrabold text-[#003358] tracking-tight"
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            Analytics
          </h2>
          <p className="text-[#727780] mt-1">Select a survey to view detailed response analytics</p>
        </div>

        {loading ? (
          <div className="text-center py-20 text-[#727780]">Loading...</div>
        ) : surveys.length === 0 ? (
          <div className="text-center py-20">
            <span className="material-symbols-outlined text-6xl text-[#c1c7d0] mb-4 block">insert_chart</span>
            <p className="text-[#727780] text-lg font-medium">
              No published surveys yet. Analytics become available once a survey is published and receives responses.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {surveys.map((sv) => (
              <div
                key={sv.id}
                className="bg-white p-6 rounded-xl cursor-pointer hover:translate-y-[-2px] transition-all"
                style={{ boxShadow: "0 12px 32px -4px rgba(7, 30, 39, 0.06)", border: "1px solid rgba(193,199,208,0.1)" }}
                onClick={() => router.push(`/CivicPartner/analytics/${sv.id}`)}
              >
                <div className="flex justify-between items-start mb-3">
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded ${
                      sv.status === "PUBLISHED" ? "bg-[#94f0df] text-[#006f62]" : "bg-[#c7dde9] text-[#727780]"
                    }`}
                  >
                    {sv.status}
                  </span>
                  <span className="text-[10px] text-[#727780]">{sv.category}</span>
                </div>
                <h3 className="text-base font-bold text-[#003358] mb-3 line-clamp-2">{sv.title}</h3>
                <div
                  className="flex items-center justify-between pt-3"
                  style={{ borderTop: "1px solid rgba(193,199,208,0.15)" }}
                >
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm text-[#006b5e]">group</span>
                    <span className="text-sm font-bold text-[#003358]">
                      {(sv._count?.responses ?? 0).toLocaleString()} responses
                    </span>
                  </div>
                  <span className="material-symbols-outlined text-[#003358]">arrow_forward</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </CivicPartnerLayout>
  )
}
