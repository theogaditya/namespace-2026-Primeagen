'use client';

import { motion } from 'framer-motion';
import {
  Sparkles,
  Lock,
  Globe,
  MapPin,
  WifiOff,
  ArrowRight,
  GitBranch,
  Building2,
  ThumbsUp,
  BarChart3,
  Camera,
  Database,
  Radio,
  Radar,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Feature card data                                                  */
/* ------------------------------------------------------------------ */

interface Feature {
  icon: LucideIcon;
  label: string;
  desc: string;
  span: string;            /* Tailwind col/row span classes */
  variant: 'hero' | 'dark' | 'gradient' | 'image' | 'wide' | 'wideDark' | 'default';
  badge?: string;
  extraIcons?: LucideIcon[];
  langSnippet?: string;
}

const features: Feature[] = [
  /* Row 1 — hero + dark + gradient  (2+1+1 = 4 cols) */
  {
    icon: Sparkles,
    label: 'AI-Powered Abuse & Duplicate Detection',
    desc: 'Our neural engine filters spam, detects duplicate filings, and verifies complaint authenticity in real-time—reducing manual screening for administrators.',
    span: 'md:col-span-2 md:row-span-2',
    variant: 'hero',
    badge: '99.2% ACCURACY',
  },
  {
    icon: Lock,
    label: 'Immutable Audit Trail',
    desc: 'Every complaint, status change, and resolution is hashed on-chain for tamper-proof accountability.',
    span: '',
    variant: 'dark',
  },
  {
    icon: Globe,
    label: '20+ Languages',
    desc: 'Mother-tongue filing with AI-driven translation to Hindi/English.',
    span: '',
    variant: 'gradient',
    langSnippet: 'नमस्ते • தமிழ் • বাংলা • HELLO',
  },

  /* Row 2 — UAV + GeoLocation (fills under dark/gradient)  */
  {
    icon: Radar,
    label: 'UAV On-Ground Verification',
    desc: 'AI-driven drones for real-time infrastructure monitoring in unsafe or remote zones.',
    span: '',
    variant: 'image',
  },
  {
    icon: MapPin,
    label: 'GeoLocation Tagging',
    desc: 'Automatic location pinning with voice-to-text and photo support for precise issue mapping.',
    span: '',
    variant: 'default',
  },

  /* Row 3 — wide auto-assign + offline + upvotes  (2+1+1)  */
  {
    icon: GitBranch,
    label: 'Intelligent Auto-Assignment',
    desc: 'AI routes each complaint to the correct municipal department by analyzing category, location, and workload balance.',
    span: 'md:col-span-2',
    variant: 'wide',
    extraIcons: [ArrowRight, GitBranch, Building2],
  },
  {
    icon: WifiOff,
    label: 'Offline-First Submissions',
    desc: 'Queue complaints locally—auto-sync when connectivity resumes. SMS and voice triggers also supported.',
    span: '',
    variant: 'default',
  },
  {
    icon: ThumbsUp,
    label: 'Community Upvotes',
    desc: 'Citizens vote on issues to surface the most critical problems. Gamified badges reward civic engagement.',
    span: '',
    variant: 'default',
  },

  /* Row 4 — SLA + Image-to-Form (1+1+2)  */
  {
    icon: BarChart3,
    label: 'SLA-Driven Analytics',
    desc: 'Real-time dashboards tracking resolution time, department efficiency, and complaint density trends.',
    span: '',
    variant: 'default',
  },
  {
    icon: Camera,
    label: 'Image-to-Form AI Autofill',
    desc: 'Upload a photo; our vision model extracts issue details, category, and severity to auto-fill the complaint form.',
    span: 'md:col-span-2',
    variant: 'wide',
  },
  {
    icon: Radio,
    label: 'Complaint Density Heatmaps',
    desc: 'Spatial clustering reveals regional patterns for data-driven governance decisions.',
    span: '',
    variant: 'default',
  },

  /* Row 5 — two wide-dark bottom  (2+2) */
  {
    icon: Database,
    label: 'Decentralized Evidence Storage',
    desc: 'Complaint media stored on IPFS for permanent, uncensorable records—ensuring evidence integrity.',
    span: 'md:col-span-2',
    variant: 'wideDark',
  },
];

/* ------------------------------------------------------------------ */
/*  Motion helpers                                                     */
/* ------------------------------------------------------------------ */

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 32, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
};

/* ------------------------------------------------------------------ */
/*  Card renderer                                                     */
/* ------------------------------------------------------------------ */

function Card({ f }: { f: Feature }) {
  const Icon = f.icon;

  /* ─ Large hero card ─ */
  if (f.variant === 'hero') {
    return (
      <motion.div
        whileHover={{ y: -4, boxShadow: '0 20px 50px -12px rgba(124,58,237,0.15)' }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
        className="h-full bg-white p-8 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden flex flex-col justify-between group"
      >
        <div>
          <div className="flex items-center gap-3 mb-6">
            <motion.div
              animate={{ rotate: [0, 8, -8, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center"
            >
              <Icon className="w-5 h-5 text-violet-600" />
            </motion.div>
            {f.badge && (
              <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded">
                {f.badge}
              </span>
            )}
          </div>
          <h3 className="text-2xl md:text-3xl font-bold tracking-tight mb-4">{f.label}</h3>
          <p className="text-gray-500 leading-relaxed">{f.desc}</p>
        </div>
        {/* Animated decorative bar */}
        <div className="mt-8 relative h-20 flex items-center justify-center">
          <div className="absolute inset-0 bg-violet-500/5 rounded-2xl flex items-center justify-center gap-2">
            <Sparkles className="w-16 h-16 text-violet-300/20 animate-pulse" />
            <motion.div
              className="flex gap-2"
              animate={{ x: [0, 10, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div className="h-1 w-8 bg-violet-600 rounded-full" />
              <div className="h-1 w-12 bg-violet-400 rounded-full" />
              <div className="h-1 w-6 bg-violet-300 rounded-full" />
            </motion.div>
          </div>
        </div>
      </motion.div>
    );
  }

  /* ─ Dark card ─ */
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
          <Database className="w-12 h-12" />
        </div>
      </motion.div>
    );
  }

  /* ─ Gradient card ─ */
  if (f.variant === 'gradient') {
    return (
      <motion.div
        whileHover={{ y: -4, scale: 1.01 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
        className="h-full bg-gradient-to-br from-violet-600 to-violet-700 p-7 rounded-3xl text-white flex flex-col justify-between relative overflow-hidden shadow-xl group"
      >
        <div className="relative z-10">
          <h3 className="text-lg font-bold mb-2">{f.label}</h3>
          <p className="text-white/80 text-sm leading-relaxed">{f.desc}</p>
        </div>
        {f.langSnippet && (
          <motion.div
            animate={{ x: [0, -40, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
            className="text-xs font-bold text-white/30 mt-4 whitespace-nowrap"
          >
            {f.langSnippet} • {f.langSnippet}
          </motion.div>
        )}
      </motion.div>
    );
  }

  /* ─ Image card (UAV) ─ */
  if (f.variant === 'image') {
    return (
      <motion.div
        whileHover={{ y: -4 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
        className="h-full bg-slate-50 p-5 rounded-3xl border border-gray-100 flex flex-col justify-between group"
      >
        <div className="relative rounded-2xl overflow-hidden mb-4 aspect-video bg-slate-200 flex items-center justify-center">
          <motion.div
            animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <Radar className="w-16 h-16 text-slate-300" />
          </motion.div>
          <div className="absolute bottom-2 left-2 flex gap-1 items-center">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[8px] font-bold text-white uppercase bg-black/50 px-1 rounded">
              Live Feed
            </span>
          </div>
        </div>
        <div>
          <h3 className="text-lg font-bold mb-1">{f.label}</h3>
          <p className="text-gray-500 text-[11px] leading-relaxed">{f.desc}</p>
        </div>
      </motion.div>
    );
  }

  /* ─ Wide card (auto-assign / image-to-form) ─ */
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
                  i === 0 ? 'bg-violet-500/10' : i === 1 ? 'bg-violet-500/20' : 'bg-violet-500/40'
                }`}
              >
                <EI className={`w-5 h-5 ${i < 2 ? 'text-violet-600' : 'text-white'}`} />
              </motion.div>
            ))
          ) : (
            <div className="w-20 h-20 bg-slate-100 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center group-hover:border-violet-400 transition-colors">
              <Icon className="w-8 h-8 text-slate-400 group-hover:text-violet-500 transition-colors" />
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  /* ─ Wide-dark card ─ */
  if (f.variant === 'wideDark') {
    return (
      <motion.div
        whileHover={{ y: -4, boxShadow: '0 16px 40px -8px rgba(0,0,0,0.4)' }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
        className="h-full bg-[#1e2330] p-7 rounded-3xl text-white group"
      >
        <div className="flex items-center gap-2 mb-3 text-violet-400">
          <Icon className="w-4 h-4" />
          <span className="text-[10px] font-bold uppercase tracking-widest">
            {f.icon === Database ? 'Web3 Infrastructure' : 'Real-time Insights'}
          </span>
        </div>
        <h3 className="text-lg font-bold mb-2">{f.label}</h3>
        <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
      </motion.div>
    );
  }

  /* ─ Default card ─ */
  return (
    <motion.div
      whileHover={{ y: -6, boxShadow: '0 16px 40px -8px rgba(0,0,0,0.08)' }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className="h-full bg-slate-50 p-5 rounded-3xl border border-gray-100 flex flex-col justify-between group"
    >
      <div className="h-20 bg-white rounded-2xl flex items-center justify-center mb-4 border border-gray-50 group-hover:bg-violet-50 transition-colors">
        <Icon className="w-8 h-8 text-violet-500 group-hover:scale-110 transition-transform" />
      </div>
      <div>
        <h3 className="text-lg font-bold mb-1">{f.label}</h3>
        <p className="text-gray-500 text-[11px] leading-relaxed">{f.desc}</p>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section                                                           */
/* ------------------------------------------------------------------ */

export default function FeatureVault() {
  return (
    <section className="py-24 bg-white" id="features">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex flex-col md:flex-row justify-between md:items-end gap-4 mb-14"
        >
          <div>
            <motion.h2
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4"
            >
              The Feature Vault
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-gray-500 text-base md:text-lg max-w-xl"
            >
              AI, blockchain, and offline-first architecture powering transparent,
              citizen-first governance at scale.
            </motion.p>
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="hidden md:block"
          >
            <span className="bg-emerald-100 text-emerald-700 px-4 py-1.5 rounded-md text-xs font-bold tracking-widest uppercase">
              Trust Badge: Verified System
            </span>
          </motion.div>
        </motion.div>

        {/* Bento Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-4 gap-5"
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.05 }}
        >
          {features.map((f, i) => (
            <motion.div key={i} variants={fadeUp} className={f.span}>
              <Card f={f} />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
