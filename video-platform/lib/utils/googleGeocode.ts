/**
 * Best-effort client-side geocoding via the Google Geocoding API (supports CORS).
 * Used only to compute a straight-line "how far" distance for an address-based store.
 * Returns null on any failure (missing key, blocked API, no result) — never throws,
 * so callers degrade gracefully to the map-only view.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */
const KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export async function geocodeAddress(
  address: string,
): Promise<{ lat: number; lng: number } | null> {
  if (!KEY || !address) return null;
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${KEY}`,
    );
    if (!res.ok) return null;
    const json = await res.json();
    if (json.status !== 'OK' || !json.results?.length) return null;
    const loc = json.results[0].geometry?.location;
    if (typeof loc?.lat !== 'number' || typeof loc?.lng !== 'number') return null;
    return { lat: loc.lat, lng: loc.lng };
  } catch {
    return null;
  }
}

/**
 * Best-effort reverse geocoding: lat/lng → a human-readable address string.
 * Returns null on any failure so callers can fall back to "Lat, Lng" text.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  if (!KEY) return null;
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${KEY}`,
    );
    if (!res.ok) return null;
    const json = await res.json();
    if (json.status !== 'OK' || !json.results?.length) return null;
    const formatted = json.results[0].formatted_address;
    return typeof formatted === 'string' ? formatted : null;
  } catch {
    return null;
  }
}
