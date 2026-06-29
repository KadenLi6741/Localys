'use client';

/**
 * FloatingCartButton — persistent shortcut to the cart that floats above the UI.
 * Purpose: Lets shoppers jump to checkout from anywhere with a live item count, without scrolling
 *   to find a cart link. It hides itself when irrelevant (empty cart, or already on cart/checkout)
 *   to avoid clutter and redundancy.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '@/contexts/CartContext';

// Floating "go to cart" pill shown app-wide; reads the live count from CartContext.
export function FloatingCartButton() {
  const { getCartCount } = useCart();
  const pathname = usePathname();
  const cartCount = getCartCount();

  // Hide on the cart and checkout pages themselves (the button would just link to the current page)
  if (pathname === '/cart' || pathname === '/checkout') return null;

  // Only show when there are items in the cart
  if (cartCount === 0) return null;

  return (
    <Link
      href="/cart"
      className="fixed bottom-20 right-0 z-30 flex items-center gap-2 bg-[#f97316] hover:bg-[#ea6a0c] text-white px-4 py-3 rounded-full shadow-lg shadow-[#f97316]/30 transition-all hover:scale-105 active:scale-95 max-w-[15%] w-auto"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
      </svg>
      <span className="font-semibold text-sm">{cartCount}</span>
    </Link>
  );
}
