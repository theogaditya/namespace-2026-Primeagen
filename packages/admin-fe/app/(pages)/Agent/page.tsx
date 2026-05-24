"use client"

import dynamic from 'next/dynamic'
import { AdminLayout } from "@/components/admin-layout"
import { AuthGuard } from "@/components/auth-guard"

// Load the heavy, browser-only complaints component only on the client (named export)
const AvailableComplaints = dynamic(() => import('@/components/available-complaints').then(m => m.AvailableComplaints), { ssr: false })

export default function AgentPage() {
  return (
    <AuthGuard requiredAdminType="AGENT">
      <AdminLayout>
        <AvailableComplaints />
      </AdminLayout>
    </AuthGuard>
  )
}
