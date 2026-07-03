// REVAMPED: This page now redirects to the new Tactical Intel design.
// Old implementation commented out below -see app/(pages)/Agent/reports/page.tsx for the revamped version.
//
// "use client"
// import { AdminLayout } from "@/components/admin-layout"
// import { Analytics } from "@/components/analytics"
// import { AuthGuard } from "@/components/auth-guard"
// export default function ReportsPage() {
//   return (
//     <AuthGuard requiredAdminType={['AGENT', 'MUNICIPAL_ADMIN', 'STATE_ADMIN', 'SUPER_ADMIN']}>
//       <AdminLayout>
//         <Analytics />
//       </AdminLayout>
//     </AuthGuard>
//   )
// }

import { redirect } from 'next/navigation'

export default function ReportsPage() {
  redirect('/Agent/reports')
}
