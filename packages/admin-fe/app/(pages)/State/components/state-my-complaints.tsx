"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Search, MoreHorizontal, Eye, Calendar, User, CheckCircle, Circle, LayoutList, RefreshCw } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Modal } from "@/components/ui/modal"

interface Complaint {
  id: string
  seq: number
  title: string
  description: string
  category: { id: string; name: string } | null
  subCategory: string
  status: string
  urgency: string
  department: string
  submissionDate: string
  lastUpdated: string
  attachmentUrl: string | null
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
  escalatedToStateAdmin?: {
    id: string
    name: string
    email: string
  } | null
  escalationLevel?: string | null
  AIStandardizedSubcategory?: string | null
  AIstandardizedSubCategory?: string | null
}

const API_URL = process.env.NEXT_PUBLIC_API_URL

export function StateMyComplaints() {
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'REGISTERED' | 'UNDER_PROCESSING' | 'COMPLETED' | 'ON_HOLD' | 'FORWARDED' | 'ESCALATED_TO_STATE_LEVEL'>('all')
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null)
  const [currentAdminId, setCurrentAdminId] = useState<string>('')
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 20,
  })

  const fetchMyComplaints = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        console.error('No token found')
        setLoading(false)
        return
      }

      // Use state admin specific endpoint
      const res = await fetch(`/api/state-admin/my-complaints?page=${pagination.currentPage}&limit=${pagination.itemsPerPage}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(`Failed to fetch escalated complaints: ${res.status} ${text}`)
      }

      const data = await res.json()
      setComplaints((data.complaints || []) as Complaint[])
      setPagination((prev) => ({
        ...prev,
        totalPages: data.pagination?.totalPages || 1,
        totalItems: data.pagination?.total || (data.complaints || []).length,
      }))
    } catch (error) {
      console.error('Error fetching complaints:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    try {
      const adminData = localStorage.getItem('admin')
      if (adminData) {
        const parsed = JSON.parse(adminData)
        setCurrentAdminId(parsed.id || '')
      }
    } catch {
      // ignore
    }
    
    fetchMyComplaints()
  }, [pagination.currentPage])

  const canUpdateStatus = (complaint: Complaint): boolean => {
    if (!currentAdminId) return false
    // State admin can update complaints escalated to them
    return complaint.escalatedToStateAdmin?.id === currentAdminId || complaint.status === 'ESCALATED_TO_STATE_LEVEL'
  }

  const updateComplaintStatus = async (complaintId: string, newStatus: string) => {
    try {
      setStatusUpdating(true)
      const token = localStorage.getItem("token")
      if (!token) return

      const endpoint = `${API_URL}/api/state-admin/complaints/${complaintId}/status`

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        fetchMyComplaints()
        setSelectedComplaint(null)
      }
    } catch (error) {
      console.error("Error updating status:", error)
    } finally {
      setStatusUpdating(false)
    }
  }

  const getUrgencyBadge = (urgency: string) => {
    const styles: Record<string, string> = {
      CRITICAL: "bg-red-100 text-red-700 border-red-200",
      HIGH: "bg-orange-100 text-orange-700 border-orange-200",
      MEDIUM: "bg-yellow-100 text-yellow-700 border-yellow-200",
      LOW: "bg-green-100 text-green-700 border-green-200",
    }
    return styles[urgency] || "bg-gray-100 text-gray-700 border-gray-200"
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string }> = {
      REGISTERED: { bg: "bg-blue-100", text: "text-blue-700" },
      UNDER_PROCESSING: { bg: "bg-yellow-100", text: "text-yellow-700" },
      COMPLETED: { bg: "bg-green-100", text: "text-green-700" },
      ON_HOLD: { bg: "bg-red-100", text: "text-red-700" },
      FORWARDED: { bg: "bg-purple-100", text: "text-purple-700" },
      REJECTED: { bg: "bg-gray-100", text: "text-gray-700" },
      ESCALATED_TO_MUNICIPAL_LEVEL: { bg: "bg-orange-100", text: "text-orange-700" },
      ESCALATED_TO_STATE_LEVEL: { bg: "bg-purple-100", text: "text-purple-700" },
    }
    const style = styles[status] || { bg: "bg-gray-100", text: "text-gray-700" }
    return `${style.bg} ${style.text}`
  }

  const formatStatus = (status: string) => {
    const labels: Record<string, string> = {
      REGISTERED: "Todo",
      UNDER_PROCESSING: "In Progress",
      COMPLETED: "Completed",
      ON_HOLD: "On Hold",
      FORWARDED: "Forwarded",
      REJECTED: "Rejected",
      ESCALATED_TO_MUNICIPAL_LEVEL: "Escalated (Municipal)",
      ESCALATED_TO_STATE_LEVEL: "Escalated (State)",
    }
    return labels[status] || status
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })
  }

  const isOverdue = (dateString: string, status: string) => {
    if (status === 'COMPLETED' || status === 'REJECTED') return false
    const submissionDate = new Date(dateString)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - submissionDate.getTime()) / (1000 * 60 * 60 * 24))
    return diffDays > 7
  }

  const filteredComplaints = complaints.filter((complaint) => {
    if (statusFilter !== 'all' && complaint.status !== statusFilter) return false
    
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      return (
        complaint.title?.toLowerCase().includes(search) ||
        complaint.description?.toLowerCase().includes(search) ||
        complaint.category?.name?.toLowerCase().includes(search) ||
        complaint.subCategory?.toLowerCase().includes(search) ||
        complaint.location?.city?.toLowerCase().includes(search)
      )
    }
    return true
  })

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 mt-1">Manage escalated complaints in your state</p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => fetchMyComplaints()}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search complaints..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white border-gray-200"
          />
        </div>
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <SelectTrigger className="w-[180px] bg-white">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="ESCALATED_TO_STATE_LEVEL">Escalated</SelectItem>
              <SelectItem value="UNDER_PROCESSING">In Progress</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="ON_HOLD">On Hold</SelectItem>
              <SelectItem value="FORWARDED">Forwarded</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Complaints List */}
      <Card className="bg-white shadow-sm border-gray-200">
        <CardContent className="p-0">
          {loading ? (
            <div className="divide-y divide-gray-100">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="p-5 animate-pulse">
                  <div className="flex items-start gap-4">
                    <div className="mt-1 h-5 w-5 bg-gray-200 rounded-full shrink-0"></div>
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="h-5 bg-gray-200 rounded w-16"></div>
                        <div className="h-5 bg-gray-200 rounded w-20"></div>
                        <div className="h-5 bg-gray-200 rounded w-24"></div>
                      </div>
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      <div className="flex items-center gap-4 pt-1">
                        <div className="h-3 bg-gray-200 rounded w-32"></div>
                        <div className="h-3 bg-gray-200 rounded w-24"></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredComplaints.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
              <LayoutList className="h-12 w-12 mb-4 text-gray-300" />
              <p className="text-lg font-medium">No complaints found</p>
              <p className="text-sm">Adjust your filters or check back later</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredComplaints.map((complaint) => {
                const overdue = isOverdue(complaint.submissionDate, complaint.status)
                const completed = complaint.status === 'COMPLETED'
                
                return (
                  <div
                    key={complaint.id}
                    className="p-5 hover:bg-gray-50 transition-colors cursor-pointer group"
                    onClick={() => setSelectedComplaint(complaint)}
                  >
                    <div className="flex items-start gap-4">
                      <button 
                        className={`mt-1 shrink-0 ${completed ? 'text-purple-600' : 'text-gray-300 hover:text-gray-400'}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {completed ? <CheckCircle className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h3 className={`text-base font-semibold ${completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                              {complaint.title || complaint.subCategory || `Complaint #${complaint.seq}`}
                            </h3>
                            <p className={`text-sm mt-1 ${completed ? 'text-gray-400' : 'text-gray-500'}`}>
                              {complaint.description?.slice(0, 100)}{complaint.description?.length > 100 ? '...' : ''}
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant="outline" className={getUrgencyBadge(complaint.urgency)}>
                              {complaint.urgency}
                            </Badge>
                            <Badge className={`${getStatusBadge(complaint.status)} border-0`}>
                              {overdue && complaint.status !== 'COMPLETED' ? 'Overdue' : formatStatus(complaint.status)}
                            </Badge>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-4 w-4" />
                            <span>Due: {formatDate(complaint.submissionDate)}</span>
                          </div>
                          {complaint.complainant && (
                            <div className="flex items-center gap-1.5">
                              <User className="h-4 w-4" />
                              <span>{complaint.complainant.name}</span>
                            </div>
                          )}
                          <span className="text-gray-400">
                            Related to: {complaint.category?.name || complaint.subCategory}
                          </span>
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSelectedComplaint(complaint)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.currentPage === 1}
            onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage - 1 }))}
          >
            Previous
          </Button>
          <span className="flex items-center px-3 text-sm text-gray-500">
            Page {pagination.currentPage} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.currentPage === pagination.totalPages}
            onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage + 1 }))}
          >
            Next
          </Button>
        </div>
      )}

      {/* Complaint Detail Modal */}
      <Modal isOpen={!!selectedComplaint} onClose={() => setSelectedComplaint(null)}>
        {selectedComplaint && (
          <div className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {selectedComplaint.title || selectedComplaint.subCategory || `Complaint #${selectedComplaint.seq}`}
                </h2>
                <p className="text-sm text-gray-500 mt-1">ID: {selectedComplaint.id}</p>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline" className={getUrgencyBadge(selectedComplaint.urgency)}>
                  {selectedComplaint.urgency}
                </Badge>
                <Badge className={`${getStatusBadge(selectedComplaint.status)} border-0`}>
                  {formatStatus(selectedComplaint.status)}
                </Badge>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Description</h4>
                <p className="text-gray-900">{selectedComplaint.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Category</h4>
                  <p className="text-gray-900">{selectedComplaint.category?.name || 'N/A'}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Sub-Category</h4>
                  <p className="text-gray-900">{selectedComplaint.subCategory}</p>
                </div>
              </div>

              {selectedComplaint.location && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Location</h4>
                  <p className="text-gray-900">
                    {[
                      selectedComplaint.location.locality,
                      selectedComplaint.location.city,
                      selectedComplaint.location.district,
                      selectedComplaint.location.pin
                    ].filter(Boolean).join(', ')}
                  </p>
                </div>
              )}

              {selectedComplaint.complainant && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Complainant</h4>
                  <p className="text-gray-900">{selectedComplaint.complainant.name}</p>
                  <p className="text-sm text-gray-500">{selectedComplaint.complainant.email}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Submitted</h4>
                  <p className="text-gray-900">{formatDate(selectedComplaint.submissionDate)}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Last Updated</h4>
                  <p className="text-gray-900">{formatDate(selectedComplaint.lastUpdated)}</p>
                </div>
              </div>

              {canUpdateStatus(selectedComplaint) && (
                <div className="pt-4 border-t">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Update Status</h4>
                  <div className="flex flex-wrap gap-2">
                    {['UNDER_PROCESSING', 'COMPLETED', 'ON_HOLD', 'FORWARDED'].map((status) => (
                      <Button
                        key={status}
                        variant={selectedComplaint.status === status ? "default" : "outline"}
                        size="sm"
                        disabled={statusUpdating || selectedComplaint.status === status}
                        onClick={() => updateComplaintStatus(selectedComplaint.id, status)}
                        className={selectedComplaint.status === status ? "bg-purple-600" : ""}
                      >
                        {statusUpdating ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : null}
                        {formatStatus(status)}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {!canUpdateStatus(selectedComplaint) && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-md">
                    This complaint is not escalated to you. Status updates are disabled.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSelectedComplaint(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
