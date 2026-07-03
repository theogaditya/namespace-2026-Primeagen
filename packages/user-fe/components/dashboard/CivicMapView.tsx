"use client";

/**
 * CivicMapView
 *
 * Full-page "Map" view for the citizen dashboard.
 * Renders a live Google Maps heatmap of all public complaints,
 * with contextual stats, a district density sidebar, and
 * usage guidance — all matching the user-fe design system.
 */

import React, { useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  MapPin,
  Layers,
  Info,
  MousePointerClick,
  Navigation,
  AlertTriangle,
  CheckCircle2,
  Activity,
} from "lucide-react";
import CivicComplaintHeatmap from "./CivicComplaintHeatmap";

// ─── Small stat card ──────────────────────────────────────────────────────────
interface StatPillProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
  delay?: number;
}
function StatPill({ icon, label, value, color, delay = 0 }: StatPillProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay }}
      className="flex items-center gap-3 bg-white rounded-2xl border border-slate-200/70 shadow-sm px-4 py-3 min-w-0"
    >
      <div className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}18` }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 truncate">{label}</p>
        <p className="text-lg font-black text-slate-900 leading-tight">{value}</p>
      </div>
    </motion.div>
  );
}

// ─── Feature highlight tile ───────────────────────────────────────────────────
interface FeatureTileProps {
  icon: React.ReactNode;
  title: string;
  body: string;
  delay?: number;
}
function FeatureTile({ icon, title, body, delay = 0 }: FeatureTileProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-5 flex flex-col gap-2"
    >
      <div className="w-10 h-10 rounded-xl bg-[var(--dash-surface-container)] flex items-center justify-center text-[var(--dash-primary)]">
        {icon}
      </div>
      <p className="font-bold text-slate-900 text-sm leading-tight">{title}</p>
      <p className="text-xs text-slate-500 leading-relaxed">{body}</p>
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function CivicMapView() {
  const [summary, setSummary] = useState<{ total: number; totalWithCoords: number } | null>(null);

  const handleSummary = useCallback(
    (s: { total: number; totalWithCoords: number }) => {
      setSummary(s);
    },
    []
  );

  return (
    <div className="pt-8 px-4 lg:px-8 pb-16 max-w-7xl mx-auto w-full space-y-8">

      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col lg:flex-row lg:items-end justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--dash-surface-container)] text-[var(--dash-primary)] text-[10px] font-black uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Data
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-black text-[var(--dash-on-surface)] leading-tight">
            Civic Issue Map
          </h1>
          <p className="mt-1.5 text-sm text-slate-500 max-w-xl leading-relaxed">
            Every pin is a real complaint submitted by a verified citizen in your region.
            Colour-coded by urgency, grouped by district — so you can see exactly where
            civic problems are concentrated right now.
          </p>
        </div>

        {/* Updated-at note */}
        <p className="text-[11px] text-slate-400 font-medium shrink-0">
          Refreshed every 5 minutes
        </p>
      </motion.div>

      {/* ── Stats row ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatPill
          icon={<MapPin className="w-4 h-4" />}
          label="Pinned on Map"
          value={summary ? summary.totalWithCoords.toLocaleString() : "—"}
          color="#630ed4"
          delay={0.05}
        />
        <StatPill
          icon={<Activity className="w-4 h-4" />}
          label="Total Reported"
          value={summary ? summary.total.toLocaleString() : "—"}
          color="#1960a3"
          delay={0.1}
        />
        <StatPill
          icon={<AlertTriangle className="w-4 h-4" />}
          label="Urgency Tracked"
          value="4 Levels"
          color="#d97706"
          delay={0.15}
        />
        <StatPill
          icon={<CheckCircle2 className="w-4 h-4" />}
          label="Data Source"
          value="Verified"
          color="#059669"
          delay={0.2}
        />
      </div>

      {/* ── Map ──────────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.15 }}
      >
        {/* Section label */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[var(--dash-primary)]" />
            <span className="text-sm font-bold text-slate-800">Interactive Heatmap</span>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-1 bg-violet-50 text-violet-600 rounded-full border border-violet-100">
            Google Maps
          </span>
        </div>

        <CivicComplaintHeatmap
          height="560px"
          showDensityTable
          onSummary={handleSummary}
        />
      </motion.div>

      {/* ── Feature tiles + usage tips ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Feature highlights */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="bg-white rounded-3xl border border-slate-200/60 shadow-sm p-6"
        >
          <div className="flex items-center gap-2 mb-5">
            <Info className="w-4 h-4 text-[var(--dash-primary)]" />
            <h3 className="text-sm font-black text-slate-800">About This Map</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FeatureTile
              icon={<MapPin className="w-5 h-5" />}
              title="Real Complaint Pins"
              body="Each marker represents a public complaint with verified GPS coordinates submitted in the app."
              delay={0.28}
            />
            <FeatureTile
              icon={<Layers className="w-5 h-5" />}
              title="Density Overlay"
              body="Coloured circles show complaint density. Overlapping circles compound to highlight high-activity zones."
              delay={0.33}
            />
            <FeatureTile
              icon={<Navigation className="w-5 h-5" />}
              title="District Focus"
              body="Click any district in the sidebar to instantly pan the map to that area and see all its issues."
              delay={0.38}
            />
          </div>
        </motion.div>

        {/* How to use */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="bg-white rounded-3xl border border-slate-200/60 shadow-sm p-6"
        >
          <div className="flex items-center gap-2 mb-5">
            <MousePointerClick className="w-4 h-4 text-[var(--dash-primary)]" />
            <h3 className="text-sm font-black text-slate-800">How to Use</h3>
          </div>
          <ol className="space-y-3">
            {[
              {
                step: "01",
                title: "Browse the map",
                body: "Pan and zoom on the map just like any Google Maps experience. Pinch to zoom on mobile.",
              },
              {
                step: "02",
                title: "Click a pin",
                body: "Tap any coloured pin to open a popup with the complaint number, category, urgency, location, and a short description.",
              },
              {
                step: "03",
                title: "Focus a district",
                body: "In the district list on the right, click any row to zoom the map straight to that area.",
              },
              {
                step: "04",
                title: "Read the colours",
                body: "Green = Low urgency · Violet = Medium · Amber = High · Red = Critical. Denser coloured zones mean more overlapping complaints.",
              },
            ].map(({ step, title, body }) => (
              <li key={step} className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-[var(--dash-surface-container)] text-[var(--dash-primary)] text-[10px] font-black flex items-center justify-center mt-0.5">
                  {step}
                </span>
                <div>
                  <p className="text-sm font-bold text-slate-900">{title}</p>
                  <p className="text-xs text-slate-500 leading-relaxed mt-0.5">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </motion.div>
      </div>

      {/* ── Footer note ──────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="flex items-start gap-3 bg-violet-50 border border-violet-100 rounded-2xl px-4 py-3.5"
      >
        <Info className="w-4 h-4 text-violet-500 mt-0.5 shrink-0" />
        <p className="text-xs text-violet-700 leading-relaxed">
          <strong>Privacy notice:</strong> Only complaints marked as <em>public</em> by their authors appear on this map.
          Personal details such as names, phone numbers, or email addresses are never displayed.
          Location data is limited to district, city, and GPS coordinates shared explicitly during submission.
        </p>
      </motion.div>
    </div>
  );
}
