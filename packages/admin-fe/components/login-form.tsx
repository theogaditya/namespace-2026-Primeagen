"use client"

import * as React from "react"
import { Eye, EyeOff } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type AdminType = "SUPER_ADMIN" | "STATE_ADMIN" | "MUNICIPAL_ADMIN" | "AGENT"

const adminTypeLabels: Record<AdminType, string> = {
  SUPER_ADMIN: "Super Admin",
  STATE_ADMIN: "State Admin",
  MUNICIPAL_ADMIN: "Municipal Admin",
  AGENT: "Agent",
}

const adminTypeRoutes: Record<AdminType, string> = {
  SUPER_ADMIN: "/pages/Super",
  STATE_ADMIN: "/pages/State",
  MUNICIPAL_ADMIN: "/pages/Municipal",
  AGENT: "/pages/Agent",
}

export function LoginForm() {
  const router = useRouter()
  const [adminType, setAdminType] = React.useState<AdminType>("AGENT")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [error, setError] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [showPassword, setShowPassword] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            officialEmail: email,
            password,
            adminType,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Login failed")
      }

      if (data.success && data.token) {
        // Store token and admin data in localStorage
        localStorage.setItem("token", data.token)
        localStorage.setItem("adminType", data.adminType)
        localStorage.setItem("admin", JSON.stringify(data.admin))

        // Route to the appropriate page based on admin type
        router.push(adminTypeRoutes[data.adminType as AdminType])
      } else {
        throw new Error(data.message || "Login failed")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect to server")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto bg-white border border-gray-200 shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl text-gray-900">Login</CardTitle>
        <CardDescription className="text-gray-500">
          Enter your email below to login to your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm">
              {error}
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="adminType">Admin Type</Label>
            <Select
              value={adminType}
              onValueChange={(value) => setAdminType(value as AdminType)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select admin type" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(adminTypeLabels) as AdminType[]).map((type) => (
                  <SelectItem key={type} value={type}>
                    {adminTypeLabels[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="officer.name@municipality.gov"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your secure password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-3 flex items-center"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
                ) : (
                  <Eye className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
                )}
              </button>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Logging in..." : "Login"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
