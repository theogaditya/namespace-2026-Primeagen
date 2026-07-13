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
      const token = localStorage.getItem("token")
      await fetch(`${API_URL}/api/civic-partner/auth/logout`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
      })
    } catch {
      // silent
    }
    localStorage.removeItem("civicPartner")
    localStorage.removeItem("adminType")
    localStorage.removeItem("token")
    try {
      window.location.replace("/")
    } catch {
      router.push("/")
    }
  }, [router])

  useEffect(() => {
    // If a cached partner exists in localStorage, restore it immediately
    const rawCached = typeof window !== "undefined" ? localStorage.getItem("civicPartner") : null
    const hadCached = !!rawCached
    if (rawCached) {
      try {
        setPartner(JSON.parse(rawCached))
        setError(null)
      } catch {
        // ignore parse errors
      }
    }

    const verify = async () => {
      try {
        const token = localStorage.getItem("token")
        const res = await fetch(`${API_URL}/api/civic-partner/auth/me`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
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
        // If we had a cached partner, don't immediately force navigation
        // to the login page — keep the cached info available until a
        // real user action/refresh decides otherwise.
        if (!hadCached) {
          localStorage.removeItem("civicPartner")
          localStorage.removeItem("adminType")
          localStorage.removeItem("token")
          router.push("/")
        }
      } finally {
        setIsLoading(false)
      }
    }

    verify()
  }, [router])

  return { partner, isLoading, isAuthenticated: !!partner, error, logout }
}
