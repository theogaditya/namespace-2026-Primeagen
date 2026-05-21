"use client"

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { MunicipalAdminLayout } from "./components/municipal-admin-layout"
import { AuthGuard } from "@/components/auth-guard"

// Load the heavy, browser-only components only on the client (named exports)
const MunicipalAvailableComplaints = dynamic(() => import('./components/municipal-available-complaints').then(m => m.MunicipalAvailableComplaints), { ssr: false })
const MunicipalMyComplaints = dynamic(() => import('./components/municipal-my-complaints').then(m => m.MunicipalMyComplaints), { ssr: false })
const MunicipalAnalytics = dynamic(() => import('./components/municipal-analytics').then(m => m.MunicipalAnalytics), { ssr: false })

export default function MunicipalPage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'my-complaints' | 'reports' | 'agent-management'>('dashboard')

  return (
    <AuthGuard requiredAdminType="MUNICIPAL_ADMIN">
      <MunicipalAdminLayout activeTab={activeTab} onTabChange={setActiveTab}>
        {activeTab === 'dashboard' && <MunicipalAvailableComplaints />}
        {activeTab === 'my-complaints' && <MunicipalMyComplaints />}
        {activeTab === 'reports' && <MunicipalAnalytics />}
        {activeTab === 'agent-management' && (
          <div className="p-6">
            <div className="text-gray-600">Agent management</div>
          </div>
        )}
      </MunicipalAdminLayout>
    </AuthGuard>
  )
}
