"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Users, Briefcase, CheckCircle, DollarSign, TrendingUp, Eye, MoreHorizontal, Star } from "lucide-react"

const metrics = [
  {
    title: "Total Users",
    value: "12,847",
    change: "+12%",
    changeType: "positive" as const,
    icon: Users,
    description: "8,234 Freelancers • 4,613 Clients",
  },
  {
    title: "Active Jobs",
    value: "1,234",
    change: "+8%",
    changeType: "positive" as const,
    icon: Briefcase,
    description: "567 Open • 667 In Progress",
  },
  {
    title: "Completed Projects",
    value: "8,945",
    change: "+23%",
    changeType: "positive" as const,
    icon: CheckCircle,
    description: "This month: 1,234",
  },
  {
    title: "Platform Earnings",
    value: "$45,678",
    change: "+15%",
    changeType: "positive" as const,
    icon: DollarSign,
    description: "Commission earned",
  },
  {
    title: "Total Revenue",
    value: "$234,567",
    change: "+18%",
    changeType: "positive" as const,
    icon: TrendingUp,
    description: "All transactions",
  },
]

const recentActivities = [
  {
    id: 1,
    user: "Sarah Ahmed",
    action: "completed project",
    project: "Website Development",
    time: "2 minutes ago",
    avatar: "/placeholder.svg?height=32&width=32",
  },
  {
    id: 2,
    user: "Rahul Sharma",
    action: "posted new job",
    project: "Mobile App Design",
    time: "15 minutes ago",
    avatar: "/placeholder.svg?height=32&width=32",
  },
  {
    id: 3,
    user: "Fatima Khan",
    action: "received payment",
    project: "Logo Design",
    time: "1 hour ago",
    avatar: "/placeholder.svg?height=32&width=32",
  },
  {
    id: 4,
    user: "Arjun Patel",
    action: "submitted proposal",
    project: "Content Writing",
    time: "2 hours ago",
    avatar: "/placeholder.svg?height=32&width=32",
  },
]

const topFreelancers = [
  {
    id: 1,
    name: "Priya Sharma",
    skill: "Full Stack Developer",
    rating: 4.9,
    earnings: "$12,450",
    projects: 23,
    avatar: "/placeholder.svg?height=40&width=40",
  },
  {
    id: 2,
    name: "Ahmed Hassan",
    skill: "UI/UX Designer",
    rating: 4.8,
    earnings: "$9,870",
    projects: 18,
    avatar: "/placeholder.svg?height=40&width=40",
  },
  {
    id: 3,
    name: "Ravi Kumar",
    skill: "Digital Marketer",
    rating: 4.7,
    earnings: "$8,650",
    projects: 15,
    avatar: "/placeholder.svg?height=40&width=40",
  },
]

const recentJobs = [
  {
    id: 1,
    title: "E-commerce Website Development",
    client: "TechCorp Ltd",
    budget: "$2,500 - $5,000",
    applications: 12,
    status: "Open",
    postedTime: "2 hours ago",
  },
  {
    id: 2,
    title: "Mobile App UI Design",
    client: "StartupXYZ",
    budget: "$1,000 - $2,000",
    applications: 8,
    status: "Open",
    postedTime: "4 hours ago",
  },
  {
    id: 3,
    title: "Content Writing for Blog",
    client: "Digital Agency",
    budget: "$500 - $800",
    applications: 15,
    status: "Hired",
    postedTime: "1 day ago",
  },
]

export function DashboardOverview() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="text-gray-600">Welcome back! Here's what's happening on ExtrUp today.</p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {metrics.map((metric) => (
          <Card key={metric.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">{metric.title}</CardTitle>
              <metric.icon className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{metric.value}</div>
              <div className="flex items-center space-x-2 text-xs">
                <span className="text-green-600 font-medium">{metric.change}</span>
                <span className="text-gray-500">from last month</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">{metric.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activities */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Recent Activities</CardTitle>
            <CardDescription>Latest platform activities and updates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-center space-x-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={activity.avatar || "/placeholder.svg"} alt={activity.user} />
                  <AvatarFallback>
                    {activity.user
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">{activity.user}</span> {activity.action}{" "}
                    <span className="font-medium text-blue-600">"{activity.project}"</span>
                  </p>
                  <p className="text-xs text-gray-500">{activity.time}</p>
                </div>
              </div>
            ))}
            <Button variant="outline" className="w-full mt-4">
              View All Activities
            </Button>
          </CardContent>
        </Card>

        {/* Top Freelancers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Top Freelancers This Week</CardTitle>
            <CardDescription>Highest performing freelancers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {topFreelancers.map((freelancer, index) => (
              <div key={freelancer.id} className="flex items-center space-x-3">
                <div className="shrink-0">
                  <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
                    {index + 1}
                  </span>
                </div>
                <Avatar className="h-10 w-10">
                  <AvatarImage src={freelancer.avatar || "/placeholder.svg"} alt={freelancer.name} />
                  <AvatarFallback>
                    {freelancer.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{freelancer.name}</p>
                  <p className="text-xs text-gray-500">{freelancer.skill}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <div className="flex items-center">
                      <Star className="h-3 w-3 text-yellow-400 fill-current" />
                      <span className="text-xs text-gray-600 ml-1">{freelancer.rating}</span>
                    </div>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-600">{freelancer.projects} projects</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{freelancer.earnings}</p>
                  <p className="text-xs text-gray-500">earned</p>
                </div>
              </div>
            ))}
            <Button variant="outline" className="w-full mt-4">
              View All Freelancers
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Job Postings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Recent Job Postings</CardTitle>
          <CardDescription>Latest jobs posted on the platform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentJobs.map((job) => (
              <div key={job.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-900">{job.title}</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    by {job.client} • {job.postedTime}
                  </p>
                  <div className="flex items-center space-x-4 mt-2">
                    <span className="text-sm text-gray-600">{job.budget}</span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-sm text-gray-600">{job.applications} applications</span>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Badge
                    variant={job.status === "Open" ? "default" : "secondary"}
                    className={job.status === "Open" ? "bg-green-100 text-green-800" : ""}
                  >
                    {job.status}
                  </Badge>
                  <Button variant="ghost" size="icon">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <Button variant="outline" className="w-full mt-4">
            View All Jobs
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
