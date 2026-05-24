"use client"

import { AdminLayout } from "@/components/admin-layout"
import { Analytics } from "@/components/analytics"
import { AuthGuard } from "@/components/auth-guard"

export default function ReportsPage() {
  return (
    <AuthGuard requiredAdminType={['AGENT', 'MUNICIPAL_ADMIN', 'STATE_ADMIN', 'SUPER_ADMIN']}>
      <AdminLayout>
        <Analytics />
      </AdminLayout>
    </AuthGuard>
  )
}
