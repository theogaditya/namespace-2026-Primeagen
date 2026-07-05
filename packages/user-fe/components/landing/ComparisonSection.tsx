'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Accurate comparison — SwarajDesk vs CPGRAMS vs CMO Kerala          */
/*  Data sourced from xxxxxxxxxxxxxxxxx.md comparison table             */
/* ------------------------------------------------------------------ */

interface Row {
  feature: string;
  cpgrams: 'yes' | 'no' | 'partial';
  cpgramsNote?: string;
  cmo: 'yes' | 'no' | 'partial';
  cmoNote?: string;
  swaraj: 'yes' | 'no' | 'partial';
}

const rows: Row[] = [
  {
    feature: 'AI-powered complaint drafting from images and voice',
    cpgrams: 'no',
    cmo: 'no',
    swaraj: 'yes',
  },
  {
    feature: 'Conversational AI assistant for full platform navigation',
    cpgrams: 'no',
    cmo: 'no',
    swaraj: 'yes',
  },
  {
    feature: 'Intelligent auto-assignment by department, district, and workload',
    cpgrams: 'no',
    cmo: 'no',
    swaraj: 'yes',
  },
  {
    feature: 'Predictive SLA breach and escalation risk detection',
    cpgrams: 'no',
    cmo: 'no',
    swaraj: 'yes',
  },
  {
    feature: 'Duplicate complaint detection before submission',
    cpgrams: 'no',
    cmo: 'no',
    swaraj: 'yes',
  },
  {
    feature: 'Real-time citizen-agent chat and live status updates',
    cpgrams: 'no',
    cmo: 'no',
    swaraj: 'yes',
  },
  {
    feature: 'Blockchain-backed audit trail for assignments and escalations',
    cpgrams: 'no',
    cmo: 'no',
    swaraj: 'yes',
  },
  {
    feature: 'Department performance analytics and heatmaps',
    cpgrams: 'partial',
    cpgramsNote: 'Basic analytics',
    cmo: 'partial',
    cmoNote: 'Basic analytics',
    swaraj: 'yes',
  },
  {
    feature: 'Multilingual voice and text complaint filing (20+ languages)',
    cpgrams: 'partial',
    cpgramsNote: 'Limited',
    cmo: 'partial',
    cmoNote: 'Limited',
    swaraj: 'yes',
  },
  {
    feature: 'Civic survey engine for NGOs and government bodies',
    cpgrams: 'no',
    cmo: 'no',
    swaraj: 'yes',
  },
  {
    feature: 'Complaint quality scoring before submission',
    cpgrams: 'no',
    cmo: 'no',
    swaraj: 'yes',
  },
  {
    feature: 'Abuse detection and content moderation',
    cpgrams: 'no',
    cmo: 'no',
    swaraj: 'yes',
  },
];

/* ------------------------------------------------------------------ */
/*  Status cell                                                        */
/* ------------------------------------------------------------------ */

function StatusCell({ status, note }: { status: 'yes' | 'no' | 'partial'; note?: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      {status === 'yes' && (
        <CheckCircle2 className="w-6 h-6 text-emerald-400" fill="currentColor" strokeWidth={0} />
      )}
      {status === 'no' && <XCircle className="w-6 h-6 text-red-400/70" />}
      {status === 'partial' && <AlertCircle className="w-6 h-6 text-amber-400" />}
      {note && (
        <span className="text-[10px] text-slate-400 text-center leading-tight max-w-[130px]">
          {note}
        </span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Animations                                                        */
/* ------------------------------------------------------------------ */

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

const rowVariant = {
  hidden: { opacity: 0, x: -30, scale: 0.97 },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { duration: 0.45, ease: 'easeOut' as const },
  },
};

const headingVariant = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as any },
  },
};

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function ComparisonSection() {
  return (
    <section className="py-24 bg-[#1e2330] text-white">
      <div className="max-w-6xl mx-auto px-6">
        {/* Heading */}
        <motion.div
          variants={headingVariant}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2
            className="text-3xl md:text-5xl font-extrabold tracking-tight mb-6"
            style={{ fontFamily: 'var(--font-headline)' }}
          >
            Why SwarajDesk?
          </h2>
          <p className="text-slate-400 text-base md:text-lg max-w-2xl mx-auto">
            Our solution vs existing redressal systems — a feature-by-feature comparison
            with CPGRAMS and CMO Kerala Grievance Portal.
          </p>
        </motion.div>

        {/* ─── Desktop Table (4 columns) ─── */}
        <div className="hidden md:block bg-slate-900/50 rounded-[2rem] border border-slate-700/50 overflow-hidden shadow-2xl backdrop-blur-sm">
          {/* Header */}
          <div className="grid grid-cols-[1fr_160px_160px_160px] border-b border-slate-700/50">
            <div className="p-6 text-slate-500 font-bold uppercase tracking-widest text-[11px]">
              Feature / Capability
            </div>
            <div className="p-6 text-center">
              <div className="text-slate-400 font-bold text-sm">CPGRAMS</div>
            </div>
            <div className="p-6 text-center">
              <div className="text-slate-400 font-bold text-sm">CMO Kerala</div>
            </div>
            <div className="p-6 text-center relative">
              <div className="absolute inset-x-0 top-0 h-1 bg-violet-600 rounded-t-sm" />
              <div className="text-violet-400 font-bold text-sm">SwarajDesk</div>
            </div>
          </div>

          {/* Rows */}
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {rows.map((r, i) => (
              <motion.div
                key={i}
                variants={rowVariant}
                className="grid grid-cols-[1fr_160px_160px_160px] border-b border-slate-800/40 last:border-b-0 hover:bg-white/4 hover:scale-[1.005] transition-all duration-200"
              >
                <div className="px-6 py-5 text-sm text-slate-300 flex items-center">
                  {r.feature}
                </div>
                <div className="px-6 py-5 flex items-center justify-center">
                  <StatusCell status={r.cpgrams} note={r.cpgramsNote} />
                </div>
                <div className="px-6 py-5 flex items-center justify-center">
                  <StatusCell status={r.cmo} note={r.cmoNote} />
                </div>
                <div className="px-6 py-5 flex items-center justify-center bg-violet-600/5">
                  <StatusCell status={r.swaraj} />
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* ─── Mobile Cards ─── */}
        <motion.div
          className="md:hidden space-y-4"
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {rows.map((r, i) => (
            <motion.div
              key={i}
              variants={rowVariant}
              className="bg-slate-900/60 rounded-2xl border border-slate-700/40 p-5"
            >
              <div className="text-sm font-medium text-slate-200 mb-4">{r.feature}</div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">CPGRAMS</div>
                  <StatusCell status={r.cpgrams} note={r.cpgramsNote} />
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">CMO Kerala</div>
                  <StatusCell status={r.cmo} note={r.cmoNote} />
                </div>
                <div>
                  <div className="text-[10px] text-violet-400 uppercase tracking-wider mb-2 font-bold">SwarajDesk</div>
                  <StatusCell status={r.swaraj} />
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
