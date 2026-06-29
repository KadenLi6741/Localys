/**
 * distance.ts — single source of truth for turning a distance in kilometres into
 * the short, human-readable strings shown across the app (feed, store header,
 * business cards, store info modal).
 *
 * Previously each surface re-implemented the same "< 1 km → metres, else one
 * decimal km" formatting and the same driving-ETA estimate, which risked them
 * drifting apart. Centralising them here keeps every "3.2 km" / "8 min" label
 * consistent. Callers append their own suffix (e.g. " away") so wording stays
 * exactly as each surface had it.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */

/** Average city driving speed (km/h) used to estimate delivery/arrival time. */
const AVERAGE_DRIVING_KMH = 35;

/** Floor for the ETA so very-close stores still read as a realistic minimum. */
const MIN_ETA_MINUTES = 4;

/**
 * Format a distance for display: under 1 km shows whole metres ("850 m"),
 * otherwise one decimal kilometre ("3.2 km"). No unit suffix beyond m/km.
 */
export function formatDistanceKm(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

/**
 * Rough driving ETA (in whole minutes) for a given distance, clamped to a
 * sensible minimum so nearby stores never read as "0 min".
 */
export function etaMinutes(km: number): number {
  return Math.max(MIN_ETA_MINUTES, Math.round((km / AVERAGE_DRIVING_KMH) * 60));
}
