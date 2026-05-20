"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { UserPlus, Eye, EyeOff, Loader2 } from "lucide-react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"

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
]

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Puducherry", "Chandigarh"
]

type AdminType = "STATE_ADMIN" | "MUNICIPAL_ADMIN"

interface AddAdminFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

export function AddAdminForm({ onSuccess, onCancel }: AddAdminFormProps) {
  const [adminType, setAdminType] = useState<AdminType>("STATE_ADMIN")
  const [formData, setFormData] = useState({
    fullName: "",
    officialEmail: "",
    phoneNumber: "",
    department: "",
    state: "",
    municipality: "",
    password: "",
    confirmPassword: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setError("")
    setSuccess("")
  }

  const handleAdminTypeChange = (type: AdminType) => {
    setAdminType(type)
    setFormData({
      fullName: "",
      officialEmail: "",
      phoneNumber: "",
      department: "",
      state: "",
      municipality: "",
      password: "",
      confirmPassword: "",
    })
    setError("")
    setSuccess("")
  }

  const validateForm = () => {
    if (!formData.fullName || formData.fullName.length < 2) {
      setError("Full name must be at least 2 characters")
      return false
    }
    if (!formData.officialEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.officialEmail)) {
      setError("Please enter a valid official email")
      return false
    }
    if (!formData.phoneNumber || formData.phoneNumber.length < 10) {
      setError("Phone number must be at least 10 digits")
      return false
    }
    if (!formData.department) {
      setError("Please select a department")
      return false
    }
    if (adminType === "STATE_ADMIN" && !formData.state) {
      setError("Please select a state")
      return false
    }
    if (adminType === "MUNICIPAL_ADMIN" && (!formData.municipality || formData.municipality.length < 2)) {
      setError("Municipality is required")
      return false
    }
    if (!formData.password || formData.password.length < 8) {
      setError("Password must be at least 8 characters")
      return false
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setLoading(true)
    setError("")
    setSuccess("")

    try {
      const token = localStorage.getItem("token")
      if (!token) {
        setError("Not authenticated. Please login again.")
        setLoading(false)
        return
      }

      const endpoint = adminType === "STATE_ADMIN" 
        ? `${API_URL}/api/super-admin/create/state-admins`
        : `${API_URL}/api/super-admin/create/municipal-admins`

      const body = adminType === "STATE_ADMIN" 
        ? {
            fullName: formData.fullName,
            officialEmail: formData.officialEmail,
            phoneNumber: formData.phoneNumber,
            department: formData.department,
            state: formData.state,
            password: formData.password,
            managedMunicipalities: [],
          }
        : {
            fullName: formData.fullName,
            officialEmail: formData.officialEmail,
            phoneNumber: formData.phoneNumber,
            department: formData.department,
            municipality: formData.municipality,
            password: formData.password,
          }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (data.success) {
        const adminLabel = adminType === "STATE_ADMIN" ? "State Admin" : "Municipal Admin"
        setSuccess(`${adminLabel} created successfully!`)
        setFormData({
          fullName: "",
          officialEmail: "",
          phoneNumber: "",
          department: "",
          state: "",
          municipality: "",
          password: "",
          confirmPassword: "",
        })
        onSuccess?.()
      } else {
        setError(data.message || "Failed to create admin")
      }
    } catch (err) {
      console.error("Error creating admin:", err)
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto bg-white border border-gray-200 shadow-sm">
      <CardHeader className="bg-gradient-to-r from-red-600 to-orange-500 text-white rounded-t-lg">
        <div className="flex items-center gap-2">
          <UserPlus className="h-6 w-6" />
          <div>
            <CardTitle className="text-xl">Create New Admin</CardTitle>
            <CardDescription className="text-red-100">
              Fill in the required details
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 text-sm text-green-600 bg-green-50 border border-green-200 rounded-md">
              {success}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-gray-700">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Enter full name"
                value={formData.fullName}
                onChange={(e) => handleInputChange("fullName", e.target.value)}
                className="border-gray-300 focus:border-red-500 focus:ring-red-500"
              />
            </div>

            {/* Official Email */}
            <div className="space-y-2">
              <Label htmlFor="officialEmail" className="text-gray-700">Official Email</Label>
              <Input
                id="officialEmail"
                type="email"
                placeholder="admin@gov.in"
                value={formData.officialEmail}
                onChange={(e) => handleInputChange("officialEmail", e.target.value)}
                className="border-gray-300 focus:border-red-500 focus:ring-red-500"
              />
            </div>

            {/* Phone Number */}
            <div className="space-y-2">
              <Label htmlFor="phoneNumber" className="text-gray-700">Phone Number</Label>
              <Input
                id="phoneNumber"
                type="tel"
                placeholder="Enter phone number"
                value={formData.phoneNumber}
                onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
                className="border-gray-300 focus:border-red-500 focus:ring-red-500"
              />
            </div>

            {/* Access Level / Admin Type */}
            <div className="space-y-2">
              <Label htmlFor="adminType" className="text-gray-700">Access Level</Label>
              <Select
                value={adminType}
                onValueChange={(value) => handleAdminTypeChange(value as AdminType)}
              >
                <SelectTrigger className="border-gray-300 focus:border-red-500 focus:ring-red-500">
                  <SelectValue placeholder="Select admin type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STATE_ADMIN">State Admin</SelectItem>
                  <SelectItem value="MUNICIPAL_ADMIN">Municipal Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Department */}
            <div className="space-y-2">
              <Label htmlFor="department" className="text-gray-700">Department</Label>
              <Select
                value={formData.department}
                onValueChange={(value) => handleInputChange("department", value)}
              >
                <SelectTrigger className="border-gray-300 focus:border-red-500 focus:ring-red-500">
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

            {/* State (for State Admin) */}
            {adminType === "STATE_ADMIN" && (
              <div className="space-y-2">
                <Label htmlFor="state" className="text-gray-700">State</Label>
                <Select
                  value={formData.state}
                  onValueChange={(value) => handleInputChange("state", value)}
                >
                  <SelectTrigger className="border-gray-300 focus:border-red-500 focus:ring-red-500">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDIAN_STATES.map((state) => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Municipality (for Municipal Admin) */}
            {adminType === "MUNICIPAL_ADMIN" && (
              <div className="space-y-2">
                <Label htmlFor="municipality" className="text-gray-700">Municipality</Label>
                <Input
                  id="municipality"
                  type="text"
                  placeholder="Enter municipality name"
                  value={formData.municipality}
                  onChange={(e) => handleInputChange("municipality", e.target.value)}
                  className="border-gray-300 focus:border-red-500 focus:ring-red-500"
                />
              </div>
            )}

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Min 8 characters"
                  value={formData.password}
                  onChange={(e) => handleInputChange("password", e.target.value)}
                  className="border-gray-300 focus:border-red-500 focus:ring-red-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-gray-700">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                  className="border-gray-300 focus:border-red-500 focus:ring-red-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Admin"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
