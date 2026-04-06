'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useActivity } from '@/contexts/ActivityContext';
import { useUnreadMessages } from '@/contexts/UnreadMessagesContext';
import { supabase } from '@/lib/supabase/client';

export function TopNavbar({ onCartOpen }: { onCartOpen: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { getCartCount } = useCart();
  const { user, signOut } = useAuth();
  const { togglePanel } = useActivity();
  const { unreadMessages } = useUnreadMessages();
  const cartCount = getCartCount();

  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const [isBusiness, setIsBusiness] = useState(false);

  useEffect(() => {
    if (!user) { setIsBusiness(false); return; }
    const check = async () => {
      const { data } = await supabase.from('profiles').select('type').eq('id', user.id).single();
      setIsBusiness(!!data?.type);
    };
    check();
  }, [user]);

  // Close profile dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);



  if (pathname === '/login' || pathname === '/signup' || pathname === '/reset-password') return null;

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname?.startsWith(href);
  };

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/explore', label: 'Explore' },
    { href: '/upload', label: 'Upload' },
    { href: '/chats', label: 'Messages' },
    ...(isBusiness ? [{ href: '/dashboard', label: 'Orders' }] : []),
  ];

  const handleSignOut = async () => {
    setProfileOpen(false);
    await signOut();
    router.push('/login');
  };

  return (
    <>
      <nav className="top-navbar">
        <div className="top-navbar-inner">
          {/* Left: Logo */}
          <Link href="/" className="flex items-center gap-2" style={{ opacity: 1 }}>
            <Image src="/logo.png" alt="Localy" width={32} height={32} className="rounded" />
            <span style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', fontWeight: 600, color: 'var(--color-text-primary)', letterSpacing: '0.02em' }}>
              Localy
            </span>
          </Link>

          {/* Center: Nav links (desktop only) */}
          <div className="nav-links hidden lg:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`nav-link ${isActive(link.href) ? 'active' : ''}`}
              >
                {link.label}
                {link.href === '/chats' && unreadMessages > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold" style={{ backgroundColor: 'var(--color-accent)', color: '#FFFFFF' }}>
                    {unreadMessages > 9 ? '9+' : unreadMessages}
                  </span>
                )}
              </Link>
            ))}
          </div>

          {/* Right: Icon buttons */}
          <div className="flex items-center gap-2">
            {/* Search */}
            <button
              suppressHydrationWarning
              onClick={() => router.push('/search')}
              className="nav-icon-button"
              aria-label="Search"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>

            {/* Cart */}
            <button
              suppressHydrationWarning
              onClick={onCartOpen}
              className="nav-icon-button"
              aria-label="Cart"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold" style={{ backgroundColor: 'var(--color-accent)', color: '#FFFFFF' }}>
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </button>

            {/* Profile */}
            <div ref={profileRef} className="relative" onMouseEnter={() => setProfileOpen(true)} onMouseLeave={() => setProfileOpen(false)}>
              <button
                suppressHydrationWarning
                onClick={() => router.push('/profile')}
                className="nav-icon-button"
                aria-label="Profile"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </button>

              {/* Profile dropdown */}
              <div
                className="profile-dropdown"
                style={{
                  opacity: profileOpen ? 1 : 0,
                  visibility: profileOpen ? 'visible' : 'hidden',
                  transition: 'opacity 200ms ease, visibility 200ms ease',
                }}
              >
                <button suppressHydrationWarning onClick={() => { setProfileOpen(false); togglePanel(); }} className="profile-dropdown-item">Activity</button>
                <Link href="/profile" onClick={() => setProfileOpen(false)} className="profile-dropdown-item">Profile</Link>
                <div className="profile-dropdown-divider" />
                {user ? (
                  <button suppressHydrationWarning onClick={handleSignOut} className="profile-dropdown-item" style={{ color: 'var(--color-error)' }}>Logout</button>
                ) : (
                  <Link href="/login" onClick={() => setProfileOpen(false)} className="profile-dropdown-item">Sign In</Link>
                )}
              </div>
            </div>

            {/* Mobile hamburger */}
            <button
              suppressHydrationWarning
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="nav-icon-button lg:hidden"
              aria-label="Menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t" style={{ borderColor: 'var(--color-border)', background: '#FFFFFF' }}>
            <div className="py-2 px-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-3 text-sm font-medium"
                  style={{
                    color: isActive(link.href) ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase' as const,
                    fontSize: '12px',
                  }}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>


    </>
  );
}
