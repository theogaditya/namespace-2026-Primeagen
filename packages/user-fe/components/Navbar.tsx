'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

const Navbar = () => {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Check if user is logged in
    const checkAuth = () => {
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('authToken');
        setIsLoggedIn(!!token);
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

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    setIsLoggedIn(false);
    router.push('/');
  };

  return (
    <nav className='fixed top-0 left-0 right-0 z-99999999 bg-white/46 backdrop-blur-md'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='flex items-center justify-between h-14'>
          {/* Logo */}
          <Link href='/' className='flex items-center gap-2'>
            <Image
              src='https://swarajdesk.adityahota.online/logo.png'
              alt='SwarajDesk Logo'
              width={120}
              height={120}
              className='object-contain'
            />
          </Link>

          {/* Auth Buttons */}
          <div className='flex items-center gap-3'>
            {isLoggedIn ? (
              <button
                onClick={handleLogout}
                className='px-5 py-2 rounded-lg bg-gray-900 text-white font-medium hover:bg-gray-800 transition-colors'
              >
                Logout
              </button>
            ) : (
              <>
                <Link
                  href='/loginUser'
                  className='px-5 py-2 rounded-lg bg-gray-900 text-white font-medium hover:bg-gray-800 transition-colors'
                >
                  Login
                </Link>
                <Link
                  href='/addUser'
                  className='px-5 py-2 rounded-lg bg-gray-900 text-white font-medium hover:bg-gray-800 transition-colors'
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
