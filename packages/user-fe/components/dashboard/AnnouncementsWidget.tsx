"use client";

import React from "react";
import { motion } from "framer-motion";
import { Megaphone, Construction, Heart, Shield, ArrowRight } from "lucide-react";

interface Announcement {
  id: string;
  icon: string;
  title: string;
  body: string;
}

const STATIC_ANNOUNCEMENTS: Announcement[] = [
  {
    id: "1",
    icon: "construction",
    title: "Scheduled maintenance in Sector 4",
    body: "Water supply may be affected this Thursday between 10 AM - 4 PM.",
  },
  {
    id: "2",
    icon: "volunteer",
    title: "New community drive this Saturday",
    body: "Join us for the local park restoration starting at 8 AM at Central Square.",
  },
  {
    id: "3",
    icon: "security",
    title: "Enhanced Patrolling Active",
    body: "Citizen patrollers are active tonight in the 5th Block area.",
  },
];

const ICON_MAP: Record<string, React.ReactNode> = {
  construction: <Construction className="w-5 h-5" />,
  volunteer: <Heart className="w-5 h-5" />,
  security: <Shield className="w-5 h-5" />,
};

export default function AnnouncementsWidget() {
  const [announcements, setAnnouncements] = React.useState<Announcement[]>(STATIC_ANNOUNCEMENTS);

  React.useEffect(() => {
    const loadAnnouncements = async () => {
      try {
        const authToken = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
        const response = await fetch("/api/announcements", {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
        });

        if (!response.ok) return;
        const data = await response.json();
        if (data?.success && Array.isArray(data.data) && data.data.length) {
          setAnnouncements(data.data);
        }
      } catch {
        setAnnouncements(STATIC_ANNOUNCEMENTS);
      }
    };

    loadAnnouncements();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.35 }}
      className="bg-[var(--dash-secondary)]/5 p-6 rounded-3xl border border-[var(--dash-secondary)]/10 flex flex-col h-full"
    >
      <div className="mb-6">
        <div className="flex items-center justify-between mb-6">
          <p className="text-[10px] font-black text-[var(--dash-secondary)] uppercase tracking-[0.2em]">
            Announcements
          </p>
          <Megaphone className="w-4 h-4 text-[var(--dash-secondary)]" />
        </div>
        <div className="space-y-6">
          {announcements.map((item) => (
            <div key={item.id} className="flex gap-4">
              <div className="shrink-0 w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[var(--dash-secondary)] shadow-sm">
                {ICON_MAP[item.icon] || <Megaphone className="w-5 h-5" />}
              </div>
              <div>
                <h5 className="text-sm font-bold text-[var(--dash-on-surface)] mb-1">
                  {item.title}
                </h5>
                <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                  {item.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-auto pt-6 border-t border-[var(--dash-secondary)]/10">
        <button className="text-[var(--dash-secondary)] text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:underline">
          View all updates
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}
