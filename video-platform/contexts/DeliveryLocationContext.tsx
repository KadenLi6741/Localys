'use client';

/**
 * DeliveryLocationContext — the user's chosen delivery location, shared app-wide.
 * Purpose: Stores the confirmed delivery {lat,lng,address}, persists it to localStorage, and can detect
 *   the current position (reverse-geocoding it to an address). Used everywhere distance/ETA to a business
 *   is shown (feed, cards, store pages).
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { reverseGeocode } from '@/lib/utils/googleGeocode';

export interface DeliveryLocation {
  lat: number;
  lng: number;
  address: string;
}

interface DeliveryLocationContextType {
  /** The user's confirmed delivery location, or null if not set yet. */
  location: DeliveryLocation | null;
  /** True while we're asking the browser for the user's position. */
  detecting: boolean;
  /** Save a confirmed delivery location (persisted to localStorage). */
  setLocation: (loc: DeliveryLocation) => void;
  /** Ask the browser for the current position and adopt it as the location. */
  detectLocation: () => Promise<DeliveryLocation | null>;
}

const STORAGE_KEY = 'localys:deliveryLocation';

const DeliveryLocationContext = createContext<DeliveryLocationContextType | null>(null);

export function DeliveryLocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocationState] = useState<DeliveryLocation | null>(null);
  const [detecting, setDetecting] = useState(false);

  // Hydrate from localStorage on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as DeliveryLocation;
        if (Number.isFinite(parsed?.lat) && Number.isFinite(parsed?.lng)) {
          setLocationState(parsed);
        }
      }
    } catch {
      /* ignore malformed storage */
    }
  }, []);

  const setLocation = useCallback((loc: DeliveryLocation) => {
    setLocationState(loc);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
    } catch {
      /* storage may be unavailable — keep in-memory state */
    }
  }, []);

  const detectLocation = useCallback(async (): Promise<DeliveryLocation | null> => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return null;
    setDetecting(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      const address =
        (await reverseGeocode(lat, lng)) || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      const loc: DeliveryLocation = { lat, lng, address };
      setLocation(loc);
      return loc;
    } catch {
      return null;
    } finally {
      setDetecting(false);
    }
  }, [setLocation]);

  // On first visit (no saved location), best-effort auto-detect so distance works
  // immediately. Never overrides a previously confirmed location.
  useEffect(() => {
    if (location) return;
    let cancelled = false;
    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
    } catch {
      /* ignore */
    }
    void detectLocation().then((loc) => {
      if (cancelled && loc) return;
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <DeliveryLocationContext.Provider value={{ location, detecting, setLocation, detectLocation }}>
      {children}
    </DeliveryLocationContext.Provider>
  );
}

export function useDeliveryLocation() {
  const ctx = useContext(DeliveryLocationContext);
  if (!ctx) throw new Error('useDeliveryLocation must be used inside DeliveryLocationProvider');
  return ctx;
}
