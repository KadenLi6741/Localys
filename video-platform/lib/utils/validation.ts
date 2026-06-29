/**
 * validation.ts — one shared place for form input validation across the app.
 *
 * Every validator returns an error message string when the value is invalid, or
 * `null` when it's acceptable. This keeps validation declarative at the call site
 * (`const err = validateEmail(email)`) and lets forms render inline messages.
 *
 * Two complementary levels are covered, per the rubric:
 *   - SYNTACTIC (format): email shape, 10-digit phone, numeric prices, required
 *     fields, minimum password length.
 *   - SEMANTIC (meaning / business rules): prices/quantities can't be zero or
 *     negative, ratings must be 1–5, opening time must be before closing time,
 *     scheduled times can't be in the past, percentages stay within 0–100, etc.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */

/* ----------------------------- low-level checks ----------------------------- */

/** RFC-ish email shape: something@something.tld with no spaces. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Strip every non-digit so phone formats like (905) 555-1234 normalize cleanly. */
export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

/** True when the string looks like a valid email address. */
export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email.trim());
}

/** True for a North-American 10-digit phone number (ignores formatting/spaces). */
export function isValidPhone(phone: string): boolean {
  const digits = digitsOnly(phone);
  // Allow an optional leading country code "1" (11 digits) as well as bare 10.
  return digits.length === 10 || (digits.length === 11 && digits.startsWith('1'));
}

/** True when the value is a finite number (accepts numeric strings). */
export function isNumeric(value: string | number): boolean {
  if (typeof value === 'number') return Number.isFinite(value);
  if (value.trim() === '') return false;
  return Number.isFinite(Number(value));
}

/* ----------------------------- syntactic validators ----------------------------- */

/** Required, non-blank text. `label` personalises the message (e.g. "Full name"). */
export function validateRequired(value: string, label = 'This field'): string | null {
  return value.trim().length === 0 ? `${label} is required.` : null;
}

/** Email is present and correctly formatted. */
export function validateEmail(email: string): string | null {
  if (email.trim().length === 0) return 'Email is required.';
  if (!isValidEmail(email)) return 'Enter a valid email address.';
  return null;
}

/** Password is present and at least `min` characters long. */
export function validatePassword(password: string, min = 6): string | null {
  if (password.length === 0) return 'Password is required.';
  if (password.length < min) return `Password must be at least ${min} characters.`;
  return null;
}

/**
 * Phone number validity. By default the field is optional (blank is fine); pass
 * `{ required: true }` to require it. When present it must be a 10-digit number.
 */
export function validatePhone(phone: string, opts: { required?: boolean } = {}): string | null {
  const trimmed = phone.trim();
  if (trimmed.length === 0) return opts.required ? 'Phone number is required.' : null;
  if (!isValidPhone(trimmed)) return 'Enter a valid 10-digit phone number.';
  return null;
}

/** Username: required, 3–20 chars, lowercase letters/numbers/underscores only. */
export function validateUsername(username: string): string | null {
  const trimmed = username.trim();
  if (trimmed.length === 0) return 'Username is required.';
  if (trimmed.length < 3) return 'Username must be at least 3 characters.';
  if (trimmed.length > 20) return 'Username must be 20 characters or fewer.';
  if (!/^[a-z0-9_]+$/.test(trimmed)) return 'Use only lowercase letters, numbers, and underscores.';
  return null;
}

/* ----------------------------- semantic validators ----------------------------- */

/**
 * A money amount: must be numeric and greater than zero (an item can't cost $0 or
 * a negative amount). `label` personalises the message.
 */
export function validatePrice(value: string | number, label = 'Price'): string | null {
  if (!isNumeric(value)) return `${label} must be a number.`;
  const amount = typeof value === 'number' ? value : Number(value);
  if (amount <= 0) return `${label} must be greater than $0.`;
  if (amount > 100000) return `${label} looks too large — please check it.`;
  return null;
}

/** Order quantity: must be a whole number of at least 1. */
export function validateQuantity(value: string | number): string | null {
  if (!isNumeric(value)) return 'Quantity must be a number.';
  const qty = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(qty)) return 'Quantity must be a whole number.';
  if (qty < 1) return 'Quantity must be at least 1.';
  return null;
}

/** Star rating: must be a whole number from 1 to 5. */
export function validateRating(value: number | null | undefined): string | null {
  if (value == null) return 'Please choose a rating from 1 to 5.';
  if (!Number.isInteger(value) || value < 1 || value > 5) return 'Rating must be between 1 and 5.';
  return null;
}

/** A percentage: numeric and within 0 (exclusive) to 100 (inclusive). */
export function validatePercentage(value: string | number, label = 'Percentage'): string | null {
  if (!isNumeric(value)) return `${label} must be a number.`;
  const pct = typeof value === 'number' ? value : Number(value);
  if (pct <= 0) return `${label} must be greater than 0.`;
  if (pct > 100) return `${label} cannot exceed 100.`;
  return null;
}

/**
 * Opening hours must be logical: a defined open time strictly before the close
 * time. Times are "HH:MM" 24-hour strings. Returns null when both are blank
 * (treated as not-set) or when the range is valid.
 */
export function validateHoursRange(open?: string, close?: string): string | null {
  if (!open && !close) return null;
  if (!open || !close) return 'Both opening and closing times are required.';
  if (open >= close) return 'Opening time must be before closing time.';
  return null;
}

/**
 * A scheduled date/time must be in the future. `graceMinutes` lets callers
 * require it to be at least N minutes out (e.g. 30 min lead time for orders).
 * Accepts a Date or an ISO/`datetime-local` string.
 */
export function validateFutureDateTime(
  value: string | Date,
  opts: { graceMinutes?: number; label?: string } = {},
): string | null {
  const label = opts.label ?? 'Time';
  const when = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(when.getTime())) return `Enter a valid ${label.toLowerCase()}.`;
  const earliest = Date.now() + (opts.graceMinutes ?? 0) * 60_000;
  if (when.getTime() < earliest) {
    return opts.graceMinutes
      ? `${label} must be at least ${opts.graceMinutes} minutes from now.`
      : `${label} can't be in the past.`;
  }
  return null;
}

/** Text bounded by a maximum length (e.g. a review or message body). */
export function validateMaxLength(value: string, max: number, label = 'This field'): string | null {
  if (value.length > max) return `${label} must be ${max} characters or fewer.`;
  return null;
}

/**
 * Run a set of validators (in order) and return the first error found, or null
 * when everything passes. Handy for combining required + format checks.
 */
export function firstError(...results: (string | null)[]): string | null {
  return results.find((r) => r != null) ?? null;
}
