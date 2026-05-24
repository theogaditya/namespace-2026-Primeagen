"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  FileText,
  CheckCircle,
  ThumbsUp,
  Activity,
  Eye,
  X,
  MapPin,
  Calendar,
  User,
} from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import dynamic from "next/dynamic"
import { Pie } from "@visx/shape"
import { Group } from "@visx/group"
import { animated, useTransition, interpolate } from "@react-spring/web"
import type { PieArcDatum, ProvidedProps } from "@visx/shape/lib/shapes/Pie"
import {
  DUMMY_7DAY,
  STATUS_DISTRIBUTION,
  TOTAL_COMPLAINTS_FALLBACK,
  SOLVED_COMPLAINTS_FALLBACK,
  ESCALATED_COMPLAINTS_FALLBACK,
} from "@/lib/analytics.constants"

const Hotmap = dynamic(() => import("@/components/Hotmap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[400px] bg-gray-100 rounded-lg flex items-center justify-center text-gray-500">
      Loading map...
    </div>
  ),
})

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"

interface Complaint {
  id: string
  seq: number
  description: string
  subCategory: string
  status: string
  urgency: string
  upvoteCount: number
  submissionDate: string
  category: { id: string; name: string } | null
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
  } | null
}

interface AnalyticsData {
  totalComplaints: number
  solvedComplaints: number
  escalatedComplaints: number
  mostLikedComplaints: Complaint[]
  highestLikeCount: number
  complaintsOverTime: { date: string; registered: number; resolved: number }[]
  statusDistribution: { name: string; value: number; color: string }[]
}

interface StatusData {
  name: string
  value: number
  color: string
}

type AnimatedStyles = { startAngle: number; endAngle: number; opacity: number }

const fromLeaveTransition = ({ endAngle }: PieArcDatum<StatusData>) => ({
  startAngle: endAngle > Math.PI ? 2 * Math.PI : 0,
  endAngle: endAngle > Math.PI ? 2 * Math.PI : 0,
  opacity: 0,
})

const enterUpdateTransition = ({ startAngle, endAngle }: PieArcDatum<StatusData>) => ({
  startAngle,
  endAngle,
  opacity: 1,
})

type AnimatedPieProps = ProvidedProps<StatusData> & {
  animate?: boolean
  getKey: (d: PieArcDatum<StatusData>) => string
  getColor: (d: PieArcDatum<StatusData>) => string
  onClickDatum?: (d: PieArcDatum<StatusData>) => void
  delay?: number
}

function AnimatedPie({ animate, arcs, path, getKey, getColor }: AnimatedPieProps) {
  const transitions = useTransition<PieArcDatum<StatusData>, AnimatedStyles>(arcs, {
    from: animate ? fromLeaveTransition : enterUpdateTransition,
    enter: enterUpdateTransition,
    update: enterUpdateTransition,
    leave: fromLeaveTransition,
    keys: getKey,
  })
  return transitions((props, arc, { key }) => (
    <animated.path
      key={key}
      d={interpolate([props.startAngle, props.endAngle], (sA, eA) =>
        path({
          ...arc,
          startAngle: sA,
          endAngle: eA,
        })
      )}
      fill={getColor(arc)}
      style={{ opacity: props.opacity }}
    />
  ))
}

export function SuperAnalytics() {
  const [loading, setLoading] = useState(true)
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    totalComplaints: 0,
    solvedComplaints: 0,
    escalatedComplaints: 0,
    mostLikedComplaints: [],
    highestLikeCount: 0,
    complaintsOverTime: [],
    statusDistribution: [],
  })
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    fetchAnalytics()
    fetchMostLiked()
  }, [])

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem("token")
      if (!token) {
        setLoading(false)
        return
      }

      let complaints: any[] = []
      let page = 1
      const pageSize = 100
      let hasMore = true

      while (hasMore) {
        const res = await fetch(`/api/complaints/all?page=${page}&limit=${pageSize}`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
        })
        if (!res.ok) break

        const json = await res.json()
        if (!json.success || !Array.isArray(json.data)) break

        complaints = complaints.concat(json.data)

        if (json.data.length < pageSize) {
          hasMore = false
        } else {
          page++
        }
      }

      const total = complaints.length
      const solved = complaints.filter((c) => c.status === "COMPLETED").length
      const escalated = complaints.filter((c) => 
        c.status === "ESCALATED_TO_STATE_LEVEL" || 
        c.status === "ESCALATED_TO_MUNICIPAL_LEVEL"
      ).length

      let highestLikes = 0
      const mostLikedComplaints: Complaint[] = []
      for (const c of complaints) {
        const likes = c.upvoteCount || 0
        if (likes > highestLikes) {
          highestLikes = likes
          mostLikedComplaints.length = 0
          mostLikedComplaints.push(c)
        } else if (likes === highestLikes && likes > 0) {
          mostLikedComplaints.push(c)
        }
      }

      const now = new Date()
      const last7Days: { date: string; registered: number; resolved: number }[] = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now)
        d.setDate(d.getDate() - i)
        const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
        const dataIndex = 6 - i
        const sample = DUMMY_7DAY[dataIndex]
        last7Days.push({ date: dateStr, registered: sample.registered, resolved: sample.resolved })
      }

      setAnalyticsData({
        totalComplaints: total > 0 ? total : TOTAL_COMPLAINTS_FALLBACK,
        solvedComplaints: solved > 0 ? solved : SOLVED_COMPLAINTS_FALLBACK,
        escalatedComplaints: escalated > 0 ? escalated : ESCALATED_COMPLAINTS_FALLBACK,
        mostLikedComplaints,
        highestLikeCount: highestLikes,
        complaintsOverTime: last7Days,
        statusDistribution: STATUS_DISTRIBUTION,
      })
    } catch (error) {
      console.error("Error fetching analytics:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMostLiked = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const res = await fetch(`/api/complaints/most-liked`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      })

      if (!res.ok) return

      const json = await res.json()
      if (json && json.success && Array.isArray(json.data)) {
        setAnalyticsData((prev) => ({
          ...prev,
          mostLikedComplaints: json.data,
          highestLikeCount: json.highestLikeCount || (json.data[0]?.upvoteCount ?? 0),
        }))
      }
    } catch (err) {
      console.error('Error fetching most-liked:', err)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-80 bg-gray-200 rounded-lg"></div>
            <div className="h-80 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Complaints</CardTitle>
            <FileText className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{TOTAL_COMPLAINTS_FALLBACK}</div>
            <p className="text-xs text-muted-foreground">Platform-wide</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{SOLVED_COMPLAINTS_FALLBACK}</div>
            <p className="text-xs text-muted-foreground">
              {TOTAL_COMPLAINTS_FALLBACK > 0
                ? `${((SOLVED_COMPLAINTS_FALLBACK / TOTAL_COMPLAINTS_FALLBACK) * 100).toFixed(1)}% resolution rate`
                : "No data"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Escalated</CardTitle>
            <Activity className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ESCALATED_COMPLAINTS_FALLBACK}</div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Most Liked</CardTitle>
            <ThumbsUp className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.highestLikeCount}</div>
            <p className="text-xs text-muted-foreground">Highest upvotes</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Line Chart - Complaints Over Time */}
        <Card>
          <CardHeader>
            <CardTitle>Complaints Trend (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={(() => {
                    const now = new Date()
                    return DUMMY_7DAY.map((d, idx) => {
                      const day = new Date(now)
                      day.setDate(now.getDate() - (6 - idx))
                      return {
                        date: day.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                        registered: d.registered,
                        resolved: d.resolved,
                      }
                    })
                  })()}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="registered"
                    stroke="#dc2626"
                    strokeWidth={2}
                    name="Registered"
                  />
                  <Line
                    type="monotone"
                    dataKey="resolved"
                    stroke="#22c55e"
                    strokeWidth={2}
                    name="Resolved"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pie Chart - Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center">
              <svg width={300} height={300}>
                <Group top={150} left={150}>
                  <Pie
                    data={STATUS_DISTRIBUTION}
                    pieValue={(d) => d.value}
                    outerRadius={120}
                    innerRadius={60}
                    cornerRadius={3}
                    padAngle={0.02}
                  >
                    {(pie) => (
                      <AnimatedPie
                        {...pie}
                        animate
                        getKey={(arc) => arc.data.name}
                        getColor={(arc) => arc.data.color}
                      />
                    )}
                  </Pie>
                </Group>
              </svg>
            </div>
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {STATUS_DISTRIBUTION.map((item) => (
                <div key={item.name} className="flex items-center gap-1">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs text-gray-600">
                    {item.name} ({item.value})
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Most Liked Complaints */}
      <Card>
        <CardHeader>
          <CardTitle>Most Liked Complaints</CardTitle>
        </CardHeader>
        <CardContent>
          {analyticsData.mostLikedComplaints.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No upvoted complaints found</p>
          ) : (
            <div className="space-y-4">
              {analyticsData.mostLikedComplaints.slice(0, 5).map((complaint) => (
                <div
                  key={complaint.id}
                  className="flex items-start justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => {
                    setSelectedComplaint(complaint)
                    setIsModalOpen(true)
                  }}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">#{complaint.seq}</span>
                      <Badge variant="secondary">{complaint.category?.name || "Uncategorized"}</Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{complaint.description}</p>
                    {complaint.location && (
                      <p className="text-xs text-gray-400 mt-1 flex items-center">
                        <MapPin className="h-3 w-3 mr-1" />
                        {complaint.location.locality}, {complaint.location.city}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-red-500">
                    <ThumbsUp className="h-4 w-4" />
                    <span className="font-medium">{complaint.upvoteCount}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hotmap */}
      <Card>
        <CardHeader>
          <CardTitle>Complaint Hotspots</CardTitle>
        </CardHeader>
        <CardContent>
          <Hotmap />
        </CardContent>
      </Card>

      {/* Complaint Detail Modal */}
      {isModalOpen && selectedComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-lg max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white p-4 border-b flex items-center justify-between">
              <div>
                <h3 className="font-bold">Complaint #{selectedComplaint.seq}</h3>
                <p className="text-sm text-gray-500">{selectedComplaint.category?.name}</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-gray-700">Description</h4>
                <p className="text-sm text-gray-600 mt-1">{selectedComplaint.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-semibold text-gray-700">Status</h4>
                  <Badge className="mt-1">{selectedComplaint.status}</Badge>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-700">Urgency</h4>
                  <Badge className="mt-1">{selectedComplaint.urgency}</Badge>
                </div>
              </div>
              {selectedComplaint.location && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700">Location</h4>
                  <p className="text-sm text-gray-600 mt-1 flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    {[
                      selectedComplaint.location.street,
                      selectedComplaint.location.locality,
                      selectedComplaint.location.city,
                      selectedComplaint.location.district,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                </div>
              )}
              {selectedComplaint.complainant && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700">Complainant</h4>
                  <p className="text-sm text-gray-600 mt-1 flex items-center">
                    <User className="h-4 w-4 mr-1" />
                    {selectedComplaint.complainant.name}
                  </p>
                </div>
              )}
              <div>
                <h4 className="text-sm font-semibold text-gray-700">Submitted</h4>
                <p className="text-sm text-gray-600 mt-1 flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  {new Date(selectedComplaint.submissionDate).toLocaleDateString("en-IN", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
              <div className="flex items-center gap-2 pt-2 border-t">
                <ThumbsUp className="h-4 w-4 text-red-500" />
                <span className="font-medium">{selectedComplaint.upvoteCount} upvotes</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
