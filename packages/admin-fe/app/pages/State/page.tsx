"use client"

import { AuthGuard } from "@/components/auth-guard"

export default function StatePage() {
  return (
    <AuthGuard requiredAdminType="STATE_ADMIN">
      <div>
        This is State Admin Page
      </div>
    </AuthGuard>
  )
}
