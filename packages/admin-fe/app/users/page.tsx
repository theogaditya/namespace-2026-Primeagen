// REVAMPED: This page now redirects to the new Tactical Intel design.
// Old implementation commented out below -see app/(pages)/Agent/my-complaints/page.tsx for the revamped version.
//
// "use client"
// import { AdminLayout } from "@/components/admin-layout"
// import { MyComplaints } from "@/components/my-complaints"
// import { AuthGuard } from "@/components/auth-guard"
// export default function UsersPage() {
//   return (
//     <AuthGuard requiredAdminType={['AGENT', 'MUNICIPAL_ADMIN', 'STATE_ADMIN', 'SUPER_ADMIN']}>
//       <AdminLayout>
//         <MyComplaints />
//       </AdminLayout>
//     </AuthGuard>
//   )
// }

import { redirect } from 'next/navigation'

export default function UsersPage() {
  redirect('/Agent/my-complaints')
}
