"use client";

import React from "react";
import { motion } from "framer-motion";
import { GitBranch, ExternalLink } from "lucide-react";

export default function BlockchainWidget() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="bg-slate-900 rounded-3xl p-6 text-white relative overflow-hidden group"
    >
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <GitBranch className="w-16 h-16" />
      </div>
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Ledger Transparency
          </span>
        </div>
        <h4 className="text-xl font-[var(--font-headline)] font-bold mb-2">
          Blockchain Verified
        </h4>
        <p className="text-sm text-slate-300 mb-6 leading-relaxed">
          Every report and fund allocation is immutable. Audit the public ledger on-chain.
        </p>
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between text-xs py-2 border-b border-white/10">
            <span className="text-slate-400">Contract Address</span>
            <span className="font-mono text-purple-300">0x71C...3a5b</span>
          </div>
          <div className="flex items-center justify-between text-xs py-2 border-b border-white/10">
            <span className="text-slate-400">Total Validated</span>
            <span className="font-bold">14,208 Reports</span>
          </div>
        </div>
        <a
          href="https://etherscan.io"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3 bg-white/10 border border-white/20 rounded-xl text-sm font-bold hover:bg-white/20 transition-all"
        >
          <span>Verify on Etherscan</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </motion.div>
  );
}
