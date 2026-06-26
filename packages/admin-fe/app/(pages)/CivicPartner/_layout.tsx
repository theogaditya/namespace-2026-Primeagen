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
  { label: "Settings", icon: "settings", href: "/CivicPartner/settings" },
]

export function CivicPartnerLayout({ children }: CivicPartnerLayoutProps) {
  const { partner, isLoading, isAuthenticated, logout } = useCivicPartnerAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [cachedPartner, setCachedPartner] = useState<CivicPartner | null>(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("civicPartner") : null
      return raw ? (JSON.parse(raw) as CivicPartner) : null
    } catch {
      return null
    }
  })

  // Keep a cached copy of the partner for instant UI while auth verifies.
  // Also update cache when a fresh partner object arrives from the auth hook.
  useEffect(() => {
    if (partner) {
      setCachedPartner(partner)
      try {
        localStorage.setItem("civicPartner", JSON.stringify(partner))
      } catch {
        // ignore storage errors
      }
    }
  }, [partner])

  const displayPartner = partner ?? cachedPartner

  // Always render the layout shell so route-level `loading.tsx` components
  // can display uninterrupted. Use safe fallbacks for `partner` fields
  // while auth is resolving.

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
      <aside
        className="h-screen w-64 fixed left-0 bg-[#f3faff] flex flex-col py-6 z-20"
        style={{ borderRight: "1px solid rgba(7,30,39,0.12)" }}
      >
        <div className="px-8 mb-10">
          <h1
            className="text-2xl font-extrabold tracking-tighter text-[#003358]"
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            CivicPartner
          </h1>
          <p className="text-xs font-medium text-[#071e27]/70 uppercase tracking-widest mt-1">
            Survey & Engagement Portal
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
      <main className="flex-1 ml-64 flex flex-col h-screen overflow-y-auto pt-4">
        {/* TopBar */}
        <header className="flex justify-between items-center px-8 h-16 w-full bg-[#f3faff] sticky top-0 z-10">
          <div className="flex items-center gap-4 bg-[#e6f6ff] px-4 py-2 rounded-full w-96">
            <span
              role="button"
              onClick={() => {
                if (searchQuery.trim()) router.push(`/CivicPartner/surveys?search=${encodeURIComponent(searchQuery.trim())}`)
              }}
              className="material-symbols-outlined text-[#727780] cursor-pointer"
            >
              search
            </span>
            <input
              className="bg-transparent border-none focus:outline-none focus:ring-0 text-sm w-full"
              placeholder="Search surveys, questions, or reports..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && searchQuery.trim()) {
                  router.push(`/CivicPartner/surveys?search=${encodeURIComponent(searchQuery.trim())}`)
                }
              }}
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
                {displayPartner ? (
                  <>
                    <p className="text-sm font-bold text-[#003358]">{displayPartner.orgName}</p>
                    <p className="text-[10px] text-[#727780] font-medium">
                      {displayPartner.orgType?.replace(/_/g, " ") || ""}{displayPartner.state ? ` · ${displayPartner.state}` : ""}
                    </p>
                  </>
                ) : isLoading ? (
                  <div className="space-y-1 animate-pulse">
                    <div className="h-4 bg-[#e6eef5] rounded w-32" />
                    <div className="h-3 bg-[#e6eef5] rounded w-24" />
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-bold text-[#003358]">CivicPartner</p>
                    <p className="text-[10px] text-[#727780] font-medium"> </p>
                  </>
                )}
              </div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm">
                {displayPartner ? (
                  (displayPartner.orgName?.charAt(0) || "C").toUpperCase()
                ) : isLoading ? (
                  <div className="w-8 h-8 rounded-full bg-[#e6eef5] animate-pulse" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#004a7c] flex items-center justify-center text-white font-bold">C</div>
                )}
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
