'use client';

import { useEffect, useState } from 'react';
import { useDeliveryLocation } from '@/contexts/DeliveryLocationContext';
import { geocodeAddress } from '@/lib/utils/googleGeocode';
import { haversineDistance } from '@/lib/utils/geo';
import { formatDistanceKm, etaMinutes } from '@/lib/utils/distance';

/**
 * useStoreDistance — React hook that resolves how far a store is from the user's
 * confirmed delivery location and returns ready-to-render distance/ETA labels.
 *
 * The store's street address is geocoded to coordinates (best effort) and the
 * straight-line haversine distance is taken from the saved delivery location.
 * Geocoded coordinates are cached in-memory and in localStorage so each unique
 * address is only looked up once across the whole session.
 *
 * Returns all-null fields when the user has no location set or the address can't
 * be geocoded — callers should simply hide the distance in that case.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */
interface LatLng {
  lat: number;
  lng: number;
}

const GEOCODE_CACHE_KEY = 'localys:geocodeCache';

/** Process-lifetime cache so repeated cards don't re-read storage or re-geocode. */
const memoryCache = new Map<string, LatLng>();

/** Read a previously geocoded address from localStorage (null if absent/unreadable). */
function readCachedCoords(address: string): LatLng | null {
  try {
    const raw = localStorage.getItem(GEOCODE_CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw) as Record<string, LatLng>;
    return cache[address] ?? null;
  } catch {
    return null;
  }
}

/** Persist a freshly geocoded address so future visits skip the network call. */
function writeCachedCoords(address: string, coords: LatLng) {
  try {
    const raw = localStorage.getItem(GEOCODE_CACHE_KEY);
    const cache = raw ? (JSON.parse(raw) as Record<string, LatLng>) : {};
    cache[address] = coords;
    localStorage.setItem(GEOCODE_CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* storage unavailable — keep the in-memory cache only */
  }
}

export interface StoreDistance {
  km: number | null;
  label: string | null; // e.g. "3.2 km away"
  etaLabel: string | null; // e.g. "8 min"
}

export function useStoreDistance(address: string | undefined): StoreDistance {
  const { location } = useDeliveryLocation();
  const [storeCoords, setStoreCoords] = useState<LatLng | null>(null);

  // Resolve the store's coordinates (memory → localStorage → network geocode).
  useEffect(() => {
    if (!address) return;
    let active = true;
    // Resolve through one async path so we never call setState synchronously
    // inside the effect body (avoids cascading renders).
    void (async () => {
      let coords: LatLng | null = memoryCache.get(address) ?? readCachedCoords(address);
      if (!coords) {
        coords = await geocodeAddress(address);
        if (coords) writeCachedCoords(address, coords);
      }
      if (coords) memoryCache.set(address, coords);
      if (active) setStoreCoords(coords);
    })();
    return () => {
      active = false;
    };
  }, [address]);

  if (!location || !storeCoords) return { km: null, label: null, etaLabel: null };

  const km = haversineDistance(location.lat, location.lng, storeCoords.lat, storeCoords.lng);
  return {
    km,
    label: `${formatDistanceKm(km)} away`,
    etaLabel: `${etaMinutes(km)} min`,
  };
}
