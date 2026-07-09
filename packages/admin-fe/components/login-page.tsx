"use client"

import * as React from "react"
import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
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
  ChevronRight,
} from 'lucide-react'
import { LoginForm } from "./login-form"

/* ------------------------------------------------------------------ */
/*  Gumroad / newvault shared constants                                 */
/* ------------------------------------------------------------------ */
const GRID_BG: React.CSSProperties = {
  backgroundColor: "#F4F4F4",
  backgroundImage:
    "radial-gradient(circle at 1px 1px, #e2e8f0 1px, transparent 0)",
  backgroundSize: "24px 24px",
}
const SHADOW_BASE = "8px 8px 0px 0px rgba(0,0,0,1)"
const SHADOW_HOVER = "12px 12px 0px 0px #7C3AED"
const HEADLINE: React.CSSProperties = {
  fontFamily: "'Plus Jakarta Sans', sans-serif",
}

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
    tag: string;
    iconBg: string;
    accentHex: string;
    capabilities: RoleCapability[];
  }
> = {
  AGENT: {
    title: "Field Agent",
    subtitle: "On-ground complaint resolution & verification",
    tag: "FIELD · AGENT",
    iconBg: "#e0f2fe",
    accentHex: "#0284c7",
    capabilities: [
      { icon: ClipboardList, title: "Smart Complaint Queue", desc: "Urgency-sorted dashboard of all assigned complaints with one-click filters." },
      { icon: RefreshCw, title: "Status Lifecycle Engine", desc: "Move complaints through Under Processing → Completed / Rejected with auto citizen notifications." },
      { icon: Wifi, title: "UAV Field Verification", desc: "Upload drone footage; AI cross-matches with complaint evidence and outputs a confidence score." },
      { icon: MessageCircle, title: "Live Citizen Chat", desc: "Per-complaint real-time messaging thread with citizens, preserved for audit." },
      { icon: ArrowUpCircle, title: "One-Click Escalation", desc: "Escalate to Municipal Admin with a structured reason note in seconds." },
      { icon: FileText, title: "Immutable Audit Trail", desc: "Every action hashed and timestamped for tamper-proof accountability." },
    ],
  },
  MUNICIPAL_ADMIN: {
    title: "Municipal Admin",
    subtitle: "Complaint operations, agents & governance",
    tag: "MUNICIPAL · ADMIN",
    iconBg: "#d1fae5",
    accentHex: "#059669",
    capabilities: [
      { icon: Cpu, title: "AI Report Generator", desc: "One-click executive summaries, district analysis, SLA breach reports—written by AI from live data." },
      { icon: Zap, title: "AI Action Suggestions", desc: "LLM tells you exactly what to do next: escalate, reassign, trigger auto-assign, or broadcast an announcement." },
      { icon: Users, title: "Agent Management Hub", desc: "Create/deactivate agents, set workload caps, monitor individual resolution rates." },
      { icon: Globe2, title: "Complaint Heatmap", desc: "Google-powered density heatmap across districts reveals pressure zones for proactive deployment." },
      { icon: Megaphone, title: "Public Announcements", desc: "Broadcast priority-flagged notices to citizens — municipality-scoped or city-wide." },
      { icon: ShieldAlert, title: "State Escalation Workflow", desc: "Escalate unresolvable complaints upward with structured reason tagging and live status tracking." },
    ],
  },
  STATE_ADMIN: {
    title: "State Admin",
    subtitle: "State-wide oversight, analytics & governance",
    tag: "STATE · ADMIN",
    iconBg: "#ede9fe",
    accentHex: "#7C3AED",
    capabilities: [
      { icon: Globe, title: "District Intelligence Command", desc: "Cross-municipality complaint volumes, resolution rates & SLA breaches—aggregated in real-time." },
      { icon: UserCog, title: "Municipal Admin Management", desc: "Create, provision and deactivate Municipal Admin accounts with full jurisdiction assignment." },
      { icon: LineChart, title: "AI Strategic Reports", desc: "District-level analysis, category insights, and timeline-ranked policy recommendations from AI." },
      { icon: ShieldCheck, title: "Escalation Oversight", desc: "Review and act on escalations from Municipal Admins—approve actions or re-route with resolution notes." },
      { icon: Download, title: "Data Export Engine", desc: "Download municipality-scoped or state-wide complaint data and AI reports as JSON/PDF." },
      { icon: Zap, title: "AI Action Executor", desc: "Execute AI-suggested actions—escalate, update status, publish announcement—directly from the report panel." },
    ],
  },
  CIVIC_PARTNER: {
    title: "Civic Partner",
    subtitle: "NGOs & government bodies — citizen engagement at scale",
    tag: "CIVIC · PARTNER",
    iconBg: "#ffe4e6",
    accentHex: "#e11d48",
    capabilities: [
      { icon: ClipboardList, title: "Survey Templates Library", desc: "Pre-built, customizable survey templates (health, sanitation, civic feedback) to launch quickly with role-based defaults." },
      { icon: FileDown, title: "Offline Mobile Collection", desc: "Field teams can collect responses offline on mobile devices; submissions sync automatically when connectivity is restored." },
      { icon: Activity, title: "Real-Time Response Stream", desc: "Watch responses arrive live — total submissions, completion rate, and velocity updated every few seconds." },
      { icon: MapPin, title: "Geographic Participation Heatmap", desc: "See which wards and districts are responding to enable targeted outreach in low-participation zones." },
      { icon: PieChart, title: "Per-Question Analytics", desc: "Option distribution for MCQs, average ratings, text responses with turnout breakdown per question." },
      { icon: FileDown, title: "One-Click Data Export", desc: "Download full response datasets in CSV or JSON for offline analysis or donor reporting." },
    ],
  },
}

function LoginPageContent() {
  const searchParams = useSearchParams()
  const roleParam = searchParams?.get("role") as RoleKey
  const emailParam = searchParams?.get("email") || ""
  const passParam = searchParams?.get("password") || ""

  const initialRole = (roleParam && (["AGENT", "MUNICIPAL_ADMIN", "STATE_ADMIN", "CIVIC_PARTNER"] as RoleKey[]).includes(roleParam)) 
    ? roleParam 
    : "AGENT"

  const [selected, setSelected] = React.useState<RoleKey>(initialRole)

  React.useEffect(() => {
    if (roleParam && (["AGENT", "MUNICIPAL_ADMIN", "STATE_ADMIN", "CIVIC_PARTNER"] as RoleKey[]).includes(roleParam)) {
      setSelected(roleParam)
    }
  }, [roleParam])

  const info = ROLE_INFO[selected]

  return (
    <div
      className="flex items-start justify-center py-16 px-6 sm:px-8 lg:px-12"
      style={GRID_BG}
    >
      <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-10">

        {/* ── Left — role capabilities ── */}
        <aside className="lg:col-span-7">

          {/* Hero headline */}
          <motion.div
            className="mb-10"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <p
              className="text-xs font-black tracking-[0.2em] text-slate-500 uppercase mb-3"
              style={HEADLINE}
            >
              SwarajDesk &middot; Unified Admin Portal
            </p>
            <h2
              className="text-4xl md:text-5xl font-extrabold text-black leading-tight mb-4"
              style={HEADLINE}
            >
              Governance,<br />
              <span className="inline-block">
                <Typewriter
                  phrases={["purpose-built.", "field-ready.", "citizen-centered."]}
                  accentFrom="from-violet-500"
                  accentTo="to-purple-400"
                  accentText="text-violet-700"
                />
              </span>
            </h2>
            <p className="text-slate-600 text-base max-w-lg leading-relaxed">
              Select your role to explore the tools available to you. Each tier is designed for precise,
              high-impact action.
            </p>
          </motion.div>

          {/* Role selector pills — gumroad style */}
          <div className="flex flex-wrap gap-3 mb-8">
            {(Object.keys(ROLE_INFO) as RoleKey[]).map((r) => {
              const isActive = r === selected
              return (
                <button
                  key={r}
                  onClick={() => setSelected(r)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-extrabold border-2 transition-all duration-200 whitespace-nowrap
                    ${isActive
                      ? "bg-black text-white border-black"
                      : "bg-white text-slate-600 border-black hover:text-black"
                    }`}
                  style={isActive ? { boxShadow: "4px 4px 0px 0px #7C3AED" } : undefined}
                >
                  <span className="flex items-center gap-2">
                    {ROLE_INFO[r].title}
                    {isActive && <ChevronRight className="w-4 h-4" />}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Role header — gumroad divider */}
          <AnimatePresence mode="wait">
            <motion.div
              key={selected + "-header"}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
              className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-black"
            >
              <span
                className="inline-block bg-black text-white px-3 py-1 rounded-lg text-xs font-black tracking-widest uppercase shrink-0"
                style={{ boxShadow: "3px 3px 0px 0px #7C3AED" }}
              >
                {info.tag}
              </span>
              <div>
                <p className="font-extrabold text-black text-sm" style={HEADLINE}>{info.title}</p>
                <p className="text-slate-500 text-xs">{info.subtitle}</p>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Capability grid — gumroad cards */}
          <AnimatePresence mode="wait">
            <motion.div
              key={selected + "-caps"}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.25 }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6"
            >
              {info.capabilities.map((cap, i) => {
                const Icon = cap.icon as React.ComponentType<{ className?: string; style?: React.CSSProperties }>
                return (
                  <motion.div
                    key={i}
                    className="bg-white rounded-2xl p-4 border-2 border-black cursor-default"
                    style={{ boxShadow: SHADOW_BASE }}
                    whileHover={{ x: -4, y: -4, boxShadow: SHADOW_HOVER }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-9 h-9 flex items-center justify-center rounded-lg border-2 border-black shrink-0"
                        style={{ backgroundColor: info.iconBg }}
                      >
                        <Icon
                          className="w-4 h-4"
                          style={{ color: info.accentHex }}
                        />
                      </div>
                      <div>
                        <p className="text-sm font-extrabold text-black mb-0.5" style={HEADLINE}>
                          {cap.title}
                        </p>
                        <p className="text-xs text-slate-600 leading-relaxed">{cap.desc}</p>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </motion.div>
          </AnimatePresence>

          {/* Access note — gumroad card w/ amber offset */}
          <div
            className="bg-white rounded-2xl p-4 border-2 border-black flex items-start gap-3"
            style={{ boxShadow: "6px 6px 0px 0px #d97706" }}
          >
            <div
              className="w-9 h-9 flex items-center justify-center rounded-lg border-2 border-black shrink-0"
              style={{ backgroundColor: "#fef3c7" }}
            >
              <ShieldAlert className="w-4 h-4 text-amber-700" />
            </div>
            <div>
              <p className="text-sm font-extrabold text-black mb-0.5" style={HEADLINE}>
                Verified access only
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                Only users with an assigned role can access this portal.
                Contact your State Admin for registration or role assignment.
              </p>
            </div>
          </div>

        </aside>

        {/* ── Right — login card ── */}
        <main className="lg:col-span-5 flex items-start justify-center">
          <div className="w-full max-w-md">
            <LoginForm
              adminType={selected as any}
              onAdminTypeChange={(t) => {
                if ((["AGENT", "MUNICIPAL_ADMIN", "STATE_ADMIN", "CIVIC_PARTNER"] as unknown as RoleKey[]).includes(t as RoleKey)) {
                  setSelected(t as RoleKey)
                }
              }}
              defaultEmail={emailParam}
              defaultPassword={passParam}
            />
          </div>
        </main>

      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading portal...</div>}>
      <LoginPageContent />
    </Suspense>
  )
}
