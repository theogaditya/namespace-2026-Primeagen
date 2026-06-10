"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  BarChart3,
  Flag,
  FileText,
  Settings,
  Menu,
  LogOut,
  User,
  X,
  Users,
} from "lucide-react"
import { Link as LinkIcon, ExternalLink, Shield } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface StateAdminLayoutProps {
  children: React.ReactNode
  activeTab?: 'dashboard' | 'my-complaints' | 'reports' | 'municipal-management'
  onTabChange?: (tab: 'dashboard' | 'my-complaints' | 'reports' | 'municipal-management') => void
}

export function StateAdminLayout({ children, activeTab = 'dashboard', onTabChange }: StateAdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [adminData, setAdminData] = useState<{ fullName?: string; officialEmail?: string; id?: string; adminType?: string } | null>(null)
  const router = useRouter()

  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('admin') : null
      if (raw) {
        const parsed = JSON.parse(raw)
        setAdminData({ 
          fullName: parsed.fullName || parsed.name, 
          officialEmail: parsed.officialEmail || parsed.email, 
          id: parsed.id,
          adminType: parsed.adminType || localStorage.getItem('adminType')
        })
      }
    } catch (err) {
      console.warn('Failed to parse admin from localStorage', err)
    }
  }, [])

  // Build navigation - all tabs are internal (no external routes)
  const navItems = [
    { name: "Dashboard", icon: BarChart3, tabKey: 'dashboard' as const },
    { name: "My Complaints", icon: FileText, tabKey: 'my-complaints' as const },
    { name: "Reports & Reviews", icon: Flag, tabKey: 'reports' as const },
    { name: "Municipal Management", icon: Users, tabKey: 'municipal-management' as const },
  ]

  // Get page title based on current tab
  const getPageTitle = (): string => {
    switch (activeTab) {
      case 'dashboard':
        return 'Complaints Management'
      case 'my-complaints':
        return 'My Complaints'
      case 'reports':
        return 'Reports & Reviews'
      case 'municipal-management':
        return 'Municipal Management'
      default:
        return 'Dashboard'
    }
  }

  const handleNavClick = (tabKey: 'dashboard' | 'my-complaints' | 'reports' | 'municipal-management') => {
    onTabChange?.(tabKey)
    setSidebarOpen(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl">
            <div className="flex h-full flex-col">
              <div className="flex h-16 items-center justify-between border-b bg-white px-4">
                <div className="flex items-center">
                  <img src="https://swarajdesk.adityahota.online/logo.png" alt="SwarajDesk logo" className="h-8 w-8 mr-2" />
                  <h1 className="text-xl font-bold text-purple-600">State Admin</h1>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
                  <X className="h-6 w-6" />
                </Button>
              </div>
              <nav className="flex-1 space-y-1 bg-white px-2 py-4">
                {navItems.map((item) => {
                  const active = activeTab === item.tabKey
                  return (
                    <button
                      key={item.name}
                      onClick={() => handleNavClick(item.tabKey)}
                      className={cn(
                        active
                          ? "bg-purple-50 border-r-2 border-purple-600 text-purple-700"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                        "group flex items-center px-2 py-2 text-sm font-medium rounded-md w-full text-left",
                      )} 
                    >
                      <item.icon
                        className={cn(
                          active ? "text-purple-500" : "text-gray-400 group-hover:text-gray-500",
                          "mr-3 h-5 w-5 shrink-0",
                        )}
                      />
                      {item.name}
                    </button>
                  )
                })}
                {(adminData?.adminType === 'MUNICIPAL_ADMIN' || adminData?.adminType === 'STATE_ADMIN') && (
                <div className="mt-4 pt-4 border-t border-gray-100 px-2">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                    className="relative overflow-hidden rounded-xl"
                  >
                    <div className="absolute inset-0 bg-linear-to-br from-blue-50 via-indigo-50 to-blue-100" />
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNiIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiIHN0cm9rZS13aWR0aD0iMiIvPjwvZz48L3N2Zz4=')] opacity-30" />

                    <div className="relative p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="p-1.5 bg-indigo-100 rounded-lg">
                          <LinkIcon className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-gray-900">Blockchain Verified</h4>
                          <p className="text-[10px] text-gray-500">Ethereum Sepolia Testnet</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 mb-3">
                        <div className="relative">
                          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center border border-indigo-200">
                            <svg viewBox="0 0 256 417" className="w-5 h-5" preserveAspectRatio="xMidYMid">
                              <path fill="#4F46E5" d="M127.961 0l-2.795 9.5v275.668l2.795 2.79 127.962-75.638z" opacity="0.8"/>
                              <path fill="#4F46E5" d="M127.962 0L0 212.32l127.962 75.639V154.158z" opacity="0.6"/>
                              <path fill="#4F46E5" d="M127.961 312.187l-1.575 1.92v98.199l1.575 4.6L256 236.587z" opacity="0.8"/>
                              <path fill="#4F46E5" d="M127.962 416.905v-104.72L0 236.585z" opacity="0.6"/>
                            </svg>
                          </div>
                          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse" />
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
                        className="group flex items-center justify-center gap-2 w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 rounded-lg border border-indigo-700 transition-all duration-300 hover:scale-[1.02]"
                      >
                        <span className="text-sm font-semibold text-white">View on Pinata</span>
                        <ExternalLink className="w-4 h-4 text-white/90 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                      </a>

                      <div className="flex items-center justify-center gap-1.5 mt-3">
                        <Shield className="w-3 h-3 text-green-600" />
                        <span className="text-[10px] text-gray-600">Immutable & Tamper-proof Records</span>
                      </div>
                    </div>
                  </motion.div>
                </div>
                )}
                {(adminData?.adminType === 'MUNICIPAL_ADMIN' || adminData?.adminType === 'STATE_ADMIN') && (
                <div className="mt-4 pt-4 border-t border-gray-100 px-2">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                    className="relative overflow-hidden rounded-xl"
                  >
                    <div className="absolute inset-0 bg-linear-to-br from-blue-50 via-indigo-50 to-blue-100" />
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNiIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiIHN0cm9rZS13aWR0aD0iMiIvPjwvZz48L3N2Zz4=')] opacity-30" />

                    <div className="relative p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="p-1.5 bg-indigo-100 rounded-lg">
                          <LinkIcon className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-gray-900">Blockchain Verified</h4>
                          <p className="text-[10px] text-gray-500">Ethereum Sepolia Testnet</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 mb-3">
                        <div className="relative">
                          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center border border-indigo-200">
                            <svg viewBox="0 0 256 417" className="w-5 h-5" preserveAspectRatio="xMidYMid">
                              <path fill="#4F46E5" d="M127.961 0l-2.795 9.5v275.668l2.795 2.79 127.962-75.638z" opacity="0.8"/>
                              <path fill="#4F46E5" d="M127.962 0L0 212.32l127.962 75.639V154.158z" opacity="0.6"/>
                              <path fill="#4F46E5" d="M127.961 312.187l-1.575 1.92v98.199l1.575 4.6L256 236.587z" opacity="0.8"/>
                              <path fill="#4F46E5" d="M127.962 416.905v-104.72L0 236.585z" opacity="0.6"/>
                            </svg>
                          </div>
                          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse" />
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
                        className="group flex items-center justify-center gap-2 w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 rounded-lg border border-indigo-700 transition-all duration-300 hover:scale-[1.02]"
                      >
                        <span className="text-sm font-semibold text-white">View on Pinata</span>
                        <ExternalLink className="w-4 h-4 text-white/90 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                      </a>

                      <div className="flex items-center justify-center gap-1.5 mt-3">
                        <Shield className="w-3 h-3 text-green-600" />
                        <span className="text-[10px] text-gray-600">Immutable & Tamper-proof Records</span>
                      </div>
                    </div>
                  </motion.div>
                </div>
                )}
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex min-h-0 flex-1 flex-col bg-white border-r border-gray-200">
          <div className="flex h-16 items-center justify-center border-b bg-white px-4">
            <div className="flex items-center">
              <img src="https://swarajdesk.adityahota.online/logo.png" alt="SwarajDesk logo" className="h-8 w-8 mr-2" />
              <h1 className="text-xl font-bold text-purple-600">State Admin</h1>
            </div>
          </div>
          <div className="flex flex-1 flex-col overflow-y-auto">
            <nav className="flex-1 space-y-1 px-2 py-4">
              {navItems.map((item) => {
                const active = activeTab === item.tabKey
                return (
                  <button
                    key={item.name}
                    onClick={() => handleNavClick(item.tabKey)}
                    className={cn(
                      active
                        ? "bg-purple-50 border-r-2 border-purple-600 text-purple-700"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                      "group flex items-center px-2 py-2 text-sm font-medium rounded-md w-full text-left",
                    )}
                  >
                    <item.icon
                      className={cn(
                        active ? "text-purple-500" : "text-gray-400 group-hover:text-gray-500",
                        "mr-3 h-5 w-5 shrink-0",
                      )}
                    />
                    {item.name}
                  </button>
                )
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top navigation */}
        <div className="sticky top-0 z-10 flex h-16 shrink-0 bg-white border-b border-gray-200">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-6 w-6" />
            <span className="sr-only">Open sidebar</span>
          </Button>

          <div className="flex flex-1 justify-between px-4">
            <div className="flex flex-1 items-center">
              <h1 className="text-xl font-semibold text-gray-900">{getPageTitle()}</h1>
            </div>
            <div className="ml-4 flex items-center md:ml-6">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={adminData ? `/api/avatar/${adminData.id}` : '/placeholder.svg?height=32&width=32'} alt={adminData?.fullName || 'Admin'} />
                        <AvatarFallback>{adminData?.fullName ? adminData.fullName.split(' ').map(n=>n[0]).slice(0,2).join('') : 'AD'}</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end">
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{adminData?.fullName || 'Admin User'}</p>
                        <p className="text-xs leading-none text-muted-foreground">{adminData?.officialEmail || '—'}</p>
                      </div>
                    </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => {
                    // Client-only logout: clear localStorage and redirect
                    try { localStorage.removeItem('token'); localStorage.removeItem('admin'); localStorage.removeItem('adminType'); } catch {}
                    try { window.dispatchEvent(new Event('authChange')) } catch {}
                    router.push('/')
                  }}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1">{children}</main>
      </div>
    </div>
  )
}
