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
      className="bg-white rounded-3xl p-6 text-slate-900 border border-gray-200 shadow-sm relative overflow-hidden group"
    >
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <GitBranch className="w-16 h-16 text-indigo-300" />
      </div>
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Ledger Transparency
          </span>
        </div>
        <h4 className="text-xl font-[var(--font-headline)] font-bold mb-2">
          Blockchain Verified
        </h4>
        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
          Every report and fund allocation is immutable. Audit the public ledger on-chain.
        </p>
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between text-xs py-2 border-b border-slate-200">
            <span className="text-slate-500">Contract Address</span>
            <span className="font-mono text-indigo-700">0x71C...3a5b</span>
          </div>
          <div className="flex items-center justify-between text-xs py-2 border-b border-slate-200">
            <span className="text-slate-500">Total Validated</span>
            <span className="font-bold">14,208 Reports</span>
          </div>
        </div>
        <a
          href="https://sepolia.etherscan.io/address/0x522ba372e9fE6ecfEd24b773528b447bBdF823b2"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all"
        >
          <span>Verify on Etherscan</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </motion.div>
  );
}
