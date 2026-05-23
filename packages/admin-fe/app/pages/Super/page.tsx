"use client"

import { AuthGuard } from "@/components/auth-guard"

export default function SuperPage() {
  return (
    <AuthGuard requiredAdminType="SUPER_ADMIN">
      <div>
        This is Super Admin Page
      </div>
    </AuthGuard>
  )
}
