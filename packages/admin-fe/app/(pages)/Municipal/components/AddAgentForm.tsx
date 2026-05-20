"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Eye, EyeOff, UserPlus, Loader2, CheckCircle } from "lucide-react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"

// Department enum matching backend schema
const DEPARTMENTS = [
  { value: "INFRASTRUCTURE", label: "Infrastructure" },
  { value: "EDUCATION", label: "Education" },
  { value: "REVENUE", label: "Revenue" },
  { value: "HEALTH", label: "Health" },
  { value: "WATER_SUPPLY_SANITATION", label: "Water Supply & Sanitation" },
  { value: "ELECTRICITY_POWER", label: "Electricity & Power" },
  { value: "TRANSPORTATION", label: "Transportation" },
  { value: "MUNICIPAL_SERVICES", label: "Municipal Services" },
  { value: "POLICE_SERVICES", label: "Police Services" },
  { value: "ENVIRONMENT", label: "Environment" },
  { value: "HOUSING_URBAN_DEVELOPMENT", label: "Housing & Urban Development" },
  { value: "SOCIAL_WELFARE", label: "Social Welfare" },
  { value: "PUBLIC_GRIEVANCES", label: "Public Grievances" },
] as const

// Form data type matching backend agentSchema
interface AgentFormData {
  fullName: string
  email: string
  officialEmail: string
  phoneNumber: string
  password: string
  confirmPassword: string
  municipality: string
  department: string
}

interface AddAgentFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

export function AddAgentForm({ onSuccess, onCancel }: AddAgentFormProps) {
  const [formData, setFormData] = useState<AgentFormData>({
    fullName: "",
    email: "",
    officialEmail: "",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
    municipality: "",
    department: "",
  })

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const handleChange = (field: keyof AgentFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setError("")
  }

  const validateForm = (): string | null => {
    if (!formData.fullName.trim()) return "Full name is required"
    if (!formData.email.trim()) return "Email is required"
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return "Invalid email format"
    if (!formData.officialEmail.trim()) return "Official email is required"
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.officialEmail)) return "Invalid official email format"
    if (!formData.phoneNumber.trim()) return "Phone number is required"
    if (formData.password.length < 6) return "Password must be at least 6 characters"
    if (formData.password !== formData.confirmPassword) return "Passwords do not match"
    if (!formData.municipality.trim()) return "Municipality is required"
    if (!formData.department) return "Department is required"
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsSubmitting(true)

    try {
      const token = localStorage.getItem("token")
      if (!token) {
        setError("Not authenticated. Please login again.")
        return
      }

      // Send data matching backend agentSchema
      const response = await fetch(`${API_URL}/api/municipal-admin/create/agent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName: formData.fullName.trim(),
          email: formData.email.trim(),
          officialEmail: formData.officialEmail.trim(),
          phoneNumber: formData.phoneNumber.trim(),
          password: formData.password,
          municipality: formData.municipality.trim(),
          department: formData.department,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Failed to create agent")
      }

      setSuccess(true)
      
      // Reset form
      setFormData({
        fullName: "",
        email: "",
        officialEmail: "",
        phoneNumber: "",
        password: "",
        confirmPassword: "",
        municipality: "",
        department: "",
      })

      // Call success callback after delay
      setTimeout(() => {
        setSuccess(false)
        onSuccess?.()
      }, 2000)

    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      fullName: "",
      email: "",
      officialEmail: "",
      phoneNumber: "",
      password: "",
      confirmPassword: "",
      municipality: "",
      department: "",
    })
    setError("")
    setSuccess(false)
  }

  if (success) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Agent Created Successfully!</h3>
            <p className="text-gray-500 text-center">The new agent has been added to the system.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="border-b">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <UserPlus className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <CardTitle className="text-xl text-gray-900">Create New Agent</CardTitle>
            <CardDescription className="text-gray-500">
              Fill out the form to onboard a new municipal or department-level agent.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Row 1: Full Name & Email */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-gray-700 font-medium">
                Full Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Enter full name"
                value={formData.fullName}
                onChange={(e) => handleChange("fullName", e.target.value)}
                className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700 font-medium">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Personal email address"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Row 2: Official Email & Phone */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="officialEmail" className="text-gray-700 font-medium">
                Official Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="officialEmail"
                type="email"
                placeholder="official@gov.in"
                value={formData.officialEmail}
                onChange={(e) => handleChange("officialEmail", e.target.value)}
                className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber" className="text-gray-700 font-medium">
                Phone Number <span className="text-red-500">*</span>
              </Label>
              <Input
                id="phoneNumber"
                type="tel"
                placeholder="Enter phone number"
                value={formData.phoneNumber}
                onChange={(e) => handleChange("phoneNumber", e.target.value)}
                className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Row 3: Password & Confirm Password */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700 font-medium">
                Password <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Minimum 6 characters"
                  value={formData.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500 pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-gray-700 font-medium">
                Confirm Password <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange("confirmPassword", e.target.value)}
                  className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500 pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Row 4: Municipality & Department */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="municipality" className="text-gray-700 font-medium">
                Municipality <span className="text-red-500">*</span>
              </Label>
              <Input
                id="municipality"
                type="text"
                placeholder="Enter municipality name"
                value={formData.municipality}
                onChange={(e) => handleChange("municipality", e.target.value)}
                className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="department" className="text-gray-700 font-medium">
                Department <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.department}
                onValueChange={(value) => handleChange("department", value)}
              >
                <SelectTrigger className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map((dept) => (
                    <SelectItem key={dept.value} value={dept.value}>
                      {dept.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetForm()
                  onCancel()
                }}
                disabled={isSubmitting}
                className="px-6"
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="px-6 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Create Agent
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
