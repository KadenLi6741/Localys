import type { BusinessHours } from '../../models/Profile';

const DAY_KEYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

export interface OpenStatus {
  /** Whether the business is open at the reference time */
  open: boolean;
  /** Closing time in "HH:MM" (24h) if currently open */
  closesAt?: string;
  /** Minutes remaining until close if currently open */
  minutesUntilClose?: number;
}

function timeToMinutes(value?: string): number | null {
  if (!value) return null;
  const [h, m] = value.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

/**
 * Determine whether a business is open at a given moment based on its weekly
 * hours. Handles overnight spans (e.g. open 18:00, close 02:00) including the
 * case where today's open window started the previous calendar day.
 *
 * Returns null when no usable hours data is available (unknown), so callers can
 * distinguish "closed" from "we don't know".
 */
export function isOpenNow(
  hours: BusinessHours | undefined | null,
  now: Date = new Date()
): OpenStatus | null {
  if (!hours) return null;

  const nowMin = now.getHours() * 60 + now.getMinutes();

  // Today's window.
  const today = hours[DAY_KEYS[now.getDay()]];
  if (today && !today.closed) {
    const open = timeToMinutes(today.open);
    const close = timeToMinutes(today.close);
    if (open !== null && close !== null) {
      if (close > open) {
        // Same-day window.
        if (nowMin >= open && nowMin < close) {
          return {
            open: true,
            closesAt: today.close,
            minutesUntilClose: close - nowMin,
          };
        }
      } else if (close < open) {
        // Overnight window that opened today and closes tomorrow.
        if (nowMin >= open) {
          return {
            open: true,
            closesAt: today.close,
            minutesUntilClose: 24 * 60 - nowMin + close,
          };
        }
      }
    }
  }

  // Overnight window that opened yesterday and spills into today.
  const yesterday = hours[DAY_KEYS[(now.getDay() + 6) % 7]];
  if (yesterday && !yesterday.closed) {
    const open = timeToMinutes(yesterday.open);
    const close = timeToMinutes(yesterday.close);
    if (open !== null && close !== null && close <= open && nowMin < close) {
      return {
        open: true,
        closesAt: yesterday.close,
        minutesUntilClose: close - nowMin,
      };
    }
  }

  return { open: false };
}

/** Format a "HH:MM" 24h string as a friendly 12h time, e.g. "9:00 PM". */
export function formatTime12h(value?: string): string {
  const minutes = timeToMinutes(value);
  if (minutes === null) return '';
  let h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  const period = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return m === 0 ? `${h} ${period}` : `${h}:${String(m).padStart(2, '0')} ${period}`;
}
