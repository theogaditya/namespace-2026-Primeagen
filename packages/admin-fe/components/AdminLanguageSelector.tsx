"use client"

import { useState, useEffect, useRef } from "react"
import { Globe, ChevronDown } from "lucide-react"

// Full set of languages matching Google Translate codes — same as user-fe Navbar
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
]

/**
 * Standalone language selector button — identical behaviour to user-fe LandingLanguageButton.
 * Drop this anywhere in an admin header to get a fully working Google Translate language switcher.
 */
export function AdminLanguageSelector() {
  const [open, setOpen] = useState(false)
  const [currentLang, setCurrentLang] = useState("en")
  const ref = useRef<HTMLDivElement>(null)

  // Read current language from the Google Translate cookie on mount
  useEffect(() => {
    const cookies = document.cookie
    let match = cookies.match(/googtrans=\/en\/([a-z-]+)/i)
    if (!match) match = cookies.match(/googtrans=%2Fen%2F([a-z-]+)/i)
    if (match?.[1]) setCurrentLang(match[1])
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const changeLanguage = (langCode: string) => {
    const hostname = window.location.hostname
    const expiredDate = "Thu, 01 Jan 1970 00:00:00 UTC"

    // Clear all existing googtrans cookies across domain variants
    document.cookie = `googtrans=; expires=${expiredDate}; path=/`
    document.cookie = `googtrans=; expires=${expiredDate}; path=/; domain=${hostname}`
    document.cookie = `googtrans=; expires=${expiredDate}; path=/; domain=.${hostname}`
    const parts = hostname.split(".")
    if (parts.length > 2) {
      document.cookie = `googtrans=; expires=${expiredDate}; path=/; domain=.${parts.slice(-2).join(".")}`
    }

    // Small delay to ensure the old cookie is cleared before setting the new one
    setTimeout(() => {
      const newValue = `/en/${langCode}`
      document.cookie = `googtrans=${newValue}; path=/`
      document.cookie = `googtrans=${newValue}; path=/; domain=${hostname}`
      if (parts.length > 2) {
        document.cookie = `googtrans=${newValue}; path=/; domain=.${parts.slice(-2).join(".")}`
      }
      setCurrentLang(langCode)
      setOpen(false)
      window.location.reload()
    }, 100)
  }

  const currentLanguage = LANGUAGES.find((l) => l.code === currentLang) || LANGUAGES[0]

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-50"
        title={currentLanguage!.name}
      >
        <Globe className="w-4 h-4" />
        <span className="hidden sm:inline text-xs font-medium">
          {currentLanguage!.name.split(" ")[0]}
        </span>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50 max-h-64 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => changeLanguage(lang.code)}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                currentLang === lang.code
                  ? "text-violet-600 font-medium bg-violet-50"
                  : "text-gray-700"
              }`}
            >
              {lang.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
