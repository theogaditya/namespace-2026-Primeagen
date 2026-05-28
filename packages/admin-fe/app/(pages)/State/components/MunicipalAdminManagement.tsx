"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Users, UserPlus, RefreshCw, Building2, Shield, Loader2 } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { AddMunicipalAdminForm } from "./AddMunicipalAdminForm"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"

interface MunicipalAdmin {
  id: string
  adminId?: string
  fullName: string
  officialEmail: string
  phoneNumber?: string
  department?: string
  municipality?: string
  accessLevel?: string
  status?: string
  workloadLimit?: number
  currentWorkload?: number
  dateOfCreation?: string
}

export function MunicipalAdminManagement() {
  const [admins, setAdmins] = useState<MunicipalAdmin[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)

  const fetchMunicipalAdmins = useCallback(async () => {
    try {
      const token = localStorage.getItem("token")
      if (!token) {
        console.error("No token found")
        setLoading(false)
        return
      }

      const response = await fetch(`${API_URL}/api/state-admin/municipal-admins`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (data.success && data.data) {
        setAdmins(data.data)
      }
    } catch (err) {
      console.error("Error fetching municipal admins:", err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchMunicipalAdmins()
  }, [fetchMunicipalAdmins])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchMunicipalAdmins()
  }

  const handleFormSuccess = () => {
    setShowForm(false)
    fetchMunicipalAdmins() // Real-time refresh after creating
  }

  const handleToggleStatus = async (adminId: string, currentStatus: string) => {
    setUpdatingStatus(adminId)
    try {
      const token = localStorage.getItem("token")
      if (!token) return

      const newStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE"
      
      const response = await fetch(`${API_URL}/api/state-admin/municipal-admins/${adminId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        setAdmins(admins.map(admin => 
          admin.id === adminId ? { ...admin, status: newStatus } : admin
        ))
      }
    } catch (err) {
      console.error("Error updating admin status:", err)
    } finally {
      setUpdatingStatus(null)
    }
  }

  const formatDepartment = (dept?: string) => {
    if (!dept) return "—"
    return dept.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  }

  const activeCount = admins.filter((a) => a.status === "ACTIVE").length
  const inactiveCount = admins.filter((a) => a.status === "INACTIVE").length

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Municipal Admin Management</h1>
          <p className="text-gray-500 mt-1">Create and manage Municipal Admins under your jurisdiction</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
            className="border-gray-300"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            onClick={() => setShowForm(!showForm)}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            {showForm ? "View Admins" : "Add New Admin"}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-white border border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Admins</p>
                <p className="text-2xl font-bold text-gray-900">{admins.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Shield className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Active</p>
                <p className="text-2xl font-bold text-green-600">{activeCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Building2 className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Inactive</p>
                <p className="text-2xl font-bold text-red-600">{inactiveCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content */}
      {showForm ? (
        <AddMunicipalAdminForm
          onSuccess={handleFormSuccess}
          onCancel={() => setShowForm(false)}
        />
      ) : (
        <Card className="bg-white border border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg text-gray-900">Municipal Admins List</CardTitle>
            <CardDescription>All registered Municipal Admins in your state</CardDescription>
          </CardHeader>
          <CardContent>
            {admins.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No Municipal Admins found</p>
                <Button
                  onClick={() => setShowForm(true)}
                  className="mt-4 bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Create First Admin
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold text-gray-700">Name</TableHead>
                      <TableHead className="font-semibold text-gray-700">Email</TableHead>
                      <TableHead className="font-semibold text-gray-700">Municipality</TableHead>
                      <TableHead className="font-semibold text-gray-700">Department</TableHead>
                      <TableHead className="font-semibold text-gray-700">Status</TableHead>
                      <TableHead className="font-semibold text-gray-700">Workload</TableHead>
                      <TableHead className="font-semibold text-gray-700">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {admins.map((admin) => (
                      <TableRow key={admin.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium text-gray-900">
                          {admin.fullName}
                        </TableCell>
                        <TableCell className="text-gray-600">{admin.officialEmail}</TableCell>
                        <TableCell className="text-gray-600">{admin.municipality || "—"}</TableCell>
                        <TableCell className="text-gray-600">
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                            {formatDepartment(admin.department)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={admin.status === "ACTIVE" ? "default" : "secondary"}
                            className={
                              admin.status === "ACTIVE"
                                ? "bg-green-100 text-green-700 hover:bg-green-100"
                                : "bg-red-100 text-red-700 hover:bg-red-100"
                            }
                          >
                            {admin.status || "UNKNOWN"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {admin.currentWorkload ?? 0} / {admin.workloadLimit ?? 10}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-5 h-5 flex items-center justify-center">
                              {updatingStatus === admin.id && (
                                <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                              )}
                            </div>
                            <Switch
                              checked={admin.status === "ACTIVE"}
                              onCheckedChange={() => handleToggleStatus(admin.id, admin.status || "INACTIVE")}
                              disabled={updatingStatus === admin.id}
                            />
                            <span className="text-sm text-gray-500 w-16">
                              {admin.status === "ACTIVE" ? "Active" : "Inactive"}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
