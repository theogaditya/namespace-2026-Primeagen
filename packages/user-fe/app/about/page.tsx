'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  Users,
  Zap,
  Globe,
  Target,
} from 'lucide-react';

const team = [
  { role: 'Full-Stack & Infrastructure', name: 'Core Engineering Team' },
  { role: 'AI / ML Research', name: 'AI Research Division' },
  { role: 'Blockchain & Web3', name: 'Decentralisation Unit' },
  { role: 'UI/UX & Design', name: 'Design Systems Team' },
];

const pillars = [
  {
    icon: ShieldCheck,
    title: 'Accountability',
    desc: 'Every complaint, every status change, every resolution is recorded on an immutable blockchain — so nothing can be buried or altered.',
  },
  {
    icon: Sparkles,
    title: 'AI-First',
    desc: 'From abuse detection to department routing to UAV ground-truth verification, intelligent automation runs through every touchpoint.',
  },
  {
    icon: Users,
    title: 'Citizen-Centric',
    desc: 'Designed for India\'s diversity — 20+ languages, offline-first submissions, and voice/photo-assisted filing remove every barrier to participation.',
  },
  {
    icon: Zap,
    title: 'Speed',
    desc: 'SLA-driven dashboards hold departments accountable to response windows, turning complaint resolution from weeks to days.',
  },
  {
    icon: Globe,
    title: 'Open & Federated',
    desc: 'Built to be deployable by any state, district, or municipal body — open architecture, open standards.',
  },
  {
    icon: Target,
    title: 'Impact-Driven',
    desc: 'Real-time heatmaps and complaint clustering give officials the data to make systemic fixes, not just one-off patches.',
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.08, ease: 'easeOut' as const },
  }),
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-slate-950 text-white pt-20 pb-28 px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4z'/%3E%3C/g%3E%3C/svg%3E\")" }}
        />
        <div className="max-w-4xl mx-auto relative z-10">
          <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}>
            <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors mb-10">
              <ArrowLeft className="w-4 h-4" /> Back to home
            </Link>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}>
            <span className="bg-violet-600/30 text-violet-300 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest mb-6 inline-block">
              About SwarajDesk
            </span>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
              Rewriting the rules of<br />
              <span className="text-violet-400">civic governance.</span>
            </h1>
            <p className="text-slate-400 text-lg md:text-xl max-w-2xl leading-relaxed">
              SwarajDesk is a next-generation grievance redressal platform built for
              India's 1.4 billion citizens. We combine artificial intelligence,
              blockchain audit trails, and offline-first architecture to make
              public services accountable — at scale.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-20 px-6 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-2xl md:text-3xl font-extrabold mb-6">Our Mission</h2>
          <p className="text-gray-600 text-base md:text-lg leading-relaxed mb-6">
            India's existing grievance systems — CPGRAMS and state-level portals — were built
            for a different era. They lack real-time tracking, AI-powered routing, and any
            mechanism for tamper-proof accountability. Complaints are filed and forgotten.
          </p>
          <p className="text-gray-600 text-base md:text-lg leading-relaxed">
            SwarajDesk was founded with a single mandate: eliminate the gap between a
            citizen filing a complaint and a government actually fixing the issue.
            We do this by making every step — submission, routing, verification,
            resolution — transparent, auditable, and fast.
          </p>
        </motion.div>
      </section>

      {/* Pillars */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-2xl md:text-3xl font-extrabold mb-12 text-center"
          >
            What we stand for
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {pillars.map((p, i) => {
              const Icon = p.icon;
              return (
                <motion.div
                  key={i}
                  custom={i}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-violet-600" />
                  </div>
                  <h3 className="font-bold text-lg mb-2">{p.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{p.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20 px-6 max-w-4xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-2xl md:text-3xl font-extrabold mb-10"
        >
          Built by a passionate team
        </motion.h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {team.map((t, i) => (
            <motion.div
              key={i}
              custom={i}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="bg-slate-950 text-white p-5 rounded-2xl"
            >
              <div className="text-violet-400 text-[10px] font-bold uppercase tracking-widest mb-2">{t.role}</div>
              <div className="font-semibold text-sm">{t.name}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl mx-auto bg-gradient-to-br from-violet-600 to-violet-700 rounded-3xl p-12 text-center text-white"
        >
          <h2 className="text-2xl md:text-3xl font-extrabold mb-4">Ready to make your voice heard?</h2>
          <p className="text-white/80 mb-8">File a complaint, track its progress, and hold your government accountable.</p>
          <Link
            href="/regComplaint"
            className="inline-block bg-white text-violet-700 px-8 py-3 rounded-xl font-bold hover:bg-white/90 transition-all shadow-lg"
          >
            File a Complaint
          </Link>
        </motion.div>
      </section>
    </main>
  );
}
