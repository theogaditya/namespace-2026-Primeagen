'use client';

import { motion } from 'framer-motion';
import {
  HardHat,
  GraduationCap,
  Receipt,
  HeartPulse,
  Droplets,
  Zap,
  Bus,
  Landmark,
  ShieldAlert,
  TreePine,
  Building2,
  HandHeart,
  Megaphone,
  Brain,
  GitBranch,
  ShieldCheck,
  ScanEye,
  Radar,
  CheckCircle2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  All 13 complaint categories                                        */
/* ------------------------------------------------------------------ */

interface Category {
  icon: LucideIcon;
  label: string;
  color: string;
}

const inputCategories: Category[] = [
  { icon: HardHat, label: 'Infrastructure', color: 'text-amber-600' },
  { icon: GraduationCap, label: 'Education', color: 'text-blue-600' },
  { icon: Receipt, label: 'Revenue', color: 'text-emerald-600' },
  { icon: HeartPulse, label: 'Health', color: 'text-rose-500' },
  { icon: Droplets, label: 'Water Supply & Sanitation', color: 'text-cyan-500' },
  { icon: Zap, label: 'Electricity & Power', color: 'text-yellow-500' },
  { icon: Bus, label: 'Transportation', color: 'text-orange-500' },
  { icon: Landmark, label: 'Municipal Services', color: 'text-violet-600' },
  { icon: ShieldAlert, label: 'Police Services', color: 'text-slate-600' },
  { icon: TreePine, label: 'Environment', color: 'text-green-600' },
  { icon: Building2, label: 'Housing & Urban Dev.', color: 'text-indigo-500' },
  { icon: HandHeart, label: 'Social Welfare', color: 'text-pink-500' },
  { icon: Megaphone, label: 'Public Grievances', color: 'text-red-500' },
];

/* ------------------------------------------------------------------ */
/*  Right‑side process steps (6 nodes)                                 */
/* ------------------------------------------------------------------ */

interface ProcessStep {
  icon: LucideIcon;
  label: string;
  desc: string;
  bg: string;
  text: string;
  iconClr: string;
  isLarge?: boolean;
}

const processSteps: ProcessStep[] = [
  {
    icon: Brain,
    label: 'Vision AI Processing',
    desc: 'Image & Abuse Validation',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    iconClr: 'text-emerald-600',
  },
  {
    icon: GitBranch,
    label: 'AI Auto-Routing',
    desc: 'Department Assignment',
    bg: 'bg-violet-50',
    text: 'text-violet-700',
    iconClr: 'text-violet-600',
  },
  {
    icon: ShieldCheck,
    label: 'Blockchain Verification',
    desc: 'Immutable Audit Trail',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    iconClr: 'text-blue-600',
  },
  {
    icon: ScanEye,
    label: 'AI-Based Admin Verification',
    desc: 'Automated Compliance Check',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    iconClr: 'text-amber-600',
  },
  {
    icon: Radar,
    label: 'AI UAV Verification',
    desc: 'Drone On-Ground Validation',
    bg: 'bg-teal-50',
    text: 'text-teal-700',
    iconClr: 'text-teal-600',
  },
  {
    icon: CheckCircle2,
    label: 'Resolved',
    desc: 'Citizen Confirmed',
    bg: 'bg-emerald-500',
    text: 'text-white',
    iconClr: 'text-white',
    isLarge: true,
  },
];

/* ------------------------------------------------------------------ */
/*  Animation variants                                                */
/* ------------------------------------------------------------------ */

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' as const } },
};

/* ------------------------------------------------------------------ */
/*  Pulse ring keyframes (CSS-in-JS)                                   */
/* ------------------------------------------------------------------ */

const pulseRingStyle: React.CSSProperties = {
  position: 'absolute',
  inset: '-12px',
  borderRadius: '9999px',
  border: '2px solid rgba(124,58,237,0.25)',
  animation: 'pulseRing 2.5s ease-out infinite',
};

const pulseRing2Style: React.CSSProperties = {
  ...pulseRingStyle,
  animationDelay: '1.25s',
};

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function FlowSection() {
  return (
    <section className="py-24 bg-slate-50" id="how-it-works">
      {/* Pulse keyframe injected once */}
      <style>{`
        @keyframes pulseRing {
          0%   { transform: scale(1);   opacity: 1; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        @keyframes flowDash {
          to { stroke-dashoffset: -20; }
        }
      `}</style>

      <div className="max-w-7xl mx-auto px-6">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16 md:mb-20"
        >
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4" style={{ fontFamily: 'var(--font-headline)' }}>
            The SwarajDesk Flow
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto text-base md:text-lg">
            From filing to resolution — see how our intelligent platform routes,
            validates, and resolves civic grievances using AI and blockchain.
          </p>
        </motion.div>

        {/* ════════════════════════════════════════════════════════════ */}
        {/*  Desktop Flow Tree                                         */}
        {/* ════════════════════════════════════════════════════════════ */}
        <div className="hidden lg:block relative" style={{ height: 820 }}>
          {/* Animated SVG paths */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 1280 820"
            preserveAspectRatio="none"
          >
            {/* Left → Center (13 lines converging) */}
            {inputCategories.map((_, i) => {
              const yStart = 30 + i * 60;
              return (
                <path
                  key={`l${i}`}
                  d={`M 310,${yStart} C 460,${yStart} 500,410 640,410`}
                  fill="none"
                  stroke="#7C3AED"
                  strokeWidth="1.5"
                  strokeDasharray="6 6"
                  opacity="0.18"
                  style={{ animation: 'flowDash 1.5s linear infinite' }}
                />
              );
            })}
            {/* Center → Right (6 lines diverging) */}
            {processSteps.map((_, i) => {
              const yEnd = 70 + i * 130;
              const colors = ['#059669', '#7C3AED', '#2563EB', '#D97706', '#0D9488', '#059669'];
              return (
                <path
                  key={`r${i}`}
                  d={`M 640,410 C 800,410 840,${yEnd} 960,${yEnd}`}
                  fill="none"
                  stroke={colors[i]}
                  strokeWidth={i === processSteps.length - 1 ? 2.5 : 1.5}
                  strokeDasharray="6 6"
                  opacity="0.22"
                  style={{ animation: 'flowDash 1.5s linear infinite' }}
                />
              );
            })}
          </svg>

          {/* ── Central Hub with pulsing rings ── */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20"
          >
            <div className="relative">
              {/* Pulse rings */}
              <div style={pulseRingStyle} />
              <div style={pulseRing2Style} />
              {/* Core circle */}
              <div className="w-44 h-44 rounded-full bg-violet-600 flex items-center justify-center shadow-[0_0_60px_rgba(124,58,237,0.35)] border-4 border-white/20 relative z-10">
                <div className="text-center text-white">
                  <div className="text-xl font-extrabold">SwarajDesk</div>
                  <div className="text-[10px] opacity-80 uppercase tracking-widest">
                    Core Engine
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ── Left: 13 Category Nodes ── */}
          <motion.div
            className="absolute left-0 h-full flex flex-col justify-between py-2 w-[33%]"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {inputCategories.map((cat, i) => {
              const Icon = cat.icon;
              /* curve inward toward center for middle items */
              const mid = (inputCategories.length - 1) / 2;
              const offset = Math.abs(mid - i);
              const mr = Math.round(offset * 10);
              return (
                <motion.div
                  key={i}
                  variants={itemVariants}
                  className="flex items-center justify-end gap-2 group"
                  style={{ marginRight: mr }}
                >
                  <div className="text-right">
                    <div className="font-semibold text-[13px] leading-tight">{cat.label}</div>
                  </div>
                  <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform shrink-0">
                    <Icon className={`w-4 h-4 ${cat.color}`} />
                  </div>
                </motion.div>
              );
            })}
          </motion.div>

          {/* ── Right: 6 Process Nodes ── */}
          <motion.div
            className="absolute right-0 h-full flex flex-col justify-around py-4 w-[33%]"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {processSteps.map((step, i) => {
              const Icon = step.icon;
              const indented = i >= 1 && i <= 4;
              return (
                <motion.div
                  key={i}
                  variants={itemVariants}
                  className={`flex items-center gap-3 group ${indented ? 'translate-x-8' : ''}`}
                >
                  <div
                    className={`${
                      step.isLarge ? 'w-14 h-14 rounded-full' : 'w-11 h-11 rounded-lg'
                    } ${step.bg} flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform shrink-0`}
                  >
                    <Icon className={`${step.isLarge ? 'w-6 h-6' : 'w-5 h-5'} ${step.iconClr}`} />
                  </div>
                  <div>
                    <div
                      className={`font-bold ${
                        step.isLarge ? 'text-lg text-emerald-600' : `text-sm ${step.text}`
                      }`}
                    >
                      {step.label}
                    </div>
                    <div className="text-xs text-gray-400">{step.desc}</div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>

        {/* ════════════════════════════════════════════════════════════ */}
        {/*  Mobile Flow (vertical)                                    */}
        {/* ════════════════════════════════════════════════════════════ */}
        <motion.div
          className="lg:hidden space-y-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {/* Categories grid */}
          <div className="grid grid-cols-2 gap-2.5">
            {inputCategories.map((cat, i) => {
              const Icon = cat.icon;
              return (
                <motion.div
                  key={i}
                  variants={itemVariants}
                  className="flex items-center gap-2 bg-white p-2.5 rounded-xl shadow-sm"
                >
                  <Icon className={`w-4 h-4 ${cat.color} shrink-0`} />
                  <div className="font-medium text-[11px] leading-tight">{cat.label}</div>
                </motion.div>
              );
            })}
          </div>

          {/* Vertical connector */}
          <div className="flex justify-center text-violet-300">
            <svg width="2" height="28">
              <line x1="1" y1="0" x2="1" y2="28" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
            </svg>
          </div>

          {/* Central Hub with pulse */}
          <motion.div variants={itemVariants} className="flex justify-center">
            <div className="relative">
              <div
                className="absolute -inset-3 rounded-full border-2 border-violet-400/30"
                style={{ animation: 'pulseRing 2.5s ease-out infinite' }}
              />
              <div className="w-28 h-28 rounded-full bg-violet-600 flex items-center justify-center shadow-lg relative z-10">
                <div className="text-center text-white">
                  <div className="text-base font-extrabold">SwarajDesk</div>
                  <div className="text-[8px] opacity-80 uppercase tracking-widest">Core Engine</div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Vertical connector */}
          <div className="flex justify-center text-violet-300">
            <svg width="2" height="28">
              <line x1="1" y1="0" x2="1" y2="28" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
            </svg>
          </div>

          {/* Process steps */}
          <div className="space-y-3">
            {processSteps.map((step, i) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={i}
                  variants={itemVariants}
                  className={`flex items-center gap-3 p-3.5 rounded-xl ${
                    step.isLarge ? 'bg-emerald-500 text-white' : 'bg-white shadow-sm'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      step.isLarge ? 'bg-white/20' : step.bg
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${step.iconClr}`} />
                  </div>
                  <div>
                    <div className={`font-bold text-sm ${step.isLarge ? '' : step.text}`}>
                      {step.label}
                    </div>
                    <div className={`text-[11px] ${step.isLarge ? 'text-white/70' : 'text-gray-400'}`}>
                      {step.desc}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
