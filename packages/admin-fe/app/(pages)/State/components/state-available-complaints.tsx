"use client"

import { useState, useEffect, useMemo } from "react"
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
import { Search, MoreHorizontal, Eye, UserPlus, User, FileText, Clock, AlertTriangle, CheckCircle, Sparkles, X, Flag, Users, Briefcase } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Modal } from "@/components/ui/modal"

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
  escalatedToStateAdmin?: {
    id: string
    name: string
    email: string
  } | null
  escalationLevel?: string | null
  AIStandardizedSubcategory?: string | null
  AIstandardizedSubCategory?: string | null
  isDuplicate?: boolean | null
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

export function StateAvailableComplaints() {
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
  const [currentAdminId, setCurrentAdminId] = useState<string | null>(null)
  const [adminType, setAdminType] = useState<string | null>(null)
  const [overviewStats, setOverviewStats] = useState<OverviewStats>({ total: 0, registered: 0, inProgress: 0, resolved: 0, closed: 0, highPriority: 0, assigned: 0 })

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
        const filtered = (data.data as any[]).filter((c) => !c.isDuplicate)
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
    if (!initialLoadDone) return
    
    const debounce = setTimeout(() => {
      if (pagination.page === 1) {
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

      // State admin uses state-admin endpoint for assignment
      const response = await fetch(`${API_URL}/api/state-admin/complaints/${complaintId}/assign`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (response.ok) {
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
        return <Badge className="bg-purple-100 text-purple-800">Escalated (State)</Badge>
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

  const criticalCount = complaints.filter((c) => c.urgency === 'CRITICAL').length

  const stats = [
    {
      title: "TOTAL REGISTERED",
      value: pagination.total.toString(),
      subtitle: `${new Date().getFullYear()} YTD`,
      icon: Briefcase,
      bgColor: "bg-purple-600",
      iconBg: "bg-purple-500",
    },
    {
      title: "HIGH PRIORITY",
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
      title: "ESCALATED TO STATE",
      value: complaints.filter((c) => 
        c.status === 'ESCALATED_TO_STATE_LEVEL' || 
        !!c.escalatedToStateAdmin?.id
      ).length.toString(),
      subtitle: "⚠ Awaiting Review",
      icon: Clock,
      bgColor: "bg-slate-700",
      iconBg: "bg-slate-600",
    },
  ]

  const displayedComplaints = complaints.filter((complaint) => {
    if (urgencyFilter !== 'all' && complaint.urgency !== urgencyFilter) return false
    
    if (assignmentFilter === 'all') return true
    if (assignmentFilter === 'assigned') return !!complaint.assignedAgent?.id || !!complaint.managedByMunicipalAdmin?.id || !!complaint.escalatedToStateAdmin?.id
    if (assignmentFilter === 'unassigned') return !complaint.assignedAgent?.id && !complaint.managedByMunicipalAdmin?.id && !complaint.escalatedToStateAdmin?.id
    if (assignmentFilter === 'escalated') return (
      !!complaint.escalatedToStateAdmin?.id ||
      complaint.status === 'ESCALATED_TO_STATE_LEVEL' ||
      !!complaint.escalationLevel
    )
    return true
  })

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
        return 'Complaints yet to be assigned to any agent or admin'
      case 'assigned':
        return 'Complaints currently assigned to agents or admins'
      case 'escalated':
        return 'Complaints escalated to state level'
      case 'all':
      default:
        return 'Overview of all complaints in your state jurisdiction'
    }
  }

  const canUpdateStatus = (complaint: Complaint | null) => {
    if (!complaint) return false
    if (adminType === 'STATE_ADMIN' || adminType === 'SUPER_ADMIN') return true
    return false
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <p className="text-gray-600">Manage and track all complaints in your state jurisdiction</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading ? (
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
                  <TableHead>Registered</TableHead>
                  <TableHead className="text-center align-middle">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i} className="animate-pulse">
                      <TableCell>
                        <div className="space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      </TableCell>
                      <TableCell><div className="h-6 bg-gray-200 rounded w-24"></div></TableCell>
                      <TableCell><div className="h-6 bg-gray-200 rounded w-16"></div></TableCell>
                      <TableCell><div className="h-4 bg-gray-200 rounded w-20"></div></TableCell>
                      <TableCell className="text-center"><div className="h-8 bg-gray-200 rounded w-20 mx-auto"></div></TableCell>
                    </TableRow>
                  ))
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
                        {complaint.location ? formatLocation(complaint.location) || 'N/A' : "N/A"}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {formatDate(complaint.submissionDate)}
                      </TableCell>
                      <TableCell className="text-center align-middle">
                        <Button
                          variant="ghost"
                          className="h-8 px-2 py-0 group hover:text-black inline-flex items-center gap-2 text-sm"
                          onClick={() => { setSelectedComplaint(complaint); setSelectedStatus(complaint.status || null); setIsModalOpen(true); }}
                        >
                          <Eye className="h-4 w-4 text-purple-500 group-hover:text-black transition-colors" />
                          <span className="text-purple-500 group-hover:text-black transition-colors">View</span>
                        </Button>
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
            <div className="sticky top-0 z-10 bg-white pb-4 border-b shadow-sm -mx-6 px-6 -mt-6 pt-0">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold">{selectedComplaint?.title || selectedComplaint?.subCategory}</h3>
                  <p className="text-sm text-gray-500">#{selectedComplaint?.seq} • {selectedComplaint?.category}</p>
                  {(selectedComplaint?.AIStandardizedSubcategory || selectedComplaint?.AIstandardizedSubCategory) && (
                    <p className="text-sm text-gray-500 mt-1 flex items-center">
                      <Sparkles className="mr-2 h-4 w-4 text-emerald-500" />
                      <span>SwarajAI classification: {selectedComplaint?.AIStandardizedSubcategory || selectedComplaint?.AIstandardizedSubCategory}</span>
                    </p>
                  )}
                  {selectedComplaint?.assignedAgent ? (
                    <p className="text-sm text-gray-500 mt-2 flex items-center">
                      <User className="mr-2 h-4 w-4 text-gray-400" />
                      <span>Assigned to Agent: {selectedComplaint.assignedAgent.name}</span>
                    </p>
                  ) : selectedComplaint?.managedByMunicipalAdmin ? (
                    <p className="text-sm text-gray-500 mt-2 flex items-center">
                      <User className="mr-2 h-4 w-4 text-gray-400" />
                      <span>Managed by Municipal Admin: {selectedComplaint.managedByMunicipalAdmin.name}</span>
                    </p>
                  ) : selectedComplaint?.escalatedToStateAdmin ? (
                    <p className="text-sm text-gray-500 mt-2 flex items-center">
                      <User className="mr-2 h-4 w-4 text-purple-400" />
                      <span>Escalated to State Admin</span>
                    </p>
                  ) : null}
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                aria-label="Close"
                className="absolute top-3 right-3 rounded-full p-1 hover:bg-gray-100 transition-colors mr-4"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4 pt-9">
              {selectedComplaint?.location && (selectedComplaint.location.latitude != null && selectedComplaint.location.longitude != null) ? (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700">Location (map)</h4>
                  <div className="mt-2 border rounded-md overflow-hidden" style={{ height: 220 }}>
                    <StateComplaintLocationMap
                      lat={selectedComplaint.location.latitude!}
                      lng={selectedComplaint.location.longitude!}
                      label={formatLocation(selectedComplaint.location)}
                    />
                  </div>
                </div>
              ) : selectedComplaint?.location ? (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700">Location</h4>
                  <p className="text-sm text-gray-500 mt-1">{formatLocation(selectedComplaint.location) || `${selectedComplaint.location.locality || ''} ${selectedComplaint.location.city || ''}`} — coordinates not available</p>
                </div>
              ) : null}

              <div>
                <h4 className="text-sm font-semibold text-gray-700">Description</h4>
                <p className="text-sm text-gray-800 whitespace-pre-wrap mt-1">{selectedComplaint?.description}</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex flex-col">
                  <h4 className="text-sm font-semibold text-gray-700">Status</h4>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {getStatusBadge(selectedComplaint?.status)}
                    {selectedComplaint?.escalationLevel && (
                      <Badge className="bg-purple-100 text-purple-800">{toTitle(selectedComplaint.escalationLevel)}</Badge>
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

              {selectedComplaint?.attachmentUrl && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700">Attachment</h4>
                  <div className="mt-2">
                    <img src={selectedComplaint.attachmentUrl} alt="Complaint attachment preview" className="max-w-full h-auto rounded-md border" />
                  </div>
                </div>
              )}

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
                        setStatusUpdating(true)
                        try {
                          const token = localStorage.getItem('token')
                          if (!token) throw new Error('Not authenticated')
                          const endpoint = `${API_URL}/api/state-admin/complaints/${selectedComplaint.id}/status`

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
                  <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-md">Only State Admins and Higher can Update Status.</p>
                </div>
              )}
            </div>
          </Modal>
        </CardContent>
      </Card>
    </div>
  )
}

function StateComplaintLocationMap({ lat, lng, label }: { lat: number; lng: number; label?: string }) {
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
      // ignore
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
