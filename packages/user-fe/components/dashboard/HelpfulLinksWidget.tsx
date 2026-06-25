"use client";

import React from "react";
import { motion } from "framer-motion";
import { BookOpen, Gavel, LifeBuoy } from "lucide-react";
import Link from "next/link";

const LINKS = [
  {
    label: "Community Guidelines",
    href: "/about",
    icon: <BookOpen className="w-5 h-5 text-[var(--dash-primary)]" />,
  },
  {
    label: "Civic Laws & Byelaws",
    href: "#",
    icon: <Gavel className="w-5 h-5 text-[var(--dash-primary)]" />,
  },
  {
    label: "Request Assistance",
    href: "#",
    icon: <LifeBuoy className="w-5 h-5 text-[var(--dash-primary)]" />,
  },
];

export default function HelpfulLinksWidget() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.45 }}
      className="bg-white rounded-3xl p-6 border border-slate-200/60 shadow-sm"
    >
      <h4 className="font-bold text-[var(--dash-on-surface)] mb-4">Helpful Links</h4>
      <div className="space-y-2">
        {LINKS.map((link) => (
          <Link
            key={link.label}
            href={link.href}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors text-sm font-medium text-slate-600"
          >
            {link.icon}
            {link.label}
          </Link>
        ))}
      </div>
    </motion.div>
  );
}
