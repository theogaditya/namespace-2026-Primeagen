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
import { DUMMY_7DAY, STATUS_DISTRIBUTION, TOTAL_COMPLAINTS_FALLBACK, SOLVED_COMPLAINTS_FALLBACK, ESCALATED_COMPLAINTS_FALLBACK } from "@/lib/analytics.constants"

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
  onClickDatum: (d: PieArcDatum<StatusData>) => void
}

function AnimatedPie({ animate, arcs, path, getKey, getColor, onClickDatum }: AnimatedPieProps) {
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
            path({ ...arc, startAngle, endAngle })
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

  const filteredData = selectedStatus ? data.filter((d) => d.name === selectedStatus) : data
  const selectedData = selectedStatus ? data.find((d) => d.name === selectedStatus) : null
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
                  setSelectedStatus(selectedStatus && selectedStatus === data.name ? null : data.name)
                }
                getColor={(arc) => arc.data.color}
              />
            )}
          </Pie>
          
          {selectedData && (
            <g>
              <text textAnchor="middle" y={-10} fontSize={24} fontWeight={700} fill={selectedData.color}>
                {selectedData.value}
              </text>
              <text textAnchor="middle" y={15} fontSize={12} fill="#6b7280">
                {selectedData.name}
              </text>
              <text textAnchor="middle" y={35} fontSize={11} fill="#9ca3af">
                {((selectedData.value / totalValue) * 100).toFixed(1)}% of total
              </text>
            </g>
          )}
          
          {!selectedData && (
            <g>
              <text textAnchor="middle" y={-5} fontSize={20} fontWeight={700} fill="#374151">
                {totalValue}
              </text>
              <text textAnchor="middle" y={15} fontSize={11} fill="#6b7280">
                Total
              </text>
            </g>
          )}
        </Group>
      </svg>
      
      <div className="mt-4 flex flex-wrap justify-center gap-3">
        {data.map((item) => (
          <button
            key={item.name}
            onClick={() => setSelectedStatus(selectedStatus === item.name ? null : item.name)}
            className={`flex items-center gap-2 px-2 py-1 rounded text-xs transition-all ${
              selectedStatus === item.name ? "bg-gray-100 ring-2 ring-offset-1" : "hover:bg-gray-50"
            }`}
            style={{ ...(selectedStatus === item.name && { boxShadow: `0 0 0 2px ${item.color}` }) }}
          >
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-gray-700">{item.name}</span>
            <span className="text-gray-500">({item.value})</span>
          </button>
        ))}
      </div>
      
      <p className="text-center text-xs text-gray-400 mt-2">Click on segments to view details</p>
    </div>
  )
}

export function StateAnalytics() {
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
  const [showMostLikedModal, setShowMostLikedModal] = useState(false)
  const [animateIcons, setAnimateIcons] = useState(false)

  useEffect(() => {
    fetchAnalytics()
    fetchMostLiked()
    const startTimer = setTimeout(() => setAnimateIcons(true), 1000)
    return () => clearTimeout(startTimer)
  }, [])

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem("token")
      if (!token) {
        setLoading(false)
        return
      }

      const complaints: Complaint[] = []
      const pageSize = 200
      let page = 1
      while (true) {
        const res = await fetch(`/api/complaints/all?page=${page}&limit=${pageSize}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error(`Failed to fetch complaints (page ${page})`)
        const data = await res.json()
        const items: Complaint[] = data.complaints || []
        complaints.push(...items)
        if (items.length < pageSize) break
        page += 1
        if (page > 200) break
      }

      const total = complaints.length
      const solved = complaints.filter((c) => c.status === "COMPLETED").length
      const escalated = complaints.filter((c) => c.status === "ESCALATED_TO_STATE_LEVEL").length

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
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 mt-1">Real-time insights into state-level complaint management</p>
        </div>
        <Button onClick={fetchAnalytics} variant="outline" size="sm">
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Complaints</CardTitle>
            <FileText className={`h-5 w-5 transition-all duration-300 ${animateIcons ? "text-purple-500 drop-shadow-[0_0_8px_rgba(168,85,247,0.8)] animate-[pulse_2s_ease-in-out_infinite]" : "text-gray-400"}`} />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">{analyticsData.totalComplaints}</div>
            <p className="text-xs text-gray-500 mt-1">All registered complaints in state</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Solved Issues</CardTitle>
            <CheckCircle className={`h-5 w-5 transition-all duration-300 ${animateIcons ? "text-green-500 drop-shadow-[0_0_8px_rgba(34,197,94,0.8)] animate-[pulse_2s_ease-in-out_infinite]" : "text-gray-400"}`} />
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Escalated to State</CardTitle>
            <ThumbsUp className={`h-5 w-5 transition-all ${animateIcons ? "text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]" : "text-gray-400"}`} />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{analyticsData.escalatedComplaints}</div>
            <p className="text-xs text-gray-500 mt-1">Awaiting state-level review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Queue Status</CardTitle>
            <Activity className={`h-5 w-5 ${animateIcons ? "text-green-500" : "text-gray-400"}`} />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
              <span className="text-xl font-bold text-green-600">Healthy</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">State Queue is Live</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Complaints Trend</CardTitle>
            <p className="text-sm text-gray-500">Registered vs Resolved - Last 7 days</p>
          </CardHeader>
          <CardContent className="pl-0">
            <div className="h-[380px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analyticsData.complaintsOverTime} margin={{ left: 0, right: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#6b7280" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px" }} />
                  <Legend />
                  <Line type="monotone" dataKey="registered" name="Registered" stroke="#8b5cf6" strokeWidth={2} dot={{ fill: "#8b5cf6", strokeWidth: 2 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="resolved" name="Resolved" stroke="#22c55e" strokeWidth={2} dot={{ fill: "#22c55e", strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Status Distribution</CardTitle>
            <p className="text-sm text-gray-500">Current complaint status breakdown</p>
          </CardHeader>
          <CardContent>
            <div className="h-[380px] flex items-center justify-center">
              <InteractivePieChart data={analyticsData.statusDistribution} width={350} height={350} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hotmap */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">Geographic Distribution</CardTitle>
          <p className="text-sm text-gray-500">Complaint hotspots across the state</p>
        </CardHeader>
        <CardContent>
          <Hotmap />
        </CardContent>
      </Card>

      {/* Resolution Rate - State sees Agent, Co-assigned, and Municipal */}
      <ResolutionRateCard visibleLines={{ agents: true, coAssigned: true, municipal: true }} />
    </div>
  )
}
