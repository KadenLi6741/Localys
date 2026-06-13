'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { HomeContent } from '@/components/HomeContent';

export function PersistentVideoFeed() {
  const pathname = usePathname();
  const { user, loading } = useAuth();

  // Explore is now the TikTok-style video feed (Home became the storefront).
  const isFeed = pathname === '/explore';

  // Do not render the feed until auth has resolved.
  // Once the user is authenticated and the feed mounts, it stays mounted.
  if (loading || !user) return null;

  return (
    <div
      style={{ display: isFeed ? 'contents' : 'none' }}
      aria-hidden={!isFeed}
    >
      <HomeContent isActive={isFeed} />
    </div>
  );
}
