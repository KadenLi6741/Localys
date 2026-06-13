'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { AnnouncementBar } from '@/components/AnnouncementBar';
import { AppHeader } from '@/components/AppHeader';
import { DesktopSidebar } from '@/components/DesktopSidebar';
import { SidebarContent } from '@/components/SidebarContent';
import { CartDrawer } from '@/components/CartDrawer';
import { Footer } from '@/components/Footer';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';

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
  const [navOpen, setNavOpen] = useState(false);
  const pathname = usePathname();

  // Auth screens are full-screen and standalone — render them without the
  // sidebar/header chrome (and without the sidebar's content offset).
  if (AUTH_ROUTES.has(pathname ?? '')) {
    return <>{children}</>;
  }

  return (
    <>
      <AppHeader onMenuOpen={() => setNavOpen(true)} />
      <DesktopSidebar onCartOpen={() => setCartOpen(true)} />

      {/* Tablet/mobile: sidebar collapses into a drawer */}
      <Sheet open={navOpen} onOpenChange={setNavOpen}>
        <SheetContent side="left" className="w-[280px] p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarContent
            onCartOpen={() => {
              setNavOpen(false);
              setCartOpen(true);
            }}
            onNavigate={() => setNavOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <div className="pt-14 lg:pl-[250px]">
        <AnnouncementBar />
        {children}
        <Footer />
      </div>
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}
