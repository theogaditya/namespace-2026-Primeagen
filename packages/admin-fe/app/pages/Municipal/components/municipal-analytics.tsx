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
import ResolutionRateCard from "@/components/ui/ResolutionRateCard"

// Dynamically import Hotmap to avoid SSR issues with Leaflet
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
  mostLikedComplaints: Complaint[]
  highestLikeCount: number
  complaintsOverTime: { date: string; registered: number; resolved: number }[]
  statusDistribution: { name: string; value: number; color: string }[]
}

// Types for the animated pie chart
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
  onClickDatum: (d: PieArcDatum<StatusData>) => void
}

function AnimatedPie({
  animate,
  arcs,
  path,
  getKey,
  getColor,
  onClickDatum,
}: AnimatedPieProps) {
  const transitions = useTransition<PieArcDatum<StatusData>, AnimatedStyles>(arcs, {
    from: animate ? fromLeaveTransition : enterUpdateTransition,
    enter: enterUpdateTransition,
    update: enterUpdateTransition,
    leave: animate ? fromLeaveTransition : enterUpdateTransition,
    keys: getKey,
  })

  return transitions((props, arc, { key }) => {
    const [centroidX, centroidY] = path.centroid(arc)
    const hasSpaceForLabel = arc.endAngle - arc.startAngle >= 0.3

    return (
      <g key={key}>
        <animated.path
          d={interpolate([props.startAngle, props.endAngle], (startAngle, endAngle) =>
            path({
              ...arc,
              startAngle,
              endAngle,
            })
          )}
          fill={getColor(arc)}
          onClick={() => onClickDatum(arc)}
          onTouchStart={() => onClickDatum(arc)}
          style={{ cursor: "pointer" }}
          stroke="#fff"
          strokeWidth={2}
        />
        {hasSpaceForLabel && (
          <animated.g style={{ opacity: props.opacity }}>
            <text
              fill="#fff"
              x={centroidX}
              y={centroidY}
              dy=".33em"
              fontSize={11}
              fontWeight={600}
              textAnchor="middle"
              pointerEvents="none"
            >
              {Math.round((arc.endAngle - arc.startAngle) / (2 * Math.PI) * 100)}%
            </text>
          </animated.g>
        )}
      </g>
    )
  })
}

// Interactive Pie Chart Component
interface InteractivePieChartProps {
  data: StatusData[]
  width: number
  height: number
}

function InteractivePieChart({ data, width, height }: InteractivePieChartProps) {
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)
  
  if (width < 10 || data.length === 0) return null

  const margin = { top: 20, right: 20, bottom: 20, left: 20 }
  const innerWidth = width - margin.left - margin.right
  const innerHeight = height - margin.top - margin.bottom
  const radius = Math.min(innerWidth, innerHeight) / 2
  const centerY = innerHeight / 2
  const centerX = innerWidth / 2
  const donutThickness = 45

  const filteredData = selectedStatus 
    ? data.filter((d) => d.name === selectedStatus)
    : data

  const selectedData = selectedStatus 
    ? data.find((d) => d.name === selectedStatus)
    : null

  const totalValue = data.reduce((sum, d) => sum + d.value, 0)

  return (
    <div className="relative flex flex-col items-center">
      <svg width={width} height={height}>
        <Group top={centerY + margin.top} left={centerX + margin.left}>
          <Pie
            data={filteredData}
            pieValue={(d) => d.value}
            outerRadius={radius}
            innerRadius={radius - donutThickness}
            cornerRadius={3}
            padAngle={0.02}
          >
            {(pie) => (
              <AnimatedPie
                {...pie}
                animate={true}
                getKey={(arc) => arc.data.name}
                onClickDatum={({ data }) =>
                  setSelectedStatus(
                    selectedStatus && selectedStatus === data.name ? null : data.name
                  )
                }
                getColor={(arc) => arc.data.color}
              />
            )}
          </Pie>
          
          {/* Center text when selected */}
          {selectedData && (
            <g>
              <text
                textAnchor="middle"
                y={-10}
                fontSize={24}
                fontWeight={700}
                fill={selectedData.color}
              >
                {selectedData.value}
              </text>
              <text
                textAnchor="middle"
                y={15}
                fontSize={12}
                fill="#6b7280"
              >
                {selectedData.name}
              </text>
              <text
                textAnchor="middle"
                y={35}
                fontSize={11}
                fill="#9ca3af"
              >
                {((selectedData.value / totalValue) * 100).toFixed(1)}% of total
              </text>
            </g>
          )}
          
          {/* Default center text */}
          {!selectedData && (
            <g>
              <text
                textAnchor="middle"
                y={-5}
                fontSize={20}
                fontWeight={700}
                fill="#374151"
              >
                {totalValue}
              </text>
              <text
                textAnchor="middle"
                y={15}
                fontSize={11}
                fill="#6b7280"
              >
                Total
              </text>
            </g>
          )}
        </Group>
      </svg>
      
      {/* Legend */}
      <div className="mt-4 flex flex-wrap justify-center gap-3">
        {data.map((item) => (
          <button
            key={item.name}
            onClick={() => setSelectedStatus(
              selectedStatus === item.name ? null : item.name
            )}
            className={`flex items-center gap-2 px-2 py-1 rounded text-xs transition-all ${
              selectedStatus === item.name 
                ? "bg-gray-100 ring-2 ring-offset-1" 
                : "hover:bg-gray-50"
            }`}
            style={{ 
              ...(selectedStatus === item.name && { 
                boxShadow: `0 0 0 2px ${item.color}` 
              })
            }}
          >
            <span 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: item.color }}
            />
            <span className="text-gray-700">{item.name}</span>
            <span className="text-gray-500">({item.value})</span>
          </button>
        ))}
      </div>
      
      {/* Instruction text */}
      <p className="text-center text-xs text-gray-400 mt-2">
        Click on segments to view details
      </p>
    </div>
  )
}

export function MunicipalAnalytics() {
  const [loading, setLoading] = useState(true)
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    totalComplaints: 0,
    solvedComplaints: 0,
    mostLikedComplaints: [],
    highestLikeCount: 0,
    complaintsOverTime: [],
    statusDistribution: [],
  })
  const [showMostLikedModal, setShowMostLikedModal] = useState(false)
  const [animateIcons, setAnimateIcons] = useState(false)

  useEffect(() => {
    fetchAnalytics()
    fetchMostLiked()
    // Start animations after 1 second delay (so page fully loads first)
    const startTimer = setTimeout(() => {
      setAnimateIcons(true)
    }, 1000)
    return () => {
      clearTimeout(startTimer)
    }
  }, [])

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem("token")
      if (!token) {
        console.error("No token found")
        setLoading(false)
        return
      }

      // Fetch all complaints using Next.js API route (proxies to backend).
      const complaints: Complaint[] = []
      const pageSize = 200
      let page = 1
      while (true) {
        const res = await fetch(`/api/complaints/all?page=${page}&limit=${pageSize}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) {
          throw new Error(`Failed to fetch complaints (page ${page})`)
        }

        const data = await res.json()
        const items: Complaint[] = data.complaints || []
        complaints.push(...items)

        if (items.length < pageSize) break
        page += 1
        if (page > 200) break
      }

      // Compute analytics
      const total = complaints.length
      const solved = complaints.filter((c) => c.status === "COMPLETED").length

      // Find the highest like count and the complaint(s) with that count
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

      // Dummy data for complaints over time (last 7 days)
      const now = new Date()
      const last7Days: { date: string; registered: number; resolved: number }[] = []
      const dummyData = [
        { registered: 12, resolved: 5 },
        { registered: 18, resolved: 9 },
        { registered: 15, resolved: 11 },
        { registered: 22, resolved: 16 },
        { registered: 19, resolved: 17 },
        { registered: 25, resolved: 22 },
        { registered: 28, resolved: 26 },
      ]
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now)
        d.setDate(d.getDate() - i)
        const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
        const dataIndex = 6 - i
        last7Days.push({ 
          date: dateStr, 
          registered: dummyData[dataIndex].registered,
          resolved: dummyData[dataIndex].resolved
        })
      }

      // Dummy status distribution
      const statusDistribution = [
        { name: "COMPLETED", value: 156, color: "#22c55e" },
        { name: "UNDER PROCESSING", value: 42, color: "#f59e0b" },
        { name: "REGISTERED", value: 28, color: "#3b82f6" },
        { name: "FORWARDED", value: 18, color: "#8b5cf6" },
        { name: "ON HOLD", value: 8, color: "#6b7280" },
        { name: "ESCALATED", value: 5, color: "#06b6d4" },
      ]

      setAnalyticsData({
        totalComplaints: total > 0 ? total : 257,
        solvedComplaints: solved > 0 ? solved : 156,
        mostLikedComplaints,
        highestLikeCount: highestLikes,
        complaintsOverTime: last7Days,
        statusDistribution,
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
      })

      if (!res.ok) {
        console.error('Failed fetching most-liked complaints')
        return
      }

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

  const getStatusBadge = (status: string) => {
    const statusStyles: Record<string, string> = {
      REGISTERED: "bg-blue-100 text-blue-800",
      UNDER_PROCESSING: "bg-yellow-100 text-yellow-800",
      COMPLETED: "bg-green-100 text-green-800",
      ON_HOLD: "bg-gray-100 text-gray-800",
      FORWARDED: "bg-purple-100 text-purple-800",
      REJECTED: "bg-red-100 text-red-800",
      ESCALATED_TO_MUNICIPAL_LEVEL: "bg-cyan-100 text-cyan-800",
      ESCALATED_TO_STATE_LEVEL: "bg-pink-100 text-pink-800",
    }
    return (
      <Badge className={statusStyles[status] || "bg-gray-100 text-gray-800"}>
        {status.replace(/_/g, " ")}
      </Badge>
    )
  }

  const getUrgencyBadge = (urgency: string) => {
    const urgencyStyles: Record<string, string> = {
      LOW: "bg-green-100 text-green-800",
      MEDIUM: "bg-yellow-100 text-yellow-800",
      HIGH: "bg-orange-100 text-orange-800",
      CRITICAL: "bg-red-100 text-red-800",
    }
    return (
      <Badge className={urgencyStyles[urgency] || "bg-gray-100 text-gray-800"}>
        {urgency}
      </Badge>
    )
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
          <div className="h-96 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 mt-1">Real-time insights into municipal complaint management</p>
        </div>
        <Button onClick={fetchAnalytics} variant="outline" size="sm">
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Complaints */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Complaints</CardTitle>
            <FileText 
              className={`h-5 w-5 transition-all duration-300 ${
                animateIcons 
                  ? "text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.8)] animate-[pulse_2s_ease-in-out_infinite]" 
                  : "text-gray-400"
              }`} 
            />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{analyticsData.totalComplaints}</div>
            <p className="text-xs text-gray-500 mt-1">All registered complaints in municipality</p>
          </CardContent>
        </Card>

        {/* Solved Issues */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Solved Issues</CardTitle>
            <CheckCircle 
              className={`h-5 w-5 transition-all duration-300 ${
                animateIcons 
                  ? "text-green-500 drop-shadow-[0_0_8px_rgba(34,197,94,0.8)] animate-[pulse_2s_ease-in-out_infinite]" 
                  : "text-gray-400"
              }`} 
            />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{analyticsData.solvedComplaints}</div>
            <p className="text-xs text-gray-500 mt-1">
              {analyticsData.totalComplaints > 0
                ? `${((analyticsData.solvedComplaints / analyticsData.totalComplaints) * 100).toFixed(1)}% resolution rate`
                : "No complaints yet"}
            </p>
          </CardContent>
        </Card>

        {/* Most Liked Complaint */}
        <Card
          className={analyticsData.mostLikedComplaints.length > 0 ? "cursor-pointer hover:shadow-md transition-shadow" : ""}
          onClick={() => analyticsData.mostLikedComplaints.length > 0 && setShowMostLikedModal(true)}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Most Liked Complaint</CardTitle>
            <ThumbsUp 
              className={`h-5 w-5 transition-all ${
                animateIcons 
                  ? "text-purple-500 drop-shadow-[0_0_8px_rgba(168,85,247,0.8)] animate-[thumbsUpJump_1.6s_ease-out_forwards]" 
                  : "text-gray-400"
              }`}
              style={{
                transformOrigin: "bottom right",
              }}
            />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-3xl font-bold text-purple-600">
                {analyticsData.highestLikeCount}
              </div>
              <span className="text-sm text-gray-500">likes</span>
            </div>
            <p className="text-xs text-gray-500 mt-1 truncate">
              {analyticsData.mostLikedComplaints.length > 0 ? (
                analyticsData.mostLikedComplaints.length === 1 ? (
                  <span className="inline-flex items-center gap-1">
                    <Eye className="h-3 w-3 text-blue-600" />
                    <span className="text-blue-600">View</span>
                  </span>
                ) : (
                  `${analyticsData.mostLikedComplaints.length} complaints - Click to view all`
                )
              ) : (
                "No complaints yet"
              )}
            </p>
          </CardContent>
        </Card>

        {/* Queue Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Queue Status</CardTitle>
            <div className="relative h-5 w-5">
              <Activity 
                className="h-5 w-5 text-gray-400"
              />
              {animateIcons && (
                <svg 
                  className="absolute inset-0 h-5 w-5" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <defs>
                    <linearGradient id="municipalEkgGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#ef4444">
                        <animate attributeName="stop-color" values="#ef4444;#eab308;#22c55e" dur="3s" fill="freeze" />
                      </stop>
                      <stop offset="50%" stopColor="#ef4444">
                        <animate attributeName="stop-color" values="#ef4444;#eab308;#22c55e" dur="3s" fill="freeze" />
                      </stop>
                      <stop offset="100%" stopColor="#ef4444">
                        <animate attributeName="stop-color" values="#ef4444;#eab308;#22c55e" dur="3s" fill="freeze" />
                      </stop>
                    </linearGradient>
                  </defs>
                  <path 
                    d="M22 12h-4l-3 9L9 3l-3 9H2" 
                    stroke="url(#municipalEkgGradient)"
                    strokeWidth="2.5"
                    fill="none"
                    style={{
                      strokeDasharray: 60,
                      strokeDashoffset: 60,
                      animation: "ekgTrace 3s ease-in-out forwards infinite",
                    }}
                  />
                </svg>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
              <span className="text-xl font-bold text-green-600">Healthy</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Municipal Queue is Live</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Line Chart - Complaints Over Time */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Complaints Trend
            </CardTitle>
            <p className="text-sm text-gray-500">Registered vs Resolved - Last 7 days</p>
          </CardHeader>
          <CardContent className="pl-0">
            <div className="h-[380px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analyticsData.complaintsOverTime} margin={{ left: 0, right: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#6b7280" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="registered"
                    name="Registered"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: "#3b82f6", strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="resolved"
                    name="Resolved"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={{ fill: "#22c55e", strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pie Chart - Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Status Distribution
            </CardTitle>
            <p className="text-sm text-gray-500">Breakdown by complaint status</p>
          </CardHeader>
          <CardContent className="flex justify-center">
            <div className="h-[380px] flex flex-col items-center justify-center">
              {analyticsData.statusDistribution.length > 0 ? (
                <InteractivePieChart
                  data={analyticsData.statusDistribution}
                  width={320}
                  height={280}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500">
                  No data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hotmap Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">
            Municipal Complaint Hotspots
          </CardTitle>
          <p className="text-sm text-gray-500">Geographic distribution of complaints in your municipality</p>
        </CardHeader>
        <CardContent>
          <Hotmap />
        </CardContent>
      </Card>

      {/* Resolution rates card below the map */}
      <div className="mt-6">
        <ResolutionRateCard />
      </div>

      {/* Most Liked Complaint Modal */}
      {showMostLikedModal && analyticsData.mostLikedComplaints.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowMostLikedModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">
                {analyticsData.mostLikedComplaints.length === 1
                  ? `Most Liked Complaint #${analyticsData.mostLikedComplaints[0].seq}`
                  : `Most Liked Complaints (${analyticsData.mostLikedComplaints.length} tied at ${analyticsData.highestLikeCount} likes)`}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMostLikedModal(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            {analyticsData.mostLikedComplaints.length === 1 ? (
              <div className="p-6 space-y-4 overflow-y-auto">
                <div className="flex items-center gap-2 flex-wrap">
                  {getStatusBadge(analyticsData.mostLikedComplaints[0].status)}
                  {getUrgencyBadge(analyticsData.mostLikedComplaints[0].urgency)}
                  <Badge className="bg-purple-100 text-purple-800">
                    <ThumbsUp className="h-3 w-3 mr-1" />
                    {analyticsData.mostLikedComplaints[0].upvoteCount} upvotes
                  </Badge>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500">Category</h3>
                  <p className="text-gray-900">
                    {analyticsData.mostLikedComplaints[0].category?.name || "N/A"} -{" "}
                    {analyticsData.mostLikedComplaints[0].subCategory}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500">Description</h3>
                  <p className="text-gray-900 whitespace-pre-wrap">
                    {analyticsData.mostLikedComplaints[0].description}
                  </p>
                </div>

                {analyticsData.mostLikedComplaints[0].location && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 flex items-center gap-1">
                      <MapPin className="h-4 w-4" /> Location
                    </h3>
                    <p className="text-gray-900">
                      {[
                        analyticsData.mostLikedComplaints[0].location.street,
                        analyticsData.mostLikedComplaints[0].location.locality,
                        analyticsData.mostLikedComplaints[0].location.city,
                        analyticsData.mostLikedComplaints[0].location.district,
                        analyticsData.mostLikedComplaints[0].location.pin,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  </div>
                )}

                {analyticsData.mostLikedComplaints[0].complainant && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 flex items-center gap-1">
                      <User className="h-4 w-4" /> Complainant
                    </h3>
                    <p className="text-gray-900">
                      {analyticsData.mostLikedComplaints[0].complainant.name} (
                      {analyticsData.mostLikedComplaints[0].complainant.email})
                    </p>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-medium text-gray-500 flex items-center gap-1">
                    <Calendar className="h-4 w-4" /> Submitted
                  </h3>
                  <p className="text-gray-900">
                    {new Date(analyticsData.mostLikedComplaints[0].submissionDate).toLocaleString()}
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-y-auto max-h-[70vh]">
                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Likes</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {analyticsData.mostLikedComplaints.map((complaint) => (
                      <tr key={complaint.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          #{complaint.seq}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900 max-w-xs">
                          <p className="line-clamp-2">{complaint.description}</p>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                          {complaint.category?.name || "N/A"}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {getStatusBadge(complaint.status)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <Badge className="bg-purple-100 text-purple-800">
                            <ThumbsUp className="h-3 w-3 mr-1" />
                            {complaint.upvoteCount}
                          </Badge>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(complaint.submissionDate).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
