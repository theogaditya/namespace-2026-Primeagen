"use client"

import { AdminLayout } from "@/components/admin-layout"
import { MyComplaints } from "@/components/my-complaints"
import { AuthGuard } from "@/components/auth-guard"

export default function UsersPage() {
  return (
    <AuthGuard requiredAdminType={['AGENT', 'MUNICIPAL_ADMIN', 'STATE_ADMIN', 'SUPER_ADMIN']}>
      <AdminLayout>
        <MyComplaints />
      </AdminLayout>
    </AuthGuard>
  )
}
