/**
 * geo.ts — geographic distance helper.
 * Purpose: Provides the Haversine great-circle distance used across the app (feed distance labels,
 *   nearest-location selection, search distance filtering) so straight-line distances are computed
 *   one consistent way.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */

/**
 * Calculate distance between two lat/lng points using the Haversine formula.
 * @returns distance in kilometers
 */
export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
