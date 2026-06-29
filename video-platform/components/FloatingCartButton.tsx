'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '@/contexts/CartContext';

export function FloatingCartButton() {
  const { getCartCount } = useCart();
  const pathname = usePathname();
  const cartCount = getCartCount();

  // Hide on the cart and checkout pages themselves
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
