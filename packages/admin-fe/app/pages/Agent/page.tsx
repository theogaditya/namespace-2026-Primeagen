import { AdminLayout } from "@/components/admin-layout"
import { AvailableComplaints } from "@/components/available-complaints"

export default function AgentPage() {
  return (
    <AdminLayout>
      <AvailableComplaints />
    </AdminLayout>
  )
}
