'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';

const word1 = 'Rewriting'.split('');
const word2 = 'the rules of'.split('');

export default function HeroCTA() {
  return (
    <section className="relative bg-white overflow-hidden py-24 md:py-32 px-6">
      {/* Ambient background blobs */}
      <motion.div
        className="absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full bg-violet-100/60 blur-[90px] pointer-events-none"
        animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.7, 0.5] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -bottom-32 right-0 w-[380px] h-[380px] rounded-full bg-indigo-100/40 blur-[80px] pointer-events-none"
        animate={{ scale: [1, 1.12, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
      />

      <div className="relative z-10 max-w-5xl mx-auto">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-6 inline-flex items-center gap-2 bg-violet-50 border border-violet-200 text-violet-700 text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-widest"
        >
          <Sparkles className="w-3 h-3" />
          AI-Powered Civic Governance
        </motion.div>

        {/* Headline — character-stagger animation */}
        <div className="mb-8">
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.08]" style={{ fontFamily: 'var(--font-headline)' }}>
            {/* "Rewriting" */}
            <span className="inline-block overflow-hidden mr-4">
              {word1.map((ch, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.45, delay: 0.04 * i, ease: 'easeOut' }}
                  className="inline-block"
                >
                  {ch}
                </motion.span>
              ))}
            </span>
            {/* "the rules of" */}
            <span className="inline-block overflow-hidden mr-4">
              {word2.map((ch, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.45, delay: 0.04 * (word1.length + i), ease: 'easeOut' }}
                  className="inline-block whitespace-pre"
                >
                  {ch}
                </motion.span>
              ))}
            </span>
            <br />
            {/* "civic governance." in violet */}
            <motion.span
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.6, ease: 'easeOut' }}
              className="text-violet-600 inline-block"
            >
              civic governance.
            </motion.span>
          </h2>
        </div>

        {/* Body copy */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.75 }}
          className="text-gray-500 text-base md:text-lg max-w-2xl leading-relaxed mb-10"
        >
          SwarajDesk is reimagining civic governance for India&apos;s 1.4 billion citizens.
          While outdated systems like CPGRAMS are crippled by delays, SwarajDesk delivers
          faster, transparent and accountable grievance resolution through AI-powered triage,
          intelligent agents, blockchain-backed tracking, and offline-first access.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.9 }}
          className="flex flex-wrap gap-4 items-center"
        >
          {/* <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
            <Link
              href="/regComplaint"
              className="inline-flex items-center gap-2 bg-violet-600 text-white px-7 py-3.5 rounded-full font-bold text-sm hover:bg-violet-700 transition-colors shadow-lg shadow-violet-200"
            >
              File a Complaint
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div> */}
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
            <Link
              href="#how-it-works"
              className="inline-flex items-center gap-2 text-gray-700 font-semibold text-sm hover:text-violet-600 transition-colors"
            >
              See how it works
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </motion.div>


      </div>
    </section>
  );
}
