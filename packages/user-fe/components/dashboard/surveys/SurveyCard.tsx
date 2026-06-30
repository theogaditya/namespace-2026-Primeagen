"use client";

import React, { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  Building2,
  MessageSquare,
  CheckCircle2,
  BadgeCheck,
  Clock,
} from "lucide-react";
import type { SurveyListItem } from "@/types/survey";

// ─── Category → Unsplash image mapping ───────────────────────────────────────
const CATEGORY_IMAGE_MAP: Record<string, string[]> = {
  // Transport - three muted city/roads images
  transport:      [
    // primary: public transport photo (stable Wikimedia Commons URL)
    "https://upload.wikimedia.org/wikipedia/commons/0/0b/KSRTC_bus%2C_Kerala.jpg",
    "1504384308090-c894fdcc538d",
    "1500530855697-b586d89ba3ee",
  ],
  roads:          ["1545459139-e54b7edc0ab8", "1504384308090-c894fdcc538d", "1494526585095-c41746248156"],
  infrastructure: ["1486325212027-8081e485255e", "1541872704-a0c13ae25862", "1504307651254-35680f356dfd"],
  traffic:        ["1477959858617-67f85cf4f1df", "1494526585095-c41746248156", "1504384308090-c894fdcc538d"],

  // Community - three warm community images
  community:      [
    "1508385082359-fb4c6d3d2b6b",
    "https://lh3.googleusercontent.com/aida-public/AB6AXuDFaW6uI6SHA5zlr4APaiJtE1Gh1ZgJpWDbWmKKGb8nFvOKjdgacnyJUnIpmGwEk3wIJsaFWHI1sRtjNBefxCEXBZWvj9dWyqKV70t-jDK3GMgHtaIJugHgFzqFuC86mcQBf2GonzOYoWiegOFReNSLkFcfbZi4s2dbJh--3NsFhHVRaCMfXLkjTWNWpm_vjigyhW-MO0CdI54mYwg6ksrlPMmGFrcHZniTY3wEI_7BUtyHxj6BMhuZjvyhoTNY6OkKVWbGCxw_UwOj",
    "1494809610413-6c6b4a0a8b6a",
  ],
  social:         ["1529156069898-49953e39b3ac", "1508385082359-fb4c6d3d2b6b", "1542736667-069246bdbc5a"],
  development:    ["1504307651254-35680f356dfd", "1541872704-a0c13ae25862", "1494526585095-c41746248156"],

  // Health
  health:         [
    "1576091160550-2173dba999ef",
    "1631217868264-e5b90bb5592b",
    "1505751172876-fa1923c5c528",
  ],
  healthcare:     ["1631217868264-e5b90bb5592b", "1576091160550-2173dba999ef", "1505751172876-fa1923c5c528"],
  medical:        ["1505751172876-fa1923c5c528", "1576091160550-2173dba999ef", "1631217868264-e5b90bb5592b"],

  // Environment
  environment:    [
    "1441974231531-c6227db76b6e",
    "https://lh3.googleusercontent.com/aida-public/AB6AXuCvgexO_1hVeZ6PA2vA8va5C0TCIOzpq_Z8DtjDL17l8TOtS5pNkAbGvuhFJcdC0F9uNt0tAsNdSKZiXhOKAlhms5BK1dAsn8oenCLO6Y-ZNMb5znZdbO4RToPQbM7nwRkYc8nWDiVMiX0J1CP89TCQwd3X1cEfL6mQWXX1hlN4FQ22YA_XSLNSQ3xv2VJJMNdOPlpHtboggfCFNgWpqJeGmInLjVXP7xaeKLz3EoAm9g0YB0SU64TCv8UGEuClPIr7IAmv44AITRii",
    "1500462918081-a6d8d86de2af",
  ],
  ecology:        ["1518531933922-f99374df87a5", "1441974231531-c6227db76b6e", "1500462918081-a6d8d86de2af"],
  green:          [
    "1441974231531-c6227db76b6e",
    "https://lh3.googleusercontent.com/aida-public/AB6AXuAStH_DoEghuNxMLcV_aJPe7rl6pVEMqrkTB_JzPRh0eLmR0sTWKodkTGG5Q_7RaRdl-Wj9QuHuoTWACXk0h6IovUNfcH9DgOzIDgykMEBXItpPk3pehOk9B8BqeitAIt5vxj7RZnPZ7oKCQvhV9SHccKqIrDAkp8sPtAxcHvjLJsoU4rOyQ3RKZYkHMVGEIxMpCyIG9jiwwOuug4JnQt0rWoS-bwIfbkPEEH9BV3fSyH6lSnXKjoelUz4z6RLb_HkTf6dizaxqDfXd",
    "1500462918081-a6d8d86de2af",
  ],
  sustainability: ["1473341304170-971dccb5ac1e", "1441974231531-c6227db76b6e", "1518531933922-f99374df87a5"],

  // Water / sanitation
  water:          [
    "1506744038136-46273834b3fb",
    "1502672260266-1c1ef2d93688",
    "1532996122724-e3c037cb331e",
  ],
  sanitation:     ["1532996122724-e3c037cb331e", "1502672260266-1c1ef2d93688", "1506744038136-46273834b3fb"],
  waste:          ["1532996122724-e3c037cb331e", "1500462918081-a6d8d86de2af", "1441974231531-c6227db76b6e"],

  // Energy
  energy:         ["1473341304170-971dccb5ac1e", "1500462918081-a6d8d86de2af", "1541872704-a0c13ae25862"],
  electricity:    ["1473341304170-971dccb5ac1e", "1500462918081-a6d8d86de2af", "1541872704-a0c13ae25862"],
  power:          ["1473341304170-971dccb5ac1e", "1500462918081-a6d8d86de2af", "1541872704-a0c13ae25862"],

  // Education
  education:      ["1580582932707-520aed937b7b", "1427504494785-3a9ca7044f45", "1504307651254-35680f356dfd"],
  school:         ["1580582932707-520aed937b7b", "1427504494785-3a9ca7044f45", "1504307651254-35680f356dfd"],
  learning:       ["1427504494785-3a9ca7044f45", "1580582932707-520aed937b7b", "1504307651254-35680f356dfd"],

  // Safety
  safety:         ["1507003211169-0a1dd7228f2d", "1500462918081-a6d8d86de2af", "1494809610413-6c6b4a0a8b6a"],
  security:       ["1507003211169-0a1dd7228f2d", "1494809610413-6c6b4a0a8b6a", "1500462918081-a6d8d86de2af"],

  // Parks / recreation
  parks:          ["1500462918081-a6d8d86de2af", "1441974231531-c6227db76b6e", "1518531933922-f99374df87a5"],
  recreation:     ["1500462918081-a6d8d86de2af", "1518531933922-f99374df87a5", "1441974231531-c6227db76b6e"],

  // Governance
  governance:     ["1541872704-a0c13ae25862", "1504307651254-35680f356dfd", "1473341304170-971dccb5ac1e"],
  administration: ["1541872704-a0c13ae25862", "1504307651254-35680f356dfd", "1473341304170-971dccb5ac1e"],
  policy:         ["1541872704-a0c13ae25862", "1504307651254-35680f356dfd", "1473341304170-971dccb5ac1e"],
};

const DEFAULT_LOTTIE_JSON = "/Lottie-1.json";

function getSurveyImage(category: string, index: number): string {
  const key = (category || "").toLowerCase().replace(/[^a-z]/g, "");
  let images: string[] | undefined = CATEGORY_IMAGE_MAP[key];

  if (!images) {
    const found = Object.entries(CATEGORY_IMAGE_MAP).find(([k]) => key.includes(k) || k.includes(key));
    images = found ? found[1] : undefined;
  }

  const id = images && images.length > 0 ? images[index % images.length] : DEFAULT_LOTTIE_JSON;
  // If the id is already a full URL or a site-root path, return as-is; otherwise build Unsplash photo URL.
  if (id.startsWith("http://") || id.startsWith("https://") || id.startsWith("/")) {
    return id;
  }
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&q=80`;
}

// ─── Category → accent color ───────────────────────────────────────────────
const CATEGORY_COLOR: Record<string, { bg: string; text: string }> = {
  transport:      { bg: "bg-blue-500/90",    text: "text-white" },
  roads:          { bg: "bg-blue-500/90",    text: "text-white" },
  infrastructure: { bg: "bg-blue-600/90",    text: "text-white" },
  community:      { bg: "bg-teal-500/90",    text: "text-white" },
  social:         { bg: "bg-teal-500/90",    text: "text-white" },
  health:         { bg: "bg-rose-500/90",    text: "text-white" },
  healthcare:     { bg: "bg-rose-500/90",    text: "text-white" },
  environment:    { bg: "bg-emerald-600/90", text: "text-white" },
  ecology:        { bg: "bg-emerald-600/90", text: "text-white" },
  green:          { bg: "bg-emerald-600/90", text: "text-white" },
  water:          { bg: "bg-sky-500/90",     text: "text-white" },
  sanitation:     { bg: "bg-cyan-600/90",    text: "text-white" },
  energy:         { bg: "bg-amber-500/90",   text: "text-white" },
  electricity:    { bg: "bg-amber-500/90",   text: "text-white" },
  education:      { bg: "bg-indigo-500/90",  text: "text-white" },
  safety:         { bg: "bg-orange-500/90",  text: "text-white" },
  parks:          { bg: "bg-lime-600/90",    text: "text-white" },
  governance:     { bg: "bg-slate-600/90",   text: "text-white" },
};

function getCategoryColor(category: string) {
  const key = (category || "").toLowerCase().replace(/[^a-z]/g, "");
  return (
    CATEGORY_COLOR[key] ??
    Object.entries(CATEGORY_COLOR).find(
      ([k]) => key.includes(k) || k.includes(key)
    )?.[1] ?? { bg: "bg-violet-600/90", text: "text-white" }
  );
}

function estimateReadTime(questions: number): string {
  const mins = Math.max(2, Math.ceil(questions / 2));
  return `${mins} min read`;
}

// ─── Status badge (unchanged logic) ───────────────────────────────────────────
function getDaysUntilClose(endsAt: string | null): number | null {
  if (!endsAt) return null;
  const end = new Date(endsAt);
  const now = new Date();
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function getStatusBadge(endsAt: string | null) {
  const days = getDaysUntilClose(endsAt);
  if (days === null)
    return { bg: "bg-emerald-100", text: "text-emerald-700", label: "Open", dot: "bg-emerald-500" };
  if (days <= 0)
    return { bg: "bg-slate-100", text: "text-slate-500", label: "Closed", dot: "bg-slate-400" };
  if (days <= 3)
    return {
      bg: "bg-amber-100",
      text: "text-amber-700",
      label: `Closes in ${days} day${days > 1 ? "s" : ""}`,
      dot: "bg-amber-500",
    };
  return { bg: "bg-emerald-100", text: "text-emerald-700", label: "Open", dot: "bg-emerald-500" };
}

// ─── Props ───────────────────────────────────────────────────────────────
interface SurveyCardProps {
  survey: SurveyListItem;
  index: number;
  isCompleted: boolean;
  onSelect: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────
export default function SurveyCard({
  survey,
  index,
  isCompleted,
  onSelect,
}: SurveyCardProps) {
  const statusBadge = getStatusBadge(survey.endsAt);
  const isClosed =
    survey.status === "CLOSED" ||
    (getDaysUntilClose(survey.endsAt) !== null &&
      getDaysUntilClose(survey.endsAt)! <= 0);
  const imageUrl = getSurveyImage(survey.category, index);
  const [showLottie, setShowLottie] = useState<boolean>(
    imageUrl.includes("lottie") || imageUrl.endsWith(".lottie") || imageUrl.endsWith(".json") || imageUrl.includes("lottie.host")
  );
  const lottieContainer = useRef<HTMLDivElement | null>(null);
  const [lottieFailed, setLottieFailed] = useState<boolean>(false);

  // Load appropriate Lottie renderer and render the animation into the container when needed.
  useEffect(() => {
    if (!showLottie) return;
    if (typeof window === "undefined") return;
    let cancelled = false;
    let anim: any = null;

    const path = imageUrl && (imageUrl.endsWith(".json") || imageUrl.includes("lottie.host") || imageUrl.includes(".lottie")) ? imageUrl : DEFAULT_LOTTIE_JSON;

    // If the path points to a JSON file, use lottie-web and load animationData
    if (path.endsWith(".json") || path.includes("/public") || path.startsWith("/")) {
      const ensureLottie = () =>
        new Promise<void>((res) => {
          if ((window as any).lottie) return res();
          const s = document.createElement("script");
          s.src = "https://unpkg.com/lottie-web@latest/build/player/lottie.min.js";
          s.async = true;
          s.onload = () => res();
          s.onerror = () => res();
          document.head.appendChild(s);
        });

      (async () => {
        await ensureLottie();
        if (cancelled || !lottieContainer.current) return;
        try {
          const resp = await fetch(path, { cache: "no-cache" });
          if (!resp.ok) {
            console.warn("Lottie JSON fetch failed:", resp.status, resp.statusText);
            setLottieFailed(true);
            return;
          }
          const json = await resp.json();
          // @ts-ignore
          const lottie = (window as any).lottie;
          if (!lottie) {
            setLottieFailed(true);
            return;
          }
          anim = lottie.loadAnimation({
            container: lottieContainer.current,
            renderer: "svg",
            loop: true,
            autoplay: true,
            animationData: json,
          });
        } catch (err) {
          console.warn("Lottie load error:", err);
          setLottieFailed(true);
        }
      })();

      return () => {
        cancelled = true;
        if (anim && anim.destroy) anim.destroy();
      };
    }

    // Otherwise assume a .lottie bundle: use dotlottie webcomponent
    const ensureDot = () =>
      new Promise<void>((res) => {
        if (document.querySelector('script[data-dotlottie-wc]')) return res();
        const s = document.createElement("script");
        s.setAttribute("src", "https://unpkg.com/@lottiefiles/dotlottie-wc@0.9.10/dist/dotlottie-wc.js");
        s.type = "module";
        s.setAttribute("data-dotlottie-wc", "true");
        s.onload = () => res();
        s.onerror = () => res();
        document.head.appendChild(s);
      });

    (async () => {
      await ensureDot();
      if (cancelled || !lottieContainer.current) return;
      try {
        const el = document.createElement("dotlottie-wc");
        el.setAttribute("src", path);
        el.setAttribute("autoplay", "");
        el.setAttribute("loop", "");
        el.style.width = "100%";
        el.style.height = "100%";
        lottieContainer.current.innerHTML = "";
        lottieContainer.current.appendChild(el);

        setTimeout(() => {
          if (cancelled) return;
          if (!(el as any).shadowRoot) setLottieFailed(true);
        }, 1500);
      } catch (err) {
        console.warn("dotlottie mount error:", err);
        setLottieFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      if (lottieContainer.current) lottieContainer.current.innerHTML = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showLottie, imageUrl]);
  const catColor = getCategoryColor(survey.category);
  const readTime = estimateReadTime(survey._count.questions);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`group bg-white rounded-2xl border border-slate-200/60 overflow-hidden flex flex-col ${
        isClosed
          ? "opacity-60 cursor-pointer"
          : "cursor-pointer hover:shadow-lg hover:border-violet-200"
      } transition-all duration-200`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* ── Hero image ── */}
      <div className="relative h-40 overflow-hidden flex-shrink-0">
        {!showLottie ? (
          <img
            src={imageUrl}
            alt={survey.category}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
            onError={() => setShowLottie(true)}
          />
        ) : (
          // Render Lottie fallback when image fails or when a Lottie URL is provided
          lottieFailed ? (
            <div className="w-full h-full flex items-center justify-center bg-slate-100">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="24" height="24" rx="6" fill="#E6E7EB"/>
                <path d="M8 12v-2a4 4 0 018 0v2" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M7 16h10" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          ) : (
            <div ref={lottieContainer} className="w-full h-full" />
          )
        )}
        {/* Gradient scrim for badge readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

        {/* Category pill */}
        <div className="absolute top-3 left-3">
          <span
            className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest backdrop-blur-sm ${catColor.bg} ${catColor.text}`}
          >
            {survey.category}
          </span>
        </div>

        {/* Status / Completed badge */}
        {isCompleted ? (
          <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100/90 backdrop-blur-sm">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-[10px] font-bold text-emerald-700">Completed</span>
          </div>
        ) : (
          <div
            className={`absolute top-3 right-3 flex items-center gap-1.5 px-2 py-0.5 rounded-full backdrop-blur-sm ${statusBadge.bg}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot}`} />
            <span className={`text-[10px] font-bold ${statusBadge.text}`}>
              {statusBadge.label}
            </span>
          </div>
        )}
      </div>

      {/* ── Card body ── */}
      <div className="flex flex-col flex-1 p-5">
        {/* CivicPartner label */}
        <div className="flex items-center gap-1.5 mb-2">
          <BadgeCheck className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            CivicPartner
          </span>
        </div>

        {/* Title */}
        <h3 className="text-sm font-bold text-slate-800 line-clamp-2 group-hover:text-violet-700 transition-colors">
          {survey.title}
        </h3>

        {/* Description */}
        <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 flex-1">
          {survey.description}
        </p>

        {/* Footer row */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <Clock className="w-3.5 h-3.5" />
              <span>{readTime}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{survey._count.responses}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-slate-500 max-w-[130px]">
            <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{survey.civicPartner.orgName}</span>
          </div>
        </div>

        {/* CTA */}
        {!isCompleted && !isClosed && (
          <button
            className="w-full mt-4 py-2.5 px-4 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-semibold text-sm transition-colors active:scale-[0.98]"
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
          >
            Take Survey →
          </button>
        )}
        {isCompleted && (
          <button
            className="w-full mt-4 py-2.5 px-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl font-semibold text-sm hover:bg-emerald-100 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
          >
            View Results →
          </button>
        )}
        {isClosed && !isCompleted && (
          <div className="w-full mt-4 py-2.5 px-4 bg-slate-100 text-slate-500 rounded-xl font-semibold text-sm text-center">
            Survey Closed
          </div>
        )}
      </div>
    </motion.div>
  );
}
