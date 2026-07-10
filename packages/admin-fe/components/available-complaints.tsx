"use client"

import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import 'leaflet/dist/leaflet.css'
import { MapContainer, Marker, TileLayer } from 'react-leaflet'
import L from 'leaflet'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Search, MoreHorizontal, Eye, UserPlus, User, FileText, Clock, AlertTriangle, CheckCircle, Sparkles, X, Flag, Users, Briefcase, GitCompare, Loader2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Modal } from "@/components/ui/modal"

// Use same-origin proxy so client calls avoid CORS with upstream AI service
const AI_API_URL = '/api/self-match'

interface OverviewStats {
  total: number
  registered: number
  inProgress: number
  resolved: number
  closed: number
  highPriority: number
  assigned: number
}

interface Complaint {
  id: string
  seq: number
  title: string
  description: string
  category: string
  subCategory: string
  status: string
  urgency: string
  department: string
  submissionDate: string
  lastUpdated: string
  attachmentUrl: string | null
  isPublic: boolean
  upvoteCount: number
  location: {
    district: string
    city: string
    locality: string
    street: string | null
    pin: string
    // optional coordinates if backend provides them
    latitude?: number | null
    longitude?: number | null
  } | null
  complainant: {
    id: string
    name: string
    email: string
    phone: string
  } | null
  assignedAgent?: {
    id: string
    name: string
    email: string
  } | null
  managedByMunicipalAdmin?: {
    id: string
    name: string
    email: string
  } | null
  escalationLevel?: string | null
  AIStandardizedSubcategory?: string | null
  // matches DB field casing from Prisma
  AIstandardizedSubCategory?: string | null
  isDuplicate?: boolean | null
}

// Use NEXT_PUBLIC_API_URL when provided, otherwise fallback to admin-be default port 4000
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'

export function AvailableComplaints() {
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [loading, setLoading] = useState(true)
  const [initialLoadDone, setInitialLoadDone] = useState(false)
  const [assigning, setAssigning] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  })
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'assigned' | 'unassigned' | 'escalated'>('all')
  const [urgencyFilter, setUrgencyFilter] = useState<'all' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [escalateFlag, setEscalateFlag] = useState(false)
  const [currentAdminId, setCurrentAdminId] = useState<string | null>(null)
  const [adminType, setAdminType] = useState<string | null>(null)
  const [overviewStats, setOverviewStats] = useState<OverviewStats>({ total: 0, registered: 0, inProgress: 0, resolved: 0, closed: 0, highPriority: 0, assigned: 0 })
  // Random 3-digit number for "Complaints Solved" – generated once per mount
  const [randomSolved] = useState<number>(() => Math.floor(Math.random() * 900) + 100)

  // ── Complaint Verification Modal (image-based, required before marking COMPLETED) ──
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false)
  const [verificationFile, setVerificationFile] = useState<File | null>(null)
  const [verificationPreview, setVerificationPreview] = useState<string | null>(null)
  const [verificationUrlInput, setVerificationUrlInput] = useState<string>('')
  const [verificationLoading, setVerificationLoading] = useState(false)
  const [verificationResult, setVerificationResult] = useState<{ match: boolean; confidence: number; reason: string; description?: string; accuracy?: number } | null>(null)
  const [verificationError, setVerificationError] = useState<string | null>(null)
  const [verificationDragging, setVerificationDragging] = useState(false)
  const verificationFileRef = useRef<HTMLInputElement>(null)
  // Pending status/endpoint to use after verification passes
  const [pendingVerificationStatus, setPendingVerificationStatus] = useState<string | null>(null)
  const [pendingVerificationEndpoint, setPendingVerificationEndpoint] = useState<string | null>(null)

  const handleVerificationFile = (file: File) => {
    setVerificationFile(file)
    setVerificationResult(null)
    setVerificationError(null)
    const reader = new FileReader()
    reader.onload = (e) => setVerificationPreview(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleVerificationDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setVerificationDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) handleVerificationFile(file)
  }, [])

  const handleVerificationAnalyse = async () => {
    if (!selectedComplaint?.attachmentUrl || (!verificationFile && !verificationPreview)) return
    setVerificationLoading(true)
    setVerificationResult(null)
    setVerificationError(null)
    try {
      let data: any = null
      if (verificationFile) {
        const fd = new FormData()
        fd.append('imageUrl1', selectedComplaint.attachmentUrl)
        fd.append('image2', verificationFile)
        const res = await fetch(AI_API_URL, { method: 'POST', body: fd })
        data = await res.json()
      } else if (verificationPreview && /^https?:\/\//.test(verificationPreview)) {
        const res = await fetch(AI_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl1: selectedComplaint.attachmentUrl, imageUrl2: verificationPreview }),
        })
        data = await res.json()
      } else {
        throw new Error('Provide a verification image file or a reachable image URL')
      }
      if (data.success) {
        setVerificationResult({
          match: data.match,
          confidence: data.confidence,
          reason: data.reason || data.description || '',
          accuracy: typeof data.accuracy === 'number' ? data.accuracy : data.confidence,
          description: data.description || data.reason || '',
        })
      } else {
        setVerificationError(data.error || 'Comparison failed')
      }
    } catch (err: any) {
      setVerificationError(err?.message || 'Network error connecting to verification server')
    } finally {
      setVerificationLoading(false)
    }
  }

  const handleConfirmVerifiedCompletion = async () => {
    if (!pendingVerificationEndpoint || !pendingVerificationStatus) return
    setStatusUpdating(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) throw new Error('Not authenticated')
      const res = await fetch(pendingVerificationEndpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: pendingVerificationStatus }),
      })
      const body = await res.json()
      if (!res.ok) {
        alert(body.message || 'Unable to update the complaint status at this time')
      } else {
        const updated = body.complaint
        setComplaints((prev) => prev.map((c) => (c.id === updated.id ? { ...c, status: updated.status } : c)))
        setSelectedComplaint((prev) => prev ? { ...prev, status: updated.status } : prev)
        alert(body.message || 'Complaint marked as Completed successfully')
        setIsVerificationModalOpen(false)
        // reset verification state
        setVerificationFile(null)
        setVerificationPreview(null)
        setVerificationResult(null)
        setVerificationError(null)
        setVerificationUrlInput('')
        setPendingVerificationStatus(null)
        setPendingVerificationEndpoint(null)
      }
    } catch (err: any) {
      alert(err?.message || 'Unable to update the complaint status')
    } finally {
      setStatusUpdating(false)
    }
  }

  // Comparison modal state
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false)
  const [compareLoading, setCompareLoading] = useState(false)
  const [compareResult, setCompareResult] = useState<{ match: boolean; confidence: number; reason: string } | null>(null)
  const [compareError, setCompareError] = useState<string | null>(null)
  const [customCompareUrl, setCustomCompareUrl] = useState('')
  const [activeCompareUrl, setActiveCompareUrl] = useState('')

  // Reference images for comparison (one for each of the top 3 complaints)
  const referenceImages = [
    'https://pub-a7deba7d0b9642f8afcfd3aebbcb446f.r2.dev/uploads/1765265732822_pothole_2.jpg', // 1st complaint
    'https://pub-a7deba7d0b9642f8afcfd3aebbcb446f.r2.dev/uploads/1765265732822_pothole_2.jpg', // 2nd complaint
    'https://pub-a7deba7d0b9642f8afcfd3aebbcb446f.r2.dev/uploads/1765271481362_brokenwall_1.png', // 3rd complaint
  ]

  // Recent complaints with images (top 3 for comparison feature)
  const recentComplaintsWithImages = useMemo(() => {
    return complaints
      .filter((c) => c.attachmentUrl)
      .sort((a, b) => new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime())
      .slice(0, 3)
  }, [complaints])

  // Map complaint ID to its reference image URL
  const complaintReferenceMap = useMemo(() => {
    const map = new Map<string, string>()
    recentComplaintsWithImages.forEach((c, index) => {
      map.set(c.id, referenceImages[index] || referenceImages[0])
    })
    return map
  }, [recentComplaintsWithImages])

  // Set of IDs for complaints eligible for comparison
  const compareEligibleIds = useMemo(() => {
    return new Set(recentComplaintsWithImages.map((c) => c.id))
  }, [recentComplaintsWithImages])

  // Get reference image for a specific complaint
  const getReferenceImageForComplaint = (complaintId: string) => {
    return complaintReferenceMap.get(complaintId) || referenceImages[0]
  }

  const fetchAvailableComplaints = async (showLoader = true) => {
    if (showLoader) setLoading(true)
    try {
      const token = localStorage.getItem("token")
      if (!token) {
        setLoading(false)
        return
      }

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      })

      if (searchTerm) {
        params.append("search", searchTerm)
      }

      const response = await fetch(`${API_URL}/api/complaints/all-complaints?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (data.success) {
        // Filter out duplicate complaints flagged by the backend
        const filtered = (data.data as any[]).filter((c) => !c.isDuplicate)

        // Adjust pagination total to account for filtered duplicates on this page
        const duplicatesOnPage = (data.data as any[]).length - filtered.length
        const adjustedTotal = Math.max(0, (data.pagination?.total ?? filtered.length) - duplicatesOnPage)
        const adjustedTotalPages = Math.max(1, Math.ceil(adjustedTotal / pagination.limit))

        setComplaints(filtered)
        setPagination((prev) => ({
          ...prev,
          total: adjustedTotal,
          totalPages: adjustedTotalPages,
        }))
      }
    } catch (error) {
      console.error("Error fetching available complaints:", error)
    } finally {
      setLoading(false)
      setInitialLoadDone(true)
    }
  }

  useEffect(() => {
    fetchAvailableComplaints()
    fetchOverviewStats()
  }, [pagination.page])

  const fetchOverviewStats = async () => {
    try {
      const token = localStorage.getItem("token")
      if (!token) return

      const response = await fetch(`${API_URL}/api/complaints/stats/overview`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (data.success) {
        setOverviewStats(data.data)
      }
    } catch (error) {
      console.error("Error fetching overview stats:", error)
    }
  }

  useEffect(() => {
    try {
      const adminRaw = localStorage.getItem('admin')
      if (adminRaw) {
        const adminObj = JSON.parse(adminRaw)
        setCurrentAdminId(adminObj?.id || adminObj?.userId || adminObj?.adminId || null)
        setAdminType(adminObj?.adminType || localStorage.getItem('adminType') || null)
      }
    } catch (err) {
      // ignore parse errors
    }
  }, [])

  useEffect(() => {
    // Skip the initial render - the pagination.page effect handles the first load
    if (!initialLoadDone) return

    const debounce = setTimeout(() => {
      if (pagination.page === 1) {
        // Don't show loading skeleton for search - just update data silently
        fetchAvailableComplaints(false)
      } else {
        setPagination((prev) => ({ ...prev, page: 1 }))
      }
    }, 300)

    return () => clearTimeout(debounce)
  }, [searchTerm])

  const handleAssignToMe = async (complaintId: string) => {
    try {
      setAssigning(complaintId)
      const token = localStorage.getItem("token")
      if (!token) return

      const response = await fetch(`${API_URL}/api/agent/complaints/${complaintId}/assign`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (response.ok) {
        // Remove the assigned complaint from the list
        setComplaints((prev) => prev.filter((c) => c.id !== complaintId))
        setPagination((prev) => ({ ...prev, total: prev.total - 1 }))
      } else {
        console.error("Failed to assign complaint:", data.message)
        alert(data.message || "Failed to assign complaint")
      }
    } catch (error) {
      console.error("Error assigning complaint:", error)
      alert("Failed to assign complaint")
    } finally {
      setAssigning(null)
    }
  }

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case "CRITICAL":
        return <Badge className="bg-red-100 text-red-800">Critical</Badge>
      case "HIGH":
        return <Badge className="bg-yellow-100 text-yellow-800">High</Badge>
      case "MEDIUM":
        return <Badge className="bg-amber-100 text-amber-800">Medium</Badge>
      case "LOW":
        return <Badge className="bg-green-100 text-green-800">Low</Badge>
      default:
        return <Badge variant="secondary">{urgency}</Badge>
    }
  }

  const toTitle = (s: string | undefined) => {
    if (!s) return ''
    return s
      .toLowerCase()
      .split(/_|\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  }

  const formatLocation = (loc: Complaint['location'] | null | undefined) => {
    if (!loc) return ''
    const parts: string[] = []
    if (loc.locality) parts.push(loc.locality)
    if (loc.street) parts.push(loc.street)
    if (loc.city) parts.push(loc.city)
    if (loc.district) parts.push(loc.district)
    if (loc.pin) parts.push(loc.pin)
    return parts.join(', ')
  }

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'UNDER_PROCESSING':
        return <Badge className="bg-yellow-100 text-yellow-800">Under Processing</Badge>
      case 'FORWARDED':
        return <Badge className="bg-violet-100 text-violet-800">Forwarded</Badge>
      case 'ON_HOLD':
        return <Badge className="bg-gray-100 text-gray-800">On Hold</Badge>
      case 'COMPLETED':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>
      case 'REJECTED':
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>
      case 'ESCALATED_TO_MUNICIPAL_LEVEL':
        return <Badge className="bg-orange-100 text-orange-800">Escalated (Municipal)</Badge>
      case 'ESCALATED_TO_STATE_LEVEL':
        return <Badge className="bg-orange-100 text-orange-800">Escalated (State)</Badge>
      case 'DELETED':
        return <Badge className="bg-muted text-muted-foreground">Deleted</Badge>
      default:
        return status ? <Badge variant="secondary">{toTitle(status)}</Badge> : null
    }
  }

  const getDepartmentBadge = (department?: string) => {
    if (!department) return null
    switch (department) {
      case 'INFRASTRUCTURE':
      case 'WATER_SUPPLY_SANITATION':
      case 'ELECTRICITY_POWER':
      case 'MUNICIPAL_SERVICES':
      case 'POLICE_SERVICES':
        return <Badge className="bg-indigo-100 text-indigo-800">{toTitle(department)}</Badge>
      case 'EDUCATION':
      case 'HEALTH':
      case 'SOCIAL_WELFARE':
        return <Badge className="bg-emerald-100 text-emerald-800">{toTitle(department)}</Badge>
      case 'REVENUE':
      case 'HOUSING_URBAN_DEVELOPMENT':
      case 'TRANSPORTATION':
      case 'PUBLIC_GRIEVANCES':
        return <Badge className="bg-amber-100 text-amber-800">{toTitle(department)}</Badge>
      case 'ENVIRONMENT':
        return <Badge className="bg-green-100 text-green-800">{toTitle(department)}</Badge>
      default:
        return <Badge variant="secondary">{toTitle(department)}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  // compute critical-only count from fetched complaints (frontend source of truth)
  const criticalCount = complaints.filter((c) => c.urgency === 'CRITICAL').length

  const stats = [
    {
      title: "TOTAL REGISTERED",
      value: pagination.total.toString(),
      subtitle: `${new Date().getFullYear()} YTD`,
      icon: Briefcase,
      bgColor: "bg-blue-600",
      iconBg: "bg-blue-500",
    },
    {
      title: "HIGH PRIORITY",
      // Use critical-only count derived from the fetched complaints list
      value: criticalCount.toString(),
      subtitle: "Needs attention",
      trend: criticalCount > 0 ? "↑ Urgent" : "",
      trendColor: "text-red-200",
      icon: AlertTriangle,
      bgColor: "bg-amber-500",
      iconBg: "bg-amber-400",
    },
    {
      title: "ASSIGNED",
      value: overviewStats.assigned.toString(),
      subtitle: "In progress",
      icon: Users,
      bgColor: "bg-emerald-600",
      iconBg: "bg-emerald-500",
    },
    {
      title: "ESCALATED",
      value: complaints.filter((c) =>
        c.status?.includes('ESCALATED') ||
        !!c.managedByMunicipalAdmin?.id ||
        !!c.escalationLevel
      ).length.toString(),
      subtitle: "⚠ Awaiting Review",
      icon: Clock,
      bgColor: "bg-slate-700",
      iconBg: "bg-slate-600",
    },
  ]

  const displayedComplaints = complaints.filter((complaint) => {
    // Urgency filter
    if (urgencyFilter !== 'all' && complaint.urgency !== urgencyFilter) return false

    // Assignment filter
    if (assignmentFilter === 'all') return true
    if (assignmentFilter === 'assigned') return !!complaint.assignedAgent?.id || !!complaint.managedByMunicipalAdmin?.id
    if (assignmentFilter === 'unassigned') return !complaint.assignedAgent?.id && !complaint.managedByMunicipalAdmin?.id
    if (assignmentFilter === 'escalated') return (
      !!complaint.managedByMunicipalAdmin?.id ||
      !!complaint.escalationLevel ||
      (complaint.status && complaint.status.toString().includes('ESCALATED'))
    )
    return true
  })

  // Compare images function - takes both complaint image URL and reference image URL
  const handleCompareImages = async (complaintImageUrl: string, referenceImageUrl: string) => {
    if (!complaintImageUrl || !referenceImageUrl) return
    setCompareLoading(true)
    setCompareResult(null)
    setCompareError(null)
    setActiveCompareUrl(referenceImageUrl)

    try {
      const response = await fetch(AI_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl1: complaintImageUrl,
          imageUrl2: referenceImageUrl,
        }),
      })
      const data = await response.json()
      if (data.success) {
        setCompareResult({
          match: data.match,
          confidence: data.confidence,
          reason: data.reason,
        })
      } else {
        setCompareError(data.error || 'Comparison failed')
      }
    } catch (err: any) {
      setCompareError(err?.message || 'Network error')
    } finally {
      setCompareLoading(false)
    }
  }

  const getHeaderTitle = () => {
    switch (assignmentFilter) {
      case 'unassigned':
        return 'Unassigned Complaints'
      case 'assigned':
        return 'Assigned Complaints'
      case 'escalated':
        return 'Escalated Complaints'
      case 'all':
      default:
        return 'Complaints'
    }
  }

  const getHeaderDescription = () => {
    switch (assignmentFilter) {
      case 'unassigned':
        return 'Complaints yet to be assigned to any agent or municipal admin'
      case 'assigned':
        return 'Complaints currently assigned to agents or municipal admins'
      case 'escalated':
        return 'Complaints escalated to higher authorities'
      case 'all':
      default:
        return 'Overview of all complaints on the platform'
    }
  }

  // Escalation / assignment derived flags (used by modal controls)
  const isAssignedToMunicipal = !!selectedComplaint?.managedByMunicipalAdmin?.id
  const isAssignedToCurrentAgent = !!(
    selectedComplaint?.assignedAgent?.id && currentAdminId && selectedComplaint.assignedAgent.id === currentAdminId
  )
  const escalateDisabled = statusUpdating || !selectedComplaint || (!isAssignedToCurrentAgent && !isAssignedToMunicipal)

  // Determine whether the logged-in user can update status for a complaint
  const canUpdateStatus = (complaint: Complaint | null) => {
    if (!complaint) return false
    // Municipal admin and higher can update any complaint
    if (adminType === 'MUNICIPAL_ADMIN' || adminType === 'STATE_ADMIN' || adminType === 'SUPER_ADMIN') return true
    // Agents can update only if currently assigned to them
    if (adminType === 'AGENT') {
      return !!(complaint.assignedAgent?.id && currentAdminId && complaint.assignedAgent.id === currentAdminId)
    }
    return false
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        {/* <h1 className="text-2xl font-bold text-gray-900">Complaints Management</h1> */}
        <p className="text-gray-600">Manage and track all complaints on the platform</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading ? (
          // Skeleton loading state for stats cards
          [...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-200 rounded-2xl p-6 shadow-lg relative overflow-hidden animate-pulse">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />

              <div className="relative flex items-start justify-between">
                <div className="space-y-3">
                  <div className="h-3 bg-gray-300 rounded w-24"></div>
                  <div className="h-10 bg-gray-300 rounded w-16"></div>
                  <div className="h-4 bg-gray-300 rounded w-20 mt-2"></div>
                </div>
                <div className="bg-gray-300 p-3 rounded-xl h-12 w-12"></div>
              </div>
            </div>
          ))
        ) : (
          stats.map((stat) => (
            <div key={stat.title} className={`${stat.bgColor} rounded-2xl p-6 text-white shadow-lg relative overflow-hidden`}>
              {/* Background decoration */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

              <div className="relative flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-semibold tracking-wider text-white/80 uppercase">{stat.title}</p>
                  <p className="text-4xl font-bold tracking-tight">{stat.value}</p>
                  <p className="text-sm text-white/70 mt-2">
                    {stat.trend && <span className={stat.trendColor}>{stat.trend} </span>}
                    {stat.subtitle}
                  </p>
                </div>
                <div className={`${stat.iconBg} p-3 rounded-xl shadow-md`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Recent Complaints with Images - For Comparison */}
      {recentComplaintsWithImages.length > 0 && (
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <GitCompare className="h-5 w-5 text-green-600" />
              <CardTitle className="text-lg">Recent Complaints with Images</CardTitle>
            </div>
            <CardDescription>
              Compare these recent complaints against the reference image to detect duplicates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recentComplaintsWithImages.map((complaint) => (
                <div
                  key={complaint.id}
                  className="bg-white rounded-lg border border-green-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Image Preview */}
                  <div className="aspect-video relative bg-gray-100">
                    <img
                      src={complaint.attachmentUrl!}
                      alt={complaint.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder.svg'
                      }}
                    />
                    <Badge className="absolute top-2 right-2 bg-green-600 text-white">
                      #{complaint.seq}
                    </Badge>
                  </div>
                  {/* Complaint Info */}
                  <div className="p-3 space-y-2">
                    <h4 className="font-medium text-sm line-clamp-1">{complaint.title || complaint.subCategory}</h4>
                    <p className="text-xs text-gray-500 line-clamp-2">{complaint.description}</p>
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-2">
                        {getUrgencyBadge(complaint.urgency)}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-green-500 hover:bg-green-600 text-white border-green-500 hover:border-green-600 text-xs"
                        onClick={() => {
                          const complaintImg = complaint.attachmentUrl!
                          const refImg = getReferenceImageForComplaint(complaint.id)
                          setSelectedComplaint(complaint)
                          setCompareResult(null)
                          setCompareError(null)
                          setCustomCompareUrl('')
                          setActiveCompareUrl(refImg)
                          setIsCompareModalOpen(true)
                          handleCompareImages(complaintImg, refImg)
                        }}
                      >
                        <GitCompare className="h-3 w-3 mr-1" />
                        Compare
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* Reference Images Info */}
            <div className="mt-4 p-3 bg-white rounded-lg border border-green-200">
              <p className="text-xs text-gray-500 mb-2">
                <span className="font-medium text-gray-700">Reference Images:</span> Each complaint above is compared against its specific reference image.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Complaints Table */}
      <Card>
        <CardHeader>
          <CardTitle>{getHeaderTitle()}</CardTitle>
          <CardDescription>{getHeaderDescription()}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by complaint ID, title, category, or location"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={assignmentFilter} onValueChange={(v) => setAssignmentFilter(v as any)}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Complaints</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="escalated">Escalated</SelectItem>
              </SelectContent>
            </Select>
            <Select value={urgencyFilter} onValueChange={(v) => setUrgencyFilter(v as any)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="CRITICAL">Critical</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Complaint</TableHead>
                  <TableHead>Urgency</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Registerd</TableHead>
                  <TableHead className="text-center align-middle">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <>
                    {[...Array(5)].map((_, i) => (
                      <TableRow key={i} className="animate-pulse">
                        <TableCell>
                          <div className="space-y-2">
                            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="h-6 bg-gray-200 rounded w-24"></div>
                        </TableCell>
                        <TableCell>
                          <div className="h-6 bg-gray-200 rounded w-16"></div>
                        </TableCell>
                        <TableCell>
                          <div className="h-4 bg-gray-200 rounded w-20"></div>
                        </TableCell>
                        <TableCell>
                          <div className="h-4 bg-gray-200 rounded w-24"></div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="h-8 bg-gray-200 rounded w-20 mx-auto"></div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                ) : displayedComplaints.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                      No complaints match your criteria
                    </TableCell>
                  </TableRow>
                ) : (
                  displayedComplaints.map((complaint) => (
                    <TableRow key={complaint.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium text-gray-900 line-clamp-2">{complaint.description}</div>
                          <div className="text-sm text-gray-500">
                            #{complaint.seq} • {complaint.category}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {getDepartmentBadge((complaint as any).department)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getUrgencyBadge(complaint.urgency)}</TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {complaint.location ? (
                          <span>{formatLocation(complaint.location) || 'N/A'}</span>
                        ) : (
                          "N/A"
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {formatDate(complaint.submissionDate)}
                      </TableCell>
                      <TableCell className="text-center align-middle">
                        {(!complaint.assignedAgent?.id && !complaint.managedByMunicipalAdmin?.id) ? (
                          // Two actions available -> keep dropdown
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem className="group" onClick={() => { setSelectedComplaint(complaint); setSelectedStatus(complaint.status || null); setEscalateFlag(false); setIsModalOpen(true); }}>
                                <Eye className="mr-2 h-4 w-4 text-blue-500 group-hover:text-black transition-colors" />
                                View details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleAssignToMe(complaint.id)}
                                className={assigning === complaint.id ? "opacity-50 pointer-events-none" : ""}
                              >
                                <UserPlus className="mr-2 h-4 w-4" />
                                {assigning === complaint.id ? "Claiming..." : "Claim complaint"}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          // Only one action (View Details) -> show it inline
                          <Button
                            variant="ghost"
                            className="h-8 px-2 py-0 group hover:text-black inline-flex items-center gap-2 text-sm"
                            onClick={() => { setSelectedComplaint(complaint); setSelectedStatus(complaint.status || null); setEscalateFlag(false); setIsModalOpen(true); }}
                          >
                            <span className="sr-only">View details</span>
                            <Eye className="h-4 w-4 text-blue-500 group-hover:text-black transition-colors" />
                            <span className="text-blue-500 group-hover:text-black transition-colors">View</span>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between space-x-2 py-4">
            <div className="text-sm text-gray-500">
              Displaying {displayedComplaints.length} of {pagination.total} complaints
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === 1}
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
              >
                Next
              </Button>
            </div>
          </div>
          {/* Complaint Details Modal */}
          <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
            {/* Sticky header with shadow to create visual separation */}
            <div className="sticky -top-6 z-10 bg-white pb-4 border-b shadow-sm -mx-6 px-6 pt-6 rounded-t-lg">
              {/* Close button (top-right corner) */}
              <button
                onClick={() => setIsModalOpen(false)}
                aria-label="Close"
                className="absolute top-4 right-4 rounded-full p-1.5 hover:bg-gray-100 transition-colors z-20"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>

              {/* Main header content */}
              <div className="pr-12">
                <h3 className="text-lg font-bold">{selectedComplaint?.title || selectedComplaint?.subCategory}</h3>
                <p className="text-sm text-gray-500">#{selectedComplaint?.seq} • {selectedComplaint?.category}</p>
                {(
                  selectedComplaint?.AIStandardizedSubcategory ||
                  selectedComplaint?.AIstandardizedSubCategory
                ) && (
                    <p className="text-sm text-gray-500 mt-1 flex items-center">
                      <Sparkles className="mr-2 h-4 w-4 text-emerald-500" />
                      <span>SwarajAI classification: {selectedComplaint?.AIStandardizedSubcategory || selectedComplaint?.AIstandardizedSubCategory}</span>
                    </p>
                  )}
                {/* Assigned agent / municipal admin (non-sensitive) */}
                {selectedComplaint?.assignedAgent ? (
                  <p className="text-sm text-gray-500 mt-2 flex items-center">
                    <User className="mr-2 h-4 w-4 text-gray-400" />
                    <span>Assigned to {selectedComplaint.assignedAgent.name}</span>
                  </p>
                ) : selectedComplaint?.managedByMunicipalAdmin ? (
                  <p className="text-sm text-gray-500 mt-2 flex items-center">
                    <User className="mr-2 h-4 w-4 text-gray-400" />
                    <span>Assigned to Municipal Admin {selectedComplaint.managedByMunicipalAdmin.name}</span>
                  </p>
                ) : null}
              </div>

              {/* Action buttons row - Compare and Escalate side by side */}
              <div className="flex items-center justify-end gap-3 mt-4">
                {/* Compare button - only for top 3 recent complaints with images */}
                {selectedComplaint && compareEligibleIds.has(selectedComplaint.id) && selectedComplaint.attachmentUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-green-500 hover:bg-green-600 text-white border-green-500 hover:border-green-600"
                    onClick={() => {
                      const complaintImg = selectedComplaint.attachmentUrl!
                      const refImg = getReferenceImageForComplaint(selectedComplaint.id)
                      setCompareResult(null)
                      setCompareError(null)
                      setCustomCompareUrl('')
                      setActiveCompareUrl(refImg)
                      setIsCompareModalOpen(true)
                      handleCompareImages(complaintImg, refImg)
                    }}
                  >
                    <GitCompare className="h-4 w-4 mr-1" />
                    Compare
                  </Button>
                )}

                {/* Escalate button */}
                {isAssignedToMunicipal ? (
                  <Button variant="outline" size="sm" disabled className="bg-gray-100 text-gray-600 border-gray-200">
                    Escalated
                  </Button>
                ) : isAssignedToCurrentAgent ? (
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={statusUpdating}
                    onClick={async () => {
                      if (!selectedComplaint) return
                      setStatusUpdating(true)
                      try {
                        const token = localStorage.getItem('token')
                        if (!token) throw new Error('Not authenticated')
                        const res = await fetch(`${API_URL}/api/agent/complaints/${selectedComplaint.id}/escalate`, {
                          method: 'PUT',
                          headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`,
                          },
                        })
                        const body = await res.json()
                        if (!res.ok) {
                          alert(body.message || 'Unable to escalate the complaint at this time')
                        } else {
                          const updated = body.complaint
                          // Build municipal admin object from response (backend returns assignedMunicipalAdmin)
                          const assignedMunicipal = body.assignedMunicipalAdmin
                            ? { id: body.assignedMunicipalAdmin.id, name: body.assignedMunicipalAdmin.fullName, email: body.assignedMunicipalAdmin.officialEmail }
                            : updated?.managedByMunicipalAdmin
                              ? { id: updated.managedByMunicipalAdmin.id, name: updated.managedByMunicipalAdmin.fullName, email: updated.managedByMunicipalAdmin.officialEmail }
                              : null
                          // Update list
                          setComplaints((prev) =>
                            prev.map((c) =>
                              c.id === updated.id
                                ? { ...c, status: updated.status, escalationLevel: 'MUNICIPAL_ADMIN', managedByMunicipalAdmin: assignedMunicipal, assignedAgent: null }
                                : c
                            )
                          )
                          // Update modal selected complaint
                          setSelectedComplaint((prev) =>
                            prev
                              ? { ...prev, status: updated.status, escalationLevel: 'MUNICIPAL_ADMIN', managedByMunicipalAdmin: assignedMunicipal, assignedAgent: null }
                              : prev
                          )
                          setSelectedStatus(updated.status)
                          alert(body.message || 'Complaint escalated successfully')
                        }
                      } catch (err: any) {
                        console.error('Escalate error', err)
                        alert(err?.message || 'Unable to escalate the complaint')
                      } finally {
                        setStatusUpdating(false)
                      }
                    }}
                  >
                    {statusUpdating ? 'Escalating...' : 'Escalate to Municipal Level'}
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" disabled className="bg-gray-100 text-gray-600 border-gray-200" title={!selectedComplaint ? undefined : 'Only the assigned agent can escalate this complaint'}>
                    Escalate to Municipal Level
                  </Button>
                )}
              </div>
            </div>

            {/* Scrollable content */}
            <div className="space-y-4 pt-4">
              {/* Complaint location map (if coordinates available) */}
              {selectedComplaint?.location && (selectedComplaint.location.latitude != null && selectedComplaint.location.longitude != null) ? (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700">Location (map)</h4>
                  <div className="mt-2 border rounded-md overflow-hidden" style={{ height: 220 }}>
                    <ComplaintLocationMap
                      lat={selectedComplaint.location.latitude!}
                      lng={selectedComplaint.location.longitude!}
                      label={formatLocation(selectedComplaint.location)}
                    />
                  </div>
                </div>
              ) : selectedComplaint?.location ? (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700">Location</h4>
                  <p className="text-sm text-gray-500 mt-1">{formatLocation(selectedComplaint.location) || `${selectedComplaint.location.locality || ''} ${selectedComplaint.location.city || ''}`} -coordinates not available</p>
                </div>
              ) : null}
              {/* Description */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700">Description</h4>
                <p className="text-sm text-gray-800 whitespace-pre-wrap mt-1">{selectedComplaint?.description}</p>
              </div>

              {/* Status and urgency row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex flex-col">
                  <h4 className="text-sm font-semibold text-gray-700">Status</h4>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {getStatusBadge(selectedComplaint?.status)}
                    {selectedComplaint?.escalationLevel && (
                      <Badge className="bg-orange-100 text-orange-800">{toTitle(selectedComplaint.escalationLevel)}</Badge>
                    )}
                  </div>
                </div>
                <div className="flex flex-col">
                  <h4 className="text-sm font-semibold text-gray-700">Urgency</h4>
                  <div className="mt-1">{getUrgencyBadge(selectedComplaint?.urgency || '')}</div>
                </div>
                <div className="flex flex-col">
                  <h4 className="text-sm font-semibold text-gray-700">Department</h4>
                  <div className="mt-1">{getDepartmentBadge(selectedComplaint?.department)}</div>
                </div>
                <div className="flex flex-col">
                  <h4 className="text-sm font-semibold text-gray-700">Submitted</h4>
                  <p className="text-sm text-gray-800 mt-1">{selectedComplaint ? formatDate(selectedComplaint.submissionDate) : ''}</p>
                </div>
              </div>

              {/* Complainant and Location row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <h4 className="text-sm font-semibold text-gray-700">Complainant</h4>
                  {selectedComplaint?.complainant ? (
                    <div className="text-sm text-gray-800 mt-1">
                      <div>{selectedComplaint.complainant.name}</div>
                      <div className="text-xs text-gray-500">Contact information withheld</div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 mt-1">N/A</p>
                  )}
                </div>
                <div className="flex flex-col">
                  <h4 className="text-sm font-semibold text-gray-700">Location</h4>
                  {selectedComplaint?.location ? (
                    <div className="text-sm text-gray-800 mt-1">
                      <div>
                        {[
                          selectedComplaint.location.street,
                          selectedComplaint.location.locality,
                          selectedComplaint.location.city,
                          selectedComplaint.location.district,
                        ].filter(Boolean).join(', ') || 'N/A'}
                      </div>
                      {selectedComplaint.location.pin && (
                        <div className="text-xs text-gray-500">PIN: {selectedComplaint.location.pin}</div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 mt-1">N/A</p>
                  )}
                </div>
              </div>

              {/* Attachment */}
              {selectedComplaint?.attachmentUrl && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700">Attachment</h4>
                  <div className="mt-2">
                    <img src={selectedComplaint.attachmentUrl} alt="Complaint attachment preview" className="max-w-full h-auto rounded-md border" />
                  </div>
                </div>
              )}

              {/* Status update controls - visible only to municipal+ admins or the assigned agent */}
              {canUpdateStatus(selectedComplaint) ? (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Update complaint status</h4>
                  <div className="flex flex-wrap items-center gap-3">
                    <Select value={selectedStatus || ''} onValueChange={(v) => setSelectedStatus(v)}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UNDER_PROCESSING">Under Processing</SelectItem>
                        <SelectItem value="FORWARDED">Forwarded</SelectItem>
                        <SelectItem value="ON_HOLD">On Hold</SelectItem>
                        <SelectItem value="COMPLETED">Completed</SelectItem>
                        <SelectItem value="REJECTED">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      disabled={statusUpdating}
                      onClick={async () => {
                        if (!selectedComplaint || !selectedStatus) return alert('Select a status first')
                        // Determine endpoint
                        let endpoint = ''
                        if (adminType === 'AGENT') endpoint = `${API_URL}/api/agent/complaints/${selectedComplaint.id}/status`
                        else if (adminType === 'MUNICIPAL_ADMIN') endpoint = `${API_URL}/api/municipal-admin/complaints/${selectedComplaint.id}/status`
                        else if (adminType === 'STATE_ADMIN') endpoint = `${API_URL}/api/state-admin/complaints/${selectedComplaint.id}/status`
                        else if (adminType === 'SUPER_ADMIN') endpoint = `${API_URL}/api/super-admin/complaints/${selectedComplaint.id}/status`
                        else endpoint = `${API_URL}/api/agent/complaints/${selectedComplaint.id}/status`

                        // Require image verification before marking as COMPLETED
                        if (selectedStatus === 'COMPLETED') {
                          setPendingVerificationStatus(selectedStatus)
                          setPendingVerificationEndpoint(endpoint)
                          setVerificationFile(null)
                          setVerificationPreview(null)
                          setVerificationResult(null)
                          setVerificationError(null)
                          setVerificationUrlInput('')
                          setIsVerificationModalOpen(true)
                          return
                        }

                        setStatusUpdating(true)
                        try {
                          const token = localStorage.getItem('token')
                          if (!token) throw new Error('Not authenticated')
                          const res = await fetch(endpoint, {
                            method: 'PUT',
                            headers: {
                              'Content-Type': 'application/json',
                              Authorization: `Bearer ${token}`,
                            },
                            body: JSON.stringify({ status: selectedStatus }),
                          })
                          const body = await res.json()
                          if (!res.ok) {
                            alert(body.message || 'Unable to update the complaint status at this time')
                          } else {
                            const updated = body.complaint
                            setComplaints((prev) => prev.map((c) => (c.id === updated.id ? { ...c, status: updated.status } : c)))
                            setSelectedComplaint((prev) => prev ? { ...prev, status: updated.status } : prev)
                            alert(body.message || 'Complaint status updated successfully')
                          }
                        } catch (err: any) {
                          console.error('Status update error', err)
                          alert(err?.message || 'Unable to update the complaint status')
                        } finally {
                          setStatusUpdating(false)
                        }
                      }}
                    >
                      {statusUpdating ? 'Updating...' : 'Save status'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="border-t pt-4">
                  <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-md">Only Municipal Admins and Higher, or Assigned Agent, can Update Status.</p>
                </div>
              )}
            </div>
          </Modal>

          {/* ── Complaint Verification Modal ── */}
          <Modal
            isOpen={isVerificationModalOpen}
            onClose={() => {
              setIsVerificationModalOpen(false)
              setVerificationFile(null)
              setVerificationPreview(null)
              setVerificationResult(null)
              setVerificationError(null)
              setVerificationUrlInput('')
              setPendingVerificationStatus(null)
              setPendingVerificationEndpoint(null)
            }}
          >
            <div className="space-y-0 w-full">
              <style>{`@keyframes uav-scan { 0% { top: -60px; } 100% { top: 100%; } }`}</style>
              {/* ── Header ── */}
              <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50 rounded-t-xl">
                <div>
                  <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-[0.2em] mb-0.5">Complaint Verification</p>
                  <h3 className="text-base font-black text-slate-800">Image-Based Completion Verification</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Upload a field verification image. Confidence must exceed 90% to mark this complaint as Completed.</p>
                </div>
                <button
                  onClick={() => setIsVerificationModalOpen(false)}
                  className="ml-4 p-1.5 rounded-full hover:bg-slate-200 transition-colors"
                >
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>

              <div className="p-5 space-y-5">
                {/* ── Complaint reference info ── */}
                {selectedComplaint && (
                  <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-100 rounded-xl p-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Complaint #{selectedComplaint.seq}</p>
                      <p className="text-sm font-semibold text-slate-800 line-clamp-1">{selectedComplaint.title}</p>
                    </div>
                  </div>
                )}

                {/* ── Image panels ── */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Left: Original complaint image */}
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Original Complaint Image</p>
                    <div className="aspect-video bg-slate-50 rounded-xl overflow-hidden border border-slate-200 relative flex items-center justify-center min-h-[140px]">
                      {/* scan bar */}
                      <div
                        className="absolute left-0 z-10 w-full pointer-events-none"
                        style={{
                          height: 60,
                          background: 'linear-gradient(to bottom, transparent, #4f46e5, transparent)',
                          opacity: 0.25,
                          animation: 'uav-scan 3s linear infinite',
                          top: -60,
                        }}
                      />
                      {selectedComplaint?.attachmentUrl ? (
                        <img
                          src={selectedComplaint.attachmentUrl}
                          alt="Original Complaint"
                          className="w-full h-full object-cover grayscale opacity-80"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-slate-400">
                          <FileText className="w-8 h-8" />
                          <span className="text-xs">No image</span>
                        </div>
                      )}
                      <div className="absolute top-2 left-2 bg-slate-900/60 backdrop-blur px-2 py-0.5 rounded text-[8px] font-mono text-white">COMPLAINT SRC</div>
                    </div>
                  </div>

                  {/* Right: Upload verification image */}
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Field Verification Image</p>
                    <div
                      className={`aspect-video rounded-xl overflow-hidden border-2 transition-all duration-200 relative flex items-center justify-center cursor-pointer min-h-[140px]
                        ${
                          verificationDragging
                            ? 'border-indigo-400 bg-indigo-50'
                            : verificationPreview
                            ? 'border-slate-200 bg-slate-50'
                            : 'border-dashed border-slate-300 hover:border-indigo-300 hover:bg-indigo-50/30 bg-slate-50'
                        }`}
                      onClick={() => verificationFileRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); setVerificationDragging(true) }}
                      onDragLeave={() => setVerificationDragging(false)}
                      onDrop={handleVerificationDrop}
                    >
                      {verificationPreview ? (
                        <>
                          <img
                            src={/^https?:\/\//.test(verificationPreview) ? verificationPreview : verificationPreview}
                            alt="Verification"
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                          <div className="absolute bottom-2 right-2 bg-indigo-600/80 px-2 py-0.5 rounded text-[8px] font-mono text-white z-10">FIELD IMAGE</div>
                          <button
                            className="absolute top-2 right-2 bg-white/80 p-1 rounded-full text-slate-500 hover:text-red-500 z-20"
                            onClick={(e) => { e.stopPropagation(); setVerificationFile(null); setVerificationPreview(null); setVerificationResult(null) }}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </>
                      ) : (
                        <div className="flex flex-col items-center gap-2 p-3">
                          <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                            <span className="text-indigo-500 text-lg">↑</span>
                          </div>
                          <div className="text-center">
                            <p className="text-xs font-bold text-slate-700">{verificationDragging ? 'Drop here' : 'Upload Verification Image'}</p>
                            <p className="text-[10px] text-slate-400">Drag & drop or click · JPG/PNG/WEBP</p>
                          </div>
                        </div>
                      )}
                      <input
                        ref={verificationFileRef}
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleVerificationFile(f) }}
                      />
                    </div>
                  </div>
                </div>

                {/* ── URL paste input ── */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Or paste a verification image URL…"
                    value={verificationUrlInput}
                    onChange={(e) => setVerificationUrlInput(e.target.value)}
                    className="flex-1 text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (verificationUrlInput.trim()) {
                        setVerificationFile(null)
                        setVerificationPreview(verificationUrlInput.trim())
                        setVerificationResult(null)
                        setVerificationError(null)
                        setVerificationUrlInput('')
                      }
                    }}
                  >
                    Use URL
                  </Button>
                </div>

                {/* ── Error ── */}
                {verificationError && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                    <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{verificationError}</p>
                  </div>
                )}

                {/* ── Verification result ── */}
                {verificationResult && (() => {
                  const pct = Math.round((verificationResult.confidence ?? verificationResult.accuracy ?? 0) * 100)
                  const passed = pct >= 90
                  return (
                    <div className={`rounded-xl border p-4 space-y-3 ${ passed ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200' }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {passed
                            ? <CheckCircle className="w-5 h-5 text-emerald-600" />
                            : <AlertTriangle className="w-5 h-5 text-red-500" />}
                          <span className={`text-sm font-bold ${ passed ? 'text-emerald-700' : 'text-red-700' }`}>
                            {passed ? 'Verification Passed' : 'Verification Failed'}
                          </span>
                        </div>
                        <span className={`text-2xl font-black ${ passed ? 'text-emerald-700' : 'text-red-700' }`}>{pct}%</span>
                      </div>
                      {/* Confidence bar */}
                      <div className="w-full h-2 bg-white/60 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${ passed ? 'bg-emerald-500' : 'bg-red-500' }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      {verificationResult.description && (
                        <p className="text-xs text-slate-700 leading-relaxed">{verificationResult.description}</p>
                      )}
                      {!passed && (
                        <p className="text-xs font-semibold text-red-700">
                          Confidence is below 90%. The complaint cannot be marked as Completed. Upload a clearer field verification image and try again.
                        </p>
                      )}
                    </div>
                  )
                })()}

                {/* ── Action buttons ── */}
                <div className="flex items-center justify-between gap-3 pt-1">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsVerificationModalOpen(false)
                      setVerificationFile(null)
                      setVerificationPreview(null)
                      setVerificationResult(null)
                      setVerificationError(null)
                      setVerificationUrlInput('')
                      setPendingVerificationStatus(null)
                      setPendingVerificationEndpoint(null)
                    }}
                  >
                    Cancel
                  </Button>

                  <div className="flex items-center gap-2">
                    {/* Analyse button */}
                    <Button
                      disabled={(!verificationFile && !verificationPreview) || verificationLoading}
                      onClick={handleVerificationAnalyse}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                      {verificationLoading ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analysing…</>
                      ) : (
                        'Analyse Image'
                      )}
                    </Button>

                    {/* Confirm completion – only enabled when confidence ≥ 90% */}
                    {verificationResult && Math.round((verificationResult.confidence ?? verificationResult.accuracy ?? 0) * 100) >= 90 && (
                      <Button
                        disabled={statusUpdating}
                        onClick={handleConfirmVerifiedCompletion}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                      >
                        {statusUpdating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Updating…</> : '✓ Confirm Completed'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Modal>

          {/* Image Comparison Modal */}
          <Modal isOpen={isCompareModalOpen} onClose={() => setIsCompareModalOpen(false)}>
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="text-lg font-bold">Image Comparison</h3>
                <button
                  onClick={() => setIsCompareModalOpen(false)}
                  aria-label="Close"
                  className="rounded-full p-1 hover:bg-gray-100 transition-colors"
                >
                  <X className="h-4 w-4 text-gray-500" />
                </button>
              </div>

              {/* Loading badge */}
              {compareLoading && (
                <div className="flex justify-center">
                  <Badge className="bg-green-100 text-green-800 flex items-center gap-2 px-4 py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Comparing With Received Image
                  </Badge>
                </div>
              )}

              {/* Side by side images */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-gray-700 text-center">Complaint Image</h4>
                  <div className="border rounded-lg overflow-hidden bg-gray-50">
                    <img
                      src={selectedComplaint?.attachmentUrl || ''}
                      alt="Complaint image"
                      className="w-full h-48 object-cover"
                    />
                  </div>
                  <p className="text-xs text-gray-500 text-center">#{selectedComplaint?.seq}</p>
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-gray-700 text-center">Reference Image</h4>
                  <div className="border rounded-lg overflow-hidden bg-gray-50">
                    <img
                      src={activeCompareUrl}
                      alt="Reference"
                      className="w-full h-48 object-cover"
                    />
                  </div>
                  <p className="text-xs text-gray-500 text-center truncate">{activeCompareUrl.split('/').pop()}</p>
                </div>
              </div>

              {/* Results */}
              {compareResult && (
                <div className="space-y-3 border-t pt-4">
                  <div className="flex items-center gap-4">
                    <Badge className={compareResult.match ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {compareResult.match ? '✓ Match Found' : '✗ No Match'}
                    </Badge>
                    <span className="text-sm text-gray-600">
                      Confidence: <strong>{(compareResult.confidence * 100).toFixed(1)}%</strong>
                    </span>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <h5 className="text-sm font-semibold text-gray-700 mb-1">Analysis Result:</h5>
                    <p className="text-sm text-gray-600">{compareResult.reason}</p>
                  </div>
                </div>
              )}

              {/* Error */}
              {compareError && (
                <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                  <p className="text-sm text-red-600">Error: {compareError}</p>
                </div>
              )}

              {/* Re-comparison input - shown after comparison is done */}
              {(compareResult || compareError) && selectedComplaint?.attachmentUrl && (
                <div className="border-t pt-4 space-y-3">
                  <h4 className="text-sm font-semibold text-gray-700">Compare with another image</h4>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Paste image CDN URL here..."
                      value={customCompareUrl}
                      onChange={(e) => setCustomCompareUrl(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      disabled={!customCompareUrl.trim() || compareLoading}
                      onClick={() => {
                        if (customCompareUrl.trim() && selectedComplaint?.attachmentUrl) {
                          handleCompareImages(selectedComplaint.attachmentUrl, customCompareUrl.trim())
                        }
                      }}
                      className="bg-green-500 hover:bg-green-600 text-white"
                    >
                      {compareLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Compare'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Modal>
        </CardContent>
      </Card>
    </div>
  )
}

// small helper map for a single complaint location
function ComplaintLocationMap({ lat, lng, label }: { lat: number; lng: number; label?: string }) {
  // fix default icon paths for leaflet (webpack/next)
  // prevent duplicate merge when multiple components load by memoizing
  useMemo(() => {
    try {
      // @ts-ignore
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
        iconUrl: require('leaflet/dist/images/marker-icon.png'),
        shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
      })
    } catch (e) {
      // ignore in environments where require isn't available at runtime
    }
  }, [])

  const googleMapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  const googleUrl = `https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&key=${googleMapsKey}`

  return (
    <MapContainer center={[lat, lng]} zoom={15} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
      {googleMapsKey ? (
        <TileLayer url={googleUrl} attribution='&copy; <a href="https://www.google.com/maps">Google Maps</a>' />
      ) : (
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
      )}
      <Marker position={[lat, lng]} />
    </MapContainer>
  )
}
