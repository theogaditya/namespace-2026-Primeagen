"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import { AdminLanguageSelector } from "@/components/AdminLanguageSelector"
import Link from "next/link"
import {
  Home, ClipboardList, History, BarChart3, User,
  LogOut, Menu, Bell, Search, ChevronRight
} from "lucide-react"

interface AgentRevampedLayoutProps {
  children: React.ReactNode
}

const NAV_SECTIONS = [
  {
    title: "MENU",
    items: [{ href: "/Agent", icon: Home, label: "Dashboard" }],
  },
  {
    title: "WORKLOAD",
    items: [{ href: "/Agent/my-complaints", icon: ClipboardList, label: "My Workload" }],
  },
  {
    title: "LOGS",
    items: [
      { href: "/Agent/audit-logs", icon: History, label: "Audit Logs" },
      { href: "/Agent/profile", icon: User, label: "My Profile" },
    ],
  },
  {
    title: "ANALYTICS",
    items: [{ href: "/Agent/reports", icon: BarChart3, label: "Analytics" }],
  },
]

export function AgentRevampedLayout({ children }: AgentRevampedLayoutProps) {
  const [adminData, setAdminData] = useState<{
    fullName?: string
    officialEmail?: string
    id?: string
    adminType?: string
  } | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const notificationRef = useRef<HTMLDivElement>(null)

  const notifications = [
    { id: 1, title: "New Assignment", desc: "Complaint #1024 has been assigned to you.", time: "2m ago", unread: true },
    { id: 2, title: "Status Verified", desc: "Citizen has verified resolution for #998.", time: "1h ago", unread: true },
    { id: 3, title: "System Update", desc: "Portal updated to version 1.0.4.", time: "3h ago", unread: false },
  ]

  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const saved = localStorage.getItem("agentSidebarCollapsed")
    if (saved === "true") setIsCollapsed(true)

    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "b") {
        e.preventDefault()
        toggleCollapse()
      }
    }
    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleKeyDown)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev
      localStorage.setItem("agentSidebarCollapsed", String(next))
      return next
    })
  }

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
    try { window.location.replace("/") } catch { router.push("/") }
  }

  const isActive = (href: string) => pathname === href

  const initials = adminData?.fullName
    ? adminData.fullName.split(" ").map((n) => n[0]).slice(0, 2).join("")
    : "AG"

  const activeLabel =
    NAV_SECTIONS.flatMap((s) => s.items).find((i) => isActive(i.href))?.label ?? "Dashboard"

  const sidebarWidth = isCollapsed ? "w-[88px]" : "w-[280px]"
  const mainMargin = isCollapsed ? "md:ml-[88px]" : "md:ml-[280px]"

  return (
    <div className="min-h-screen bg-[#F9FAFB] font-outfit">
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap');
        .font-outfit { font-family: 'Outfit', sans-serif; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
      `}</style>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen ${sidebarWidth} bg-white border-r border-slate-200/80 shadow-xl shadow-slate-200/30 flex flex-col z-50 transition-all duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
      >
        {/* Logo */}
        <div className={`flex items-center gap-3 px-5 h-16 border-b border-slate-100 flex-shrink-0 ${isCollapsed ? "justify-center px-0" : ""}`}>
          <div className="h-14 w-14 rounded-xl bg-white shadow-md border border-slate-100 flex items-center justify-center flex-shrink-0">
            <img
              src="/logo.png"
              alt="SwarajDesk"
              className="h-12 w-12 object-contain"
            />
          </div>
          {!isCollapsed && (
            <div>
              <h1 className="font-outfit font-bold text-slate-900 text-base leading-none tracking-tight">SwarajDesk</h1>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest mt-0.5">Agent Portal</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title}>
              {!isCollapsed && (
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-2">
                  {section.title}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const active = isActive(item.href)
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 group
                        ${isCollapsed ? "justify-center" : ""}
                        ${active
                          ? "bg-[#EEF2FF] text-[#465FFF]"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        }`}
                      title={isCollapsed ? item.label : undefined}
                    >
                      <Icon size={18} className="flex-shrink-0" />
                      {!isCollapsed && (
                        <>
                          <span className="flex-1">{item.label}</span>
                          {active && <ChevronRight size={14} className="text-[#465FFF]" />}
                        </>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Blockchain widget */}
        {!isCollapsed && (
          <div className="px-3 pb-3">
            <div className="bg-gradient-to-br from-indigo-50 via-blue-50 to-indigo-100 rounded-xl p-4 border border-indigo-100">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-indigo-100 rounded-lg">
                  <svg viewBox="0 0 256 417" className="w-4 h-4" preserveAspectRatio="xMidYMid">
                    <path fill="#4F46E5" d="M127.961 0l-2.795 9.5v275.668l2.795 2.79 127.962-75.638z" opacity="0.8" />
                    <path fill="#4F46E5" d="M127.962 0L0 212.32l127.962 75.639V154.158z" opacity="0.6" />
                    <path fill="#4F46E5" d="M127.961 312.187l-1.575 1.92v98.199l1.575 4.6L256 236.587z" opacity="0.8" />
                    <path fill="#4F46E5" d="M127.962 416.905v-104.72L0 236.585z" opacity="0.6" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-900">Blockchain Verified</h4>
                  <p className="text-[10px] text-gray-500">Ethereum Sepolia Testnet</p>
                </div>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <div className="relative">
                  <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center border border-indigo-200">
                    <svg viewBox="0 0 256 417" className="w-3 h-3" preserveAspectRatio="xMidYMid">
                      <path fill="#4F46E5" d="M127.961 0l-2.795 9.5v275.668l2.795 2.79 127.962-75.638z" opacity="0.8" />
                      <path fill="#4F46E5" d="M127.962 0L0 212.32l127.962 75.639V154.158z" opacity="0.6" />
                    </svg>
                  </div>
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border-2 border-white animate-pulse" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-700 font-medium">Hashed Transactions</p>
                  <p className="text-[10px] text-gray-500 truncate font-mono">0xD129...35F7</p>
                </div>
              </div>
              <a
                href="https://sepolia.etherscan.io/address/0x522ba372e9fE6ecfEd24b773528b447bBdF823b2"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 w-full py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-xs font-semibold text-white transition-all"
              >
                View on Sepolia
              </a>
            </div>
          </div>
        )}

        {/* Profile + logout */}
        <div className={`border-t border-slate-100 p-3 flex-shrink-0 ${isCollapsed ? "flex flex-col items-center gap-2" : ""}`}>
          {isCollapsed ? (
            <>
              <div className="h-9 w-9 rounded-xl bg-[#EEF2FF] text-[#465FFF] flex items-center justify-center text-xs font-bold uppercase">
                {initials}
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-xl transition-colors"
                title="Sign Out"
              >
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-xl bg-[#EEF2FF] text-[#465FFF] flex items-center justify-center text-xs font-bold uppercase flex-shrink-0">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate leading-none font-outfit">
                    {adminData?.fullName || "Agent User"}
                  </p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">Field Agent</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-xl transition-colors flex-shrink-0"
                title="Sign Out"
              >
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main area */}
      <div className={`transition-all duration-300 min-h-screen flex flex-col ${mainMargin}`}>
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-xl border-b border-slate-100 h-16 flex items-center justify-between px-6 sticky top-0 z-30">
          {/* Left: toggle + breadcrumb */}
          <div className="flex items-center gap-4">
            <button
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500"
              onClick={() => {
                if (typeof window !== "undefined" && window.innerWidth < 768) setSidebarOpen(true)
                else toggleCollapse()
              }}
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2 text-sm font-outfit">
              <span className="text-slate-400 font-medium">Agent</span>
              <ChevronRight size={14} className="text-slate-300" />
              <span className="font-bold text-slate-900">{activeLabel}</span>
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-3">
            <AdminLanguageSelector />
            <div className="hidden md:flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
              <Search size={14} className="text-slate-400" />
              <input
                type="text"
                placeholder="Search complaints..."
                className="bg-transparent text-sm w-44 focus:outline-none text-slate-700 placeholder:text-slate-400 font-outfit"
              />
            </div>

            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-[#EEF2FF] rounded-xl">
              <span className="w-2 h-2 rounded-full bg-[#465FFF]" />
              <span className="text-xs font-bold text-[#465FFF] tracking-tight font-outfit">AGENT PORTAL</span>
            </div>

            {/* Notifications */}
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors relative"
              >
                <Bell size={18} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-[100] overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest font-outfit">Notifications</h3>
                    <button className="text-[10px] font-bold text-[#465FFF] hover:underline">Mark all read</button>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer ${n.unread ? "bg-[#EEF2FF]/30" : ""}`}
                      >
                        <div className="flex gap-3">
                          <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${n.unread ? "bg-[#465FFF]" : "bg-transparent"}`} />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 leading-none mb-1">{n.title}</p>
                            <p className="text-[11px] text-slate-500 leading-tight">{n.desc}</p>
                            <p className="text-[10px] font-mono text-slate-400 mt-1">{n.time}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-2.5 border-t border-slate-100 text-center">
                    <button className="text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:text-slate-900">View all alerts</button>
                  </div>
                </div>
              )}
            </div>

            <div className="h-8 w-px bg-slate-200 hidden sm:block" />
            <div className="flex items-center gap-2.5">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-slate-900 leading-none font-outfit">{adminData?.fullName || "Agent"}</p>
                <p className="text-[10px] text-slate-400 uppercase mt-0.5 tracking-wider">Field Agent</p>
              </div>
              <div className="h-9 w-9 rounded-xl bg-[#EEF2FF] text-[#465FFF] flex items-center justify-center text-xs font-bold uppercase">
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
