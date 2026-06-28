'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MapPin, ChevronDown, RotateCcw, User, ShoppingCart, Settings, LogOut, Check, Building2 } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { SearchDropdown } from './SearchDropdown';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';

const LOCATIONS = ['Richmond Hill, ON', 'Toronto, ON', 'Markham, ON', 'Vaughan, ON', 'Mississauga, ON'];
const LANGUAGES = [
  { code: 'EN', label: 'English' },
  { code: 'FR', label: 'Français' },
  { code: 'ES', label: 'Español' },
  { code: 'ZH', label: '中文' },
];

/** Closes the popover when clicking outside of `ref`. */
function useClickOutside(ref: React.RefObject<HTMLDivElement | null>, onClose: () => void) {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ref, onClose]);
}

export function TopHeader() {
  const router = useRouter();
  const { getCartCount } = useCart();
  const { signOut } = useAuth();

  const [location, setLocation] = useState(LOCATIONS[0]);
  const [lang, setLang] = useState('EN');
  const [openMenu, setOpenMenu] = useState<null | 'location' | 'lang' | 'profile'>(null);

  const wrapRef = useRef<HTMLDivElement>(null);
  useClickOutside(wrapRef, () => setOpenMenu(null));

  const cartCount = getCartCount();

  return (
    <header
      ref={wrapRef}
      style={{ ['--header-h' as string]: '64px' }}
      className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur dark:border-gray-800 dark:bg-[#1A1A18]/95"
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-3 sm:gap-3 sm:px-6">
        {/* Logo */}
        <Logo href="/home" className="shrink-0 text-gray-900 dark:text-white" iconClassName="h-6 w-6 text-[#f97316]" textClassName="text-lg hidden sm:inline" />

        {/* Fulfillment / location */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setOpenMenu(openMenu === 'location' ? null : 'location')}
            className="flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1.5 text-left transition hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            <MapPin className="h-5 w-5 shrink-0 text-[#f97316]" />
            <span className="hidden leading-tight md:block">
              <span className="block text-[11px] text-black dark:text-white">How do you want your items?</span>
              <span className="block text-sm font-semibold text-gray-900 dark:text-white">Deliver to {location}</span>
            </span>
            <ChevronDown className="hidden h-4 w-4 text-black md:block" />
          </button>
          {openMenu === 'location' && (
            <div className="absolute left-0 top-full mt-2 w-64 rounded-2xl border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-700 dark:bg-gray-900">
              <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-black">Choose location</p>
              {LOCATIONS.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => { setLocation(loc); setOpenMenu(null); }}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm text-black transition hover:bg-gray-50 dark:text-white dark:hover:bg-gray-800"
                >
                  {loc}
                  {loc === location && <Check className="h-4 w-4 text-[#f97316]" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Search — opens a filter dropdown + live business suggestions */}
        <SearchDropdown />

        {/* Language */}
        <div className="relative hidden shrink-0 sm:block">
          <button
            type="button"
            onClick={() => setOpenMenu(openMenu === 'lang' ? null : 'lang')}
            className="flex items-center gap-1 rounded-full px-2 py-2 text-sm font-semibold text-black transition hover:bg-gray-50 dark:text-white dark:hover:bg-gray-800"
          >
            {lang}
            <ChevronDown className="h-4 w-4 text-black" />
          </button>
          {openMenu === 'lang' && (
            <div className="absolute right-0 top-full mt-2 w-40 rounded-2xl border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-700 dark:bg-gray-900">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => { setLang(l.code); setOpenMenu(null); }}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm text-black transition hover:bg-gray-50 dark:text-white dark:hover:bg-gray-800"
                >
                  <span>{l.label}</span>
                  <span className="text-xs text-black">{l.code}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Reorder */}
        <Link
          href="/profile?tab=orders"
          className="hidden shrink-0 flex-col items-center px-2 text-black transition hover:text-[#f97316] dark:text-white lg:flex"
        >
          <RotateCcw className="h-5 w-5" />
          <span className="text-[11px] font-medium">Reorder</span>
        </Link>

        {/* Profile */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setOpenMenu(openMenu === 'profile' ? null : 'profile')}
            aria-label="Account menu"
            className="flex flex-col items-center px-2 text-black transition hover:text-[#f97316] dark:text-white"
          >
            <User className="h-5 w-5" />
            <span className="hidden text-[11px] font-medium lg:block">Account</span>
          </button>
          {openMenu === 'profile' && (
            <div className="absolute right-0 top-full mt-2 w-48 rounded-2xl border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-700 dark:bg-gray-900">
              <Link href="/profile" onClick={() => setOpenMenu(null)} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-black transition hover:bg-gray-50 dark:text-white dark:hover:bg-gray-800">
                <User className="h-4 w-4" /> Profile
              </Link>
              <Link href="/dashboard" onClick={() => setOpenMenu(null)} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-black transition hover:bg-gray-50 dark:text-white dark:hover:bg-gray-800">
                <Building2 className="h-4 w-4" /> Business Manager
              </Link>
              <Link href="/profile?tab=settings" onClick={() => setOpenMenu(null)} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-black transition hover:bg-gray-50 dark:text-white dark:hover:bg-gray-800">
                <Settings className="h-4 w-4" /> Settings
              </Link>
              <div className="my-1 h-px bg-gray-100 dark:bg-gray-800" />
              <button
                type="button"
                onClick={() => { setOpenMenu(null); void signOut(); router.push('/login'); }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-black transition hover:bg-gray-50 dark:text-white dark:hover:bg-gray-800"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </div>
          )}
        </div>

        {/* Cart */}
        <Link href="/cart" aria-label={`Cart, ${cartCount} items`} className="relative shrink-0 flex flex-col items-center px-2 text-black transition hover:text-[#f97316] dark:text-white">
          <ShoppingCart className="h-5 w-5" />
          <span className="hidden text-[11px] font-medium lg:block">Cart</span>
          {cartCount > 0 && (
            <span className="absolute -right-0.5 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#f97316] px-1 text-[10px] font-bold text-white">
              {cartCount > 99 ? '99+' : cartCount}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
