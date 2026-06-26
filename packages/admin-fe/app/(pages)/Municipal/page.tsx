"use client"

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { RevampedLayout } from "./components/layout"
import { AuthGuard } from "@/components/auth-guard"

const Dashboard = dynamic(() => import('./components/dashboard').then(m => m.MunicipalDashboard), { ssr: false })
const MyComplaints = dynamic(() => import('./components/my-complaints').then(m => m.MunicipalMyComplaints), { ssr: false })
const Analytics = dynamic(() => import('./components/analytics').then(m => m.MunicipalAnalytics), { ssr: false })
const AgentManagement = dynamic(() => import('./components/agent-management').then(m => m.AgentManagement), { ssr: false })
const Announcements = dynamic(() => import('./components/announcements').then(m => m.MunicipalAnnouncements), { ssr: false })

export default function MunicipalRevampedPage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'my-complaints' | 'reports' | 'agent-management' | 'announcements'>('dashboard')

  return (
    <AuthGuard requiredAdminType="MUNICIPAL_ADMIN">
      <RevampedLayout activeTab={activeTab} onTabChange={setActiveTab}>
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'my-complaints' && <MyComplaints />}
        {activeTab === 'reports' && <Analytics />}
        {activeTab === 'agent-management' && <AgentManagement />}
        {activeTab === 'announcements' && <Announcements />}
      </RevampedLayout>
    </AuthGuard>
  )
}
