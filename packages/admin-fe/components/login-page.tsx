"use client"

import * as React from "react"
import { LoginForm } from "./login-form"

type RoleKey = "SUPER_ADMIN" | "STATE_ADMIN" | "MUNICIPAL_ADMIN" | "AGENT"

const ROLE_INFO: Record<
  RoleKey,
  { title: string; subtitle: string; bullets: React.ReactNode[]; color: string; bg: string; border: string }
> = {
  AGENT: {
    title: "Agent",
    subtitle: "Field / implementation agent",
    bullets: [
      "View assigned complaints: Open complaint details, attachments, complainant info, and history.",
      (
        <span>
          Update status & resolve cases: Move complaints through statuses{' '}
          <span className="inline-flex items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-semibold text-yellow-800 bg-yellow-100 rounded">Under Processing</span>
            <span className="px-2 py-0.5 text-xs font-semibold text-green-800 bg-green-100 rounded">Completed</span>
            <span className="px-2 py-0.5 text-xs font-semibold text-red-800 bg-red-100 rounded">Rejected</span>
          </span>
          , set resolution date.
        </span>
      ),
      "Escalate to municipal level: Escalate assigned complaints to the municipal admin when required.",
      "Assign / accept work: Claim or be assigned complaints and manage workload limits.",
      "Add notes & evidence: Upload photos/docs, add resolution notes and comments for auditing.",
    ],
    color: "text-sky-700",
    bg: "bg-sky-50",
    border: "border-sky-300",
  },
  MUNICIPAL_ADMIN: {
    title: "Municipal Admin",
    subtitle: "Municipal-level administrator",
    bullets: [
      "Create & manage agents: Register agents, set/adjust workload limits, activate/deactivate accounts.",
      "Manage municipal complaints: View and filter complaints for the municipality, update statuses, and assign agents.",
      "Escalate to state: Escalate municipal complaints to the state admin and manage escalation workflow.",
      "Review & reporting: Review municipal progress and generate municipality-level reports.",
    ],
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-300",
  },
  STATE_ADMIN: {
    title: "State Admin",
    subtitle: "State government officer",
    bullets: [
      "Create & manage municipal admins: Create municipal-admin accounts, assign municipalities, activate/deactivate.",
      "Monitor district/municipal progress: View complaints and metrics across municipalities and districts.",
      "Approve state-level actions & escalations: Approve fund/schedule actions, handle escalations from municipal admins.",
      "Analytics & data exports: Download aggregated reports and access trend dashboards.",
      "Manage user registrations: Oversee user/admin registration and role assignments within the state.",
    ],
    color: "text-violet-700",
    bg: "bg-violet-50",
    border: "border-violet-300",
  },
  SUPER_ADMIN: {
    title: "Super Admin",
    subtitle: "Platform administrator",
    bullets: [
      "Platform & user administration: Create Super/State/Municipal admins, manage roles, permissions and account status.",
      "System-wide complaint oversight: View or remove complaints, handle escalations that reach the top level.",
      "Audit, exports & maintenance: Access audit logs, run system-wide exports and maintenance tasks.",
      "Configure integrations & global settings: Configure external integrations and global platform settings.",
    ],
    color: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-500",
  },
}

export default function LoginPage() {
  const [selected, setSelected] = React.useState<RoleKey>("AGENT")

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center py-12 px-6 sm:px-8 lg:px-12">
      <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left info column */}
        <aside className="lg:col-span-7 bg-transparent">
          <div className="max-w-2xl">
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4">Welcome to <span className="text-blue-600">Unified Admin Portal</span></h2>
            <p className="text-lg font-semibold text-gray-800 mb-2">Access the SwarajDesk Grievance Redressal System</p>
            <p className="text-gray-600 mb-6">Use this portal to view and manage complaints, track resolution progress, submit updates, and coordinate with field officers and municipal teams.</p>

            {/* 'What you can do' driven by the form dropdown selection */}
            {/* No role boxes shown — the text updates automatically when user selects Admin Type in the form */}

            {/* Dynamic 'What you can do' for selected role */}
            <div className={`mt-6 rounded-md overflow-hidden`}>
              <div className={`${ROLE_INFO[selected].bg} border-l-4 ${ROLE_INFO[selected].border} p-6` }>
                <h3 className={`font-semibold mb-3 ${ROLE_INFO[selected].color}`}>What you can do:</h3>
                <ul className="text-gray-700 space-y-3">
                  {ROLE_INFO[selected].bullets.map((b, i) => (
                    <li key={i} className="flex items-start gap-3">
                        <svg className={`${ROLE_INFO[selected].color} w-5 h-5 mt-0.5 flexshrink-0`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        <div className="text-base leading-relaxed">
                          {typeof b === 'string' ? (
                            b.includes(":") ? (
                              <span><span className="font-semibold">{b.split(":")[0]}:</span> {b.split(":").slice(1).join(":").trim()}</span>
                            ) : (
                              <span>{b}</span>
                            )
                          ) : (
                            b
                          )}
                        </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mt-4 rounded-md">
                <strong className="text-amber-800">Note:</strong>
                <span className="block text-sm text-amber-700 mt-1">Only verified and registered users with an assigned role can access this portal. Contact your State Admin for registration or role assignment.</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Right column - login card */}
        <main className="lg:col-span-5 flex items-start justify-center">
          <div className="w-full max-w-md">
            <LoginForm
              adminType={selected as any}
              onAdminTypeChange={(t) => {
                if ((["AGENT", "MUNICIPAL_ADMIN", "STATE_ADMIN", "SUPER_ADMIN"] as unknown as RoleKey[]).includes(t as RoleKey)) {
                  setSelected(t as RoleKey)
                }
              }}
            />
          </div>
        </main>
      </div>
    </div>
  )
}
