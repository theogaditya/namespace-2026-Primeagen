"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

interface RevampedLayoutProps {
  children: React.ReactNode
  activeTab?: 'dashboard' | 'my-complaints' | 'reports' | 'agent-management' | 'announcements'
  onTabChange?: (tab: 'dashboard' | 'my-complaints' | 'reports' | 'agent-management' | 'announcements') => void
}

const NAV_ITEMS = [
  { name: "Dashboard", icon: "dashboard", tabKey: 'dashboard' as const },
  { name: "My Complaints", icon: "assignment", tabKey: 'my-complaints' as const },
  { name: "Analytics", icon: "analytics", tabKey: 'reports' as const },
  { name: "Agent Management", icon: "group", tabKey: 'agent-management' as const },
  { name: "Announcements", icon: "campaign", tabKey: 'announcements' as const },
]

export function RevampedLayout({ children, activeTab = 'dashboard', onTabChange }: RevampedLayoutProps) {
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [adminData, setAdminData] = useState<{
    fullName?: string
    officialEmail?: string
    id?: string
    adminType?: string
    municipality?: string
  } | null>(null)

  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('admin') : null
      if (raw) {
        const parsed = JSON.parse(raw)
        setAdminData({
          fullName: parsed.fullName || parsed.name,
          officialEmail: parsed.officialEmail || parsed.email,
          id: parsed.id,
          adminType: parsed.adminType || localStorage.getItem('adminType'),
          municipality: parsed.municipality,
        })
      }
    } catch (err) {
      console.warn('Failed to parse admin from localStorage', err)
    }
  }, [])

  const handleLogout = () => {
    try {
      localStorage.removeItem('token')
      localStorage.removeItem('admin')
      localStorage.removeItem('adminType')
    } catch {}
    try { window.dispatchEvent(new Event('authChange')) } catch {}
    router.push('/')
  }

  const initials = adminData?.fullName
    ? adminData.fullName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'MA'

  function renderSidebarContent() {
    return (
      <>
        {/* Logo */}
        <div className="flex items-center gap-3 px-2 py-4 mb-4">
          <div className="w-8 h-8 rounded-lg bg-[#041627] flex items-center justify-center text-white">
            <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 leading-none tracking-tight">SwarajDesk</h1>
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest mt-1">Admin Portal</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const active = activeTab === item.tabKey
            return (
              <button
                key={item.tabKey}
                onClick={() => {
                  onTabChange?.(item.tabKey)
                  setSidebarOpen(false)
                }}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold tracking-wide transition-all ease-in-out duration-200 w-full text-left",
                  active
                    ? "bg-[#e1e3e4] text-slate-900"
                    : "text-slate-500 hover:bg-slate-200/50"
                )}
              >
                <span
                  className="material-symbols-outlined text-xl"
                  style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
                >
                  {item.icon}
                </span>
                <span>{item.name}</span>
              </button>
            )
          })}
        </nav>

        {/* Bottom items */}
        <div className="mt-auto border-t border-slate-200/50 pt-4 flex flex-col gap-1">
          <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold tracking-wide text-slate-500 hover:bg-slate-200/50 transition-all w-full text-left">
            <span className="material-symbols-outlined text-xl">help</span>
            <span>Help</span>
          </button>
        </div>
      </>
    )
  }

  return (
    <>
      {/* Google Fonts for Material Symbols + Inter */}
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />

      <div className="min-h-screen bg-[#f8f9fa] text-[#191c1d]" style={{ fontFamily: "'Inter', sans-serif" }}>
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
            <aside className="fixed inset-y-0 left-0 w-64 bg-[#f3f4f5] flex flex-col p-4 gap-2 shadow-xl z-50">
              {renderSidebarContent()}
            </aside>
          </div>
        )}

        {/* Desktop sidebar */}
        <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:flex lg:flex-col bg-[#f3f4f5] p-4 gap-2 z-40">
          {renderSidebarContent()}
        </aside>

        {/* Main content */}
        <main className="lg:ml-64 min-h-screen flex flex-col">
          {/* Top App Bar */}
          <header className="sticky top-0 z-30 bg-[#f8f9fa]/80 backdrop-blur-xl flex items-center justify-between px-6 py-3 w-full shadow-sm">
            {/* Left: Mobile hamburger + search */}
            <div className="flex items-center gap-4">
              <button
                className="lg:hidden p-2 hover:bg-slate-100 rounded-full transition-colors"
                onClick={() => setSidebarOpen(true)}
              >
                <span className="material-symbols-outlined text-slate-900">menu</span>
              </button>
              <div className="relative hidden md:block">
                <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                  <span className="material-symbols-outlined text-lg">search</span>
                </span>
                <input
                  className="bg-[#f3f4f5] border-none rounded-lg pl-10 pr-4 py-1.5 text-sm w-80 focus:ring-1 focus:ring-[#115cb9] focus:outline-none transition-all"
                  placeholder="Global Search..."
                  type="text"
                />
              </div>
            </div>

            {/* Right: role badge + notifications + avatar */}
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-full">
                <span className="w-2 h-2 rounded-full bg-[#115cb9]" />
                <span className="text-xs font-bold text-[#041627] tracking-tight">MUNICIPAL ADMIN</span>
              </div>
              <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors relative">
                <span className="material-symbols-outlined">notifications</span>
              </button>
              <div className="h-8 w-px bg-slate-200 hidden sm:block" />
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold text-slate-900 leading-none">{adminData?.fullName || 'Admin'}</p>
                  <p className="text-[10px] text-slate-500 uppercase mt-0.5">{adminData?.municipality || 'Municipality'}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-[#115cb9] text-white flex items-center justify-center text-sm font-bold ring-2 ring-white shadow-sm">
                  {initials}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-slate-500 hover:bg-red-50 hover:text-[#ba1a1a] rounded-full transition-colors" title="Logout"
              >
                <span className="material-symbols-outlined">logout</span>
              </button>
            </div>
          </header>

          {/* Page content */}
          <div className="flex-1">{children}</div>
        </main>
      </div>
    </>
  )
}

export default RevampedLayout
