"use client"

import { useAuth } from '@/hooks/useAuth'
import { Loader2 } from 'lucide-react'

type AdminType = 'SUPER_ADMIN' | 'STATE_ADMIN' | 'MUNICIPAL_ADMIN' | 'AGENT'

interface AuthGuardProps {
  children: React.ReactNode
  requiredAdminType?: AdminType | AdminType[]
  redirectTo?: string
}

export function AuthGuard({ children, requiredAdminType, redirectTo = '/' }: AuthGuardProps) {
  const { isLoading, isAuthenticated, error } = useAuth({ requiredAdminType, redirectTo })

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-gray-600">Verifying authentication...</p>
        </div>
      </div>
    )
  }

  if (error || !isAuthenticated) {
    // The useAuth hook will handle the redirect, show loading state during redirect
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
