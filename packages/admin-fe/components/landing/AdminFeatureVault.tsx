"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import {
  /* Agent icons */
  ClipboardList,
  RefreshCw,
  Radar,
  MessageCircle,
  Map,
  ScrollText,
  Upload,
  ArrowUpCircle,
  /* Municipal icons */
  Users,
  Route,
  BrainCircuit,
  Lightbulb,
  Megaphone,
  ShieldAlert,
  BarChart3,
  GitMerge,
  /* State icons */
  Globe2,
  UserCog,
  LineChart,
  TrendingUp,
  Download,
  ShieldCheck,
  Network,
  Zap,
  /* Civic Partner icons */
  ClipboardEdit,
  Activity,
  PieChart,
  MapPin,
  FileDown,
  Layers,
  Sparkles,
  Languages,
  /* shared */
  ArrowRight,
  Building2,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

type RoleKey = 'agent' | 'municipal' | 'state' | 'civic';

interface Feature {
  icon: LucideIcon;
  label: string;
  desc: string;
  span: string;
  variant: 'hero' | 'dark' | 'gradient' | 'wide' | 'wideDark' | 'stat' | 'default';
  badge?: string;
  extraIcons?: LucideIcon[];
  stat?: string;
  statLabel?: string;
  carousel?: { icon?: LucideIcon; title: string; desc?: string }[];
}

/* ------------------------------------------------------------------ */
/*  Role config                                                         */
/* ------------------------------------------------------------------ */

const ROLES: Record<
  RoleKey,
  {
    label: string;
    subtitle: string;
    accent: string;        // Tailwind text color
    accentBg: string;      // Tailwind bg color (light)
    accentFull: string;    // Tailwind bg color (full)
    accentBorder: string;  // Tailwind border color
    gradFrom: string;
    gradTo: string;
    features: Feature[];
  }
> = {
  /* -------- AGENT -------- */
  agent: {
    label: 'Field Agent',
    subtitle: 'On-ground complaint resolution & verification',
    accent: 'text-sky-700',
    accentBg: 'bg-sky-50',
    accentFull: 'bg-sky-600',
    accentBorder: 'border-sky-400',
    gradFrom: 'from-sky-600',
    gradTo: 'to-cyan-500',
    features: [
      {
        icon: ClipboardList,
        label: 'Field Toolkit',
        desc: 'Quick access to your most-used workflows — claim, escalate, and resolve with minimal taps.',
        span: 'md:col-span-2 md:row-span-2',
        variant: 'hero',
        badge: 'REAL-TIME',
        carousel: [
          {
            icon: ClipboardList,
            title: 'Smart Complaint Queue',
            desc: 'Priority-sorted assigned complaints with filters for SLA, urgency, and recent activity.',
          },
          {
            icon: RefreshCw,
            title: 'Quick Actions',
            desc: 'One-tap actions: claim, reassign, escalate, or mark complete — reduces admin friction in the field.',
          },
          {
            icon: Map,
            title: 'Nearby Cases',
            desc: 'See nearby complaints on the map to batch visits and reduce travel time.',
          },
        ],
      },
      {
        icon: RefreshCw,
        label: 'Status Lifecycle Engine',
        desc: 'Move through Under Processing → Completed / Rejected with automated notifications dispatched to the citizen on every transition.',
        span: '',
        variant: 'dark',
      },
      {
        icon: Radar,
        label: 'UAV Field Verification',
        desc: 'Upload drone footage; AI cross-matches with complaint evidence and outputs a tamper-proof confidence score.',
        span: '',
        variant: 'gradient',
      },
      {
        icon: MessageCircle,
        label: 'Live Citizen Chat',
        desc: 'Per-complaint message thread for real-time clarification with the complainant—history preserved for auditing.',
        span: '',
        variant: 'default',
      },
      {
        icon: Map,
        label: 'Geospatial Complaint Map',
        desc: 'Leaflet-powered live map pins all assigned complaints; overlay Google heatmap to spot density clusters instantly.',
        span: '',
        variant: 'default',
      },
      {
        icon: ArrowUpCircle,
        label: 'One-Click Escalation',
        desc: 'Escalate any complaint to the Municipal Admin with a reason note—triggers immediate re-routing and citizen notification.',
        span: 'md:col-span-2',
        variant: 'wide',
        extraIcons: [ArrowRight, ArrowUpCircle, Building2],
      },
      {
        icon: ScrollText,
        label: 'Mobile Field Checklists',
        desc: 'Standardized SOP checklists for field verification to ensure consistent, auditable data capture on every visit.',
        span: '',
        variant: 'default',
      },
      {
        icon: ScrollText,
        label: 'Immutable Audit Trail',
        desc: 'Every action—assignment, status change, escalation, chat—logged with timestamp and hashed for tamper-proof accountability.',
        span: '',
        variant: 'wideDark',
      },
    ],
  },

  /* -------- MUNICIPAL ADMIN -------- */
  municipal: {
    label: 'Municipal Admin',
    subtitle: 'Municipal-level complaint operations & governance',
    accent: 'text-emerald-700',
    accentBg: 'bg-emerald-50',
    accentFull: 'bg-emerald-600',
    accentBorder: 'border-emerald-400',
    gradFrom: 'from-emerald-600',
    gradTo: 'to-teal-500',
    features: [
      {
        icon: BrainCircuit,
        label: 'AI Report Generator',
        desc: 'One-click generates executive summaries, district analysis, systemic issue breakdowns, SLA breach reports, and ranked strategic recommendations—all written by AI from live data.',
        span: 'md:col-span-2 md:row-span-2',
        variant: 'hero',
        badge: 'POWERED BY AI',
        carousel: [
          { icon: BrainCircuit, title: 'Executive Summaries', desc: 'Auto-generated one-page briefs for leadership with key metrics and recommendations.' },
          { icon: BarChart3, title: 'SLA & Breach Alerts', desc: 'Real-time alerts and ranked breach lists so you can triage policy action quickly.' },
          { icon: Users, title: 'District Rollups', desc: 'Aggregated district-level views highlighting recurring issues and hotspots.' },
        ],
      },
      {
        icon: Lightbulb,
        label: 'AI Action Suggestions',
        desc: 'LLM analyzes current stats and tells you exactly what to do next: escalate, reassign, trigger auto-assign, or publish an announcement.',
        span: '',
        variant: 'dark',
      },
      {
        icon: Users,
        label: 'Agent Management Hub',
        desc: 'Create or deactivate agent accounts, set workload caps, and monitor individual resolution rates from one unified panel.',
        span: '',
        variant: 'gradient',
      },
      {
        icon: Route,
        label: 'Complaint Routing Board',
        desc: 'Filter by district, category, urgency, or SLA breach status. Assign or re-assign agents in bulk without leaving the page.',
        span: '',
        variant: 'default',
      },
      {
        icon: BarChart3,
        label: 'SLA Breach Analytics',
        desc: 'Track avg resolution time, breach count, quality scores, and escalation rates across departments and districts in real-time.',
        span: '',
        variant: 'default',
      },
      {
        icon: Megaphone,
        label: 'Public Announcement Broadcast',
        desc: 'Draft and publish announcements to citizens—priority-flagged, municipality-scoped or city-wide, with scheduled delivery.',
        span: 'md:col-span-2',
        variant: 'wide',
        extraIcons: [Megaphone, ArrowRight, Building2],
      },
      {
        icon: ShieldAlert,
        label: 'State Escalation Workflow',
        desc: 'Escalate unresolvable complaints to the State Admin with structured reason tagging and live escalation-status tracking.',
        span: '',
        variant: 'default',
      },
      {
        icon: GitMerge,
        label: 'Heatmap Intelligence',
        desc: 'Google-powered complaint density heatmap across districts reveals pressure zones for proactive resource deployment.',
        span: '',
        variant: 'wideDark',
      },
    ],
  },

  /* -------- STATE ADMIN -------- */
  state: {
    label: 'State Admin',
    subtitle: 'State-wide oversight, analytics & governance',
    accent: 'text-violet-700',
    accentBg: 'bg-violet-50',
    accentFull: 'bg-violet-600',
    accentBorder: 'border-violet-400',
    gradFrom: 'from-violet-600',
    gradTo: 'to-purple-500',
    features: [
      {
        icon: Network,
        label: 'District Intelligence Command',
        desc: 'Unified cross-municipality dashboard: complaint volumes, resolution rates, SLA breaches, and escalation counts aggregated by district—updated in real-time.',
        span: 'md:col-span-2 md:row-span-2',
        variant: 'hero',
        badge: 'STATE-WIDE',
        carousel: [
          { icon: Network, title: 'State Overview', desc: 'High-level state metrics, growth/decline trends and critical alerts across municipalities.' },
          { icon: LineChart, title: 'Trend Analytics', desc: 'Time-series insights for volume, resolution speed and quality to inform policy.' },
          { icon: Download, title: 'Export & Share', desc: 'Export district datasets or AI reports for committee reviews and inter-departmental sharing.' },
        ],
      },
      {
        icon: UserCog,
        label: 'Municipal Admin Management',
        desc: 'Create and provision Municipal Admin accounts, assign jurisdictions, and activate or deactivate access with full audit logging.',
        span: '',
        variant: 'dark',
      },
      {
        icon: TrendingUp,
        label: 'AI Strategic Reports',
        desc: 'AI generates district-level analysis, category insights, priority alerts, and timeline-ranked recommendations from aggregated complaint data.',
        span: '',
        variant: 'gradient',
      },
      {
        icon: ShieldCheck,
        label: 'Escalation Oversight',
        desc: 'Review and act on escalations from Municipal Admins—approve fund/action requests or re-route with structured resolution notes.',
        span: '',
        variant: 'default',
      },
      {
        icon: Globe2,
        label: 'State Heatmap',
        desc: 'Google Maps density overlay across the entire state surfaces high-complaint zones for data-driven governance.',
        span: '',
        variant: 'default',
      },
      {
        icon: LineChart,
        label: 'Trend & Volume Analytics',
        desc: 'Monthly volume curves, status distribution pie charts, urgency breakdowns, and sub-category trend lines—all in one view.',
        span: 'md:col-span-2',
        variant: 'wide',
        extraIcons: [LineChart, TrendingUp, BarChart3],
      },
      {
        icon: Download,
        label: 'Data Export Engine',
        desc: 'Download municipality-scoped or state-wide complaint data and AI reports as structured JSON/PDF for offline analysis.',
        span: '',
        variant: 'default',
      },
      {
        icon: Zap,
        label: 'AI Action Executor',
        desc: "AI-suggested actions—escalate, update status, publish announcement—execute directly from the report panel with one tap.",
        span: '',
        variant: 'wideDark',
      },
    ],
  },

  /* -------- CIVIC PARTNER -------- */
  civic: {
    label: 'Civic Partner',
    subtitle: 'NGOs & government bodies -citizen engagement at scale',
    accent: 'text-rose-700',
    accentBg: 'bg-rose-50',
    accentFull: 'bg-rose-600',
    accentBorder: 'border-rose-400',
    gradFrom: 'from-rose-600',
    gradTo: 'to-pink-500',
    features: [
      {
        icon: ClipboardEdit,
        label: 'Visual Survey Builder',
        desc: 'Drag-and-drop survey creation with MCQ, Rating (1–5 stars), Yes/No, and open-text question types. Publish to citizens in one click.',
        span: 'md:col-span-2 md:row-span-2',
        variant: 'hero',
        badge: 'NO-CODE',
        carousel: [
          { icon: ClipboardEdit, title: 'Drag & Drop Builder', desc: 'Build surveys visually with question templates and instant previews.' },
          { icon: Activity, title: 'Live Response Stream', desc: 'Monitor incoming responses in real-time with completion and dropout analytics.' },
          { icon: Languages, title: 'Regional Language Reach', desc: 'Publish surveys in 20+ languages to maximize inclusion and response rates.' },
        ],
      },
      {
        icon: Activity,
        label: 'Real-Time Response Stream',
        desc: 'Watch responses arrive live—total submissions, completion rate, and response velocity updated every few seconds.',
        span: '',
        variant: 'dark',
      },
      {
        icon: Languages,
        label: 'Regional Language Reach',
        desc: 'Distribute surveys in 20+ Indian languages so every citizen can respond in their mother tongue—no barriers.',
        span: '',
        variant: 'gradient',
      },
      {
        icon: PieChart,
        label: 'Per-Question Analytics',
        desc: 'Option distribution charts for MCQs, average scores for rating questions, and text response lists with turnout breakdown per question.',
        span: '',
        variant: 'default',
      },
      {
        icon: MapPin,
        label: 'Geographic Participation Heatmap',
        desc: 'Google Maps visualization shows which wards, districts, or pincodes are responding—enabling targeted outreach in low-participation zones.',
        span: '',
        variant: 'default',
      },
      {
        icon: FileDown,
        label: 'One-Click Data Export',
        desc: 'Download complete response datasets in CSV or JSON for offline analysis, reporting to donors, or government submissions.',
        span: 'md:col-span-2',
        variant: 'wide',
        extraIcons: [FileDown, ArrowRight, PieChart],
      },
      {
        icon: Layers,
        label: 'Survey Lifecycle Control',
        desc: 'Manage surveys through Draft → Published → Closed → Archived stages with full control over visibility and response windows.',
        span: '',
        variant: 'default',
      },
      {
        icon: Sparkles,
        label: 'AI Text Sentiment Engine',
        desc: "Open-ended responses are automatically scored for sentiment—positive, neutral, or negative—giving you qualitative insight at scale.",
        span: '',
        variant: 'wideDark',
      },
    ],
  },
};

/* ------------------------------------------------------------------ */
/*  Motion helpers                                                      */
/* ------------------------------------------------------------------ */

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.055 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 28, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.48, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
};

/* ------------------------------------------------------------------ */
/*  Card                                                                */
/* ------------------------------------------------------------------ */

function Card({ f, role }: { f: Feature; role: RoleKey }) {
  const cfg = ROLES[role];
  const Icon = f.icon;

  if (f.variant === 'hero') {
    const items = f.carousel && f.carousel.length ? f.carousel : [{ icon: f.icon, title: f.label, desc: f.desc }]
    const [index, setIndex] = useState(0)

    useEffect(() => {
      if (!items || items.length <= 1) return
      const t = setInterval(() => setIndex((s) => (s + 1) % items.length), 3500)
      return () => clearInterval(t)
    }, [items.length])

    const active = items[index]

    return (
      <motion.div
        whileHover={{ y: -4, boxShadow: '0 24px 60px -16px rgba(0,0,0,0.12)' }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
        className="h-full bg-white p-8 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden flex flex-col justify-between group"
      >
        <div>
          <div className="flex items-center gap-3 mb-6">
            <motion.div
              animate={{ rotate: [0, 8, -8, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className={`w-10 h-10 rounded-lg ${cfg.accentBg} flex items-center justify-center`}
            >
              {active.icon ? <active.icon className={`w-5 h-5 ${cfg.accent}`} /> : <Icon className={`w-5 h-5 ${cfg.accent}`} />}
            </motion.div>
            {f.badge && (
              <span className={`${cfg.accentBg} ${cfg.accent} text-[10px] font-bold px-2 py-0.5 rounded border ${cfg.accentBorder}`}>
                {f.badge}
              </span>
            )}
          </div>
          <h3 className="text-2xl md:text-3xl font-bold tracking-tight mb-4">{active.title}</h3>
          <p className="text-gray-500 leading-relaxed">{active.desc ?? f.desc}</p>
        </div>
        <div className="mt-8 relative h-16 flex items-center justify-center">
          <div className={`absolute inset-0 ${cfg.accentBg} rounded-2xl flex items-center justify-center gap-3`}>
            <motion.div
              className="flex gap-2"
              animate={{ x: [0, 10, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div className={`h-1 w-8 bg-gradient-to-r ${cfg.gradFrom} ${cfg.gradTo} rounded-full opacity-60`} />
              <div className={`h-1 w-14 bg-gradient-to-r ${cfg.gradFrom} ${cfg.gradTo} rounded-full opacity-80`} />
              <div className={`h-1 w-6 bg-gradient-to-r ${cfg.gradFrom} ${cfg.gradTo} rounded-full opacity-40`} />
            </motion.div>
          </div>
          {/* pagination dots */}
          <div className="relative z-10 flex gap-2">
            {items.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                className={`w-2 h-2 rounded-full ${i === index ? cfg.accentFull : 'bg-white/40'} border border-white/20`}
                aria-label={`Show ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </motion.div>
    );
  }

  if (f.variant === 'dark') {
    return (
      <motion.div
        whileHover={{ y: -4, boxShadow: '0 16px 40px -8px rgba(0,0,0,0.4)' }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
        className="h-full bg-slate-900 text-white p-7 rounded-3xl shadow-xl flex flex-col justify-between relative overflow-hidden group"
      >
        <div className="relative z-10">
          <motion.div
            whileHover={{ rotate: 12 }}
            className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center mb-5"
          >
            <Icon className="w-5 h-5 text-white" />
          </motion.div>
          <h3 className="text-lg font-bold mb-2">{f.label}</h3>
          <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
        </div>
        <div className="flex justify-end opacity-5 mt-4 group-hover:opacity-10 transition-opacity">
          <Icon className="w-14 h-14" />
        </div>
      </motion.div>
    );
  }

  if (f.variant === 'gradient') {
    return (
      <motion.div
        whileHover={{ y: -4, scale: 1.01 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
        className={`h-full bg-gradient-to-br ${cfg.gradFrom} ${cfg.gradTo} p-7 rounded-3xl text-white flex flex-col justify-between relative overflow-hidden shadow-xl`}
      >
        <div className="relative z-10">
          <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center mb-4">
            <Icon className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-lg font-bold mb-2">{f.label}</h3>
          <p className="text-white/80 text-sm leading-relaxed">{f.desc}</p>
        </div>
        <motion.div
          className="absolute -bottom-4 -right-4 opacity-10"
          animate={{ rotate: 360 }}
          transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
        >
          <Icon className="w-24 h-24 text-white" />
        </motion.div>
      </motion.div>
    );
  }

  if (f.variant === 'wide') {
    return (
      <motion.div
        whileHover={{ y: -4, boxShadow: '0 16px 40px -8px rgba(0,0,0,0.06)' }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
        className="h-full bg-white p-7 rounded-3xl border border-gray-100 flex flex-col md:flex-row gap-5 items-center group"
      >
        <div className="md:w-3/5">
          <h3 className="text-xl font-bold mb-2">{f.label}</h3>
          <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
        </div>
        <div className="md:w-2/5 flex justify-center gap-3">
          {f.extraIcons ? (
            f.extraIcons.map((EI, i) => (
              <motion.div
                key={i}
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 2, delay: i * 0.3, repeat: Infinity }}
                className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  i === 0 ? `${cfg.accentBg}` : i === 1 ? `${cfg.accentBg} opacity-70` : `${cfg.accentFull}`
                }`}
              >
                <EI className={`w-5 h-5 ${i < 2 ? cfg.accent : 'text-white'}`} />
              </motion.div>
            ))
          ) : (
            <div className={`w-20 h-20 ${cfg.accentBg} rounded-xl border-2 border-dashed ${cfg.accentBorder} flex items-center justify-center group-hover:opacity-80 transition-opacity`}>
              <Icon className={`w-8 h-8 ${cfg.accent}`} />
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  if (f.variant === 'wideDark') {
    return (
      <motion.div
        whileHover={{ y: -4, boxShadow: '0 16px 40px -8px rgba(0,0,0,0.35)' }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
        className="h-full bg-[#1e2330] p-7 rounded-3xl text-white group"
      >
        <div className={`flex items-center gap-2 mb-3 ${cfg.accent} brightness-150`}>
          <Icon className="w-4 h-4" />
          <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">
            {ROLES[role].label} · Intelligence
          </span>
        </div>
        <h3 className="text-lg font-bold mb-2">{f.label}</h3>
        <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
      </motion.div>
    );
  }

  /* default */
  return (
    <motion.div
      whileHover={{ y: -6, boxShadow: '0 16px 40px -8px rgba(0,0,0,0.08)' }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className="h-full bg-slate-50 p-5 rounded-3xl border border-gray-100 flex flex-col justify-between group"
    >
      <div className={`h-16 ${cfg.accentBg} rounded-2xl flex items-center justify-center mb-4 border border-gray-50 group-hover:opacity-80 transition-opacity`}>
        <Icon className={`w-7 h-7 ${cfg.accent} group-hover:scale-110 transition-transform`} />
      </div>
      <div>
        <h3 className="text-base font-bold mb-1">{f.label}</h3>
        <p className="text-gray-500 text-[11px] leading-relaxed">{f.desc}</p>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Role tab pill                                                       */
/* ------------------------------------------------------------------ */

function RoleTab({
  roleKey,
  active,
  onClick,
}: {
  roleKey: RoleKey;
  active: boolean;
  onClick: () => void;
}) {
  const cfg = ROLES[roleKey];
  return (
    <button
      onClick={onClick}
      className={`relative px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 whitespace-nowrap
        ${active
          ? `${cfg.accentFull} text-white shadow-lg`
          : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
        }`}
    >
      {cfg.label}
      {active && (
        <motion.div
          layoutId="activeTabHighlight"
          className={`absolute inset-0 ${cfg.accentFull} rounded-xl -z-10`}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        />
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Section                                                             */
/* ------------------------------------------------------------------ */

export default function AdminFeatureVault() {
  const [activeRole, setActiveRole] = useState<RoleKey>('agent');
  const cfg = ROLES[activeRole];

  return (
    <section className="py-24 bg-gray-50 border-t border-gray-100" id="admin-features">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex flex-col md:flex-row justify-between md:items-end gap-6 mb-10"
        >
          <div>
            <motion.h2
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-3xl md:text-5xl font-extrabold tracking-tight mb-3"
            >
              Role Feature Vault
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-gray-500 text-base md:text-lg max-w-xl"
            >
              Every role has a purpose-built toolkit. Explore what powers each tier of the
              SwarajDesk governance stack.
            </motion.p>
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="hidden md:block"
          >
            <span className="bg-slate-900 text-white px-4 py-1.5 rounded-md text-xs font-bold tracking-widest uppercase">
              4 Roles · 32 Features
            </span>
          </motion.div>
        </motion.div>

        {/* Role Tabs */}
        <div className="flex gap-2 mb-10 overflow-x-auto pb-1 scrollbar-hide">
          {(Object.keys(ROLES) as RoleKey[]).map((r) => (
            <RoleTab key={r} roleKey={r} active={activeRole === r} onClick={() => setActiveRole(r)} />
          ))}
        </div>

        {/* Role subtitle */}
        <AnimatePresence mode="wait">
          <motion.p
            key={activeRole + '-subtitle'}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            className={`text-sm font-semibold mb-8 ${cfg.accent}`}
          >
            {cfg.subtitle}
          </motion.p>
        </AnimatePresence>

        {/* Bento Grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeRole}
            className="grid grid-cols-1 md:grid-cols-4 gap-5"
            variants={stagger}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
          >
            {cfg.features.map((f, i) => (
              <motion.div key={i} variants={fadeUp} className={f.span}>
                <Card f={f} role={activeRole} />
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
