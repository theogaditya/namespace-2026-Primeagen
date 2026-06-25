"use client";

import React from "react";
import { motion } from "framer-motion";

export default function LiveAreaMapWidget() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="bg-white rounded-3xl border border-slate-200/60 overflow-hidden shadow-sm"
    >
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <h4 className="font-bold text-[var(--dash-on-surface)]">Live Area Map</h4>
        <span className="text-[10px] font-bold px-2 py-1 bg-emerald-100 text-emerald-700 rounded uppercase">
          Active Now
        </span>
      </div>
      <div className="h-64 relative bg-slate-200">
        {/* Static map placeholder */}
        <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
          <div className="text-center text-slate-400">
            <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <p className="text-xs font-medium">Map loading...</p>
          </div>
        </div>
        {/* Animated ping marker */}
        <div className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2">
          <div className="relative">
            <div className="absolute -inset-2 bg-[var(--dash-primary)]/20 rounded-full animate-ping" />
            <div className="relative w-4 h-4 bg-[var(--dash-primary)] border-2 border-white rounded-full" />
          </div>
        </div>
      </div>
      <div className="p-4 bg-slate-50">
        <div className="flex items-center justify-between">
          <div className="flex -space-x-2">
            {["A", "B", "C"].map((letter, i) => (
              <div
                key={i}
                className="w-6 h-6 rounded-full bg-slate-300 border-2 border-white text-[8px] flex items-center justify-center font-bold text-slate-500"
              >
                {letter}
              </div>
            ))}
            <div className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white text-[8px] flex items-center justify-center font-bold text-slate-500">
              +12
            </div>
          </div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
            Citizen Patrollers Nearby
          </span>
        </div>
      </div>
    </motion.div>
  );
}
