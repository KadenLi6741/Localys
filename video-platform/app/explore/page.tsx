'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';

export default function ExplorePage() {
  return (
    <ProtectedRoute>
      {/* The TikTok-style video feed is rendered persistently via
          PersistentVideoFeed in layout.tsx for the /explore route. */}
      <></>
    </ProtectedRoute>
  );
}
