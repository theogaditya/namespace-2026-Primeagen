"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"

interface AgentRevampedLayoutProps {
  children: React.ReactNode
}

export function AgentRevampedLayout({ children }: AgentRevampedLayoutProps) {
  const [adminData, setAdminData] = useState<{
    fullName?: string
    officialEmail?: string
    id?: string
    adminType?: string
  } | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("admin") : null
      if (raw) {
        const parsed = JSON.parse(raw)
        setAdminData({
          fullName: parsed.fullName || parsed.name,
          officialEmail: parsed.officialEmail || parsed.email,
          id: parsed.id,
          adminType: parsed.adminType || localStorage.getItem("adminType"),
        })
      }
    } catch (err) {
      console.warn("Failed to parse admin from localStorage", err)
    }
  }, [])

  const handleLogout = async () => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
      const adminType = typeof window !== "undefined" ? localStorage.getItem("adminType") : null
      if (adminType === "SUPER_ADMIN") {
        await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002"}/api/super-admin/logout`,
          { method: "POST", credentials: "include" }
        )
      } else if (token) {
        try {
          await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002"}/api/users/logout`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          })
        } catch {}
      }
    } catch {}
    try {
      localStorage.removeItem("token")
      localStorage.removeItem("admin")
      localStorage.removeItem("adminType")
    } catch {}
    try { window.dispatchEvent(new Event("authChange")) } catch {}
    router.push("/")
  }

  const navItems = [
    { href: "/Agent", icon: "analytics", label: "Intelligence" },
    { href: "/Agent/my-complaints", icon: "tactic", label: "Operations" },
    { href: "/Agent/reports", icon: "settings", label: "Management" },
  ]

  const isActive = (href: string) => pathname === href

  const initials = adminData?.fullName
    ? adminData.fullName
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
    : "AG"

  return (
    <div
      className="min-h-screen bg-[#f8f9ff] font-[Inter,sans-serif] text-[#0b1c30]"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* Google Fonts + Material Symbols */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');
        .material-symbols-outlined {
          font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
          vertical-align: middle;
          font-family: 'Material Symbols Outlined';
          font-style: normal;
          display: inline-block;
          line-height: 1;
          text-transform: none;
          letter-spacing: normal;
          word-wrap: normal;
          white-space: nowrap;
          direction: ltr;
        }
        .headline { font-family: 'Space Grotesk', sans-serif; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #c3c5d9; border-radius: 2px; }
        .nav-item-active { background: #fff; color: #0047cc; font-weight: 700; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
        .nav-item { display:flex; align-items:center; gap:12px; padding:8px 12px; border-radius:2px; font-size:14px; transition:all .2s; color:#475569; cursor:pointer; }
        .nav-item:hover { background:#f8f9ff; padding-left:16px; }
        .scanning-line { height:2px; background:#155dfc; box-shadow:0 0 15px #155dfc; position:absolute; width:100%; top:0; left:0; z-index:10; animation: scanDown 3s linear infinite; }
        @keyframes scanDown { 0%{top:0} 100%{top:100%} }
      `}</style>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen w-64 bg-[#eff4ff] border-r border-[#c3c5d9]/30 py-6 px-4 flex flex-col z-50 transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-2 mb-8">
          <div className="w-8 h-8 bg-[#0047cc] rounded-sm flex items-center justify-center">
            <span
              className="material-symbols-outlined text-white"
              style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}
            >
              security
            </span>
          </div>
          <div>
            <h1 className="headline font-bold text-[#0b1c30] tracking-tighter text-lg leading-none">
              SwarajDesk
            </h1>
            <p className="text-[10px] text-[#0047cc] font-medium tracking-widest uppercase mt-1">
              Agent Portal v1.0
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`nav-item ${isActive(item.href) ? "nav-item-active" : ""}`}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Blockchain Card */}
        <div className="mt-4 pt-4 border-t border-[#c3c5d9]/30">
          <div className="bg-gradient-to-br from-indigo-50 via-blue-50 to-indigo-100 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-indigo-100 rounded-lg">
                <span className="material-symbols-outlined text-indigo-600" style={{ fontSize: 16 }}>
                  link
                </span>
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900">Blockchain Verified</h4>
                <p className="text-[10px] text-gray-500">Ethereum Sepolia Testnet</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center border border-indigo-200">
                  <svg viewBox="0 0 256 417" className="w-4 h-4" preserveAspectRatio="xMidYMid">
                    <path fill="#4F46E5" d="M127.961 0l-2.795 9.5v275.668l2.795 2.79 127.962-75.638z" opacity="0.8" />
                    <path fill="#4F46E5" d="M127.962 0L0 212.32l127.962 75.639V154.158z" opacity="0.6" />
                    <path fill="#4F46E5" d="M127.961 312.187l-1.575 1.92v98.199l1.575 4.6L256 236.587z" opacity="0.8" />
                    <path fill="#4F46E5" d="M127.962 416.905v-104.72L0 236.585z" opacity="0.6" />
                  </svg>
                </div>
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-700 font-medium">Hashed Transactions</p>
                <p className="text-[10px] text-gray-500 truncate font-mono">0xD129...35F7</p>
              </div>
            </div>
            <a
              href="https://app.pinata.cloud/ipfs/files/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-semibold text-white transition-all"
            >
              View on Pinata
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                open_in_new
              </span>
            </a>
          </div>
        </div>

        {/* Footer links */}
        <div className="mt-4 space-y-1">
          <a
            href="#"
            className="flex items-center gap-2 px-3 py-2 text-xs text-slate-400 hover:text-slate-600 font-mono uppercase tracking-wide"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
              shield
            </span>
            Privacy Protocol
          </a>
          <a
            href="#"
            className="flex items-center gap-2 px-3 py-2 text-xs text-slate-400 hover:text-slate-600 font-mono uppercase tracking-wide"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
              sensors
            </span>
            System Status
          </a>
        </div>
      </aside>

      {/* Main area */}
      <div className="md:ml-64 min-h-screen flex flex-col">
        {/* Top nav */}
        <header className="bg-[#f8f9ff] border-b border-[#c3c5d9]/20 h-16 flex items-center justify-between px-6 sticky top-0 z-30">
          {/* Left: hamburger + breadcrumb */}
          <div className="flex items-center gap-4">
            <button
              className="md:hidden p-2 hover:bg-[#eff4ff] rounded-sm transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                menu
              </span>
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-400">PATH //</span>
              <nav className="flex gap-2 text-xs font-bold uppercase tracking-widest headline">
                <span className="text-slate-400">DASHBOARD</span>
                <span className="text-slate-300">/</span>
                <span className="text-[#0047cc] border-b-2 border-[#0047cc] pb-0.5">
                  {pathname === "/Agent"
                    ? "INTELLIGENCE"
                    : pathname === "/Agent/my-complaints"
                    ? "OPERATIONS"
                    : "MANAGEMENT"}
                </span>
              </nav>
            </div>
          </div>

          {/* Right: search + role + user */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex relative">
              <span
                className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-slate-400"
                style={{ fontSize: 16 }}
              >
                search
              </span>
              <input
                type="text"
                placeholder="SEARCH ID..."
                className="bg-[#eff4ff] border-none text-[10px] font-mono w-44 h-8 pl-8 pr-2 focus:outline-none focus:ring-1 focus:ring-[#0047cc] rounded-sm"
              />
            </div>
            <div className="h-8 w-px bg-[#c3c5d9]/20" />
            <div className="px-2 py-1 bg-[#dce1ff] text-[#0047cc] text-[10px] font-bold uppercase tracking-tighter rounded-sm">
              Role: Agent
            </div>
            <div className="flex items-center gap-1">
              <button className="p-2 hover:bg-[#eff4ff] rounded-sm transition-colors relative">
                <span className="material-symbols-outlined text-slate-500" style={{ fontSize: 20 }}>
                  notifications
                </span>
              </button>
              <button
                className="p-2 hover:bg-[#eff4ff] rounded-sm transition-colors"
                onClick={handleLogout}
                title="Log out"
              >
                <span className="material-symbols-outlined text-slate-500" style={{ fontSize: 20 }}>
                  logout
                </span>
              </button>
              <div className="w-8 h-8 rounded-sm bg-[#0047cc] text-white text-xs font-bold flex items-center justify-center uppercase">
                {initials}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1">{children}</main>
      </div>
    </div>
  )
}
