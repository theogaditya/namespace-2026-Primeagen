'use client';

import { motion } from 'framer-motion';
import { Landmark, Building2, Scale, Building, Shield } from 'lucide-react';

const partners = [
  { icon: Landmark, name: 'Government of India' },
  { icon: Building2, name: 'Jharkhand' },
  { icon: Scale, name: 'Ranchi Municipal Corp.' },
  { icon: Building, name: 'Odisha' },
  { icon: Shield, name: 'Asansol Municipal Corp.' },
];

export default function TrustedBy() {
  /* Double list for seamless marquee */
  const doubled = [...partners, ...partners];

  return (
    <section className="py-12 border-y border-gray-100 bg-white overflow-hidden">
      <style>{`
        @keyframes marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
      <div className="max-w-7xl mx-auto px-6">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center text-sm font-bold text-gray-400 uppercase tracking-[0.2em] mb-8"
        >
          Trusted by Civic Leaders
        </motion.p>
      </div>
      {/* Infinite scrolling marquee */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-white to-transparent z-10" />
        <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-white to-transparent z-10" />
        <div
          className="flex items-center gap-12 md:gap-20 whitespace-nowrap w-max opacity-60 hover:opacity-100 transition-opacity duration-500"
          style={{ animation: 'marquee 30s linear infinite' }}
        >
          {doubled.map((p, i) => {
            const Icon = p.icon;
            return (
              <div key={i} className="flex items-center gap-2 font-bold text-base md:text-lg text-slate-700 shrink-0">
                <Icon className="w-6 h-6 md:w-7 md:h-7" />
                {p.name}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
