'use client';

import { useRef, useEffect, useState } from 'react';
import {
  motion,
  useTransform,
  useMotionValue,
  useSpring,
  type Variants,
  type MotionValue,
} from 'framer-motion';
import {
  Brain,
  MessageSquare,
  Camera,
  GitBranch,
  AlertTriangle,
  Shield,
  Zap,
  Users,
  Languages,
  Map,
  BarChart3,
  Smile,
  ArrowRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Shared constants                                                   */
/* ------------------------------------------------------------------ */

/** newvault technical-grid dot pattern */
const GRID_BG = {
  backgroundColor: '#F4F4F4',
  backgroundImage: 'radial-gradient(circle at 1px 1px, #e2e8f0 1px, transparent 0)',
  backgroundSize: '24px 24px',
};

/** Gumroad offset shadow – default black, hover purple */
const SHADOW_BASE = '8px 8px 0px 0px rgba(0,0,0,1)';
const SHADOW_HOVER = '12px 12px 0px 0px #7C3AED';

const HEADLINE: React.CSSProperties = { fontFamily: 'var(--font-headline)' };

/* ------------------------------------------------------------------ */
/*  Animation variants                                                 */
/* ------------------------------------------------------------------ */

const stagger: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.18, delayChildren: 0.05 } },
};

const rise: Variants = {
  hidden: { opacity: 0, y: 56, scale: 0.94 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1] },
  },
};

/* ------------------------------------------------------------------ */
/*  BentoCard — white bg, 2px black border, gumroad shadow             */
/* ------------------------------------------------------------------ */

function BentoCard({
  children,
  className = '',
  dark = false,
  accent = false,
}: {
  children: React.ReactNode;
  className?: string;
  dark?: boolean;       // slate-950 bg
  accent?: boolean;     // #7C3AED purple bg
}) {
  const bg = accent ? '#7C3AED' : dark ? '#0f172a' : '#ffffff';
  const border = dark || accent ? '2px solid rgba(255,255,255,0.15)' : '2px solid #000';

  return (
    <motion.div
      variants={rise}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      whileHover={{ x: -4, y: -4, boxShadow: SHADOW_HOVER, transition: { duration: 0.18 } }}
      className={`relative overflow-hidden rounded-2xl p-8 flex flex-col group ${className}`}
      style={{ backgroundColor: bg, border, boxShadow: SHADOW_BASE }}
    >
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Icon badge — solid color square, 2px black border                 */
/* ------------------------------------------------------------------ */

function IconBadge({
  icon: Icon,
  bg,
  dark = false,
  size = 'md',
}: {
  icon: LucideIcon;
  bg: string;
  dark?: boolean;
  size?: 'md' | 'lg';
}) {
  const dim = size === 'lg' ? 'w-16 h-16' : 'w-14 h-14';
  const iconSize = size === 'lg' ? 'w-8 h-8' : 'w-6 h-6';
  const borderColor = dark ? 'rgba(255,255,255,0.7)' : '#000';

  return (
    <div
      className={`${dim} rounded-2xl flex items-center justify-center mb-8 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3`}
      style={{ backgroundColor: bg, border: `2px solid ${borderColor}` }}
    >
      <Icon className={`${iconSize} ${dark ? 'text-white' : 'text-black'}`} />
    </div>
  );
}

/* ================================================================== */
/*  ROW 1 — Staggered entrance: AI Intelligence · Sentient · Snap     */
/* ================================================================== */

function RowOne() {
  return (
    <motion.div
      className="grid grid-cols-1 md:grid-cols-3 gap-6"
      variants={stagger}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
    >

      {/* 1. AI Complaint Intelligence — white wide */}
      <motion.div variants={rise} whileHover={{ x: -4, y: -4, boxShadow: SHADOW_HOVER, transition: { duration: 0.18 } }}
        className="relative overflow-hidden rounded-2xl p-8 flex flex-col group bg-white"
        style={{ border: '2px solid #000', boxShadow: SHADOW_BASE }}
      >
        <IconBadge icon={Brain} bg="rgba(124,58,237,0.1)" />
        <h3 className="text-3xl font-extrabold text-black mb-4" style={HEADLINE}>
          AI Complaint Intelligence
        </h3>
        <p className="text-slate-600 font-medium leading-relaxed mb-10">
          Vision AI models trained on civic datasets for instant moderation and duplicate detection.
        </p>
        <div className="mt-auto bg-slate-50 border-2 border-black rounded-xl p-4 flex items-center justify-between group-hover:bg-violet-50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs font-black uppercase tracking-widest">Active Scan: 98.4% Acc.</span>
          </div>
          <BarChart3 className="w-5 h-5 text-black" />
        </div>
      </motion.div>

      {/* 2. Sentient Platform Assistant — dark */}
      <motion.div variants={rise} whileHover={{ x: -4, y: -4, boxShadow: SHADOW_HOVER, transition: { duration: 0.18 } }}
        className="relative overflow-hidden rounded-2xl p-8 flex flex-col group"
        style={{ backgroundColor: '#0f172a', border: '2px solid rgba(255,255,255,0.12)', boxShadow: SHADOW_BASE }}
      >
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-8 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3"
          style={{ backgroundColor: '#7C3AED', border: '2px solid rgba(255,255,255,0.7)' }}
        >
          <MessageSquare className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-2xl font-extrabold text-white mb-3" style={HEADLINE}>
          Sentient AI Assistant
        </h3>
        <p className="text-slate-300 text-base font-medium leading-relaxed mb-8">
          Voice &amp; text AI that files complaints, tracks status, and navigates the platform for you.
        </p>
        <div className="mt-auto space-y-3 opacity-70 group-hover:opacity-100 transition-opacity">
          <div className="bg-white/10 rounded-lg p-3 text-xs font-bold border border-white/20 text-white">
            &ldquo;There&apos;s a broken pipe flooding Park Road.&rdquo;
          </div>
          <div className="bg-violet-500/30 rounded-lg p-3 text-xs font-bold border border-violet-500/40 text-right text-violet-200">
            &ldquo;Filed as #429 under Water Supply. ETA: 48h.&rdquo;
          </div>
        </div>
      </motion.div>

      {/* 3. Snap & Go — white, yellow icon */}
      <motion.div variants={rise} whileHover={{ x: -4, y: -4, boxShadow: SHADOW_HOVER, transition: { duration: 0.18 } }}
        className="relative overflow-hidden rounded-2xl p-8 flex flex-col group bg-white"
        style={{ border: '2px solid #000', boxShadow: SHADOW_BASE }}
      >
        <IconBadge icon={Camera} bg="#FFD700" />
        <h3 className="text-2xl font-extrabold text-black mb-4" style={HEADLINE}>
          Snap &amp; Go
        </h3>
        <p className="text-slate-600 text-sm font-medium mb-8">
          Upload a photo; AI extracts category and location automatically.
        </p>
        <div className="mt-auto relative h-32 bg-slate-100 rounded-xl overflow-hidden border-2 border-black p-2 group-hover:bg-violet-50 transition-colors">
          <div className="absolute inset-0 flex items-center justify-center opacity-10">
            <Camera className="w-20 h-20 text-black" />
          </div>
          <motion.div
            className="absolute inset-x-0 bottom-0 h-1/2"
            style={{ background: 'linear-gradient(to top, rgba(251,191,36,0.15), transparent)' }}
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 2.5, repeat: Infinity }}
          />
          <div className="absolute bottom-2 left-2 right-2 bg-black text-white p-2 rounded text-[10px] font-black uppercase tracking-tighter">
            Object: Damaged Utility Pole
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ================================================================== */
/*  ROW 2 — Scroll-hijack horizontal cards                            */
/* ================================================================== */

/** Card dimensions & scroll budget */
const CARD_W = 520;
const CARD_H = 480;
const CARD_GAP = 36;
const TOTAL_CARDS = 5;
const TOTAL_WHEEL = 2000; // accumulated wheel-delta to traverse all cards

interface Row2Card {
  icon: LucideIcon;
  label: string;
  desc: string;
  iconBg: string;
  dark?: boolean;
  speed: number;
  extra?: React.ReactNode;
}

const row2Cards: Row2Card[] = [
  {
    icon: GitBranch,
    label: 'Intelligent Auto-Assignment',
    desc: 'AI routes each complaint to the correct municipal department by analyzing category, location, and agent workload balance.',
    iconBg: '#8afcb3',
    speed: 1,
    extra: (
      <div className="mt-auto space-y-3">
        <div className="flex justify-between items-center py-3 px-4 bg-slate-50 border-2 border-black rounded-lg group-hover:translate-x-1 transition-transform">
          <div className="flex flex-col">
            <span className="text-[9px] text-slate-400 font-bold uppercase">From</span>
            <span className="text-xs font-black">Citizen Report</span>
          </div>
          <div className="flex items-center gap-2">
            <ArrowRight className="w-4 h-4 text-violet-600" />
            <ArrowRight className="w-4 h-4 text-violet-600 -ml-3 opacity-50" />
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[9px] text-slate-400 font-bold uppercase">To</span>
            <span className="text-xs font-black">Water Dept.</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-[10px] font-bold text-slate-500">13 departments &middot; workload-balanced</span>
        </div>
      </div>
    ),
  },
  {
    icon: AlertTriangle,
    label: 'Predictive SLA Engine',
    desc: 'Identifies risk zones and predicts SLA breaches before they happen. Escalation alerts auto-trigger when resolution timelines are at risk.',
    iconBg: '#ffdad6',
    speed: 1.1,
    extra: (
      <div className="mt-auto space-y-3">
        <div className="flex items-end gap-2 h-20">
          {[20, 40, 65, 85, 100].map((h, i) => (
            <motion.div
              key={i}
              className="flex-1 rounded-t-md border-x border-t border-black bg-slate-200 group-hover:bg-violet-500 transition-all duration-300"
              style={{ height: `${h}%` }}
              initial={{ scaleY: 0, originY: 1 }}
              whileInView={{ scaleY: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.15 + i * 0.08 }}
            />
          ))}
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-black text-red-500 uppercase">⚠ 3 at risk</span>
          <span className="text-[10px] font-bold text-slate-400">Avg resolve: 36h</span>
        </div>
      </div>
    ),
  },
  {
    icon: Shield,
    label: 'Blockchain Audit Trail',
    desc: 'Every status change, assignment, and escalation is hashed on-chain for tamper-proof accountability. No report can be hidden or deleted.',
    iconBg: '#32CD32',
    dark: true,
    speed: 0.92,
    extra: (
      <div className="mt-auto space-y-3">
        <div className="font-mono text-[10px] bg-white/5 p-3 rounded-lg border border-white/10 text-emerald-300 space-y-1">
          <div className="flex justify-between"><span className="text-white/40">block</span><span>#4,291</span></div>
          <div className="flex justify-between"><span className="text-white/40">hash</span><span className="truncate ml-4">0x82f...7c3aed</span></div>
          <div className="flex justify-between"><span className="text-white/40">status</span><span className="text-green-400">VERIFIED</span></div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-400 rounded-full" />
          <span className="text-[10px] font-bold text-slate-400">Immutable &middot; On-chain</span>
        </div>
      </div>
    ),
  },
  {
    icon: Users,
    label: 'Real-Time Citizen-Agent Chat',
    desc: 'Direct communication channel between citizens and assigned agents for evidence sharing, updates, and verification — powered by WebSocket.',
    iconBg: '#7db6ff',
    speed: 0.88,
    extra: (
      <div className="mt-auto space-y-3">
        <div className="flex -space-x-3">
          {['AG', 'CI', 'MA', '+5'].map((t, i) => (
            <div key={t}
              className={`w-10 h-10 rounded-full border-2 border-black flex items-center justify-center font-black text-[10px] transition-transform group-hover:-translate-y-0.5 ${i === 0 ? 'bg-violet-200' : i === 1 ? 'bg-violet-600 text-white' : i === 2 ? 'bg-emerald-200' : 'bg-white'}`}
              style={{ transitionDelay: `${i * 50}ms` }}
            >{t}</div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 bg-violet-600 rounded-full animate-ping" />
          <span className="text-[10px] font-black text-violet-600 uppercase tracking-wider">Live WebSocket</span>
        </div>
      </div>
    ),
  },
  {
    icon: Languages,
    label: 'Multilingual Support',
    desc: 'File complaints in 20+ Indian languages via voice or text. AI translates and standardizes to Hindi/English for backend processing.',
    iconBg: '#88f9b0',
    speed: 1.06,
    extra: (
      <div className="mt-auto space-y-3">
        <div className="flex gap-2 flex-wrap">
          {['हिन्दी', 'தமிழ்', 'বাংলা', 'తెలుగు', 'ಕನ್ನಡ', 'EN'].map((l) => (
            <span key={l} className="bg-black text-white text-[9px] font-black px-2.5 py-1.5 rounded">{l}</span>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-500">Voice + Text &middot; 20+ languages</span>
        </div>
      </div>
    ),
  },
];

function HorizontalCard({
  card,
  index,
  progress,
}: {
  card: Row2Card;
  index: number;
  progress: MotionValue<number>; // 0 → 1
}) {
  const xExtra = useTransform(progress, [0, 1], [0, (card.speed - 1) * -140]);
  const rotate = useTransform(progress, [0, 0.5, 1],
    [index % 2 === 0 ? 0.8 : -0.6, 0, index % 2 === 0 ? -0.5 : 0.4]);
  const cardY = useTransform(progress, [0, 0.4, 0.7, 1],
    [index % 2 === 0 ? 8 : -6, 0, index % 2 === 0 ? -4 : 5, index % 2 === 0 ? 2 : -2]);

  const bg = card.dark ? '#0f172a' : '#ffffff';
  const border = card.dark ? '2px solid rgba(255,255,255,0.12)' : '2px solid #000';

  return (
    <motion.div
      className="shrink-0"
      style={{ width: CARD_W, x: xExtra, rotate, y: cardY }}
    >
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.92 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.65, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
        whileHover={{ x: -4, y: -4, boxShadow: SHADOW_HOVER, transition: { duration: 0.15 } }}
        className="rounded-2xl p-8 flex flex-col group"
        style={{ height: CARD_H, backgroundColor: bg, border, boxShadow: SHADOW_BASE }}
      >
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-8 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3"
          style={{
            backgroundColor: card.iconBg,
            border: card.dark ? '2px solid rgba(255,255,255,0.7)' : '2px solid #000',
          }}
        >
          <card.icon className={`w-8 h-8 ${card.dark ? 'text-white' : 'text-black'}`} />
        </div>
        <h4
          className={`text-2xl font-extrabold mb-3 ${card.dark ? 'text-white' : 'text-black'}`}
          style={HEADLINE}
        >
          {card.label}
        </h4>
        <p className={`text-sm font-medium leading-relaxed ${card.dark ? 'text-slate-400' : 'text-slate-600'}`}>
          {card.desc}
        </p>
        <div className="mt-auto pt-4">{card.extra}</div>
      </motion.div>
    </motion.div>
  );
}

function RowTwo() {
  const sectionRef = useRef<HTMLDivElement>(null);

  // 0 → 1 raw progress, spring-smoothed for the actual transform
  const scrollVal = useMotionValue(0);
  const smoothVal = useSpring(scrollVal, { stiffness: 85, damping: 22 });
  const [progressPct, setProgressPct] = useState(0);

  // x-range is computed from live viewport width at mount/resize
  const xRangeRef = useRef<[number, number]>([80, -1680]);

  // State machine refs — avoid stale closures
  const stateRef  = useRef<'before' | 'active' | 'after'>('before');
  const accumRef  = useRef(0);
  const coolRef   = useRef(false); // short cooldown after releasing

  // Drive horizontal translation via function-form useTransform so it
  // always reads the latest xRangeRef even after resize.
  const x = useTransform(smoothVal, (v) => {
    const [s, e] = xRangeRef.current;
    return s + v * (e - s);
  });

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    /* ---- geometry: center first card, end with last card centered ---- */
    const computeRange = () => {
      const vw = window.innerWidth;
      const xInit = Math.max((vw - CARD_W) / 2, 40); // center first card
      const lastCardOffset = (TOTAL_CARDS - 1) * (CARD_W + CARD_GAP);
      const xEnd = xInit - lastCardOffset; // center last card
      xRangeRef.current = [xInit, xEnd];
    };
    computeRange();
    window.addEventListener('resize', computeRange);

    /* ---- scroll lock helpers ---- */
    const lockScroll = () => {
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
    };
    const unlockScroll = () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      coolRef.current = true;
      setTimeout(() => { coolRef.current = false; }, 450);
    };

    const activate = () => {
      if (coolRef.current || stateRef.current === 'active') return;
      // Snap section to be vertically centered in viewport, then lock.
      const rect = section.getBoundingClientRect();
      const sectionH = rect.height;
      const vh = window.innerHeight;
      const offsetToCenter = rect.top + window.scrollY - Math.max((vh - sectionH) / 2, 0);
      window.scrollTo({ top: offsetToCenter, behavior: 'instant' });
      lockScroll();
      stateRef.current = 'active';
    };

    /* ---- shared delta handler ---- */
    const applyDelta = (delta: number) => {
      const newAccum = accumRef.current + delta;

      // PAST END → release forward
      if (newAccum >= TOTAL_WHEEL && delta > 0) {
        accumRef.current = TOTAL_WHEEL;
        scrollVal.set(1);
        setProgressPct(100);
        stateRef.current = 'after';
        unlockScroll();
        return false; // don't preventDefault
      }

      // PAST START → release backward
      if (newAccum <= 0 && delta < 0) {
        accumRef.current = 0;
        scrollVal.set(0);
        setProgressPct(0);
        stateRef.current = 'before';
        unlockScroll();
        return false; // don't preventDefault
      }

      // Normal consumption
      accumRef.current = Math.max(0, Math.min(TOTAL_WHEEL, newAccum));
      const prog = accumRef.current / TOTAL_WHEEL;
      scrollVal.set(prog);
      setProgressPct(Math.round(prog * 100));
      return true; // consumed — caller should preventDefault
    };

    /* ---- wheel listener ---- */
    const handleWheel = (e: WheelEvent) => {
      if (stateRef.current !== 'active') return;
      const consumed = applyDelta(e.deltaY);
      if (consumed) e.preventDefault();
    };

    /* ---- touch listeners ---- */
    let touchY = 0;
    const handleTouchStart = (e: TouchEvent) => { touchY = e.touches[0].clientY; };
    const handleTouchMove  = (e: TouchEvent) => {
      if (stateRef.current !== 'active') return;
      const delta = (touchY - e.touches[0].clientY) * 2;
      touchY = e.touches[0].clientY;
      const consumed = applyDelta(delta);
      if (consumed) e.preventDefault();
    };

    /* ---- scroll listener (activation / re-entry) ---- */
    const handleScroll = () => {
      if (coolRef.current || !section) return;
      const rect = section.getBoundingClientRect();
      const vh = window.innerHeight;
      // Activate when the section is roughly centered or reaching top
      const sectionCenter = rect.top + rect.height / 2;
      const nearCenter = sectionCenter > vh * 0.3 && sectionCenter < vh * 0.7;
      const nearTop = rect.top >= -80 && rect.top <= 40;

      if (stateRef.current === 'before' && (nearTop || nearCenter)) {
        activate();
      }
      // Re-activate when user scrolls back up into the section
      if (stateRef.current === 'after' && (nearTop || nearCenter)) {
        accumRef.current = TOTAL_WHEEL;
        activate();
      }
    };

    // Check position on mount
    const initialRect = section.getBoundingClientRect();
    const initialNearTop = initialRect.top >= -80 && initialRect.top <= 40;
    if (initialNearTop) activate();

    window.addEventListener('wheel',      handleWheel,      { passive: false });
    window.addEventListener('touchstart', handleTouchStart, { passive: true  });
    window.addEventListener('touchmove',  handleTouchMove,  { passive: false });
    window.addEventListener('scroll',     handleScroll,     { passive: true  });

    return () => {
      window.removeEventListener('resize',     computeRange);
      window.removeEventListener('wheel',      handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove',  handleTouchMove);
      window.removeEventListener('scroll',     handleScroll);
      unlockScroll();
    };
  }, [scrollVal]);

  return (
    <div
      ref={sectionRef}
      className="relative h-screen flex flex-col justify-center overflow-hidden"
      style={GRID_BG}
    >
      {/* Sub-label row */}
      <div className="flex items-center gap-3 px-6 md:px-14 mb-10">
        <span className="w-10 h-0.5 bg-black" />
        <span
          className="text-black font-extrabold tracking-widest text-xs uppercase"
          style={HEADLINE}
        >
          Infrastructure Layer
        </span>

        {/* Live card counter */}
        <div className="ml-auto mr-4 md:mr-14 flex items-center gap-3">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
            {progressPct < 4
              ? '↓ scroll to explore'
              : `${Math.min(TOTAL_CARDS, Math.ceil(progressPct / (100 / TOTAL_CARDS)))} / ${TOTAL_CARDS}`}
          </span>
        </div>
      </div>

      {/* Card track */}
      <div className="relative">
        {/* Edge fades */}
        <div
          className="absolute left-0 top-0 bottom-0 w-20 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(to right, #F4F4F4 20%, transparent)' }}
        />
        <div
          className="absolute right-0 top-0 bottom-0 w-20 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(to left, #F4F4F4 20%, transparent)' }}
        />

        <motion.div
          className="flex will-change-transform"
          style={{ x, gap: CARD_GAP }}
        >
          {row2Cards.map((card, i) => (
            <HorizontalCard key={card.label} card={card} index={i} progress={smoothVal} />
          ))}
        </motion.div>
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-black/10">
        <motion.div
          className="h-full bg-black origin-left"
          animate={{ scaleX: progressPct / 100 }}
          transition={{ ease: 'easeOut', duration: 0.12 }}
          style={{ transformOrigin: 'left' }}
        />
      </div>

      {/* Scroll lock indicator dots */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2">
        {Array.from({ length: TOTAL_CARDS }).map((_, i) => {
          const cardThreshold = (i + 1) / TOTAL_CARDS;
          const active = progressPct / 100 >= cardThreshold - 1 / TOTAL_CARDS;
          return (
            <motion.div
              key={i}
              className="rounded-full bg-black"
              animate={{
                width:   active ? 20 : 6,
                opacity: active ? 1  : 0.25,
              }}
              style={{ height: 6 }}
              transition={{ duration: 0.3 }}
            />
          );
        })}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  ROW 3 — Geo Intelligence (full-width reveal)                       */
/* ================================================================== */

function GeoIntelligence() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 60, scale: 0.96 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ x: -4, y: -4, boxShadow: SHADOW_HOVER, transition: { duration: 0.2 } }}
      className="relative w-full rounded-2xl overflow-hidden p-10 md:p-14 min-h-[420px] flex flex-col justify-between group bg-white"
      style={{ border: '2px solid #000', boxShadow: SHADOW_BASE }}
    >
      {/* Dot grid overlay */}
      <div className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, #e2e8f0 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* SVG route traces */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
        <defs>
          <linearGradient id="geo1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7c3aed" stopOpacity="0" />
            <stop offset="50%" stopColor="#7c3aed" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="geo2" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0" />
            <stop offset="50%" stopColor="#10b981" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </linearGradient>
        </defs>
        <motion.path d="M 80,320 C 200,280 350,120 550,180 C 750,240 900,100 1100,160"
          fill="none" stroke="url(#geo1)" strokeWidth="2"
          initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }}
          transition={{ duration: 2.5, ease: 'easeInOut' }}
        />
        <motion.path d="M 50,100 C 200,200 400,60 600,140 C 800,220 950,80 1150,200"
          fill="none" stroke="url(#geo2)" strokeWidth="1.5"
          initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }}
          transition={{ duration: 3, ease: 'easeInOut', delay: 0.5 }}
        />
      </svg>

      {/* Pulsing hotspots */}
      <motion.div className="absolute top-[30%] left-[25%] w-5 h-5 rounded-full bg-violet-500 border-2 border-black"
        animate={{ boxShadow: ['0 0 0 0 rgba(124,58,237,0.4)', '0 0 0 20px rgba(124,58,237,0)'] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      <motion.div className="absolute top-[55%] left-[60%] w-4 h-4 rounded-full bg-emerald-500 border-2 border-black"
        animate={{ boxShadow: ['0 0 0 0 rgba(16,185,129,0.4)', '0 0 0 16px rgba(16,185,129,0)'] }}
        transition={{ duration: 2.4, repeat: Infinity, delay: 0.7 }}
      />
      <motion.div className="absolute top-[40%] right-[20%] w-4 h-4 rounded-full bg-red-500 border-2 border-black"
        animate={{ boxShadow: ['0 0 0 0 rgba(239,68,68,0.4)', '0 0 0 14px rgba(239,68,68,0)'] }}
        transition={{ duration: 2.8, repeat: Infinity, delay: 1.4 }}
      />

      {/* Content */}
      <div className="relative z-10 max-w-lg">
        <IconBadge icon={Map} bg="#e2e8f0" />
        <h3 className="text-3xl md:text-4xl font-extrabold text-black mb-4" style={HEADLINE}>
          Geo Intelligence
        </h3>
        <p className="text-slate-600 font-medium leading-relaxed max-w-md">
          Map spatial patterns to reveal systemic infrastructure failures.
          Real-time heatmaps, hotspot detection, and regional clustering for
          data-driven governance decisions.
        </p>
      </div>

      <div className="relative z-10 flex items-center gap-4 mt-8">
        <span className="bg-black text-white text-[10px] font-black px-4 py-2 rounded uppercase tracking-widest">
          Hotspot Detected
        </span>
        <span className="border-2 border-black text-[10px] font-black px-4 py-2 rounded uppercase tracking-widest">
          3 Active Zones
        </span>
      </div>
    </motion.div>
  );
}

/* ================================================================== */
/*  ROW 4 — Scorecard & Sentiment Engine                               */
/* ================================================================== */

function RowFour() {
  return (
    <motion.div
      className="grid grid-cols-1 md:grid-cols-2 gap-6"
      variants={stagger}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.25 }}
    >
      {/* Scorecard — white */}
      <motion.div
        variants={rise}
        whileHover={{ x: -4, y: -4, boxShadow: SHADOW_HOVER, transition: { duration: 0.18 } }}
        className="relative overflow-hidden rounded-2xl p-8 flex flex-col group bg-white"
        style={{ border: '2px solid #000', boxShadow: SHADOW_BASE }}
      >
        <IconBadge icon={BarChart3} bg="#E6E6FA" />
        <h3 className="text-2xl font-extrabold text-black mb-4" style={HEADLINE}>Scorecard</h3>
        <p className="text-slate-600 text-sm font-medium mb-8">
          Resolution metrics and SLA compliance dashboards for transparent performance tracking.
        </p>
        <div className="mt-auto">
          <motion.div
            className="text-5xl font-black text-black group-hover:text-violet-700 transition-colors"
            style={HEADLINE}
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            8.4<span className="text-2xl text-slate-400">/10</span>
          </motion.div>
        </div>
      </motion.div>

      {/* Sentiment Engine — purple accent */}
      <motion.div
        variants={rise}
        whileHover={{ x: -4, y: -4, boxShadow: SHADOW_HOVER, transition: { duration: 0.18 } }}
        className="relative overflow-hidden rounded-2xl p-8 flex flex-col group"
        style={{ backgroundColor: '#7C3AED', border: '2px solid #000', boxShadow: SHADOW_BASE }}
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-8 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3"
          style={{ backgroundColor: '#fff', border: '2px solid #000' }}
        >
          <Smile className="w-6 h-6 text-black" />
        </div>
        <h3 className="text-2xl font-extrabold text-white mb-4" style={HEADLINE}>Sentiment Engine</h3>
        <p className="text-white/80 text-sm font-medium mb-8">
          Feedback-driven policy insights for smarter governance.
        </p>
        <div className="mt-auto flex gap-5 group-hover:-translate-y-1 transition-transform duration-500">
          {['😊', '❤️', '👍'].map((e, i) => (
            <motion.span
              key={e}
              className="text-3xl"
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
            >
              {e}
            </motion.span>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ================================================================== */
/*  MAIN FEATURE VAULT                                                 */
/* ================================================================== */

export default function FeatureVault() {
  return (
    <section className="relative overflow-hidden" id="features" style={GRID_BG}>

      {/* ── Header + Row 1 (normal scroll) ── */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-28 md:pt-36">

        {/* Section header */}
        <motion.div
          className="mb-16 md:mb-24"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >

          {/* Headline + decorative bolt */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div>
              <h2
                className="text-6xl md:text-8xl font-extrabold text-black tracking-tighter leading-none mb-6"
                style={HEADLINE}
              >
                The Feature Vault
              </h2>
              <p className="text-slate-700 text-xl font-medium leading-relaxed max-w-xl">
                High-performance infrastructure built for sovereign communities.
                Playful by design, powerful by default.
              </p>
            </div>

            {/* Decorative rotating badge */}
            <div className="hidden lg:block relative h-24 w-24 shrink-0">
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{ backgroundColor: 'rgba(124,58,237,0.15)' }}
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
              <motion.div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-black flex items-center justify-center rounded-xl shadow-xl"
                animate={{ rotate: [12, 22, 12] }}
                transition={{ duration: 4, repeat: Infinity }}
              >
                <Zap className="w-6 h-6 text-white" />
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Row 1 — staggered premium cards */}
        <RowOne />
      </div>

      {/* ── Row 2 — Scroll-hijacked horizontal immersive strip ── */}
      <RowTwo />

      {/* ── Row 3 + Row 4 (normal scroll resumes) ── */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 pb-28 md:pb-36">
        <div className="h-16 md:h-24" />
        <GeoIntelligence />
        <div className="h-16 md:h-24" />
        <RowFour />
      </div>

    </section>
  );
}

