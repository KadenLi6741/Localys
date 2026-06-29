'use client';

/**
 * Feed page (/feed) — the Discover route.
 * Purpose: Intentionally renders almost nothing: the actual video feed (HomeContent) is mounted
 *   persistently by PersistentVideoFeed in the root layout so it survives navigation. This page just
 *   gates the route behind auth; the feed becomes visible because the path is /feed.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */

import { ProtectedRoute } from '@/components/ProtectedRoute';

export default function FeedPage() {
  return (
    <ProtectedRoute>
      {/* Video feed is rendered persistently via PersistentVideoFeed in layout.tsx */}
      <></>
    </ProtectedRoute>
  );
}
