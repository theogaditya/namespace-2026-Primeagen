"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Users, UserPlus, RefreshCw, Shield, Building2, MapPin, Loader2, Filter } from "lucide-react"
import { AddAdminForm } from "./AddAdminForm"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"

type FilterType = "ALL" | "STATE_ADMIN" | "MUNICIPAL_ADMIN"

interface Admin {
  id: string
  name: string
  email: string
  department?: string
  accessLevel?: string
  status?: string
  state?: string
  municipality?: string
}

export function AdminManagement() {
  const [admins, setAdmins] = useState<Admin[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<FilterType>("ALL")

  const fetchAdmins = useCallback(async () => {
    try {
      const token = localStorage.getItem("token")
      if (!token) {
        console.error("No token found")
        setLoading(false)
        return
      }

      const response = await fetch(`${API_URL}/api/super-admin/admins`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (data.success && data.admins) {
        setAdmins(data.admins)
      }
    } catch (err) {
      console.error("Error fetching admins:", err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchAdmins()
  }, [fetchAdmins])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchAdmins()
  }

  const handleFormSuccess = () => {
    setShowForm(false)
    fetchAdmins() // Real-time refresh after creating
  }

  const formatDepartment = (dept?: string) => {
    if (!dept) return "—"
    return dept.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  }

  const formatAccessLevel = (level?: string) => {
    if (!level) return "—"
    switch (level) {
      case "DEPT_STATE_ADMIN":
        return "State Admin"
      case "DEPT_MUNICIPAL_ADMIN":
        return "Municipal Admin"
      case "SUPER_ADMIN":
        return "Super Admin"
      default:
        return level.replace(/_/g, " ")
    }
  }

  const stateAdmins = admins.filter((a) => a.accessLevel === "DEPT_STATE_ADMIN")
  const municipalAdmins = admins.filter((a) => a.accessLevel === "DEPT_MUNICIPAL_ADMIN")
  const activeCount = admins.filter((a) => a.status === "ACTIVE").length

  // Filter admins based on selected filter
  const filteredAdmins = filter === "ALL" 
    ? admins 
    : filter === "STATE_ADMIN" 
      ? stateAdmins 
      : municipalAdmins

  const getFilterLabel = () => {
    switch (filter) {
      case "STATE_ADMIN":
        return "State Admins"
      case "MUNICIPAL_ADMIN":
        return "Municipal Admins"
      default:
        return "All Admins"
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-red-600" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Management</h1>
          <p className="text-gray-500 mt-1">Create and manage State and Municipal Admins</p>
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
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            {showForm ? "View Admins" : "Add New Admin"}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="bg-white border border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Users className="h-5 w-5 text-red-600" />
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
              <div className="p-2 bg-purple-100 rounded-lg">
                <MapPin className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">State Admins</p>
                <p className="text-2xl font-bold text-purple-600">{stateAdmins.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Municipal Admins</p>
                <p className="text-2xl font-bold text-blue-600">{municipalAdmins.length}</p>
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
      </div>

      {/* Content */}
      {showForm ? (
        <AddAdminForm
          onSuccess={handleFormSuccess}
          onCancel={() => setShowForm(false)}
        />
      ) : (
        <Card className="bg-white border border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="text-lg text-gray-900">{getFilterLabel()}</CardTitle>
              <CardDescription>
                {filter === "ALL" 
                  ? "State and Municipal Admins across the system" 
                  : filter === "STATE_ADMIN"
                    ? "All State level administrators"
                    : "All Municipal level administrators"
                }
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <Select value={filter} onValueChange={(value) => setFilter(value as FilterType)}>
                <SelectTrigger className="w-[180px] border-gray-300">
                  <SelectValue placeholder="Filter admins" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-gray-600" />
                      <span>All Admins</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="STATE_ADMIN">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-purple-600" />
                      <span>State Admins</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="MUNICIPAL_ADMIN">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-blue-600" />
                      <span>Municipal Admins</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {filteredAdmins.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">
                  {filter === "ALL" 
                    ? "No admins found" 
                    : `No ${filter === "STATE_ADMIN" ? "State" : "Municipal"} Admins found`
                  }
                </p>
                <Button
                  onClick={() => setShowForm(true)}
                  className="mt-4 bg-red-600 hover:bg-red-700 text-white"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Create {filter === "MUNICIPAL_ADMIN" ? "Municipal" : filter === "STATE_ADMIN" ? "State" : ""} Admin
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold text-gray-700">Name</TableHead>
                      <TableHead className="font-semibold text-gray-700">Email</TableHead>
                      {filter === "ALL" && (
                        <TableHead className="font-semibold text-gray-700">Access Level</TableHead>
                      )}
                      <TableHead className="font-semibold text-gray-700">Department</TableHead>
                      <TableHead className="font-semibold text-gray-700">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAdmins.map((admin) => (
                      <TableRow key={admin.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium text-gray-900">
                          {admin.name}
                        </TableCell>
                        <TableCell className="text-gray-600">{admin.email}</TableCell>
                        {filter === "ALL" && (
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                admin.accessLevel === "DEPT_STATE_ADMIN"
                                  ? "bg-purple-100 text-purple-700 border-purple-200"
                                  : "bg-blue-100 text-blue-700 border-blue-200"
                              }
                            >
                              {formatAccessLevel(admin.accessLevel)}
                            </Badge>
                          </TableCell>
                        )}
                        <TableCell className="text-gray-600">
                          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
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
