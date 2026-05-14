import { AdminLayout } from "@/components/admin-layout"
import { JobManagement } from "@/components/job-management"

export default function AgentPage() {
  return (
    <AdminLayout>
      <JobManagement />
    </AdminLayout>
  )
}
