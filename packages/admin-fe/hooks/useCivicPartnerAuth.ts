"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002"

export interface CivicPartner {
  id: string
  orgId: string
  orgName: string
  officialEmail: string
  orgType: string
  registrationNo?: string
  state: string
  district?: string | null
  website?: string | null
  phoneNumber?: string | null
  accessLevel: string
  status: string
  isVerified: boolean
  verifiedAt?: string | null
  dateOfCreation: string
  lastLogin?: string | null
}

interface UseCivicPartnerAuthReturn {
  partner: CivicPartner | null
  isLoading: boolean
  isAuthenticated: boolean
  error: string | null
  logout: () => Promise<void>
}

export function useCivicPartnerAuth(): UseCivicPartnerAuthReturn {
  const router = useRouter()
  const [partner, setPartner] = useState<CivicPartner | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const logout = useCallback(async () => {
    try {
      await fetch(`/api/civic-partner/logout`, {
        method: "POST",
        credentials: "include",
      })
    } catch {
      // silent
    }
    localStorage.removeItem("civicPartner")
    localStorage.removeItem("adminType")
    router.push("/")
  }, [router])

  useEffect(() => {
    const verify = async () => {
      try {
        // CivicPartner auth uses httpOnly cookies. Use the local proxy so
        // cookies are forwarded server-side: `/api/civic-partner/me`.
        const res = await fetch(`/api/civic-partner/me`, {
          credentials: "include",
        })

        if (!res.ok) {
          throw new Error("Session expired")
        }

        const data = await res.json()
        if (!data.success || !data.partner) {
          throw new Error("Invalid session")
        }

        setPartner(data.partner)
        setError(null)
        // Also sync to localStorage for quick reads
        localStorage.setItem("civicPartner", JSON.stringify(data.partner))
      } catch (err) {
        console.error("[CivicPartner Auth]", err)
        setError(err instanceof Error ? err.message : "Authentication failed")
        localStorage.removeItem("civicPartner")
        localStorage.removeItem("adminType")
        router.push("/")
      } finally {
        setIsLoading(false)
      }
    }

    verify()
  }, [router])

  return { partner, isLoading, isAuthenticated: !!partner, error, logout }
}
