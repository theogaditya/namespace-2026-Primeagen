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
import { Search, MoreHorizontal, Eye, UserPlus, FileText, Clock, AlertTriangle, CheckCircle } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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
      case "HIGH":
        return <Badge className="bg-red-100 text-red-800">High</Badge>
      case "MEDIUM":
        return <Badge className="bg-yellow-100 text-yellow-800">Medium</Badge>
      case "LOW":
        return <Badge className="bg-green-100 text-green-800">Low</Badge>
      default:
        return <Badge variant="secondary">{urgency}</Badge>
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
      title: "Available Complaints",
      value: pagination.total.toString(),
      icon: FileText,
      color: "text-blue-600",
    },
    {
      title: "High Priority",
      value: complaints.filter((c) => c.urgency === "HIGH").length.toString(),
      icon: AlertTriangle,
      color: "text-red-600",
    },
    {
      title: "Medium Priority",
      value: complaints.filter((c) => c.urgency === "MEDIUM").length.toString(),
      icon: Clock,
      color: "text-yellow-600",
    },
    {
      title: "Low Priority",
      value: complaints.filter((c) => c.urgency === "LOW").length.toString(),
      icon: CheckCircle,
      color: "text-green-600",
    },
  ]

  const displayedComplaints = complaints.filter((complaint) => {
    if (assignmentFilter === 'all') return true
    if (assignmentFilter === 'assigned') return !!complaint.assignedAgent || !!complaint.managedByMunicipalAdmin
    if (assignmentFilter === 'unassigned') return !complaint.assignedAgent && !complaint.managedByMunicipalAdmin
    if (assignmentFilter === 'escalated') return !!complaint.escalationLevel || (complaint.status && complaint.status.toString().includes('ESCALATED'))
    return true
  })

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
          <CardTitle>Complaints</CardTitle>
          <CardDescription>Overview of all complaints on the platform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search complaints..."
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
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    <SelectItem value="escalated">Escalated</SelectItem>
                  </SelectContent>
                </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Complaint Description</TableHead>
                  <TableHead>Urgency</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Created Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : displayedComplaints.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                      No available complaints found
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
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            {/* Show Assign option only when complaint is not already assigned */}
                            {!complaint.assignedAgent && !complaint.managedByMunicipalAdmin && (
                              <DropdownMenuItem
                                onClick={() => handleAssignToMe(complaint.id)}
                                className={assigning === complaint.id ? "opacity-50 pointer-events-none" : ""}
                              >
                                <UserPlus className="mr-2 h-4 w-4" />
                                {assigning === complaint.id ? "Assigning..." : "Assign to Me"}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
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
              Showing {displayedComplaints.length} of {pagination.total} complaints
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
        </CardContent>
      </Card>
    </div>
  )
}
