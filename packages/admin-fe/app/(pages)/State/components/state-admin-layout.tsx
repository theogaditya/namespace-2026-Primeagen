"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { AdminLanguageSelector } from "@/components/AdminLanguageSelector"
import { cn } from "@/lib/utils"
import {
  Home, ClipboardList, BarChart3, Building2,
  LogOut, Menu, Bell, Search, ChevronRight
} from "lucide-react"

interface StateAdminLayoutProps {
  children: React.ReactNode
  activeTab?: 'dashboard' | 'my-complaints' | 'reports' | 'municipal-management'
  onTabChange?: (tab: 'dashboard' | 'my-complaints' | 'reports' | 'municipal-management') => void
}

type TabKey = 'dashboard' | 'my-complaints' | 'reports' | 'municipal-management'

const NAV_SECTIONS: { title: string; items: { id: string; label: string; icon: React.ComponentType<{className?:string}>; tabKey: TabKey }[] }[] = [
  { title: "Menu", items: [
    { id: "dashboard", label: "Dashboard", icon: Home, tabKey: "dashboard" },
  ]},
  { title: "Complaints", items: [
    { id: "my-complaints", label: "My Complaints", icon: ClipboardList, tabKey: "my-complaints" },
  ]},
  { title: "Intelligence", items: [
    { id: "reports", label: "Analytics", icon: BarChart3, tabKey: "reports" },
  ]},
  { title: "Administration", items: [
    { id: "municipal-management", label: "Municipal Management", icon: Building2, tabKey: "municipal-management" },
  ]},
]

export function StateAdminLayout({ children, activeTab = 'dashboard', onTabChange }: StateAdminLayoutProps) {
  const router = useRouter()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [adminData, setAdminData] = useState<{
    fullName?: string; officialEmail?: string; id?: string;
    adminType?: string; state?: string; department?: string;
  } | null>(null)
  const notificationRef = useRef<HTMLDivElement>(null)

  const SW = isCollapsed ? 88 : 280

  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem("stateSidebarCollapsed")
    if (saved === "true") setIsCollapsed(true)
    try {
      const raw = localStorage.getItem('admin')
      if (raw) {
        const parsed = JSON.parse(raw)
        setAdminData({
          fullName: parsed.fullName || parsed.name,
          officialEmail: parsed.officialEmail || parsed.email,
          id: parsed.id,
          adminType: parsed.adminType || localStorage.getItem('adminType'),
          state: parsed.state,
          department: parsed.department,
        })
      }
    } catch {}
    const handleClickOutside = (e: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node))
        setShowNotifications(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    const handleResize = () => { if (window.innerWidth >= 768) setMobileOpen(false) }
    window.addEventListener("resize", handleResize)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "b") { e.preventDefault(); toggleCollapse() }
      if (e.key === "Escape") { setShowNotifications(false); setMobileOpen(false) }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  const toggleCollapse = useCallback(() => {
    setIsCollapsed(prev => {
      const next = !prev
      localStorage.setItem("stateSidebarCollapsed", String(next))
      return next
    })
  }, [])

  const handleLogout = () => {
    try { localStorage.removeItem('token'); localStorage.removeItem('admin'); localStorage.removeItem('adminType') } catch {}
    try { window.dispatchEvent(new Event('authChange')) } catch {}
    try { window.location.replace('/') } catch { router.push('/') }
  }

  const initials = adminData?.fullName
    ? adminData.fullName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
    : 'SA'

  function SidebarContent() {
    return (
      <>
        {/* Logo */}
        <div className={cn(
          "border-b border-slate-100 bg-slate-50/40 shrink-0",
          isCollapsed ? "flex flex-col items-center py-5 px-1" : "flex items-center gap-3 p-5"
        )}>
          <div className="flex h-14 w-14 min-w-[56px] items-center justify-center rounded-xl bg-white shadow-md border border-slate-100">
            <img src="/logo.png" alt="Logo" className="h-12 w-12 object-contain" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-[16px] font-black tracking-tight text-slate-900 leading-none">SwarajDesk</span>
              <span className="text-[9px] font-semibold text-slate-400 mt-0.5 tracking-wide">State Admin Portal</span>
            </div>
          )}
        </div>

        {/* Search */}
        {!isCollapsed ? (
          <div className="px-4 py-3 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input type="text" placeholder="Search..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-sm font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#465FFF]/30 transition-all"
                suppressHydrationWarning />
            </div>
          </div>
        ) : (
          <div className="flex justify-center py-3 shrink-0">
            <button className="group relative p-2 rounded-xl hover:bg-slate-50 transition-all">
              <Search className="h-[18px] w-[18px] text-slate-400 group-hover:text-slate-600" />
            </button>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-2">
          {NAV_SECTIONS.map((section, sIdx) => (
            <div key={section.title} className={sIdx > 0 ? "mt-6" : ""}>
              {!isCollapsed && (
                <p className="mb-2 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-[2px]">{section.title}</p>
              )}
              {isCollapsed && sIdx > 0 && <div className="mx-auto mb-2 w-6 h-px bg-slate-200" />}
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon
                  const active = activeTab === item.tabKey
                  return (
                    <li key={item.id}>
                      <button
                        onClick={() => { onTabChange?.(item.tabKey); setMobileOpen(false) }}
                        className={cn(
                          "group relative w-full flex items-center gap-3 py-2.5 rounded-xl text-left transition-all duration-200",
                          active ? "bg-[#EEF2FF] text-[#465FFF]" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                          isCollapsed ? "justify-center px-2" : "px-3"
                        )}
                      >
                        <div className="flex items-center justify-center min-w-[20px]">
                          <Icon className={cn("h-[18px] w-[18px] shrink-0 transition-colors", active ? "text-[#465FFF]" : "text-slate-400 group-hover:text-slate-600")} />
                        </div>
                        {!isCollapsed && (
                          <span className={cn("text-[13px] truncate", active ? "font-bold" : "font-medium")}>{item.label}</span>
                        )}
                        {isCollapsed && (
                          <div className="absolute left-full ml-3 px-3 py-1.5 bg-slate-800 text-white text-xs font-medium rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-[200] pointer-events-none">
                            {item.label}
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-1.5 h-1.5 bg-slate-800 rotate-45" />
                          </div>
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Profile + Logout */}
        <div className="mt-auto border-t border-slate-100 shrink-0">
          <div className={cn("border-b border-slate-100 bg-slate-50/30", isCollapsed ? "py-3 px-1" : "p-3")}>
            {!isCollapsed ? (
              <div className="flex items-center px-3 py-2 rounded-xl bg-white hover:bg-slate-50 transition-colors border border-slate-100/60">
                <div className="w-8 h-8 bg-[#EEF2FF] rounded-full flex items-center justify-center shrink-0">
                  <span className="text-[#465FFF] font-black text-xs">{initials}</span>
                </div>
                <div className="flex-1 min-w-0 ml-2.5">
                  <p className="text-sm font-bold text-slate-800 truncate leading-none">{mounted && adminData ? adminData.fullName : "Admin"}</p>
                  <p className="text-[9px] font-semibold text-emerald-500 uppercase mt-1 tracking-widest leading-none">{adminData?.state || "State Admin"}</p>
                </div>
                <div className="w-2 h-2 bg-emerald-400 rounded-full ml-2 ring-2 ring-emerald-100 shrink-0" />
              </div>
            ) : (
              <div className="flex justify-center">
                <div className="w-9 h-9 bg-[#EEF2FF] rounded-full flex items-center justify-center">
                  <span className="text-[#465FFF] font-black text-xs">{initials}</span>
                </div>
              </div>
            )}
          </div>
          <div className="p-3">
            <button
              onClick={handleLogout}
              className={cn(
                "group relative w-full flex items-center rounded-xl text-left transition-all text-red-500 hover:bg-red-50 hover:text-red-600",
                isCollapsed ? "justify-center p-2" : "gap-3 px-3 py-2.5"
              )}
            >
              <LogOut className="h-[18px] w-[18px] shrink-0 text-red-400 group-hover:text-red-500" />
              {!isCollapsed && <span className="text-sm font-bold">Logout</span>}
              {isCollapsed && (
                <div className="absolute left-full ml-3 px-3 py-1.5 bg-slate-800 text-white text-xs font-medium rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-[200] pointer-events-none">
                  Logout
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-1.5 h-1.5 bg-slate-800 rotate-45" />
                </div>
              )}
            </button>
          </div>
        </div>
      </>
    )
  }

  return (
    <div className="flex h-screen bg-[#F9FAFB] overflow-hidden font-outfit">
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[99] md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        style={{ width: SW, minWidth: SW, maxWidth: SW }}
        className={cn(
          "h-full bg-white border-r border-slate-200/80 flex flex-col shadow-xl shadow-slate-200/30 transition-all duration-300 ease-in-out overflow-hidden shrink-0",
          mobileOpen ? "fixed top-0 left-0 z-[100] translate-x-0 md:relative md:z-auto" : "hidden md:flex relative"
        )}
      >
        <SidebarContent />
      </aside>

      {/* Main */}
      <div className="relative flex flex-1 flex-col overflow-y-auto min-w-0">
        <header className="sticky top-0 z-[9] flex w-full border-b border-slate-100 bg-white/80 backdrop-blur-xl py-3 px-6 items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { if (typeof window !== 'undefined' && window.innerWidth < 768) setMobileOpen(!mobileOpen); else toggleCollapse() }}
              className="p-2 rounded-xl hover:bg-slate-100 transition-all text-slate-400 hover:text-slate-700"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden md:block h-5 w-px bg-slate-200" />
            <div className="hidden md:flex items-center gap-1.5 text-sm">
              <span className="font-medium text-slate-400">SwarajDesk</span>
              <ChevronRight className="h-3 w-3 text-slate-300" />
              <span className="font-bold text-slate-900 capitalize">{activeTab?.replace(/-/g, ' ')}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                className="bg-slate-50 border border-slate-200/60 rounded-lg pl-9 pr-4 py-1.5 text-sm font-medium w-64 focus:ring-2 focus:ring-[#465FFF]/20 focus:outline-none transition-all placeholder-slate-400"
                placeholder="Global Search..." type="text"
              />
            </div>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-[#EEF2FF] rounded-full">
              <span className="w-2 h-2 rounded-full bg-[#465FFF]" />
              <span className="text-xs font-bold text-[#465FFF] tracking-tight">STATE ADMIN</span>
            </div>
            <AdminLanguageSelector />
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className={cn("p-2 rounded-xl transition-colors relative", showNotifications ? "bg-[#EEF2FF] text-[#465FFF]" : "hover:bg-slate-50 text-slate-400")}
              >
                <Bell className="h-[18px] w-[18px]" />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full border-2 border-white" />
              </button>
            </div>
            <div className="h-8 w-px bg-slate-200 hidden sm:block" />
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-slate-900 leading-none">{mounted && adminData ? adminData.fullName : "Admin"}</p>
                <p className="text-[9px] font-bold text-emerald-500 uppercase mt-1 tracking-widest leading-none">{adminData?.state || "State"}</p>
              </div>
              <div className="h-9 w-9 bg-[#EEF2FF] text-[#465FFF] rounded-xl flex items-center justify-center font-black text-sm border border-[#EEF2FF] shadow-sm">{initials}</div>
            </div>
          </div>
        </header>

        <main className="flex-1">{children}</main>
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap');
        .font-outfit { font-family: 'Outfit', sans-serif; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
      `}</style>
    </div>
  )
}
