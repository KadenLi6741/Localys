'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { AnnouncementBar } from '@/components/AnnouncementBar';
import { AppHeader } from '@/components/AppHeader';
import { DesktopSidebar } from '@/components/DesktopSidebar';
import { AccountDrawer } from '@/components/AccountDrawer';
import { CartDrawer } from '@/components/CartDrawer';
import { Footer } from '@/components/Footer';

const AUTH_ROUTES = new Set(['/login', '/signup', '/reset-password']);

/**
 * Reddit-style app chrome:
 *   AppHeader — fixed, full-width top bar (logo · search · actions)
 *   DesktopSidebar — fixed ~250px rail below the top bar (lg+)
 *   Sheet drawer — the same sidebar content on tablet/mobile
 * Content is offset by the bar height and the sidebar width. The home video
 * feed renders separately (PersistentVideoFeed) as a full-screen overlay.
 */
export function LayoutShell({ children }: { children: React.ReactNode }) {
  const [cartOpen, setCartOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const pathname = usePathname();

  // Auth screens are full-screen and standalone — render them without the
  // sidebar/header chrome (and without the sidebar's content offset).
  if (AUTH_ROUTES.has(pathname ?? '')) {
    return <>{children}</>;
  }

  return (
    <>
      <AppHeader onAccountOpen={() => setAccountOpen(true)} />
      <DesktopSidebar onCartOpen={() => setCartOpen(true)} />

      {/* Hamburger account drawer (coexists with the nav rail; mobile primary
          navigation is the AppBottomNav). */}
      <AccountDrawer open={accountOpen} onOpenChange={setAccountOpen} />

      {/* Full-width promo strip fixed directly under the header (above the
          sidebar) — the first thing the user sees, spanning the whole width. */}
      <div className="fixed inset-x-0 top-14 z-30">
        <AnnouncementBar />
      </div>
      <div className="pt-[5.75rem]">
        <div className="lg:pl-[208px]">
          {children}
          <Footer />
        </div>
      </div>
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}
