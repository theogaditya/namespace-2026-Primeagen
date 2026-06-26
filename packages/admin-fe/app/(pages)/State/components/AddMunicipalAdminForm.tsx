"use client"

import { useState } from "react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002"

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

interface MunicipalAdminFormData {
  fullName: string
  email: string
  officialEmail: string
  phoneNumber: string
  password: string
  confirmPassword: string
  municipality: string
  department: string
}

interface AddMunicipalAdminFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

export function AddMunicipalAdminForm({ onSuccess, onCancel }: AddMunicipalAdminFormProps) {
  const [formData, setFormData] = useState<MunicipalAdminFormData>({
    fullName: "", email: "", officialEmail: "", phoneNumber: "", password: "", confirmPassword: "", municipality: "", department: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const handleChange = (field: keyof MunicipalAdminFormData, value: string) => {
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
    if (validationError) { setError(validationError); return }

    setIsSubmitting(true)
    try {
      const token = localStorage.getItem("token")
      if (!token) { setError("Not authenticated. Please login again."); return }

      const res = await fetch(`${API_URL}/api/state-admin/create/municipal-admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
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

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "Failed to create municipal admin")

      setSuccess(true)
      setFormData({ fullName: "", email: "", officialEmail: "", phoneNumber: "", password: "", confirmPassword: "", municipality: "", department: "" })

      setTimeout(() => { setSuccess(false); onSuccess?.() }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormData({ fullName: "", email: "", officialEmail: "", phoneNumber: "", password: "", confirmPassword: "", municipality: "", department: "" })
    setError("")
    setSuccess(false)
  }

  // ─── Success State ─────────────────────────────────────────────
  if (success) {
    return (
      <div className="bg-white rounded-xl max-w-2xl mx-auto p-10 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
          <span className="material-symbols-outlined text-3xl text-emerald-600">check_circle</span>
        </div>
        <h3 className="text-xl font-black text-[#041627] tracking-tight mb-2">Municipal Admin Created Successfully!</h3>
        <p className="text-[#44474c] text-sm">The new admin has been added to the system.</p>
      </div>
    )
  }

  // ─── Form ──────────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-xl max-w-2xl mx-auto overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 bg-[#f3f4f5]/50 flex items-center gap-3">
        <div className="w-10 h-10 bg-[#d2e4fb] rounded-lg flex items-center justify-center">
          <span className="material-symbols-outlined text-[#115cb9]">person_add</span>
        </div>
        <div>
          <h3 className="text-lg font-bold text-[#041627] leading-tight">Create New Municipal Admin</h3>
          <p className="text-sm text-[#44474c] font-medium">Fill out the form to onboard a new municipal-level admin.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 bg-[#ffdad6] text-[#ba1a1a] px-4 py-3 rounded-lg text-sm font-medium">
            <span className="material-symbols-outlined text-lg">error</span>
            {error}
          </div>
        )}

        {/* Row 1: Name & Email */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <FormField label="Full Name" required>
            <input
              type="text" placeholder="Enter full name" value={formData.fullName}
              onChange={(e) => handleChange("fullName", e.target.value)}
              className="w-full h-11 px-4 rounded-lg bg-[#f3f4f5] text-[#191c1d] text-sm font-medium placeholder:text-[#74777d] outline-none focus:ring-2 focus:ring-[#115cb9]/30 transition-all"
            />
          </FormField>
          <FormField label="Email" required>
            <input
              type="email" placeholder="Personal email address" value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
              className="w-full h-11 px-4 rounded-lg bg-[#f3f4f5] text-[#191c1d] text-sm font-medium placeholder:text-[#74777d] outline-none focus:ring-2 focus:ring-[#115cb9]/30 transition-all"
            />
          </FormField>
        </div>

        {/* Row 2: Official Email & Phone */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <FormField label="Official Email" required>
            <input
              type="email" placeholder="official@gov.in" value={formData.officialEmail}
              onChange={(e) => handleChange("officialEmail", e.target.value)}
              className="w-full h-11 px-4 rounded-lg bg-[#f3f4f5] text-[#191c1d] text-sm font-medium placeholder:text-[#74777d] outline-none focus:ring-2 focus:ring-[#115cb9]/30 transition-all"
            />
          </FormField>
          <FormField label="Phone Number" required>
            <input
              type="tel" placeholder="Enter phone number" value={formData.phoneNumber}
              onChange={(e) => handleChange("phoneNumber", e.target.value)}
              className="w-full h-11 px-4 rounded-lg bg-[#f3f4f5] text-[#191c1d] text-sm font-medium placeholder:text-[#74777d] outline-none focus:ring-2 focus:ring-[#115cb9]/30 transition-all"
            />
          </FormField>
        </div>

        {/* Row 3: Password & Confirm */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <FormField label="Password" required>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"} placeholder="Minimum 6 characters" value={formData.password}
                onChange={(e) => handleChange("password", e.target.value)}
                className="w-full h-11 px-4 pr-11 rounded-lg bg-[#f3f4f5] text-[#191c1d] text-sm font-medium placeholder:text-[#74777d] outline-none focus:ring-2 focus:ring-[#115cb9]/30 transition-all"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 px-3 flex items-center text-[#74777d] hover:text-[#44474c]">
                <span className="material-symbols-outlined text-lg">{showPassword ? "visibility_off" : "visibility"}</span>
              </button>
            </div>
          </FormField>
          <FormField label="Confirm Password" required>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"} placeholder="Confirm password" value={formData.confirmPassword}
                onChange={(e) => handleChange("confirmPassword", e.target.value)}
                className="w-full h-11 px-4 pr-11 rounded-lg bg-[#f3f4f5] text-[#191c1d] text-sm font-medium placeholder:text-[#74777d] outline-none focus:ring-2 focus:ring-[#115cb9]/30 transition-all"
              />
              <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 right-0 px-3 flex items-center text-[#74777d] hover:text-[#44474c]">
                <span className="material-symbols-outlined text-lg">{showConfirmPassword ? "visibility_off" : "visibility"}</span>
              </button>
            </div>
          </FormField>
        </div>

        {/* Row 4: Municipality & Department */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <FormField label="Municipality" required>
            <input
              type="text" placeholder="Enter municipality name" value={formData.municipality}
              onChange={(e) => handleChange("municipality", e.target.value)}
              className="w-full h-11 px-4 rounded-lg bg-[#f3f4f5] text-[#191c1d] text-sm font-medium placeholder:text-[#74777d] outline-none focus:ring-2 focus:ring-[#115cb9]/30 transition-all"
            />
          </FormField>
          <FormField label="Department" required>
            <select
              value={formData.department}
              onChange={(e) => handleChange("department", e.target.value)}
              className="w-full h-11 px-4 rounded-lg bg-[#f3f4f5] text-[#191c1d] text-sm font-medium outline-none focus:ring-2 focus:ring-[#115cb9]/30 transition-all appearance-none cursor-pointer"
            >
              <option value="" className="text-[#74777d]">Select department</option>
              {DEPARTMENTS.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </FormField>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4">
          {onCancel && (
            <button
              type="button"
              onClick={() => { resetForm(); onCancel() }}
              disabled={isSubmitting}
              className="px-5 py-2.5 text-sm font-bold text-[#041627] bg-[#e1e3e4] rounded-lg hover:bg-[#d9dadb] transition-all disabled:opacity-50"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-[#041627] rounded-lg hover:bg-[#0a2844] transition-all disabled:opacity-50 active:scale-95"
          >
            {isSubmitting ? (
              <>
                <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
                Creating...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-lg">person_add</span>
                Create Admin
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── Helper ──────────────────────────────────────────────────────
function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold uppercase tracking-[0.05em] text-[#44474c]">
        {label} {required && <span className="text-[#ba1a1a]">*</span>}
      </label>
      {children}
    </div>
  )
}
