"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useCivicPartnerAuth, CivicPartner } from "@/hooks/useCivicPartnerAuth"

interface CivicPartnerLayoutProps {
  children: React.ReactNode
}

const NAV_ITEMS = [
  { label: "Dashboard", icon: "dashboard", href: "/CivicPartner" },
  { label: "Surveys", icon: "poll", href: "/CivicPartner/surveys" },
  { label: "Analytics", icon: "insert_chart", href: "/CivicPartner/analytics" },
  { label: "Settings", icon: "settings", href: "/CivicPartner/settings" },
]

export function CivicPartnerLayout({ children }: CivicPartnerLayoutProps) {
  const { partner, isLoading, isAuthenticated, logout } = useCivicPartnerAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f3faff]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-[#003358] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#071e27]/70 font-medium">Loading portal...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !partner) return null

  const isActive = (href: string) => {
    if (href === "/CivicPartner") return pathname === "/CivicPartner"
    return pathname.startsWith(href)
  }

  return (
    <div className="min-h-screen flex overflow-hidden bg-[#f3faff]" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Google Fonts — loaded once */}
      <link
        href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap"
        rel="stylesheet"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        rel="stylesheet"
      />

      {/* ── Sidebar ── */}
      <aside className="h-screen w-64 fixed left-0 bg-[#f3faff] flex flex-col py-6 z-20">
        <div className="px-8 mb-10">
          <h1
            className="text-2xl font-extrabold tracking-tighter text-[#003358]"
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            CivicPartner
          </h1>
          <p className="text-xs font-medium text-[#071e27]/70 uppercase tracking-widest mt-1">
            Government Portal
          </p>
        </div>

        <nav className="flex-1 space-y-1 px-4">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 transition-all rounded-l-xl ${
                  active
                    ? "text-[#003358] font-bold border-r-4 border-[#006b5e] bg-[#e6f6ff] rounded-r-none"
                    : "text-[#071e27]/70 hover:bg-[#dbf1fe]"
                }`}
                style={{ fontFamily: "'Manrope', sans-serif" }}
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="px-6 mt-auto">
          <button
            onClick={() => router.push("/CivicPartner/surveys/new")}
            className="w-full py-4 rounded-xl bg-gradient-to-br from-[#003358] to-[#004a7c] text-white font-bold text-sm hover:brightness-110 transition-all flex items-center justify-center gap-2"
            style={{ boxShadow: "0 12px 32px -4px rgba(7, 30, 39, 0.06)" }}
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Launch New Survey
          </button>
        </div>
      </aside>

      {/* ── Main Area ── */}
      <main className="flex-1 ml-64 flex flex-col h-screen overflow-y-auto">
        {/* TopBar */}
        <header className="flex justify-between items-center px-8 h-16 w-full bg-[#f3faff] sticky top-0 z-10">
          <div className="flex items-center gap-4 bg-[#e6f6ff] px-4 py-2 rounded-full w-96">
            <span className="material-symbols-outlined text-[#727780]">search</span>
            <input
              className="bg-transparent border-none focus:outline-none focus:ring-0 text-sm w-full"
              placeholder="Search surveys, respondents, or reports..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ fontFamily: "'Inter', sans-serif" }}
            />
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-[#e6f6ff] rounded-full transition-colors relative">
              <span className="material-symbols-outlined text-[#003358]">notifications</span>
              <span className="absolute top-2 right-2 w-2 h-2 bg-[#ba1a1a] rounded-full" />
            </button>
            <div className="flex items-center gap-3 pl-4" style={{ borderLeft: "1px solid rgba(193,199,208,0.2)" }}>
              <div className="text-right">
                <p className="text-sm font-bold text-[#003358]">{partner.orgName}</p>
                <p className="text-[10px] text-[#727780] font-medium">
                  {partner.orgType?.replace(/_/g, " ")} · {partner.state}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-[#004a7c] flex items-center justify-center text-white font-bold text-sm">
                {partner.orgName?.charAt(0)?.toUpperCase() || "C"}
              </div>
            </div>
            <button
              onClick={logout}
              className="p-2 hover:bg-[#e6f6ff] rounded-full transition-colors"
              title="Logout"
            >
              <span className="material-symbols-outlined text-[#003358]">logout</span>
            </button>
          </div>
        </header>

        {/* Main Canvas */}
        <div className="flex-1">{children}</div>
      </main>
    </div>
  )
}
