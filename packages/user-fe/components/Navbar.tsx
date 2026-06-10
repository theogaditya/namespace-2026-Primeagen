'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { User, LogOut, ChevronDown, Globe, ChevronRight } from 'lucide-react';

// Language options matching Google Translate codes
const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'हिन्दी (Hindi)' },
  { code: 'bn', name: 'বাংলা (Bengali)' },
  { code: 'te', name: 'తెలుగు (Telugu)' },
  { code: 'mr', name: 'मराठी (Marathi)' },
  { code: 'ta', name: 'தமிழ் (Tamil)' },
  { code: 'gu', name: 'ગુજરાતી (Gujarati)' },
  { code: 'kn', name: 'ಕನ್ನಡ (Kannada)' },
  { code: 'ml', name: 'മലയാളം (Malayalam)' },
  { code: 'pa', name: 'ਪੰਜਾਬੀ (Punjabi)' },
  { code: 'or', name: 'ଓଡ଼ିଆ (Odia)' },
  { code: 'ur', name: 'اردو (Urdu)' },
  { code: 'as', name: 'অসমীয়া (Assamese)' },
  { code: 'ne', name: 'नेपाली (Nepali)' },
];

// Language selector component
const LanguageSelector = ({ onClose }: { onClose: () => void }) => {
  const [showLanguages, setShowLanguages] = useState(false);
  const [currentLang, setCurrentLang] = useState('en');

  useEffect(() => {
    // Get current language from Google Translate cookie
    // Try multiple patterns as cookie format can vary
    const cookies = document.cookie;
    
    // Try standard format: googtrans=/en/hi
    let match = cookies.match(/googtrans=\/en\/([a-z-]+)/i);
    
    // If not found, try URL encoded format: googtrans=%2Fen%2Fhi
    if (!match) {
      match = cookies.match(/googtrans=%2Fen%2F([a-z-]+)/i);
    }
    
    if (match && match[1]) {
      setCurrentLang(match[1]);
    }
  }, []);

  const changeLanguage = (langCode: string) => {
    // Clear existing googtrans cookies first (important for production)
    const hostname = window.location.hostname;
    const expiredDate = 'Thu, 01 Jan 1970 00:00:00 UTC';
    
    // Clear cookies with various domain configurations
    document.cookie = `googtrans=; expires=${expiredDate}; path=/`;
    document.cookie = `googtrans=; expires=${expiredDate}; path=/; domain=${hostname}`;
    document.cookie = `googtrans=; expires=${expiredDate}; path=/; domain=.${hostname}`;
    
    // Also clear from root domain if on subdomain (e.g., app.example.com -> .example.com)
    const parts = hostname.split('.');
    if (parts.length > 2) {
      const rootDomain = parts.slice(-2).join('.');
      document.cookie = `googtrans=; expires=${expiredDate}; path=/; domain=.${rootDomain}`;
    }
    
    // Small delay to ensure cookies are cleared
    setTimeout(() => {
      // Set new Google Translate cookie
      const newValue = `/en/${langCode}`;
      
      // Set cookie without domain (works most reliably in production)
      document.cookie = `googtrans=${newValue}; path=/`;
      
      // Also set with explicit domain for Google Translate to pick up
      document.cookie = `googtrans=${newValue}; path=/; domain=${hostname}`;
      
      // For subdomains, also set on root domain
      if (parts.length > 2) {
        const rootDomain = parts.slice(-2).join('.');
        document.cookie = `googtrans=${newValue}; path=/; domain=.${rootDomain}`;
      }
      
      setCurrentLang(langCode);
      onClose();
      
      // Reload to apply translation
      window.location.reload();
    }, 100);
  };

  const currentLanguage = LANGUAGES.find(l => l.code === currentLang) || LANGUAGES[0];

  return (
    <div className="border-b border-gray-100">
      <button
        onClick={() => setShowLanguages(!showLanguages)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Globe className="w-4 h-4" />
          <span>Language</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{currentLanguage.name.split(' ')[0]}</span>
          <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${showLanguages ? 'rotate-90' : ''}`} />
        </div>
      </button>
      
      {showLanguages && (
        <div className="max-h-48 overflow-y-auto bg-gray-50 py-1">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => changeLanguage(lang.code)}
              className={`w-full text-left px-6 py-2 text-sm hover:bg-gray-100 transition-colors ${
                currentLang === lang.code ? 'text-blue-600 font-medium bg-blue-50' : 'text-gray-700'
              }`}
            >
              {lang.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const Navbar = () => {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if user is logged in
    const checkAuth = () => {
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('authToken');
        const userData = localStorage.getItem('userData');
        setIsLoggedIn(!!token);
        if (userData) {
          try {
            const parsed = JSON.parse(userData);
            setUserName(parsed.name || '');
          } catch {
            setUserName('');
          }
        }
      }
    };

    checkAuth();

    // Listen for storage changes (in case of login/logout in another tab)
    window.addEventListener('storage', checkAuth);
    
    // Listen for auth changes within the same tab
    window.addEventListener('authChange', checkAuth);
    
    return () => {
      window.removeEventListener('storage', checkAuth);
      window.removeEventListener('authChange', checkAuth);
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    setIsLoggedIn(false);
    setIsDropdownOpen(false);
    router.push('/');
  };

  return (
    <nav className='fixed top-0 left-0 right-0 z-99999 bg-white/80 backdrop-blur-md shadow-sm'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='flex items-center justify-between h-25'>
          {/* Logo */}
          <Link href='/' className='flex items-center gap-2 shrink-0'>
            <Image
              src='https://swarajdesk.adityahota.online/logo.png'
              alt='SwarajDesk Logo'
              width={160}
              height={160}
              className='object-contain w-28 sm:w-32 md:w-40'
            />
          </Link>

          {/* Auth Buttons */}
          <div className='flex items-center gap-2 sm:gap-3'>
            {isLoggedIn ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className='flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 rounded-full bg-linear-to-r from-blue-600 to-purple-600 text-white font-medium hover:opacity-90 transition-all shadow-md hover:shadow-lg'
                >
                  <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                  <span className="hidden sm:inline text-sm max-w-[100px] truncate">
                    {userName || 'Profile'}
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-52 sm:w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-4 py-2.5 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900 truncate">{userName || 'User'}</p>
                      <p className="text-xs text-gray-500">Logged in</p>
                    </div>
                    <LanguageSelector onClose={() => setIsDropdownOpen(false)} />
                    <button
                      onClick={handleLogout}
                      className='w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors'
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link
                  href='/loginUser'
                  className='px-4 sm:px-5 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors'
                >
                  Login
                </Link>
                <Link
                  href='/addUser'
                  className='px-4 sm:px-5 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors'
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
