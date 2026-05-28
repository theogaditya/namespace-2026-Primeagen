"use client"

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { SuperAdminLayout } from "./components/super-admin-layout"
import { AuthGuard } from "@/components/auth-guard"

// Load the heavy, browser-only components only on the client (named exports)
const SuperAvailableComplaints = dynamic(() => import('./components/super-available-complaints').then(m => m.SuperAvailableComplaints), { ssr: false })
const SuperAnalytics = dynamic(() => import('./components/super-analytics').then(m => m.SuperAnalytics), { ssr: false })
const AdminManagement = dynamic(() => import('./components/AdminManagement').then(m => m.AdminManagement), { ssr: false })

export default function SuperPage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'reports' | 'Admin-Management'>('dashboard')

  return (
    <AuthGuard requiredAdminType="SUPER_ADMIN">
      <SuperAdminLayout activeTab={activeTab} onTabChange={setActiveTab}>
        {activeTab === 'dashboard' && <SuperAvailableComplaints />}
        {activeTab === 'reports' && <SuperAnalytics />}
        {activeTab === 'Admin-Management' && <AdminManagement />}
        {activeTab === 'Admin-Management' && (
          <div className="p-6">
            <div className="text-gray-600"></div>
          </div>
        )}
      </SuperAdminLayout>
    </AuthGuard>
  )
}
