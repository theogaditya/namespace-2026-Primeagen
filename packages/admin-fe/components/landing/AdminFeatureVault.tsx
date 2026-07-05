"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  /* Agent icons */
  ClipboardList,
  RefreshCw,
  Radar,
  MessageCircle,
  Map,
  ScrollText,
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
  ChevronRight,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Shared constants (matches code.html / user-fe gumroad style)       */
/* ------------------------------------------------------------------ */

/** newvault technical-grid dot pattern */
const GRID_BG: React.CSSProperties = {
  backgroundColor: "#F4F4F4",
  backgroundImage:
    "radial-gradient(circle at 1px 1px, #e2e8f0 1px, transparent 0)",
  backgroundSize: "24px 24px",
};

/** Gumroad offset shadow */
const SHADOW_BASE = "8px 8px 0px 0px rgba(0,0,0,1)";
const SHADOW_HOVER = "12px 12px 0px 0px #7C3AED";

const HEADLINE: React.CSSProperties = {
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

type RoleKey = "agent" | "municipal" | "state" | "civic";

interface Feature {
  icon: LucideIcon;
  label: string;
  desc: string;
  span: string;
  variant: "hero" | "dark" | "gradient" | "wide" | "accent" | "default";
  badge?: string;
  extraIcons?: LucideIcon[];
  carousel?: { icon?: LucideIcon; title: string; desc?: string }[];
}

/* ------------------------------------------------------------------ */
/*  Role accent config                                                  */
/* ------------------------------------------------------------------ */

interface RoleCfg {
  label: string;
  subtitle: string;
  iconBg: string;
  accentHex: string;
  features: Feature[];
}

const ROLES: Record<RoleKey, RoleCfg> = {
  /* -------- AGENT -------- */
  agent: {
    label: "Field Agent",
    subtitle: "On-ground complaint resolution & verification",
    iconBg: "#e0f2fe",
    accentHex: "#0284c7",
    features: [
      {
        icon: ClipboardList,
        label: "Field Toolkit",
        desc: "Quick access to your most-used workflows — claim, escalate, and resolve with minimal taps.",
        span: "md:col-span-2 md:row-span-2",
        variant: "hero",
        badge: "REAL-TIME",
        carousel: [
          {
            icon: ClipboardList,
            title: "Smart Complaint Queue",
            desc: "Priority-sorted assigned complaints with filters for SLA, urgency, and recent activity.",
          },
          {
            icon: RefreshCw,
            title: "Quick Actions",
            desc: "One-tap actions: claim, reassign, escalate, or mark complete — reduces admin friction in the field.",
          },
          {
            icon: Map,
            title: "Nearby Cases",
            desc: "See nearby complaints on the map to batch visits and reduce travel time.",
          },
        ],
      },
      {
        icon: RefreshCw,
        label: "Status Lifecycle Engine",
        desc: "Move through Under Processing, Completed, or Rejected with automated notifications dispatched to the citizen on every transition.",
        span: "",
        variant: "dark",
      },
      {
        icon: Radar,
        label: "UAV Field Verification",
        desc: "Upload drone footage; AI cross-matches with complaint evidence and outputs a tamper-proof confidence score.",
        span: "",
        variant: "gradient",
      },
      {
        icon: MessageCircle,
        label: "Live Citizen Chat",
        desc: "Per-complaint message thread for real-time clarification with the complainant — history preserved for auditing.",
        span: "",
        variant: "default",
      },
      {
        icon: Map,
        label: "Geospatial Complaint Map",
        desc: "Leaflet-powered live map pins all assigned complaints; overlay Google heatmap to spot density clusters instantly.",
        span: "",
        variant: "default",
      },
      {
        icon: ArrowUpCircle,
        label: "One-Click Escalation",
        desc: "Escalate any complaint to the Municipal Admin with a reason note — triggers immediate re-routing and citizen notification.",
        span: "md:col-span-2",
        variant: "wide",
        extraIcons: [ArrowRight, ArrowUpCircle, Building2],
      },
      {
        icon: ScrollText,
        label: "Mobile Field Checklists",
        desc: "Standardized SOP checklists for field verification to ensure consistent, auditable data capture on every visit.",
        span: "",
        variant: "default",
      },
      {
        icon: ScrollText,
        label: "Immutable Audit Trail",
        desc: "Every action — assignment, status change, escalation, chat — logged with timestamp and hashed for tamper-proof accountability.",
        span: "",
        variant: "accent",
      },
    ],
  },

  /* -------- MUNICIPAL ADMIN -------- */
  municipal: {
    label: "Municipal Admin",
    subtitle: "Municipal-level complaint operations & governance",
    iconBg: "#d1fae5",
    accentHex: "#059669",
    features: [
      {
        icon: BrainCircuit,
        label: "AI Report Generator",
        desc: "One-click generates executive summaries, district analysis, systemic issue breakdowns, SLA breach reports, and ranked strategic recommendations — all written by AI from live data.",
        span: "md:col-span-2 md:row-span-2",
        variant: "hero",
        badge: "POWERED BY AI",
        carousel: [
          {
            icon: BrainCircuit,
            title: "Executive Summaries",
            desc: "Auto-generated one-page briefs for leadership with key metrics and recommendations.",
          },
          {
            icon: BarChart3,
            title: "SLA & Breach Alerts",
            desc: "Real-time alerts and ranked breach lists so you can triage policy action quickly.",
          },
          {
            icon: Users,
            title: "District Rollups",
            desc: "Aggregated district-level views highlighting recurring issues and hotspots.",
          },
        ],
      },
      {
        icon: Lightbulb,
        label: "AI Action Suggestions",
        desc: "LLM analyzes current stats and tells you exactly what to do next: escalate, reassign, trigger auto-assign, or publish an announcement.",
        span: "",
        variant: "dark",
      },
      {
        icon: Users,
        label: "Agent Management Hub",
        desc: "Create or deactivate agent accounts, set workload caps, and monitor individual resolution rates from one unified panel.",
        span: "",
        variant: "gradient",
      },
      {
        icon: Route,
        label: "Complaint Routing Board",
        desc: "Filter by district, category, urgency, or SLA breach status. Assign or re-assign agents in bulk without leaving the page.",
        span: "",
        variant: "default",
      },
      {
        icon: BarChart3,
        label: "SLA Breach Analytics",
        desc: "Track avg resolution time, breach count, quality scores, and escalation rates across departments and districts in real-time.",
        span: "",
        variant: "default",
      },
      {
        icon: Megaphone,
        label: "Public Announcement Broadcast",
        desc: "Draft and publish announcements to citizens — priority-flagged, municipality-scoped or city-wide, with scheduled delivery.",
        span: "md:col-span-2",
        variant: "wide",
        extraIcons: [Megaphone, ArrowRight, Building2],
      },
      {
        icon: ShieldAlert,
        label: "State Escalation Workflow",
        desc: "Escalate unresolvable complaints to the State Admin with structured reason tagging and live escalation-status tracking.",
        span: "",
        variant: "default",
      },
      {
        icon: GitMerge,
        label: "Heatmap Intelligence",
        desc: "Google-powered complaint density heatmap across districts reveals pressure zones for proactive resource deployment.",
        span: "",
        variant: "accent",
      },
    ],
  },

  /* -------- STATE ADMIN -------- */
  state: {
    label: "State Admin",
    subtitle: "State-wide oversight, analytics & governance",
    iconBg: "#ede9fe",
    accentHex: "#7c3aed",
    features: [
      {
        icon: Network,
        label: "District Intelligence Command",
        desc: "Unified cross-municipality dashboard: complaint volumes, resolution rates, SLA breaches, and escalation counts aggregated by district — updated in real-time.",
        span: "md:col-span-2 md:row-span-2",
        variant: "hero",
        badge: "STATE-WIDE",
        carousel: [
          {
            icon: Network,
            title: "State Overview",
            desc: "High-level state metrics, growth/decline trends and critical alerts across municipalities.",
          },
          {
            icon: LineChart,
            title: "Trend Analytics",
            desc: "Time-series insights for volume, resolution speed and quality to inform policy.",
          },
          {
            icon: Download,
            title: "Export & Share",
            desc: "Export district datasets or AI reports for committee reviews and inter-departmental sharing.",
          },
        ],
      },
      {
        icon: UserCog,
        label: "Municipal Admin Management",
        desc: "Create and provision Municipal Admin accounts, assign jurisdictions, and activate or deactivate access with full audit logging.",
        span: "",
        variant: "dark",
      },
      {
        icon: TrendingUp,
        label: "AI Strategic Reports",
        desc: "AI generates district-level analysis, category insights, priority alerts, and timeline-ranked recommendations from aggregated complaint data.",
        span: "",
        variant: "gradient",
      },
      {
        icon: ShieldCheck,
        label: "Escalation Oversight",
        desc: "Review and act on escalations from Municipal Admins — approve fund/action requests or re-route with structured resolution notes.",
        span: "",
        variant: "default",
      },
      {
        icon: Globe2,
        label: "State Heatmap",
        desc: "Google Maps density overlay across the entire state surfaces high-complaint zones for data-driven governance.",
        span: "",
        variant: "default",
      },
      {
        icon: LineChart,
        label: "Trend & Volume Analytics",
        desc: "Monthly volume curves, status distribution pie charts, urgency breakdowns, and sub-category trend lines — all in one view.",
        span: "md:col-span-2",
        variant: "wide",
        extraIcons: [LineChart, TrendingUp, BarChart3],
      },
      {
        icon: Download,
        label: "Data Export Engine",
        desc: "Download municipality-scoped or state-wide complaint data and AI reports as structured JSON/PDF for offline analysis.",
        span: "",
        variant: "default",
      },
      {
        icon: Zap,
        label: "AI Action Executor",
        desc: "AI-suggested actions — escalate, update status, publish announcement — execute directly from the report panel with one tap.",
        span: "",
        variant: "accent",
      },
    ],
  },

  /* -------- CIVIC PARTNER -------- */
  civic: {
    label: "Civic Partner",
    subtitle: "NGOs & government bodies — citizen engagement at scale",
    iconBg: "#ffe4e6",
    accentHex: "#e11d48",
    features: [
      {
        icon: ClipboardEdit,
        label: "Visual Survey Builder",
        desc: "Drag-and-drop survey creation with MCQ, Rating (1-5 stars), Yes/No, and open-text question types. Publish to citizens in one click.",
        span: "md:col-span-2 md:row-span-2",
        variant: "hero",
        badge: "NO-CODE",
        carousel: [
          {
            icon: ClipboardEdit,
            title: "Drag & Drop Builder",
            desc: "Build surveys visually with question templates and instant previews.",
          },
          {
            icon: Activity,
            title: "Live Response Stream",
            desc: "Monitor incoming responses in real-time with completion and dropout analytics.",
          },
          {
            icon: Languages,
            title: "Regional Language Reach",
            desc: "Publish surveys in 20+ languages to maximize inclusion and response rates.",
          },
        ],
      },
      {
        icon: Activity,
        label: "Real-Time Response Stream",
        desc: "Watch responses arrive live — total submissions, completion rate, and response velocity updated every few seconds.",
        span: "",
        variant: "dark",
      },
      {
        icon: Languages,
        label: "Regional Language Reach",
        desc: "Distribute surveys in 20+ Indian languages so every citizen can respond in their mother tongue — no barriers.",
        span: "",
        variant: "gradient",
      },
      {
        icon: PieChart,
        label: "Per-Question Analytics",
        desc: "Option distribution charts for MCQs, average scores for rating questions, and text response lists with turnout breakdown per question.",
        span: "",
        variant: "default",
      },
      {
        icon: MapPin,
        label: "Geographic Participation Heatmap",
        desc: "Google Maps visualization shows which wards, districts, or pincodes are responding — enabling targeted outreach in low-participation zones.",
        span: "",
        variant: "default",
      },
      {
        icon: FileDown,
        label: "One-Click Data Export",
        desc: "Download complete response datasets in CSV or JSON for offline analysis, reporting to donors, or government submissions.",
        span: "md:col-span-2",
        variant: "wide",
        extraIcons: [FileDown, ArrowRight, PieChart],
      },
      {
        icon: Layers,
        label: "Survey Lifecycle Control",
        desc: "Manage surveys through Draft, Published, Closed, and Archived stages with full control over visibility and response windows.",
        span: "",
        variant: "default",
      },
      {
        icon: Sparkles,
        label: "AI Text Sentiment Engine",
        desc: "Open-ended responses are automatically scored for sentiment — positive, neutral, or negative — giving you qualitative insight at scale.",
        span: "",
        variant: "accent",
      },
    ],
  },
};

/* ------------------------------------------------------------------ */
/*  Animation variants                                                  */
/* ------------------------------------------------------------------ */

const stagger: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.02 },
  },
};

const rise: Variants = {
  hidden: { opacity: 0, y: 36, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  },
};

/* ------------------------------------------------------------------ */
/*  BentoCard — gumroad style wrapper                                  */
/* ------------------------------------------------------------------ */

function BentoCard({
  children,
  className = "",
  dark = false,
  accent = false,
}: {
  children: React.ReactNode;
  className?: string;
  dark?: boolean;
  accent?: boolean;
}) {
  const bg = accent ? "#7C3AED" : dark ? "#0f172a" : "#ffffff";
  const border =
    dark || accent ? "2px solid rgba(255,255,255,0.15)" : "2px solid #000";

  return (
    <motion.div
      variants={rise}
      whileHover={{
        x: -4,
        y: -4,
        boxShadow: SHADOW_HOVER,
        transition: { duration: 0.18 },
      }}
      className={`relative overflow-hidden rounded-2xl p-8 flex flex-col group ${className}`}
      style={{ backgroundColor: bg, border, boxShadow: SHADOW_BASE }}
    >
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  IconBadge — solid color square, 2px black border                   */
/* ------------------------------------------------------------------ */

function IconBadge({
  icon: Icon,
  bg,
  dark = false,
  size = "md",
}: {
  icon: LucideIcon;
  bg: string;
  dark?: boolean;
  size?: "md" | "lg";
}) {
  const dim = size === "lg" ? "w-16 h-16" : "w-14 h-14";
  const iconSize = size === "lg" ? "w-8 h-8" : "w-6 h-6";
  const borderColor = dark ? "rgba(255,255,255,0.7)" : "#000";

  return (
    <div
      className={`${dim} rounded-2xl flex items-center justify-center mb-8 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3`}
      style={{ backgroundColor: bg, border: `2px solid ${borderColor}` }}
    >
      <Icon className={`${iconSize} ${dark ? "text-white" : "text-black"}`} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Card variants (gumroad / code.html style)                          */
/* ------------------------------------------------------------------ */

function Card({ f, role }: { f: Feature; role: RoleKey }) {
  const cfg = ROLES[role];
  const Icon = f.icon;

  /* HERO — large carousel card with auto-cycling content */
  if (f.variant === "hero") {
    const items = f.carousel?.length
      ? f.carousel
      : [{ icon: f.icon, title: f.label, desc: f.desc }];
    const [index, setIndex] = useState(0);

    useEffect(() => {
      if (items.length <= 1) return;
      const t = setInterval(
        () => setIndex((s) => (s + 1) % items.length),
        3500
      );
      return () => clearInterval(t);
    }, [items.length]);

    const active = items[index]!;
    const ActiveIcon = active.icon || Icon;

    return (
      <BentoCard className="h-full justify-between">
        <div>
          <div className="flex items-center gap-3 mb-6">
            <motion.div
              animate={{ rotate: [0, 8, -8, 0] }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <IconBadge icon={ActiveIcon} bg={cfg.iconBg} />
            </motion.div>
          </div>
          {f.badge && (
            <span
              className="inline-block text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-md mb-4"
              style={{
                backgroundColor: cfg.iconBg,
                border: "2px solid #000",
              }}
            >
              {f.badge}
            </span>
          )}
          <h3
            className="text-2xl md:text-3xl font-extrabold text-black tracking-tight mb-4"
            style={HEADLINE}
          >
            {active.title}
          </h3>
          <p className="text-slate-600 font-medium leading-relaxed">
            {active.desc ?? f.desc}
          </p>
        </div>
        <div className="mt-8 relative h-14 flex items-center justify-center">
          <div
            className="absolute inset-0 rounded-xl flex items-center justify-center gap-3"
            style={{
              backgroundColor: cfg.iconBg,
              border: "2px solid #000",
            }}
          >
            <motion.div
              className="flex gap-2"
              animate={{ x: [0, 10, 0] }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <div className="h-1 w-8 bg-black/20 rounded-full" />
              <div className="h-1 w-14 bg-black/35 rounded-full" />
              <div className="h-1 w-6 bg-black/15 rounded-full" />
            </motion.div>
          </div>
          <div className="relative z-10 flex gap-2">
            {items.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                className={`w-2.5 h-2.5 rounded-full border-2 border-black transition-colors ${
                  i === index ? "bg-black" : "bg-white"
                }`}
                aria-label={`Show slide ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </BentoCard>
    );
  }

  /* DARK — slate-950 background */
  if (f.variant === "dark") {
    return (
      <BentoCard dark className="h-full justify-between">
        <div>
          <IconBadge icon={Icon} bg="rgba(124,58,237,0.8)" dark size="md" />
          <h3
            className="text-lg font-extrabold text-white mb-2"
            style={HEADLINE}
          >
            {f.label}
          </h3>
          <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
        </div>
        <div className="flex justify-end opacity-5 mt-4 group-hover:opacity-10 transition-opacity">
          <Icon className="w-14 h-14 text-white" />
        </div>
      </BentoCard>
    );
  }

  /* GRADIENT — accent gradient background */
  if (f.variant === "gradient") {
    return (
      <motion.div
        variants={rise}
        whileHover={{
          x: -4,
          y: -4,
          boxShadow: SHADOW_HOVER,
          transition: { duration: 0.18 },
        }}
        className="relative overflow-hidden rounded-2xl p-8 flex flex-col group h-full"
        style={{
          background: `linear-gradient(135deg, ${cfg.accentHex}, #7C3AED)`,
          border: "2px solid rgba(255,255,255,0.2)",
          boxShadow: SHADOW_BASE,
        }}
      >
        <div className="relative z-10">
          <IconBadge icon={Icon} bg="rgba(255,255,255,0.2)" dark />
          <h3
            className="text-lg font-extrabold text-white mb-2"
            style={HEADLINE}
          >
            {f.label}
          </h3>
          <p className="text-white/80 text-sm leading-relaxed">{f.desc}</p>
        </div>
        <motion.div
          className="absolute -bottom-4 -right-4 opacity-10"
          animate={{ rotate: 360 }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        >
          <Icon className="w-24 h-24 text-white" />
        </motion.div>
      </motion.div>
    );
  }

  /* WIDE — horizontal layout with extra icons */
  if (f.variant === "wide") {
    return (
      <BentoCard className="h-full">
        <div className="flex flex-col md:flex-row gap-6 items-center">
          <div className="md:w-3/5">
            <h3
              className="text-xl font-extrabold text-black mb-2"
              style={HEADLINE}
            >
              {f.label}
            </h3>
            <p className="text-slate-600 text-sm leading-relaxed">{f.desc}</p>
          </div>
          <div className="md:w-2/5 flex justify-center gap-4">
            {f.extraIcons?.map((EI, i) => (
              <motion.div
                key={i}
                animate={{ y: [0, -6, 0] }}
                transition={{
                  duration: 2,
                  delay: i * 0.3,
                  repeat: Infinity,
                }}
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: i < 2 ? cfg.iconBg : cfg.accentHex,
                  border: "2px solid #000",
                }}
              >
                <EI
                  className={`w-5 h-5 ${i < 2 ? "text-black" : "text-white"}`}
                />
              </motion.div>
            )) ?? (
              <div
                className="w-20 h-20 rounded-xl border-2 border-dashed border-black flex items-center justify-center group-hover:opacity-80 transition-opacity"
                style={{ backgroundColor: cfg.iconBg }}
              >
                <Icon className="w-8 h-8 text-black" />
              </div>
            )}
          </div>
        </div>
      </BentoCard>
    );
  }

  /* ACCENT — purple background card */
  if (f.variant === "accent") {
    return (
      <BentoCard accent className="h-full justify-between">
        <div>
          <IconBadge icon={Icon} bg="rgba(255,255,255,0.2)" dark />
          <h3
            className="text-lg font-extrabold text-white mb-2"
            style={HEADLINE}
          >
            {f.label}
          </h3>
          <p className="text-white/70 text-sm leading-relaxed">{f.desc}</p>
        </div>
      </BentoCard>
    );
  }

  /* DEFAULT — white card with icon bar */
  return (
    <BentoCard className="h-full justify-between">
      <div
        className="h-16 rounded-xl flex items-center justify-center mb-5 group-hover:opacity-80 transition-opacity"
        style={{ backgroundColor: cfg.iconBg, border: "2px solid #000" }}
      >
        <Icon className="w-7 h-7 text-black group-hover:scale-110 transition-transform" />
      </div>
      <div>
        <h3
          className="text-base font-extrabold text-black mb-1"
          style={HEADLINE}
        >
          {f.label}
        </h3>
        <p className="text-slate-600 text-[11px] leading-relaxed">{f.desc}</p>
      </div>
    </BentoCard>
  );
}

/* ------------------------------------------------------------------ */
/*  Role Tab — gumroad style pill                                      */
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
      className={`relative px-6 py-3 rounded-xl text-sm font-extrabold transition-all duration-200 whitespace-nowrap ${
        active
          ? "bg-black text-white shadow-lg"
          : "text-slate-600 hover:text-black hover:bg-white border-2 border-transparent hover:border-black"
      }`}
      style={
        active ? { boxShadow: "4px 4px 0px 0px #7C3AED" } : undefined
      }
    >
      <span className="flex items-center gap-2">
        {cfg.label}
        {active && <ChevronRight className="w-4 h-4" />}
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Section                                                        */
/* ------------------------------------------------------------------ */

export default function AdminFeatureVault() {
  const [activeRole, setActiveRole] = useState<RoleKey>("agent");
  const cfg = ROLES[activeRole];

  return (
    <section
      className="relative overflow-hidden py-28 md:py-36"
      id="admin-features"
      style={GRID_BG}
    >
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* ── Header (code.html style) ── */}
        <motion.div
          className="mb-16 md:mb-20"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          {/* Headline + decorative badge */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div>
              <h2
                className="text-5xl md:text-7xl lg:text-8xl font-extrabold text-black tracking-tighter leading-none mb-6"
                style={HEADLINE}
              >
                Role Feature Vault
              </h2>
              <p className="text-slate-700 text-lg md:text-xl font-medium leading-relaxed max-w-xl">
                Every role has a purpose-built toolkit. Explore what powers each
                tier of the SwarajDesk governance stack.
              </p>
            </div>

            {/* Decorative rotating badge */}
            <div className="hidden lg:block relative h-24 w-24 shrink-0">
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{ backgroundColor: "rgba(124,58,237,0.15)" }}
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
              <motion.div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-black flex items-center justify-center rounded-xl shadow-xl"
                animate={{ rotate: [12, 22, 12] }}
                transition={{ duration: 4, repeat: Infinity }}
              >
                <Zap className="w-6 h-6 text-white" />
              </motion.div>
            </div>
          </div>

          {/* Count badge */}
          <div className="mt-8">
            <span
              className="inline-block bg-black text-white px-5 py-2 rounded-lg text-xs font-black tracking-widest uppercase"
              style={{ boxShadow: "4px 4px 0px 0px #7C3AED" }}
            >
              4 Roles &middot; 32 Features
            </span>
          </div>
        </motion.div>

        {/* ── Role Tabs ── */}
        <div className="flex gap-3 mb-6 overflow-x-auto pb-2 scrollbar-hide">
          {(Object.keys(ROLES) as RoleKey[]).map((r) => (
            <RoleTab
              key={r}
              roleKey={r}
              active={activeRole === r}
              onClick={() => setActiveRole(r)}
            />
          ))}
        </div>

        {/* Role subtitle */}
        <AnimatePresence mode="wait">
          <motion.p
            key={activeRole + "-subtitle"}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="text-sm font-bold mb-10 text-slate-500"
          >
            {cfg.subtitle}
          </motion.p>
        </AnimatePresence>

        {/* ── Bento Grid ── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeRole}
            className="grid grid-cols-1 md:grid-cols-4 gap-6"
            variants={stagger}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
          >
            {cfg.features.map((f, i) => (
              <motion.div key={i} variants={rise} className={f.span}>
                <Card f={f} role={activeRole} />
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
