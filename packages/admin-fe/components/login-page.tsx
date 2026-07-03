"use client"

import * as React from "react"
import {
  ClipboardList,
  RefreshCw,
  Wifi,
  MessageCircle,
  MapPin,
  ArrowUpCircle,
  FileText,
  Cpu,
  Users,
  Globe2,
  Megaphone,
  ShieldAlert,
  BarChart3,
  Zap,
  Clipboard,
  Activity,
  PieChart,
  FileDown,
  Sparkles,
  Globe,
  UserCog,
  LineChart,
  ShieldCheck,
  Download,
} from 'lucide-react'
import { LoginForm } from "./login-form"

type RoleKey = "CIVIC_PARTNER" | "STATE_ADMIN" | "MUNICIPAL_ADMIN" | "AGENT"

interface RoleCapability {
  icon: React.ComponentType<any> | string;
  title: string;
  desc: string;
}

// Typewriter component for the heading (placed before ROLE_INFO so types parse cleanly)
type TypewriterProps = {
  phrases: string[]
  accentFrom: string
  accentTo: string
  accentText: string
  typingSpeed?: number
  deletingSpeed?: number
  pause?: number
}

function Typewriter({ phrases, accentFrom, accentTo, accentText, typingSpeed = 60, deletingSpeed = 30, pause = 1200 }: TypewriterProps) {
  const [idx, setIdx] = React.useState(0)
  const [display, setDisplay] = React.useState('')
  const [typing, setTyping] = React.useState(true)
  const timeoutRef = React.useRef<number | null>(null)
  const displayRef = React.useRef(display)

  const cursorBg = accentText.replace('text-', 'bg-')

  React.useEffect(() => {
    // reset only when the phrase *content* changes — do NOT reset on accent/role changes
    setIdx(0)
    setDisplay('')
    setTyping(true)
  }, [phrases.join('|')])

  React.useEffect(() => {
    const current = (phrases.join('|').split('|')[idx]) || ''
    const tick = () => {
      const disp = displayRef.current
      if (typing) {
        if (disp.length < current.length) {
          const next = current.slice(0, disp.length + 1)
          setDisplay(next)
          timeoutRef.current = window.setTimeout(tick, typingSpeed)
        } else {
          timeoutRef.current = window.setTimeout(() => setTyping(false), pause)
        }
      } else {
        if (disp.length > 0) {
          const next = current.slice(0, disp.length - 1)
          setDisplay(next)
          timeoutRef.current = window.setTimeout(tick, deletingSpeed)
        } else {
          setIdx((i) => (i + 1) % phrases.length)
          setTyping(true)
          timeoutRef.current = window.setTimeout(tick, typingSpeed)
        }
      }
    }

    timeoutRef.current = window.setTimeout(tick, typingSpeed)

    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, typing, phrases.join('|'), typingSpeed, deletingSpeed, pause])

  React.useEffect(() => {
    displayRef.current = display
  }, [display])

  return (
    <span className={`inline-flex items-center gap-2`}>
      <span className={`bg-gradient-to-r ${accentFrom} ${accentTo} bg-clip-text text-transparent font-extrabold`}>{display}</span>
      <span className={`${cursorBg} w-1 h-5 rounded animate-pulse inline-block`} aria-hidden />
    </span>
  )
}

const ROLE_INFO: Record<
  RoleKey,
  {
    title: string;
    subtitle: string;
    capabilities: RoleCapability[];
    color: string;
    bg: string;
    border: string;
    accentFrom: string;
    accentTo: string;
    tag: string;
  }
> = {
  AGENT: {
    title: "Field Agent",
    subtitle: "On-ground complaint resolution & verification",
    tag: "SKY · TEAL",
    accentFrom: "from-sky-500",
    accentTo: "to-cyan-400",
    capabilities: [
      { icon: ClipboardList, title: "Smart Complaint Queue", desc: "Urgency-sorted dashboard of all assigned complaints with one-click filters." },
      { icon: RefreshCw, title: "Status Lifecycle Engine", desc: "Move complaints through Under Processing → Completed / Rejected with auto citizen notifications." },
      { icon: Wifi, title: "UAV Field Verification", desc: "Upload drone footage; AI cross-matches with complaint evidence and outputs a confidence score." },
      { icon: MessageCircle, title: "Live Citizen Chat", desc: "Per-complaint real-time messaging thread with citizens, preserved for audit." },
      { icon: ArrowUpCircle, title: "One-Click Escalation", desc: "Escalate to Municipal Admin with a structured reason note in seconds." },
      { icon: FileText, title: "Immutable Audit Trail", desc: "Every action hashed and timestamped for tamper-proof accountability." },
    ],
    color: "text-sky-700",
    bg: "bg-sky-50",
    border: "border-sky-300",
  },
  MUNICIPAL_ADMIN: {
    title: "Municipal Admin",
    subtitle: "Complaint operations, agents & governance",
    tag: "EMERALD · TEAL",
    accentFrom: "from-emerald-500",
    accentTo: "to-teal-400",
    capabilities: [
      { icon: Cpu, title: "AI Report Generator", desc: "One-click executive summaries, district analysis, SLA breach reports—written by AI from live data." },
      { icon: Zap, title: "AI Action Suggestions", desc: "LLM tells you exactly what to do next: escalate, reassign, trigger auto-assign, or broadcast an announcement." },
      { icon: Users, title: "Agent Management Hub", desc: "Create/deactivate agents, set workload caps, monitor individual resolution rates." },
      { icon: Globe2, title: "Complaint Heatmap", desc: "Google-powered density heatmap across districts reveals pressure zones for proactive deployment." },
      { icon: Megaphone, title: "Public Announcements", desc: "Broadcast priority-flagged notices to citizens -municipality-scoped or city-wide." },
      { icon: ShieldAlert, title: "State Escalation Workflow", desc: "Escalate unresolvable complaints upward with structured reason tagging and live status tracking." },
    ],
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-300",
  },
  STATE_ADMIN: {
    title: "State Admin",
    subtitle: "State-wide oversight, analytics & governance",
    tag: "VIOLET · PURPLE",
    accentFrom: "from-violet-500",
    accentTo: "to-purple-400",
    capabilities: [
      { icon: Globe, title: "District Intelligence Command", desc: "Cross-municipality complaint volumes, resolution rates & SLA breaches—aggregated in real-time." },
      { icon: UserCog, title: "Municipal Admin Management", desc: "Create, provision and deactivate Municipal Admin accounts with full jurisdiction assignment." },
      { icon: LineChart, title: "AI Strategic Reports", desc: "District-level analysis, category insights, and timeline-ranked policy recommendations from AI." },
      { icon: ShieldCheck, title: "Escalation Oversight", desc: "Review and act on escalations from Municipal Admins—approve actions or re-route with resolution notes." },
      { icon: Download, title: "Data Export Engine", desc: "Download municipality-scoped or state-wide complaint data and AI reports as JSON/PDF." },
      { icon: Zap, title: "AI Action Executor", desc: "Execute AI-suggested actions—escalate, update status, publish announcement—directly from the report panel." },
    ],
    color: "text-violet-700",
    bg: "bg-violet-50",
    border: "border-violet-300",
  },
  CIVIC_PARTNER: {
    title: "Civic Partner",
    subtitle: "NGOs & government bodies -citizen engagement at scale",
    tag: "ROSE · PINK",
    accentFrom: "from-rose-500",
    accentTo: "to-pink-400",
      capabilities: [
      { icon: ClipboardList, title: "Survey Templates Library", desc: "Pre-built, customizable survey templates (health, sanitation, civic feedback) to launch quickly with role-based defaults." },
      { icon: FileDown, title: "Offline Mobile Collection", desc: "Field teams can collect responses offline on mobile devices; submissions sync automatically when connectivity is restored." },
      { icon: Activity, title: "Real-Time Response Stream", desc: "Watch responses arrive live -total submissions, completion rate, and velocity updated every few seconds." },
      { icon: MapPin, title: "Geographic Participation Heatmap", desc: "See which wards and districts are responding to enable targeted outreach in low-participation zones." },
      { icon: PieChart, title: "Per-Question Analytics", desc: "Option distribution for MCQs, average ratings, text responses with turnout breakdown per question." },
      { icon: FileDown, title: "One-Click Data Export", desc: "Download full response datasets in CSV or JSON for offline analysis or donor reporting." },
      { icon: Sparkles, title: "AI Sentiment Engine", desc: "Open-ended responses auto-scored for positive / neutral / negative sentiment at scale." },
    ],
    color: "text-rose-700",
    bg: "bg-rose-50",
    border: "border-rose-300",
  },
}

export default function LoginPage() {
  const [selected, setSelected] = React.useState<RoleKey>("AGENT")
  const info = ROLE_INFO[selected]

  return (
    <div className="bg-white flex items-start justify-center py-16 px-6 sm:px-8 lg:px-12">
      <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-10">

        {/* ── Left -role capabilities ── */}
        <aside className="lg:col-span-7">
          {/* Hero headline */}
          <div className="mb-8">
            <p className="text-xs font-bold tracking-[0.2em] text-gray-400 uppercase mb-2">
              SwarajDesk · Unified Admin Portal
            </p>
            <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight mb-3">
              Governance,<br />
              <span className="inline-block">
                <Typewriter
                  phrases={["purpose-built.", "field-ready.", "citizen-centered."]}
                  accentFrom={info.accentFrom}
                  accentTo={info.accentTo}
                  accentText={info.color}
                />
              </span>
            </h2>
            <p className="text-gray-500 text-base max-w-lg leading-relaxed">
              Select your role to explore the tools available to you. Each tier is designed for precise,
              high-impact action.
            </p>
          </div>

          {/* Role selector pills */}
          <div className="flex flex-wrap gap-2 mb-8">
            {(Object.keys(ROLE_INFO) as RoleKey[]).map((r) => {
              const ri = ROLE_INFO[r]
              const isActive = r === selected
              return (
                <button
                  key={r}
                  onClick={() => setSelected(r)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-semibold border transition-all duration-150
                    ${isActive
                      ? `${ri.bg} ${ri.color} ${ri.border} shadow-sm`
                      : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-800'
                    }`}
                >
                  {ri.title}
                </button>
              )
            })}
          </div>

          {/* Role header */}
          <div className={`flex items-center gap-3 mb-5 pb-4 border-b ${info.border}`}>
            <div className={`${info.bg} rounded-xl px-3 py-1`}>
              <span className={`text-xs font-bold tracking-widest uppercase ${info.color}`}>
                {info.tag}
              </span>
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">{info.title}</p>
              <p className="text-gray-400 text-xs">{info.subtitle}</p>
            </div>
          </div>

          {/* Capability grid -2 cols */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {info.capabilities.map((cap, i) => {
              if (typeof cap.icon === 'string') {
                return (
                  <div
                    key={i}
                    className={`${info.bg} rounded-2xl p-4 border ${info.border} border-opacity-40 hover:border-opacity-100 transition-all`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 flex items-center justify-center rounded-md bg-white/0">
                        <span className="text-xl mt-0.5 select-none">{cap.icon}</span>
                      </div>
                      <div>
                        <p className={`text-sm font-bold ${info.color} mb-0.5`}>{cap.title}</p>
                        <p className="text-xs text-gray-500 leading-relaxed">{cap.desc}</p>
                      </div>
                    </div>
                  </div>
                )
              }

              const Icon = cap.icon as React.ComponentType<any>
              return (
                <div
                  key={i}
                  className={`${info.bg} rounded-2xl p-4 border ${info.border} border-opacity-40 hover:border-opacity-100 transition-all`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 flex items-center justify-center rounded-md bg-white/0">
                      <Icon className={`${info.color.replace('text-', 'text-')} w-5 h-5`} />
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${info.color} mb-0.5`}>{cap.title}</p>
                      <p className="text-xs text-gray-500 leading-relaxed">{cap.desc}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Access note */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
            <div className="p-2 rounded-md bg-amber-100">
              <ShieldAlert className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-800 mb-0.5">Verified access only</p>
              <p className="text-xs text-amber-700 leading-relaxed">
                Only users with an assigned role can access this portal.
                Contact your State Admin for registration or role assignment.
              </p>
            </div>
          </div>
        </aside>

        {/* ── Right -login card ── */}
        <main className="lg:col-span-5 flex items-start justify-center">
          <div className="w-full max-w-md">
            <LoginForm
              adminType={selected as any}
              onAdminTypeChange={(t) => {
                if ((["AGENT", "MUNICIPAL_ADMIN", "STATE_ADMIN", "CIVIC_PARTNER"] as unknown as RoleKey[]).includes(t as RoleKey)) {
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
