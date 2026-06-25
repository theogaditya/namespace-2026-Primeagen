'use client';

import { useState, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { CheckCircle2, X } from 'lucide-react';

export default function LandingFooter() {
  const [email, setEmail] = useState('');
  const [showToast, setShowToast] = useState(false);

  function handleSubscribe(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setShowToast(true);
    setEmail('');
    setTimeout(() => setShowToast(false), 4000);
  }

  return (
    <footer className="bg-slate-950 text-white pt-24 pb-12 relative overflow-hidden">
      {/* ─── Thank-you Toast ─── */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: -30, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -30, x: '-50%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="fixed top-6 left-1/2 z-50 bg-emerald-600 text-white px-6 py-3.5 rounded-xl shadow-2xl flex items-center gap-3"
          >
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span className="text-sm font-semibold">Thank you for subscribing!</span>
            <button onClick={() => setShowToast(false)} className="ml-2 hover:bg-white/10 rounded-full p-0.5 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-6">
        {/* ─── Header Area ─── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-12 pb-16 border-b border-slate-800"
        >
          <div className="flex flex-col justify-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-3xl md:text-4xl font-extrabold text-violet-500 tracking-tight mb-4"
            >
              SwarajDesk
            </motion.div>
            <motion.p
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-slate-400 text-base md:text-lg max-w-md"
            >
              Building the technical layer for transparent, accountable, and
              citizen-first governance across India.
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="flex flex-col justify-center"
          >
            <h4 className="font-bold text-sm uppercase tracking-widest text-slate-300 mb-4">
              Stay up to date
            </h4>
            <form onSubmit={handleSubscribe} className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-violet-500 w-full text-white placeholder-slate-500 outline-none transition-all focus:border-violet-500"
              />
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                type="submit"
                className="bg-white text-slate-950 px-6 py-2 rounded-lg font-bold hover:bg-violet-100 transition-colors shrink-0 cursor-pointer"
              >
                Subscribe
              </motion.button>
            </form>
          </motion.div>
        </motion.div>

        {/* ─── Nav Columns (Platform + Legal only) ─── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-2 gap-12 py-16 max-w-lg"
        >
          <div>
            <h4 className="font-bold text-slate-100 mb-6">Platform</h4>
            <ul className="space-y-4">
              <li>
                <Link href="/regComplaint" className="text-slate-400 hover:text-violet-400 transition-colors text-sm">
                  File a Complaint
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-slate-400 hover:text-violet-400 transition-colors text-sm">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-slate-400 hover:text-violet-400 transition-colors text-sm">
                  Community Feed
                </Link>
              </li>
              <li>
                <Link href="/heatmap" className="text-slate-400 hover:text-violet-400 transition-colors text-sm">
                  Civic Heatmap
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-slate-100 mb-6">Legal</h4>
            <ul className="space-y-4">
              <li>
                <Link href="/about" className="text-slate-400 hover:text-violet-400 transition-colors text-sm">
                  About
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-slate-400 hover:text-violet-400 transition-colors text-sm">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-slate-400 hover:text-violet-400 transition-colors text-sm">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </motion.div>

        {/* ─── Giant branding ─── */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.2 }}
          className="py-12 flex justify-center overflow-hidden pointer-events-none select-none"
        >
          <motion.span
            initial={{ letterSpacing: '0.3em' }}
            whileInView={{ letterSpacing: '-0.05em' }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            className="text-[12vw] font-extrabold leading-none text-violet-500/10"
          >
            SwarajDesk
          </motion.span>
        </motion.div>

        {/* ─── Bottom bar ─── */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-slate-500 gap-4"
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            All systems operational
          </div>
          <div>© {new Date().getFullYear()} SwarajDesk. Built for Radical Accountability.</div>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-violet-400 transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-violet-400 transition-colors">Terms of Service</Link>
          </div>
        </motion.div>
      </div>
    </footer>
  );
}
