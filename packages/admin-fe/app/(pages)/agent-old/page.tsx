// REVAMPED: This page now redirects to the new Tactical Intel design.
// Old implementation commented out below — see app/(pages)/Agent/page.tsx for the revamped version.
//
// "use client"
// import dynamic from 'next/dynamic'
// import { AdminLayout } from "@/components/admin-layout"
// import { AuthGuard } from "@/components/auth-guard"
// const AvailableComplaints = dynamic(() => import('@/components/available-complaints').then(m => m.AvailableComplaints), { ssr: false })
// export default function AgentPage() {
//   return (
//     <AuthGuard requiredAdminType="AGENT">
//       <AdminLayout>
//         <AvailableComplaints />
//       </AdminLayout>
//     </AuthGuard>
//   )
// }

import { redirect } from 'next/navigation'

export default function AgentPage() {
  redirect('/Agent')
}
