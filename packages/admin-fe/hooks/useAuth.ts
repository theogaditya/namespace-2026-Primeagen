"use client"

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

type AdminType = 'SUPER_ADMIN' | 'STATE_ADMIN' | 'MUNICIPAL_ADMIN' | 'AGENT'

interface AuthUser {
  id: string
  email: string
  accessLevel: string
  adminType: AdminType
  department?: string
}

interface UseAuthOptions {
  requiredAdminType?: AdminType | AdminType[]
  redirectTo?: string
}

interface UseAuthReturn {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
  error: string | null
  logout: () => void
}

export function useAuth(options: UseAuthOptions = {}): UseAuthReturn {
  const { requiredAdminType, redirectTo = '/' } = options
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('admin')
    localStorage.removeItem('adminType')
    router.push('/')
  }, [router])

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const token = localStorage.getItem('token')
        
        if (!token) {
          setError('No token found')
          setIsLoading(false)
          router.push(redirectTo)
          return
        }

        const res = await fetch('/api/auth/verify', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.message || 'Authentication failed')
        }

        const data = await res.json()
        
        if (!data.success || !data.user) {
          throw new Error('Invalid token')
        }

        const authUser: AuthUser = {
          id: data.user.id,
          email: data.user.email,
          accessLevel: data.user.accessLevel,
          adminType: data.user.adminType,
          department: data.user.department,
        }

        // Check if user has required admin type
        if (requiredAdminType) {
          const allowedTypes = Array.isArray(requiredAdminType) 
            ? requiredAdminType 
            : [requiredAdminType]
          
          if (!allowedTypes.includes(authUser.adminType)) {
            setError('Access denied. You do not have permission to access this page.')
            setIsLoading(false)
            // Redirect to their appropriate page or login
            router.push(redirectTo)
            return
          }
        }

        setUser(authUser)
        setError(null)
      } catch (err) {
        console.error('Auth verification failed:', err)
        setError(err instanceof Error ? err.message : 'Authentication failed')
        // Clear invalid token
        localStorage.removeItem('token')
        localStorage.removeItem('admin')
        localStorage.removeItem('adminType')
        router.push(redirectTo)
      } finally {
        setIsLoading(false)
      }
    }

    verifyAuth()
  }, [requiredAdminType, redirectTo, router])

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
    logout,
  }
}
