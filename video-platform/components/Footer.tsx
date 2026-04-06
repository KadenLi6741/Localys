'use client';

import Link from 'next/link';

const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Explore', href: '/explore' },
  { label: 'Search', href: '/search' },
  { label: 'Upload', href: '/upload' },
  { label: 'Profile', href: '/profile' },
];

const SUPPORT_LINKS = [
  { label: 'Buy Coins', href: '/buy-coins' },
  { label: 'My Orders', href: '/orders/verify' },
  { label: 'Cart', href: '/cart' },
  { label: 'Messages', href: '/chats' },
];

export function Footer() {
  return (
    <footer className="bg-[#1A1A1A] text-white mt-auto">
      {/* Main Footer */}
      <div className="max-w-6xl mx-auto px-6 lg:px-12 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Column 1: Brand + Contact */}
          <div>
            <h3
              className="text-2xl font-light mb-3"
              style={{ fontFamily: 'Cormorant Garamond, serif' }}
            >
              Localys
            </h3>
            <p className="text-sm text-white/60 leading-relaxed mb-4">
              Discover and support local businesses in your neighborhood. Order direct — no middleman.
            </p>
            <div className="flex gap-3">
              {/* Instagram */}
              <a href="#" aria-label="Instagram" className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center hover:border-white/60 transition-colors">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              </a>
              {/* X / Twitter */}
              <a href="#" aria-label="Twitter" className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center hover:border-white/60 transition-colors">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
              {/* Facebook */}
              <a href="#" aria-label="Facebook" className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center hover:border-white/60 transition-colors">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </a>
            </div>
          </div>

          {/* Column 2: Navigation */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-4">Navigate</h4>
            <ul className="space-y-2">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/60 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Support + Subscribe */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-4">Support</h4>
            <ul className="space-y-2 mb-6">
              {SUPPORT_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/60 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Subscribe */}
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-3">Stay Updated</h4>
            <form onSubmit={(e) => e.preventDefault()} className="flex">
              <input
                type="email"
                placeholder="Email address"
                className="flex-1 bg-white/10 border border-white/20 text-sm text-white placeholder-white/40 px-3 py-2 focus:outline-none focus:border-white/40 transition-colors"
              />
              <button
                type="submit"
                className="bg-[#1B5EA8] hover:bg-[#1B5EA8]/90 text-white text-sm font-semibold px-4 py-2 transition-colors"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Payment Row */}
      <div className="border-t border-white/10">
        <div className="max-w-6xl mx-auto px-6 lg:px-12 py-4 flex items-center justify-center gap-4">
          <span className="text-[10px] text-white/30 uppercase tracking-wider mr-2">We accept</span>
          {/* Visa */}
          <svg className="h-5 text-white/40" viewBox="0 0 48 32" fill="currentColor"><rect width="48" height="32" rx="4" fill="currentColor" opacity="0.15"/><text x="24" y="20" textAnchor="middle" fontSize="12" fontWeight="bold" fill="currentColor">VISA</text></svg>
          {/* Mastercard */}
          <svg className="h-5 text-white/40" viewBox="0 0 48 32" fill="currentColor"><rect width="48" height="32" rx="4" fill="currentColor" opacity="0.15"/><circle cx="19" cy="16" r="8" fill="currentColor" opacity="0.3"/><circle cx="29" cy="16" r="8" fill="currentColor" opacity="0.3"/></svg>
          {/* Stripe */}
          <svg className="h-5 text-white/40" viewBox="0 0 48 32" fill="currentColor"><rect width="48" height="32" rx="4" fill="currentColor" opacity="0.15"/><text x="24" y="20" textAnchor="middle" fontSize="9" fontWeight="600" fill="currentColor">Stripe</text></svg>
        </div>
      </div>

      {/* Copyright Bar */}
      <div className="border-t border-white/10">
        <div className="max-w-6xl mx-auto px-6 lg:px-12 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-white/30">&copy; {new Date().getFullYear()} Localys. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="#" className="text-xs text-white/30 hover:text-white/60 transition-colors">Privacy Policy</a>
            <a href="#" className="text-xs text-white/30 hover:text-white/60 transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
