'use client';

/**
 * PersistentVideoFeed — keeps the video feed mounted app-wide, hiding it when off the feed page.
 * Purpose: The feed (HomeContent) is expensive to set up and we want video playback/scroll position to
 *   survive navigation. So instead of unmounting when the user leaves /feed, this renders it once and
 *   just toggles CSS visibility, so returning to /feed is instant and state is preserved.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */

import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { HomeContent } from '@/components/HomeContent';

// Mounts the feed for authenticated users and shows it only on /feed.
export function PersistentVideoFeed() {
  const pathname = usePathname();
  const { user, loading } = useAuth();

  const isHome = pathname === '/feed';

  // Do not render the feed until auth has resolved.
  // Once the user is authenticated and the feed mounts, it stays mounted.
  if (loading || !user) return null;

  // `display: contents` makes this wrapper invisible to layout when on the feed (children behave as
  // if direct), and `none` fully hides — but NOT unmounts — the feed elsewhere, preserving its state.
  return (
    <div
      style={{ display: isHome ? 'contents' : 'none' }}
      aria-hidden={!isHome}
    >
      <HomeContent isActive={isHome} />
    </div>
  );
}
