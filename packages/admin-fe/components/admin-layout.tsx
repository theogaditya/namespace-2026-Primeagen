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
  Shield,
  Menu,
  LogOut,
  User,
  X,
} from "lucide-react"
import Link from "next/link"
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

const navigation = [
  { name: "Dashboard", href: "/", icon: BarChart3, current: true },
  { name: "Complaints", href: "/users", icon: FileText, current: false },
  { name: "Reports & Reviews", href: "/reports", icon: Flag, current: false },
  { name: "Admin Settings", href: "/settings", icon: Settings, current: false },
  { name: "Roles & Permissions", href: "/roles", icon: Shield, current: false },
]

interface AdminLayoutProps {
  children: React.ReactNode
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [adminData, setAdminData] = useState<{ fullName?: string; officialEmail?: string; id?: string } | null>(null)
  const router = useRouter()

  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('admin') : null
      if (raw) {
        const parsed = JSON.parse(raw)
        setAdminData({ fullName: parsed.fullName || parsed.fullName || parsed.name, officialEmail: parsed.officialEmail || parsed.email, id: parsed.id })
      }
    } catch (err) {
      console.warn('Failed to parse admin from localStorage', err)
    }
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl">
            <div className="flex h-full flex-col">
              <div className="flex h-16 items-center justify-between border-b bg-white px-4">
                <h1 className="text-xl font-bold text-blue-600">SwarajDesK Agent</h1>
                <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
                  <X className="h-6 w-6" />
                </Button>
              </div>
              <nav className="flex-1 space-y-1 bg-white px-2 py-4">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      item.current
                        ? "bg-blue-50 border-r-2 border-blue-600 text-blue-700"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                      "group flex items-center px-2 py-2 text-sm font-medium rounded-md",
                    )}
                  >
                    <item.icon
                      className={cn(
                        item.current ? "text-blue-500" : "text-gray-400 group-hover:text-gray-500",
                        "mr-3 h-5 w-5 flex-shrink-0",
                      )}
                    />
                    {item.name}
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex min-h-0 flex-1 flex-col bg-white border-r border-gray-200">
          <div className="flex h-16 items-center justify-center border-b bg-white px-4">
            <h1 className="text-xl font-bold text-blue-600">SwarajDesk Agent</h1>
          </div>
          <div className="flex flex-1 flex-col overflow-y-auto">
            <nav className="flex-1 space-y-1 px-2 py-4">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    item.current
                      ? "bg-blue-50 border-r-2 border-blue-600 text-blue-700"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                    "group flex items-center px-2 py-2 text-sm font-medium rounded-md",
                  )}
                >
                  <item.icon
                    className={cn(
                      item.current ? "text-blue-500" : "text-gray-400 group-hover:text-gray-500",
                      "mr-3 h-5 w-5 flex-shrink-0",
                    )}
                  />
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top navigation */}
        <div className="sticky top-0 z-10 flex h-16 flex-shrink-0 bg-white border-b border-gray-200">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-6 w-6" />
            <span className="sr-only">Open sidebar</span>
          </Button>

          <div className="flex flex-1 justify-between px-4">
            <div className="flex flex-1">
              <div className="flex w-full md:ml-0">
                <div className="relative w-full text-gray-400 focus-within:text-gray-600">
                  {/* Search can be added here */}
                </div>
              </div>
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
                    <DropdownMenuItem onClick={async () => {
                      // Logout flow: attempt server-side invalidation then clear client state
                      try {
                        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
                        const adminType = typeof window !== 'undefined' ? localStorage.getItem('adminType') : null

                        if (adminType === 'SUPER_ADMIN') {
                          // super-admin logout endpoint clears cookie
                          await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/super-admin/logout`, { method: 'POST', credentials: 'include' })
                        } else if (token) {
                          // try to invalidate token on server if endpoint exists
                          try {
                            await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/users/logout`, {
                              method: 'POST',
                              headers: { Authorization: `Bearer ${token}` },
                            })
                          } catch (e) {
                            // ignore server errors; we'll still clear client state
                          }
                        }
                      } catch (err) {
                        console.warn('Logout error', err)
                      } finally {
                        // Clear client-side auth
                        try { localStorage.removeItem('token'); localStorage.removeItem('admin'); localStorage.removeItem('adminType'); } catch {}
                        // notify other tabs
                        try { window.dispatchEvent(new Event('authChange')) } catch {}
                        router.push('/')
                      }
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
