"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Megaphone,
  Construction,
  Heart,
  Shield,
  Droplets,
  Zap,
  Bus,
  Users,
  ArrowRight,
  X,
  Clock,
  AlertTriangle,
} from "lucide-react";

interface Announcement {
  id: string;
  icon: string;
  title: string;
  body: string;
  priority?: number;
  startsAt?: string;
  expiresAt?: string;
  isActive?: boolean;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  construction: <Construction className="w-5 h-5" />,
  volunteer: <Users className="w-5 h-5" />,
  security: <Shield className="w-5 h-5" />,
  health: <Heart className="w-5 h-5" />,
  water: <Droplets className="w-5 h-5" />,
  electricity: <Zap className="w-5 h-5" />,
  transport: <Bus className="w-5 h-5" />,
  campaign: <Megaphone className="w-5 h-5" />,
};

function timeAgo(dateStr?: string): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function priorityLabel(p?: number) {
  if (!p || p === 0) return null;
  if (p >= 3) return { text: "Urgent", cls: "bg-red-100 text-red-600" };
  if (p === 2) return { text: "High", cls: "bg-orange-100 text-orange-600" };
  return { text: "Normal", cls: "bg-slate-100 text-slate-500" };
}

/* ─── Full-screen glass modal ─── */
function AllAnnouncementsModal({
  announcements,
  onClose,
}: {
  announcements: Announcement[];
  onClose: () => void;
}) {
  // Close on Escape
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <motion.div
      key="backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      {/* Glass backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-md" />

      {/* Panel */}
      <motion.div
        key="panel"
        initial={{ opacity: 0, y: 60, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 320, damping: 28 } }}
        exit={{ opacity: 0, y: 40, scale: 0.97, transition: { duration: 0.18 } }}
        className={[
          "relative z-10 w-full sm:max-w-lg",
          "max-h-[90dvh] sm:max-h-[80dvh] flex flex-col",
          "rounded-t-3xl sm:rounded-3xl",
          "bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl",
          "border border-white/40 shadow-2xl overflow-hidden",
        ].join(" ")}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[var(--dash-secondary)]/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--dash-secondary)]/10 flex items-center justify-center">
              <Megaphone className="w-4 h-4 text-[var(--dash-secondary)]" />
            </div>
            <div>
              <p className="text-[10px] font-black text-[var(--dash-secondary)] uppercase tracking-[0.2em]">
                All Announcements
              </p>
              <p className="text-xs text-slate-400 font-medium">
                {announcements.length} active update{announcements.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Scrollable list */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          {announcements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Megaphone className="w-10 h-10 text-slate-200 mb-4" />
              <p className="text-sm font-semibold text-slate-400">No announcements yet</p>
            </div>
          ) : (
            announcements.map((item, i) => {
              const badge = priorityLabel(item.priority);
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: i * 0.04 } }}
                  className="flex gap-4 p-4 rounded-2xl bg-white/60 backdrop-blur-sm border border-slate-100 shadow-sm"
                >
                  <div className="shrink-0 w-11 h-11 rounded-xl bg-[var(--dash-secondary)]/8 flex items-center justify-center text-[var(--dash-secondary)]">
                    {ICON_MAP[item.icon] ?? <Megaphone className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 mb-1 flex-wrap">
                      <h5 className="text-sm font-bold text-[var(--dash-on-surface)] leading-snug">
                        {item.title}
                      </h5>
                      {badge && (
                        <span className={`shrink-0 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full ${badge.cls}`}>
                          {badge.text}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed mb-2">
                      {item.body}
                    </p>
                    <div className="flex items-center gap-3 text-[10px] text-slate-400 font-medium">
                      {item.startsAt && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {timeAgo(item.startsAt)}
                        </span>
                      )}
                      {item.expiresAt && (
                        <span className="flex items-center gap-1 text-amber-500">
                          <AlertTriangle className="w-3 h-3" />
                          Expires {new Date(item.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Bottom handle (mobile) */}
        <div className="sm:hidden absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-slate-300/60" />
      </motion.div>
    </motion.div>
  );
}

/* ─── Widget ─── */
export default function AnnouncementsWidget() {
  const [announcements, setAnnouncements] = React.useState<Announcement[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [filterMode, setFilterMode] = React.useState<"my" | "all" | "other">("my");
  const [municipalityInput, setMunicipalityInput] = React.useState<string>("");

  // (userMunicipality will be read inside the effect to avoid changing hooks)


  React.useEffect(() => {
    const loadAnnouncements = async () => {
      setLoading(true);
      try {
        // decide municipality param according to filterMode
        let municipalityParam: string | null = null;
        // derive user's municipality from localStorage for "my" mode
        let userMunicipality: string | null = null;
        try {
          const raw = typeof window !== "undefined" ? localStorage.getItem("userData") : null;
          if (raw) {
            const ud = JSON.parse(raw) as any;
            userMunicipality = ud?.location?.municipality || ud?.location?.municipal || ud?.location?.locality || ud?.location?.city || null;
          }
        } catch {}

        if (filterMode === "my") municipalityParam = userMunicipality;
        else if (filterMode === "other") municipalityParam = municipalityInput || null;

        // prepare headers for proxy route
        const authToken = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
        const extraHeaders: Record<string, string> = {};
        if (authToken) extraHeaders.Authorization = `Bearer ${authToken}`;
        if (municipalityParam) extraHeaders["X-Municipality"] = municipalityParam;

        const response = await fetch(`/api/announcements`, {
          headers: Object.keys(extraHeaders).length ? extraHeaders : undefined,
        });
        if (!response.ok) return;
        const data = await response.json();
        if (data?.success && Array.isArray(data.data)) {
          const now = Date.now();
          const filtered = data.data.filter((a: any) => {
            if (a.isActive === false) return false;
            if (a.expiresAt && new Date(a.expiresAt).getTime() < now) return false;
            if (a.startsAt && new Date(a.startsAt).getTime() > now) return false;
            return true;
          });
          setAnnouncements(filtered);
        }
      } catch (err) {
        console.error("Failed loading announcements:", err);
      } finally {
        setLoading(false);
      }
    };

    loadAnnouncements();
  }, [filterMode, municipalityInput]);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.35 }}
        className="bg-[var(--dash-secondary)]/5 p-6 rounded-3xl border border-[var(--dash-secondary)]/10 flex flex-col"
      >
        <div className="mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <p className="text-[10px] font-black text-[var(--dash-secondary)] uppercase tracking-[0.2em]">
                Announcements
              </p>
              <div className="text-xs text-slate-400">
                <label className="mr-2">View:</label>
                <select
                  value={filterMode}
                  onChange={(e) => setFilterMode(e.target.value as any)}
                  className="bg-transparent text-[11px] border border-slate-200 rounded px-2 py-1"
                >
                  <option value="my">My municipality</option>
                  <option value="all">All</option>
                  <option value="other">Other...</option>
                </select>
                {filterMode === "other" && (
                  <input
                    value={municipalityInput}
                    onChange={(e) => setMunicipalityInput(e.target.value)}
                    placeholder="Municipality"
                    className="ml-2 text-[11px] px-2 py-1 border border-slate-100 rounded"
                  />
                )}
              </div>
            </div>
            <Megaphone className="w-4 h-4 text-[var(--dash-secondary)]" />
          </div>

          {/* Loading skeleton */}
          {loading && (
            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-4 animate-pulse">
                  <div className="shrink-0 w-10 h-10 rounded-xl bg-slate-200" />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="h-3 bg-slate-200 rounded w-3/4" />
                    <div className="h-2 bg-slate-100 rounded w-full" />
                    <div className="h-2 bg-slate-100 rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && announcements.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Megaphone className="w-8 h-8 text-slate-300 mb-3" />
              <p className="text-xs font-semibold text-slate-400">No announcements</p>
              <p className="text-[11px] text-slate-300 mt-0.5">
                New announcements from your municipality will appear here.
              </p>
            </div>
          )}

          {/* Announcement list — show first 3 in the widget */}
          {!loading && announcements.length > 0 && (
            <div className="space-y-6">
              {announcements.slice(0, 3).map((item) => {
                const badge = priorityLabel(item.priority);
                return (
                  <div key={item.id} className="flex gap-4">
                    <div className="shrink-0 w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[var(--dash-secondary)] shadow-sm">
                      {ICON_MAP[item.icon] ?? <Megaphone className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h5 className="text-sm font-bold text-[var(--dash-on-surface)] line-clamp-1">
                          {item.title}
                        </h5>
                        {badge && badge.text !== "Normal" && (
                          <span className={`shrink-0 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full ${badge.cls}`}>
                            {badge.text}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed font-medium line-clamp-2">
                        {item.body}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-auto pt-6 border-t border-[var(--dash-secondary)]/10">
          <button
            onClick={() => setModalOpen(true)}
            className="text-[var(--dash-secondary)] text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:underline"
          >
            View all updates
            {announcements.length > 3 && (
              <span className="text-[10px] font-black bg-[var(--dash-secondary)]/10 px-1.5 py-0.5 rounded-full">
                +{announcements.length - 3}
              </span>
            )}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>

      {/* Glass modal */}
      <AnimatePresence>
        {modalOpen && (
          <AllAnnouncementsModal
            announcements={announcements}
            onClose={() => setModalOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

