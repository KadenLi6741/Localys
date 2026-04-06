'use client';

import { useState } from 'react';
import { AnnouncementBar } from '@/components/AnnouncementBar';
import { TopNavbar } from '@/components/TopNavbar';
import { CartDrawer } from '@/components/CartDrawer';
import { Footer } from '@/components/Footer';

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const [cartOpen, setCartOpen] = useState(false);

  return (
    <>
      <AnnouncementBar />
      <TopNavbar onCartOpen={() => setCartOpen(true)} />
      {children}
      <Footer />
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}
