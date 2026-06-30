"use client"

import { useState, useEffect, ReactNode, useRef, useCallback } from "react"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { useCivicPartnerAuth, CivicPartner } from "@/hooks/useCivicPartnerAuth"
import {
  Home,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Search,
  Bell,
  Moon,
  ClipboardList,
  MapPinned,
  Command,
  ChevronDown,
  Archive,
  FileBarChart,
} from "lucide-react"

/* ─── Navigation Config ─── */
interface NavItem {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  href: string
  badge?: string
  matchPrefix?: boolean
}

interface NavSection {
  title: string
  items: NavItem[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: "Menu",
    items: [
      { id: "dashboard", label: "Dashboard", icon: Home, href: "/CivicPartner" },
    ],
  },
  {
    title: "Campaigns",
    items: [
      { id: "surveys", label: "Active Surveys", icon: ClipboardList, href: "/CivicPartner/surveys", badge: "NEW", matchPrefix: true },
      { id: "archived-surveys", label: "Archived & Closed", icon: Archive, href: "/CivicPartner/surveys/archived", matchPrefix: false },
    ],
  },
  {
    title: "Intelligence",
    items: [
      { id: "reports", label: "AI Reports", icon: FileBarChart, href: "/CivicPartner/reports", badge: "AI" },
    ],
  },
  {
    title: "System",
    items: [
      { id: "analytics", label: "Heatmaps", icon: MapPinned, href: "/CivicPartner/analytics" },
      { id: "settings", label: "Portal Settings", icon: Settings, href: "/CivicPartner/settings" },
    ],
  },
]

// Flatten for command palette search
const ALL_NAV_ITEMS = NAV_SECTIONS.flatMap((s) => s.items)

/* ─── Breadcrumb Labels ─── */
const BREADCRUMB_MAP: Record<string, string> = {
  "/CivicPartner": "Dashboard",
  "/CivicPartner/surveys": "Active Surveys",
  "/CivicPartner/surveys/new": "Create New Survey",
  "/CivicPartner/surveys/archived": "Archived & Closed Surveys",
  "/CivicPartner/analytics": "Heatmaps",
  "/CivicPartner/reports": "AI Reports",
  "/CivicPartner/settings": "Portal Settings",
}

/* ─── Dummy Notifications ─── */
const NOTIFICATIONS = [
  { id: 1, title: "New survey response", desc: "Urban Mobility survey received 12 new responses", time: "2m ago", unread: true },
  { id: 2, title: "Survey published", desc: "Healthcare Feedback survey is now live", time: "1h ago", unread: true },
  { id: 3, title: "Milestone reached", desc: "Community engagement crossed 500 responses!", time: "3h ago", unread: false },
  { id: 4, title: "Draft auto-saved", desc: "Your Education survey draft was saved", time: "5h ago", unread: false },
]

/* ══════════════════════════════════════════════════════ */
/*                    MAIN LAYOUT                        */
/* ══════════════════════════════════════════════════════ */
export function CivicPartnerLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { partner, logout } = useCivicPartnerAuth()

  const [isCollapsed, setIsCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showCommandPalette, setShowCommandPalette] = useState(false)
  const [cmdSearch, setCmdSearch] = useState("")
  const [mounted, setMounted] = useState(false)
  const [cachedPartner, setCachedPartner] = useState<CivicPartner | null>(null)
  const notificationRef = useRef<HTMLDivElement>(null)
  const cmdInputRef = useRef<HTMLInputElement>(null)

  /* ── Init ── */
  useEffect(() => {
    setMounted(true)
    const raw = localStorage.getItem("civicPartner")
    if (raw) setCachedPartner(JSON.parse(raw))

    // Restore sidebar state
    const saved = localStorage.getItem("sidebarCollapsed")
    if (saved === "true") setIsCollapsed(true)

    // Material Symbols font for dashboard pages
    const link = document.createElement("link")
    link.href = "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@48,400,0,0"
    link.rel = "stylesheet"
    document.head.appendChild(link)

    const handler = (e: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node))
        setShowNotifications(false)
    }
    document.addEventListener("mousedown", handler)

    const handleResize = () => {
      if (window.innerWidth >= 768) setMobileOpen(false)
    }
    window.addEventListener("resize", handleResize)

    return () => {
      document.removeEventListener("mousedown", handler)
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  /* ── Keyboard Shortcuts ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl+B → Toggle sidebar
      if ((e.ctrlKey || e.metaKey) && e.key === "b") {
        e.preventDefault()
        setIsCollapsed((prev) => {
          const next = !prev
          localStorage.setItem("sidebarCollapsed", String(next))
          return next
        })
      }
      // Ctrl+K → Command palette
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault()
        setShowCommandPalette((prev) => !prev)
        setCmdSearch("")
      }
      // Escape → close palette
      if (e.key === "Escape") {
        setShowCommandPalette(false)
        setShowNotifications(false)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  // Auto-focus command palette input
  useEffect(() => {
    if (showCommandPalette) setTimeout(() => cmdInputRef.current?.focus(), 50)
  }, [showCommandPalette])

  const displayPartner = partner ?? cachedPartner
  const initials = displayPartner?.orgName
    ? displayPartner.orgName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "SC"

  const isActive = (item: NavItem) => {
    if (!item.matchPrefix) return pathname === item.href
    // Prevent "Active Surveys" from matching nested routes owned by another nav item
    if (item.id === "surveys") {
      return pathname.startsWith(item.href) && !pathname.startsWith("/CivicPartner/surveys/archived")
    }
    return pathname.startsWith(item.href)
  }

  const handleNavClick = (href: string) => {
    router.push(href)
    if (window.innerWidth < 768) setMobileOpen(false)
  }

  const toggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev
      localStorage.setItem("sidebarCollapsed", String(next))
      return next
    })
  }, [])

  /* ── Breadcrumbs ── */
  const breadcrumbs = (() => {
    const segments = pathname.split("/").filter(Boolean)
    const crumbs: { label: string; href: string }[] = []
    let path = ""
    for (const seg of segments) {
      path += "/" + seg
      const label = BREADCRUMB_MAP[path] || seg.charAt(0).toUpperCase() + seg.slice(1)
      crumbs.push({ label, href: path })
    }
    return crumbs
  })()

  /* ── Command Palette filtered results ── */
  const cmdResults = ALL_NAV_ITEMS.filter((item) =>
    item.label.toLowerCase().includes(cmdSearch.toLowerCase())
  )

  const SW = isCollapsed ? 88 : 280

  return (
    <div className="flex h-screen bg-[#F9FAFB] overflow-hidden font-outfit">

      {/* ── Mobile Overlay ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[99] md:hidden transition-opacity duration-300"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ═══════════ SIDEBAR ═══════════ */}
      <aside
        style={{ width: SW, minWidth: SW, maxWidth: SW }}
        className={cn(
          "h-full bg-white border-r border-slate-200/80 flex flex-col shadow-xl shadow-slate-200/30 transition-all duration-300 ease-in-out overflow-hidden shrink-0",
          // Mobile: fixed with translate
          mobileOpen ? "fixed top-0 left-0 z-[100] translate-x-0 md:relative md:z-auto" : "hidden md:flex relative"
        )}
      >
        {/* ── Logo Header (no collapse button here) ── */}
        <div className={cn(
          "border-b border-slate-100 bg-slate-50/40 shrink-0",
          isCollapsed ? "flex flex-col items-center py-4 px-1" : "flex items-center gap-3 p-5"
        )}>
          <div className="flex h-9 w-9 min-w-[36px] items-center justify-center rounded-xl bg-white shadow-md border border-slate-100">
            <img src="https://swarajdesk.adityahota.online/logo.png" alt="Logo" className="h-6 w-6 object-contain" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-[16px] font-black tracking-tight text-slate-900 leading-none">SwarajCivic</span>
              <span className="text-[9px] font-semibold text-slate-400 mt-0.5 tracking-wide">Civic Partner Portal</span>
            </div>
          )}
        </div>

        {/* ── Sidebar Search ── */}
        {!isCollapsed ? (
          <div className="px-4 py-3 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-sm font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#465FFF]/30 transition-all"
                suppressHydrationWarning
              />
            </div>
          </div>
        ) : (
          <div className="flex justify-center py-3 shrink-0">
            <button className="group relative p-2 rounded-xl hover:bg-slate-50 transition-all">
              <Search className="h-[18px] w-[18px] text-slate-400 group-hover:text-slate-600" />
              <div className="absolute left-full ml-3 px-3 py-1.5 bg-slate-800 text-white text-xs font-medium rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-[200] pointer-events-none">
                Search
                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-1.5 h-1.5 bg-slate-800 rotate-45" />
              </div>
            </button>
          </div>
        )}

        {/* ── Navigation ── */}
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
                  const active = isActive(item)
                  return (
                    <li key={item.id}>
                      <button
                        onClick={() => handleNavClick(item.href)}
                        className={cn(
                          "group relative w-full flex items-center gap-3 py-2.5 rounded-xl text-left transition-all duration-200",
                          active ? "bg-[#EEF2FF] text-[#465FFF]" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                          isCollapsed ? "justify-center px-2" : "px-3"
                        )}
                        title={isCollapsed ? item.label : undefined}
                      >
                        <div className="flex items-center justify-center min-w-[20px]">
                          <Icon className={cn("h-[18px] w-[18px] shrink-0 transition-colors", active ? "text-[#465FFF]" : "text-slate-400 group-hover:text-slate-600")} />
                        </div>
                        {!isCollapsed && (
                          <div className="flex items-center justify-between flex-1 overflow-hidden">
                            <span className={cn("text-[13px] truncate", active ? "font-bold" : "font-medium")}>{item.label}</span>
                            {item.badge && (
                              <span className={cn("px-2 py-0.5 text-[9px] font-black rounded-full uppercase tracking-wider shrink-0", active ? "bg-[#465FFF]/10 text-[#465FFF]" : "bg-emerald-50 text-emerald-500")}>{item.badge}</span>
                            )}
                          </div>
                        )}
                        {isCollapsed && item.badge && <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400 border-2 border-white" />}
                        {/* Tooltip */}
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

        {/* ── Bottom: Profile + Logout ── */}
        <div className="mt-auto border-t border-slate-100 shrink-0">
          {/* Profile */}
          <div className={cn("border-b border-slate-100 bg-slate-50/30", isCollapsed ? "py-3 px-1" : "p-3")}>
            {!isCollapsed ? (
              <div className="flex items-center px-3 py-2 rounded-xl bg-white hover:bg-slate-50 transition-colors border border-slate-100/60">
                <div className="w-8 h-8 bg-[#EEF2FF] rounded-full flex items-center justify-center shrink-0">
                  <span className="text-[#465FFF] font-black text-xs">{initials}</span>
                </div>
                <div className="flex-1 min-w-0 ml-2.5">
                  <p className="text-sm font-bold text-slate-800 truncate leading-none">{mounted && displayPartner ? displayPartner.orgName : "Partner"}</p>
                  <p className="text-[9px] font-semibold text-emerald-500 uppercase mt-1 tracking-widest leading-none">Official Portal</p>
                </div>
                <div className="w-2 h-2 bg-emerald-400 rounded-full ml-2 ring-2 ring-emerald-100 shrink-0" />
              </div>
            ) : (
              <div className="flex justify-center">
                <div className="relative group">
                  <div className="w-9 h-9 bg-[#EEF2FF] rounded-full flex items-center justify-center">
                    <span className="text-[#465FFF] font-black text-xs">{initials}</span>
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white" />
                  <div className="absolute left-full ml-3 px-3 py-1.5 bg-slate-800 text-white text-xs font-medium rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-[200] pointer-events-none">
                    {mounted && displayPartner ? displayPartner.orgName : "Partner"}
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-1.5 h-1.5 bg-slate-800 rotate-45" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Logout */}
          <div className="p-3">
            <button
              onClick={() => logout()}
              className={cn(
                "group relative w-full flex items-center rounded-xl text-left transition-all text-red-500 hover:bg-red-50 hover:text-red-600",
                isCollapsed ? "justify-center p-2" : "gap-3 px-3 py-2.5"
              )}
            >
              <LogOut className="h-[18px] w-[18px] shrink-0 text-red-400 group-hover:text-red-500" />
              {!isCollapsed && <span className="text-sm font-bold">Logout Portal</span>}
              {isCollapsed && (
                <div className="absolute left-full ml-3 px-3 py-1.5 bg-slate-800 text-white text-xs font-medium rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-[200] pointer-events-none">
                  Logout
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-1.5 h-1.5 bg-slate-800 rotate-45" />
                </div>
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* ═══════════ MAIN CONTENT AREA ═══════════ */}
      <div className="relative flex flex-1 flex-col overflow-y-auto min-w-0">
        {/* ── Top Header ── */}
        <header className="sticky top-0 z-[9] flex w-full border-b border-slate-100 bg-white/80 backdrop-blur-xl py-3 px-8 items-center justify-between shrink-0">
          {/* Left: Sidebar Toggle + Breadcrumbs */}
          <div className="flex items-center gap-3">
            {/* Sidebar Toggle Button (in navbar) */}
            <button
              onClick={() => {
                // On mobile, open mobile drawer. On desktop, collapse/expand.
                if (window.innerWidth < 768) {
                  setMobileOpen(!mobileOpen)
                } else {
                  toggleCollapse()
                }
              }}
              className="p-2 rounded-xl hover:bg-slate-100 transition-all text-slate-400 hover:text-slate-700"
              aria-label="Toggle sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="hidden md:block h-5 w-px bg-slate-200" />

            <nav className="hidden md:flex items-center gap-1.5 text-sm">
              {breadcrumbs.map((crumb, i) => (
                <div key={crumb.href} className="flex items-center gap-1.5">
                  {i > 0 && <ChevronRight className="h-3 w-3 text-slate-300" />}
                  <button
                    onClick={() => router.push(crumb.href)}
                    className={cn(
                      "transition-colors",
                      i === breadcrumbs.length - 1
                        ? "font-bold text-slate-900"
                        : "font-medium text-slate-400 hover:text-slate-600"
                    )}
                  >
                    {crumb.label}
                  </button>
                </div>
              ))}
            </nav>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3 relative">
            {/* Command Palette Trigger */}
            <button
              onClick={() => { setShowCommandPalette(true); setCmdSearch("") }}
              className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200/60 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <Search className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-xs text-slate-400 font-medium">Search...</span>
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-bold text-slate-400 ml-4">⌘K</kbd>
            </button>

            <div className="flex items-center gap-1 border-r border-slate-100 pr-3">
              <button className="p-2 rounded-xl hover:bg-slate-50 transition-colors">
                <Moon className="h-[18px] w-[18px] text-slate-400" />
              </button>

              {/* Notification Bell */}
              <div className="relative" ref={notificationRef}>
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className={cn("p-2 rounded-xl transition-colors relative", showNotifications ? "bg-[#EEF2FF] text-[#465FFF]" : "hover:bg-slate-50 text-slate-400")}
                >
                  <Bell className="h-[18px] w-[18px]" />
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full border-2 border-white" />
                </button>

                {/* ── Notification Panel ── */}
                {showNotifications && (
                  <div className="absolute right-0 top-12 w-96 bg-white rounded-2xl shadow-2xl shadow-slate-200/60 border border-slate-200/80 z-[50] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                      <h3 className="text-sm font-black text-slate-900">Notifications</h3>
                      <button className="text-[10px] font-bold text-[#465FFF] uppercase tracking-wider hover:underline">Mark all read</button>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {NOTIFICATIONS.map((n) => (
                        <div key={n.id} className={cn("px-5 py-4 border-b border-slate-50 hover:bg-slate-50/50 transition-colors cursor-pointer", n.unread && "bg-[#EEF2FF]/30")}>
                          <div className="flex items-start gap-3">
                            <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", n.unread ? "bg-[#465FFF]" : "bg-transparent")} />
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-slate-800 leading-tight">{n.title}</p>
                              <p className="text-xs text-slate-500 mt-0.5 leading-snug">{n.desc}</p>
                              <p className="text-[10px] text-slate-400 font-semibold mt-1.5">{n.time}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="px-5 py-3 border-t border-slate-100 text-center">
                      <button className="text-xs font-bold text-[#465FFF] hover:underline">View all notifications</button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Profile */}
            <div className="flex items-center gap-3 cursor-pointer">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-slate-900 leading-none">{mounted && displayPartner ? displayPartner.orgName : "Partner"}</p>
                <p className="text-[9px] font-bold text-emerald-500 uppercase mt-1 tracking-widest leading-none">Official Portal</p>
              </div>
              <div className="h-9 w-9 bg-[#EEF2FF] text-[#465FFF] rounded-xl flex items-center justify-center font-black text-sm border border-[#EEF2FF] shadow-sm">{initials}</div>
            </div>
          </div>
        </header>

        {/* ── Page Content ── */}
        <main className="p-8 2xl:p-12">{children}</main>
      </div>

      {/* ═══════════ COMMAND PALETTE (Ctrl+K) ═══════════ */}
      {showCommandPalette && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[500]" onClick={() => setShowCommandPalette(false)} />
          <div className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-lg bg-white rounded-2xl shadow-2xl z-[501] border border-slate-200/80 overflow-hidden">
            {/* Search Input */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
              <Command className="h-5 w-5 text-slate-400" />
              <input
                ref={cmdInputRef}
                type="text"
                placeholder="Type a command or search..."
                value={cmdSearch}
                onChange={(e) => setCmdSearch(e.target.value)}
                className="flex-1 text-sm font-medium text-slate-800 placeholder-slate-400 outline-none bg-transparent"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && cmdResults.length > 0) {
                    router.push(cmdResults[0].href)
                    setShowCommandPalette(false)
                  }
                }}
              />
              <kbd className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] font-bold text-slate-400">ESC</kbd>
            </div>

            {/* Results */}
            <div className="max-h-72 overflow-y-auto py-2">
              {cmdResults.length > 0 ? (
                <div className="px-2">
                  <p className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-[2px]">Pages</p>
                  {cmdResults.map((item) => {
                    const Icon = item.icon
                    return (
                      <button
                        key={item.id}
                        onClick={() => { router.push(item.href); setShowCommandPalette(false) }}
                        className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[#EEF2FF] text-left transition-all group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-[#465FFF]/10 flex items-center justify-center transition-colors">
                          <Icon className="h-4 w-4 text-slate-500 group-hover:text-[#465FFF] transition-colors" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800 group-hover:text-[#465FFF] transition-colors">{item.label}</p>
                          <p className="text-[10px] text-slate-400 font-medium">{item.href}</p>
                        </div>
                        {item.badge && <span className="ml-auto px-2 py-0.5 text-[9px] font-black rounded-full bg-emerald-50 text-emerald-500 uppercase">{item.badge}</span>}
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="px-5 py-8 text-center">
                  <p className="text-sm text-slate-400 font-medium">No results for &quot;{cmdSearch}&quot;</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <span>Navigate with ↑↓</span>
              <span>Press Enter to open</span>
            </div>
          </div>
        </>
      )}

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap');
        .font-outfit { font-family: 'Outfit', sans-serif; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
      `}</style>
    </div>
  )
}
