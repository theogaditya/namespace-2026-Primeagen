"use client"

import { useState, useEffect, useMemo } from "react"
import 'leaflet/dist/leaflet.css'
import { MapContainer, Marker, TileLayer } from 'react-leaflet'
import L from 'leaflet'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Eye, User, Sparkles, X, RefreshCw } from "lucide-react"
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
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

export function SuperMyComplaints() {
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({
    currentPage: 1,
    itemsPerPage: 10,
    totalItems: 0,
    totalPages: 0,
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'UNDER_PROCESSING' | 'COMPLETED' | 'ON_HOLD' | 'FORWARDED' | 'REJECTED'>('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)
  const [statusUpdating, setStatusUpdating] = useState(false)

  const fetchMyComplaints = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setLoading(false)
        return
      }

      const res = await fetch(`/api/super-admin/my-complaints?page=${pagination.currentPage}&limit=${pagination.itemsPerPage}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(`Failed to fetch escalated complaints: ${res.status} ${text}`)
      }

      const data = await res.json()
      if (data.success && Array.isArray(data.complaints)) {
        setComplaints(data.complaints)
        if (data.pagination) {
          setPagination((prev) => ({
            ...prev,
            totalItems: data.pagination.total || data.complaints.length,
            totalPages: data.pagination.totalPages || Math.ceil(data.complaints.length / prev.itemsPerPage),
          }))
        }
      }
    } catch (error) {
      console.error('Error fetching complaints:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMyComplaints()
  }, [pagination.currentPage])

  const handleStatusUpdate = async () => {
    if (!selectedComplaint || !selectedStatus) {
      alert('Please select a status first')
      return
    }

    setStatusUpdating(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) throw new Error('Not authenticated')

      const res = await fetch(`${API_URL}/api/super-admin/complaints/${selectedComplaint.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ status: selectedStatus }),
      })

      const body = await res.json()

      if (!res.ok) {
        alert(body.message || 'Unable to update the complaint status')
      } else {
        const updated = body.complaint
        setComplaints((prev) => prev.map((c) => (c.id === updated.id ? { ...c, status: updated.status } : c)))
        setSelectedComplaint((prev) => prev ? { ...prev, status: updated.status } : prev)
        fetchMyComplaints()
        alert(body.message || 'Complaint status updated successfully')
      }
    } catch (err: any) {
      console.error('Status update error', err)
      alert(err?.message || 'Unable to update the complaint status')
    } finally {
      setStatusUpdating(false)
    }
  }

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'CRITICAL':
        return <Badge className="bg-red-100 text-red-800">Critical</Badge>
      case 'HIGH':
        return <Badge className="bg-yellow-100 text-yellow-800">High</Badge>
      case 'MEDIUM':
        return <Badge className="bg-amber-100 text-amber-800">Medium</Badge>
      case 'LOW':
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
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const displayedComplaints = complaints.filter((c) => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false
    if (searchTerm) {
      const s = searchTerm.toLowerCase()
      return (
        String(c.seq).includes(s) ||
        c.description?.toLowerCase().includes(s) ||
        c.category?.toLowerCase().includes(s) ||
        c.subCategory?.toLowerCase().includes(s) ||
        formatLocation(c.location).toLowerCase().includes(s)
      )
    }
    return true
  })

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Escalated Complaints</h2>
          <p className="text-gray-600">Complaints escalated to Super Admin for review</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchMyComplaints()}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Escalated Complaints</CardTitle>
          <CardDescription>Complaints requiring Super Admin attention</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by ID, description, category, or location"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filter by Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="UNDER_PROCESSING">Under Processing</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="ON_HOLD">On Hold</SelectItem>
                <SelectItem value="FORWARDED">Forwarded</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="border rounded-lg p-4 animate-pulse">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      <div className="flex gap-2 mt-2">
                        <div className="h-6 bg-gray-200 rounded w-20"></div>
                        <div className="h-6 bg-gray-200 rounded w-16"></div>
                      </div>
                    </div>
                    <div className="h-8 bg-gray-200 rounded w-20"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : displayedComplaints.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">No escalated complaints found</p>
              <p className="text-sm mt-1">Complaints escalated to Super Admin will appear here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {displayedComplaints.map((complaint) => (
                <div
                  key={complaint.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">#{complaint.seq}</span>
                        <span className="text-gray-500">•</span>
                        <span className="text-sm text-gray-600">{complaint.category}</span>
                      </div>
                      <p className="text-sm text-gray-800 mt-1 line-clamp-2">{complaint.description}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {getStatusBadge(complaint.status)}
                        {getUrgencyBadge(complaint.urgency)}
                        {getDepartmentBadge((complaint as any).department)}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Submitted: {formatDate(complaint.submissionDate)}
                        {complaint.location && ` • ${formatLocation(complaint.location)}`}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => {
                        setSelectedComplaint(complaint)
                        setSelectedStatus(complaint.status || null)
                        setIsModalOpen(true)
                      }}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between space-x-2 py-4 mt-4 border-t">
              <div className="text-sm text-gray-500">
                Page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalItems} total)
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.currentPage === 1}
                  onClick={() => setPagination((prev) => ({ ...prev, currentPage: prev.currentPage - 1 }))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.currentPage >= pagination.totalPages}
                  onClick={() => setPagination((prev) => ({ ...prev, currentPage: prev.currentPage + 1 }))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}

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
                    <SuperMyComplaintLocationMap
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
                  <div className="mt-1">{getDepartmentBadge((selectedComplaint as any)?.department)}</div>
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
                    className="bg-red-600 hover:bg-red-700"
                    onClick={handleStatusUpdate}
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

function SuperMyComplaintLocationMap({ lat, lng, label }: { lat: number; lng: number; label?: string }) {
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
