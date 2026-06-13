'use client';

import { usePathname } from 'next/navigation';
import { SidebarContent } from '@/components/SidebarContent';

/**
 * Persistent Reddit-style left sidebar (~250px, lg+), fixed below the top bar.
 * The full section list (nav, challenges, recent, communities, footer links)
 * lives in SidebarContent, which the mobile drawer reuses.
 */
export function DesktopSidebar({ onCartOpen }: { onCartOpen?: () => void }) {
  const pathname = usePathname();

  if (pathname === '/login' || pathname === '/signup' || pathname === '/reset-password') return null;

  return (
    <aside className="fixed bottom-0 left-0 top-14 z-20 hidden w-[250px] border-r border-border bg-card lg:block">
      <SidebarContent onCartOpen={onCartOpen} />
    </aside>
  );
}
