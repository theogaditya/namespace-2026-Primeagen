"use client"

import * as React from "react"
import Script from "next/script"
import { Eye, EyeOff, ShieldCheck } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type AdminType = "STATE_ADMIN" | "MUNICIPAL_ADMIN" | "AGENT" | "CIVIC_PARTNER"

const adminTypeLabels: Record<AdminType, string> = {
  STATE_ADMIN: "State Admin",
  MUNICIPAL_ADMIN: "Municipal Admin",
  AGENT: "Agent",
  CIVIC_PARTNER: "Civic Partner",
}

const adminTypeRoutes: Record<AdminType, string> = {
  STATE_ADMIN: "/State",
  MUNICIPAL_ADMIN: "/Municipal?tab=reports",
  AGENT: "/Agent",
  CIVIC_PARTNER: "/CivicPartner",
}

type LoginFormProps = {
  adminType?: AdminType
  onAdminTypeChange?: (t: AdminType) => void
  defaultEmail?: string
  defaultPassword?: string
}

export function LoginForm({ adminType: controlledAdminType, onAdminTypeChange, defaultEmail = "", defaultPassword = "" }: LoginFormProps) {
  const router = useRouter()
  const [adminType, setAdminType] = React.useState<AdminType>((controlledAdminType as AdminType) ?? "AGENT")
  const [email, setEmail] = React.useState(defaultEmail)
  const [password, setPassword] = React.useState(defaultPassword)
  const [error, setError] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [showPassword, setShowPassword] = React.useState(false)
  const [cfToken, setCfToken] = React.useState<string | null>(null)
  const turnstileRef = React.useRef<HTMLDivElement | null>(null)
  const widgetIdRef = React.useRef<number | null>(null)

  const isFirstRender = React.useRef(true)

  React.useEffect(() => {
    if (controlledAdminType && controlledAdminType !== adminType) {
      setAdminType(controlledAdminType)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controlledAdminType])

  React.useEffect(() => {
    if (defaultEmail) setEmail(defaultEmail)
  }, [defaultEmail])

  React.useEffect(() => {
    if (defaultPassword) setPassword(defaultPassword)
  }, [defaultPassword])

  React.useEffect(() => {
    // global callback for Turnstile (used by rendered widget)
    ;(window as any).onTurnstileSuccess = (token: string) => {
      setCfToken(token)
    }

    // If Turnstile script already loaded (navigated back), render the widget into the container
    try {
      const t = (window as any).turnstile
      if (t && turnstileRef.current && widgetIdRef.current === null) {
        // render returns a widget id
        widgetIdRef.current = t.render(turnstileRef.current, {
          sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITEKEY || "0x4AAAAAAC6QmeBE4MEqq_x7",
          callback: "onTurnstileSuccess",
          theme: "light",
        })
      }
    } catch (e) {
      // ignore
    }
  }, [])

  // Reset Turnstile when `adminType` or `showPassword` changes (after initial mount)
  React.useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    try {
      const t = (window as any).turnstile
      if (t) {
        if (widgetIdRef.current != null && typeof t.reset === "function") {
          try {
            t.reset(widgetIdRef.current)
          } catch (e) {
            try {
              t.reset()
            } catch (_) {
              // ignore
            }
          }
        } else if (typeof t.reset === "function") {
          try {
            t.reset()
          } catch (_) {
            // ignore
          }
        }
      }
    } catch (e) {
      // ignore
    }

    setCfToken(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminType, showPassword])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      // require Cloudflare Turnstile token
      if (!cfToken) {
        setError("Please complete the verification widget before submitting")
        setIsLoading(false)
        return
      }

      // verify Turnstile token with our server endpoint
      const verifyResp = await fetch("/api/turnstile/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: cfToken }),
      })
      const verifyData = await verifyResp.json()
      if (!verifyResp.ok || !verifyData.success) {
        throw new Error(verifyData.message || "Turnstile verification failed")
      }

      // Civic Partner uses a separate auth endpoint
      const isCivicPartner = adminType === "CIVIC_PARTNER"
      const loginUrl = isCivicPartner
        ? `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002"}/api/civic-partner/auth/login`
        : `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002"}/api/auth/login`

      const response = await fetch(loginUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(
          isCivicPartner
            ? { officialEmail: email, password }
            : { officialEmail: email, password, adminType }
        ),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Login failed")
      }

      if (isCivicPartner && data.success) {
        // Civic partner auth uses httpOnly cookies set by backend.
        // Store partner info for the frontend.
        localStorage.setItem("civicPartner", JSON.stringify(data.partner))
        localStorage.setItem("adminType", "CIVIC_PARTNER")
        router.push(adminTypeRoutes.CIVIC_PARTNER)
      } else if (data.success && data.token) {
        localStorage.setItem("token", data.token)
        localStorage.setItem("adminType", data.adminType)
        localStorage.setItem("admin", JSON.stringify(data.admin))
        router.push(adminTypeRoutes[data.adminType as AdminType])
      } else {
        throw new Error(data.message || "Login failed")
      }
    } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to connect to server")
        // Reset Turnstile widget and clear token so user can retry without refreshing
        try {
          const t = (window as any).turnstile
          // prefer resetting the specific widget if we have its id
          if (t) {
            if (widgetIdRef.current != null && typeof t.reset === "function") {
              try {
                t.reset(widgetIdRef.current)
              } catch (e) {
                // fallback to global reset
                try {
                  t.reset()
                } catch (_) {
                  // ignore
                }
              }
            } else if (typeof t.reset === "function") {
              try {
                t.reset()
              } catch (_) {
                // ignore
              }
            }
          }
        } catch (e) {
          // ignore
        }
        setCfToken(null)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full px-4 sm:px-6">
      <Card className="w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl mx-auto bg-white border-0 shadow-2xl rounded-3xl overflow-hidden">
        <div className="bg-linear-to-b from-blue-900 via-blue-800 to-blue-900 px-5 sm:px-6 pt-8 sm:pt-12 pb-6 sm:pb-8 text-center">
          <div className="flex justify-center mb-3">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-full p-2 shadow-lg flex items-center justify-center">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/5/55/Emblem_of_India.svg"
                alt="National Emblem of India"
                className="w-full h-full object-contain"
                loading="eager"
                fetchPriority="high"
                onError={(e) => {
                  const img = e.currentTarget as HTMLImageElement
                  if (!img.dataset.retry) {
                    img.dataset.retry = "1"
                    // reassign src to trigger a reload attempt
                    img.src = img.src
                  }
                }}
              />
            </div>
          </div>
          <h1 className="text-white text-lg sm:text-xl font-bold tracking-wide">भारत सरकार</h1>
          <p className="text-blue-200 text-xs sm:text-sm mt-1 font-medium tracking-wider">Government of India</p>
        </div>

        <CardHeader className="text-center pt-2 pb-2">
          <div className="flex items-center justify-center gap-2 mb-2">
            <ShieldCheck className="w-6 h-6 text-blue-800" />
            <CardTitle className="text-xl sm:text-2xl font-bold text-blue-900">Admin Portal</CardTitle>
          </div>
          <CardDescription className="text-gray-600">
            Authorized personnel only. Enter your credentials to access the portal.
          </CardDescription>
        </CardHeader>

        <CardContent className="px-4 sm:px-6 pb-6 sm:pb-8">
          <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="lazyOnload" />
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="adminType" className="text-gray-700 font-medium">
                Admin Type
              </Label>
              <div>
                <select
                  id="adminType"
                  value={adminType}
                  onChange={(e) => {
                    const v = e.target.value as AdminType
                    setAdminType(v)
                    if (onAdminTypeChange) onAdminTypeChange(v)
                  }}
                  className="h-10 sm:h-12 w-full bg-white border border-gray-300 rounded-xl px-3 pr-4 text-sm sm:text-base focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  {(Object.keys(adminTypeLabels) as AdminType[])
                    .slice()
                    .sort((a, b) => adminTypeLabels[a].localeCompare(adminTypeLabels[b]))
                    .map((type) => (
                      <option key={type} value={type}>
                        {adminTypeLabels[type]}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700 font-medium">
                Official Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="officer.name@gov.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-10 sm:h-12 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-xl text-sm sm:text-base"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700 font-medium">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your secure password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-10 sm:h-12 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500 pr-12 rounded-xl text-sm sm:text-base"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-3 flex items-center"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5 text-gray-400 hover:text-gray-600 transition-colors" />
                  ) : (
                    <Eye className="w-5 h-5 text-gray-400 hover:text-gray-600 transition-colors" />
                  )}
                </button>
              </div>
            </div>

            <div className="mt-2 flex justify-center">
              <div
                ref={turnstileRef}
                className="cf-turnstile"
                data-sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITEKEY || "0x4AAAAAAC6QmeBE4MEqq_x7"}
                data-callback="onTurnstileSuccess"
                data-theme="light"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-10 sm:h-12 bg-linear-to-r from-blue-800 to-blue-700 hover:from-blue-900 hover:to-blue-800 text-white font-semibold text-sm sm:text-base rounded-xl shadow-lg transition-all duration-200"
              disabled={isLoading || !cfToken}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Authenticating...
                </span>
              ) : (
                "Login to Portal"
              )}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-500 flex items-center justify-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                  clipRule="evenodd"
                />
              </svg>
              This is a secure government portal. Unauthorized access is prohibited.
            </p>
            <p className="text-xs text-gray-400 mt-2 font-medium">सत्यमेव जयते</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
