'use client';

/**
 * GoogleMap — thin wrapper around the Google Maps Embed API (an iframe).
 * Purpose: Reusable map that reliably renders a place marker, or a driving route when an origin is
 *   given. Keeps the API key in an env var and centralises URL building so callers just pass a query.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */

import { useMemo } from 'react';

/**
 * Google Maps via the Embed API (iframe). Single, permissive API → renders reliably
 * (no grey box). Reads the key from NEXT_PUBLIC_GOOGLE_MAPS_API_KEY (never hardcoded).
 *
 * - `query`: a street address OR a "lat,lng" string. Google geocodes + drops a marker.
 * - `origin`: when provided, switches to DIRECTIONS mode (route + driving distance/time
 *   shown inside the map) from the user to the store.
 */
const KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export function GoogleMap({
  query,
  origin,
  title,
  className = '',
}: {
  query: string;
  origin?: { lat: number; lng: number } | null;
  title: string;
  className?: string;
}) {
  // Build the embed URL: directions mode when we have an origin, otherwise a single-place marker.
  // Memoized so the iframe src only changes when the query/origin actually change (avoids reloads).
  const src = useMemo(() => {
    if (!KEY || !query) return null;
    const dest = encodeURIComponent(query);
    if (origin) {
      return `https://www.google.com/maps/embed/v1/directions?key=${KEY}&origin=${origin.lat},${origin.lng}&destination=${dest}&mode=driving`;
    }
    return `https://www.google.com/maps/embed/v1/place?key=${KEY}&q=${dest}`;
  }, [query, origin]);

  if (!src) {
    return (
      <div className={`flex items-center justify-center bg-white ${className}`}>
        <p className="px-6 text-center text-sm text-black">
          {KEY
            ? 'Map unavailable — no location provided.'
            : 'Map unavailable. Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to .env.local and restart the dev server.'}
        </p>
      </div>
    );
  }

  return (
    <iframe
      title={title}
      src={src}
      className={`block border-0 ${className}`}
      loading="lazy"
      allowFullScreen
      referrerPolicy="no-referrer-when-downgrade"
    />
  );
}
