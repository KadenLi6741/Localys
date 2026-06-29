'use client';

/**
 * Loads the Google Maps JavaScript API once (shared across the app) and resolves
 * with `window.google.maps`. The key is read from NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
 * (never hardcoded). Safe to call many times — the script is injected only once
 * and concurrent callers share the same promise.
 *
 * The project has no @types/google.maps, so the Maps namespace is typed loosely
 * as `GoogleMaps` (any). Callers stay isolated to the picker component.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */
const KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type GoogleMaps = any;

declare global {
  interface Window {
    google?: { maps?: GoogleMaps };
  }
}

let loadPromise: Promise<GoogleMaps> | null = null;

export function loadGoogleMaps(): Promise<GoogleMaps> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google Maps can only load in the browser'));
  }
  if (window.google?.maps) {
    return Promise.resolve(window.google.maps);
  }
  if (!KEY) {
    return Promise.reject(new Error('Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY'));
  }
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<GoogleMaps>((resolve, reject) => {
    const existing = document.getElementById('google-maps-js') as HTMLScriptElement | null;
    const onReady = () => {
      if (window.google?.maps) resolve(window.google.maps);
      else reject(new Error('Google Maps failed to initialise'));
    };
    if (existing) {
      existing.addEventListener('load', onReady);
      existing.addEventListener('error', () => reject(new Error('Google Maps script failed to load')));
      return;
    }
    const script = document.createElement('script');
    script.id = 'google-maps-js';
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${KEY}&libraries=places`;
    script.addEventListener('load', onReady);
    script.addEventListener('error', () => reject(new Error('Google Maps script failed to load')));
    document.head.appendChild(script);
  });

  return loadPromise;
}

export const hasGoogleMapsKey = Boolean(KEY);
