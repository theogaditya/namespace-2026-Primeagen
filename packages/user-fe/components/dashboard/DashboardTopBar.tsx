"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { Settings, Search, Menu, Loader2, X, MapPin, Calendar, FileText, Globe, ChevronDown } from "lucide-react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import type { UserData } from "@/app/dashboard/customComps/types";

const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "hi", name: "हिन्दी (Hindi)" },
  { code: "bn", name: "বাংলা (Bengali)" },
  { code: "te", name: "తెలుగు (Telugu)" },
  { code: "mr", name: "मराठी (Marathi)" },
  { code: "ta", name: "தமிழ் (Tamil)" },
  { code: "gu", name: "ગુજરાતી (Gujarati)" },
  { code: "kn", name: "ಕನ್ನಡ (Kannada)" },
  { code: "ml", name: "മലയാളം (Malayalam)" },
  { code: "pa", name: "ਪੰਜਾਬੀ (Punjabi)" },
  { code: "or", name: "ଓଡ଼ିଆ (Odia)" },
  { code: "ur", name: "اردو (Urdu)" },
  { code: "as", name: "অসমীয়া (Assamese)" },
  { code: "ne", name: "नेपाली (Nepali)" },
];

interface SearchResult {
  id: string;
  seq: number;
  description: string;
  subCategory: string;
  status: string;
  location?: { locality?: string; district?: string } | null;
  category?: { name: string } | null;
  submissionDate: string;
  User?: { name: string } | null;
}

interface DashboardTopBarProps {
  user: UserData | null;
  onMenuToggle?: () => void;
  onSettingsClick?: () => void;
  onSearchResultClick?: (id: string) => void;
}

function LanguageDropdown() {
  const [open, setOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState("en");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cookies = document.cookie;
    let match = cookies.match(/googtrans=\/en\/([a-z-]+)/i);
    if (!match) match = cookies.match(/googtrans=%2Fen%2F([a-z-]+)/i);
    if (match?.[1]) setCurrentLang(match[1]);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const changeLanguage = (langCode: string) => {
    const hostname = window.location.hostname;
    const expired = "Thu, 01 Jan 1970 00:00:00 UTC";

    document.cookie = `googtrans=; expires=${expired}; path=/`;
    document.cookie = `googtrans=; expires=${expired}; path=/; domain=${hostname}`;
    document.cookie = `googtrans=; expires=${expired}; path=/; domain=.${hostname}`;

    const parts = hostname.split(".");
    if (parts.length > 2) {
      const root = parts.slice(-2).join(".");
      document.cookie = `googtrans=; expires=${expired}; path=/; domain=.${root}`;
    }

    setTimeout(() => {
      const val = `/en/${langCode}`;
      document.cookie = `googtrans=${val}; path=/`;
      document.cookie = `googtrans=${val}; path=/; domain=${hostname}`;
      if (parts.length > 2) {
        const root = parts.slice(-2).join(".");
        document.cookie = `googtrans=${val}; path=/; domain=.${root}`;
      }
      setCurrentLang(langCode);
      setOpen(false);
      window.location.reload();
    }, 100);
  };

  const current = LANGUAGES.find((l) => l.code === currentLang) || LANGUAGES[0];

  return (
    <div className="relative hidden sm:block" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-slate-500 hover:text-[var(--dash-primary)] transition-colors"
      >
        <Globe className="w-5 h-5" />
        <span className="text-xs font-medium">{current.name.split(" ")[0]}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-200/60 max-h-64 overflow-y-auto z-50"
          >
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => changeLanguage(lang.code)}
                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors ${
                  currentLang === lang.code
                    ? "text-[var(--dash-primary)] font-medium bg-[var(--dash-primary)]/5"
                    : "text-slate-700"
                }`}
              >
                {lang.name}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function DashboardTopBar({
  user,
  onMenuToggle,
  onSettingsClick,
  onSearchResultClick,
}: DashboardTopBarProps) {
  const initials = user?.name?.[0]?.toUpperCase() || "U";
  const locality = user?.location?.locality || user?.location?.city || "India";

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);
      if (searchTimeout.current) clearTimeout(searchTimeout.current);

      if (!query.trim()) {
        setSearchResults([]);
        setShowResults(false);
        return;
      }

      searchTimeout.current = setTimeout(async () => {
        setSearching(true);
        setShowResults(true);
        try {
          const token = localStorage.getItem("authToken");
          const resp = await fetch(
            `/api/complaint/feed/search?q=${encodeURIComponent(query.trim())}&limit=8`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          const data = await resp.json();
          if (data.success && Array.isArray(data.data)) {
            setSearchResults(data.data);
          } else {
            setSearchResults([]);
          }
        } catch {
          setSearchResults([]);
        } finally {
          setSearching(false);
        }
      }, 350);
    },
    []
  );

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });
  }

  return (
    <header className="sticky top-0 right-0 z-40 bg-white/80 backdrop-blur-xl flex justify-between items-center px-4 lg:px-8 py-4 border-b border-slate-100">
      <div className="flex items-center gap-4">
        {/* Mobile hamburger */}
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-600"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Logo */}
        <Image
          src="https://pub-6c77e16531784985b618e038085ecd96.r2.dev/logo.png"
          alt="SwarajDesk"
          width={140}
          height={36}
          className="h-9 w-auto object-contain"
          unoptimized
        />

        <div className="h-6 w-[1px] bg-slate-200 hidden sm:block" />

        {/* Search bar */}
        <div className="relative hidden sm:block" ref={searchRef}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => { if (searchResults.length > 0) setShowResults(true); }}
            className="pl-10 pr-8 py-2 bg-slate-100 border-none rounded-full text-sm w-72 focus:ring-2 focus:ring-[var(--dash-primary)]/20 transition-all outline-none"
            placeholder="Search reports..."
            type="text"
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(""); setSearchResults([]); setShowResults(false); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Search dropdown */}
          <AnimatePresence>
            {showResults && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute top-full mt-2 left-0 w-[420px] bg-white rounded-xl shadow-xl border border-slate-200/60 max-h-[400px] overflow-y-auto z-50"
              >
                {searching && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-[var(--dash-primary)]" />
                  </div>
                )}

                {!searching && searchResults.length === 0 && (
                  <div className="py-8 text-center text-sm text-slate-400">
                    No results for &quot;{searchQuery}&quot;
                  </div>
                )}

                {!searching &&
                  searchResults.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => {
                        onSearchResultClick?.(r.id);
                        setShowResults(false);
                        setSearchQuery("");
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-[var(--dash-primary)]">#{r.seq}</span>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                          {r.category?.name || r.subCategory || ""}
                        </span>
                        {r.User?.name && (
                          <span className="text-[10px] text-slate-400 ml-auto">by {r.User.name}</span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-[var(--dash-on-surface)] line-clamp-1">
                        {r.description}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-400">
                        {r.location?.locality && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {r.location.locality}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(r.submissionDate)}
                        </span>
                      </div>
                    </button>
                  ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex items-center gap-4 lg:gap-6">
        {/* Language Selector */}
        <LanguageDropdown />
        <button
          onClick={onSettingsClick}
          className="text-slate-500 hover:text-[var(--dash-primary)] transition-colors hidden sm:block"
        >
          <Settings className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-[var(--dash-on-surface)]">
              {user?.name || "User"}
            </p>
            <p className="text-[10px] text-slate-500">{locality}</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--dash-primary)] to-[var(--dash-primary-container)] flex items-center justify-center text-white text-sm font-bold border-2 border-[var(--dash-primary)]/10">
            {initials}
          </div>
        </div>
      </div>
    </header>
  );
}
