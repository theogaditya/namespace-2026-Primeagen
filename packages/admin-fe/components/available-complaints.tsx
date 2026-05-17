"use client"

import { useState, useEffect } from "react"
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
import { Search, MoreHorizontal, Eye, UserPlus, User, FileText, Clock, AlertTriangle, CheckCircle, Sparkles, X } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Modal } from "@/components/ui/modal"

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
}

const API_URL = process.env.NEXT_PUBLIC_API_URL

export function AvailableComplaints() {
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  })
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'assigned' | 'unassigned' | 'escalated'>('all')
  const [searchTerm, setSearchTerm] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [escalateFlag, setEscalateFlag] = useState(false)
  const [currentAdminId, setCurrentAdminId] = useState<string | null>(null)

  const fetchAvailableComplaints = async () => {
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
        setComplaints(data.data)
        setPagination((prev) => ({
          ...prev,
          total: data.pagination.total,
          totalPages: data.pagination.totalPages,
        }))
      }
    } catch (error) {
      console.error("Error fetching available complaints:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAvailableComplaints()
  }, [pagination.page])

  useEffect(() => {
    try {
      const adminRaw = localStorage.getItem('admin')
      if (adminRaw) {
        const adminObj = JSON.parse(adminRaw)
        setCurrentAdminId(adminObj?.id || adminObj?.userId || adminObj?.adminId || null)
      }
    } catch (err) {
      // ignore parse errors
    }
  }, [])

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (pagination.page === 1) {
        fetchAvailableComplaints()
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

  const stats = [
    {
      title: "Unassigned Complaints",
      value: pagination.total.toString(),
      icon: FileText,
      color: "text-blue-600",
    },
    {
      title: "High Priority Complaints",
      value: complaints.filter((c) => c.urgency === "HIGH").length.toString(),
      icon: AlertTriangle,
      color: "text-red-600",
    },
    {
      title: "Medium Priority Complaints",
      value: complaints.filter((c) => c.urgency === "MEDIUM").length.toString(),
      icon: Clock,
      color: "text-yellow-600",
    },
    {
      title: "Low Priority Complaints",
      value: complaints.filter((c) => c.urgency === "LOW").length.toString(),
      icon: CheckCircle,
      color: "text-green-600",
    },
  ]

  const displayedComplaints = complaints.filter((complaint) => {
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Complaints Management</h1>
        <p className="text-gray-600">Manage and track all complaints on the platform</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <stat.icon className={`h-8 w-8 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
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
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="escalated">Escalated</SelectItem>
                    <SelectItem value="all">All Complaints</SelectItem>
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
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <div className="flex items-center justify-center space-x-3">
                        <div className="w-5 h-5 border-2 border-t-transparent border-gray-600 rounded-full animate-spin" />
                        <span className="text-gray-600">Loading...</span>
                      </div>
                    </TableCell>
                  </TableRow>
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
                          <span>
                            {complaint.location.locality}, {complaint.location.city}
                          </span>
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
            <div className="sticky top-0 z-10 bg-white pb-4 border-b shadow-sm -mx-6 px-6 -mt-6 pt-0">
              <div className="flex items-start justify-between">
                <div>
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
                {/* controls are positioned absolutely within header (close top-right, escalate bottom-right) */}
              </div>

              {/* Close button (top-right) */}
              <button
                onClick={() => setIsModalOpen(false)}
                aria-label="Close"
                className="absolute top-3 right-3 rounded-full p-1 hover:bg-gray-100 transition-colors"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>

              {/* Escalate button (bottom-right) */}
              <div className="absolute right-3 bottom-3">
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
            <div className="space-y-4 pt-9">
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
                      <div>{selectedComplaint.location.locality}, {selectedComplaint.location.city}</div>
                      <div className="text-xs text-gray-500">PIN: {selectedComplaint.location.pin}</div>
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

              {/* Status update controls */}
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
                        const res = await fetch(`${API_URL}/api/agent/complaints/${selectedComplaint.id}/status`, {
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
            </div>
          </Modal>
        </CardContent>
      </Card>
    </div>
  )
}
