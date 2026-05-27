"use client"

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { StateAdminLayout } from "./components/state-admin-layout"
import { AuthGuard } from "@/components/auth-guard"

// Load the heavy, browser-only components only on the client (named exports)
const StateAvailableComplaints = dynamic(() => import('./components/state-available-complaints').then(m => m.StateAvailableComplaints), { ssr: false })
const StateMyComplaints = dynamic(() => import('./components/state-my-complaints').then(m => m.StateMyComplaints), { ssr: false })
const StateAnalytics = dynamic(() => import('./components/state-analytics').then(m => m.StateAnalytics), { ssr: false })
const MunicipalAdminManagement = dynamic(() => import('./components/MunicipalAdminManagement').then(m => m.MunicipalAdminManagement), { ssr: false })

export default function StatePage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'my-complaints' | 'reports' | 'municipal-management'>('dashboard')

  return (
    <AuthGuard requiredAdminType="STATE_ADMIN">
      <StateAdminLayout activeTab={activeTab} onTabChange={setActiveTab}>
        {activeTab === 'dashboard' && <StateAvailableComplaints />}
        {activeTab === 'my-complaints' && <StateMyComplaints />}
        {activeTab === 'reports' && <StateAnalytics />}
        {activeTab === 'municipal-management' && <MunicipalAdminManagement />}
        {activeTab === 'municipal-management' && (
          <div className="p-6">
            <div className="text-gray-600">Municipal Admin Department</div>
          </div>
        )}
      </StateAdminLayout>
    </AuthGuard>
  )
}
