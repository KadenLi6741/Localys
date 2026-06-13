/**
 * Shared validation utilities for the Localys platform.
 * All user-facing input passes through these helpers.
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

// ── Coordinate Validation ────────────────────────────────────────────

export function validateLatitude(lat: unknown): ValidationResult {
  if (lat === null || lat === undefined || lat === '') {
    return { valid: false, error: 'Latitude is required.' };
  }
  const n = Number(lat);
  if (isNaN(n) || n < -90 || n > 90) {
    return { valid: false, error: 'Latitude must be between -90 and 90.' };
  }
  return { valid: true };
}

export function validateLongitude(lng: unknown): ValidationResult {
  if (lng === null || lng === undefined || lng === '') {
    return { valid: false, error: 'Longitude is required.' };
  }
  const n = Number(lng);
  if (isNaN(n) || n < -180 || n > 180) {
    return { valid: false, error: 'Longitude must be between -180 and 180.' };
  }
  return { valid: true };
}

export function validateCoordinates(lat: unknown, lng: unknown): ValidationResult {
  const latResult = validateLatitude(lat);
  if (!latResult.valid) return latResult;
  const lngResult = validateLongitude(lng);
  if (!lngResult.valid) return lngResult;
  return { valid: true };
}

// ── Distance / Radius Validation ─────────────────────────────────────

export function validateRadius(radius: unknown): ValidationResult {
  if (radius === null || radius === undefined || radius === '') {
    return { valid: false, error: 'Distance radius is required.' };
  }
  const n = Number(radius);
  if (isNaN(n) || n <= 0) {
    return { valid: false, error: 'Distance must be a positive number.' };
  }
  if (n > 500) {
    return { valid: false, error: 'Maximum search radius is 500km.' };
  }
  return { valid: true };
}

// ── Text Input Validation ────────────────────────────────────────────

const SPAM_PATTERN = /(.)\1{9,}/; // 10+ repeated chars
const INVALID_CHARS = /[<>{}]/; // prevent injection-style chars

export function validateSearchQuery(query: unknown): ValidationResult {
  if (query === null || query === undefined) {
    return { valid: false, error: 'Search query is required.' };
  }
  const s = String(query).trim();
  if (s.length === 0) {
    return { valid: false, error: 'Search query cannot be empty.' };
  }
  if (s.length > 200) {
    return { valid: false, error: 'Search query is too long (max 200 characters).' };
  }
  if (INVALID_CHARS.test(s)) {
    return { valid: false, error: 'Search query contains invalid characters.' };
  }
  return { valid: true };
}

export function validateQuestionText(text: unknown): ValidationResult {
  if (text === null || text === undefined) {
    return { valid: false, error: 'Question text is required.' };
  }
  const s = String(text).trim();
  if (s.length < 5) {
    return { valid: false, error: 'Question must contain at least 5 characters.' };
  }
  if (s.length > 1000) {
    return { valid: false, error: 'Question is too long (max 1000 characters).' };
  }
  if (SPAM_PATTERN.test(s)) {
    return { valid: false, error: 'Question appears to contain spam content.' };
  }
  return { valid: true };
}

export function validateAnswerText(text: unknown): ValidationResult {
  if (text === null || text === undefined) {
    return { valid: false, error: 'Answer text is required.' };
  }
  const s = String(text).trim();
  if (s.length < 1) {
    return { valid: false, error: 'Answer cannot be empty.' };
  }
  if (s.length > 2000) {
    return { valid: false, error: 'Answer is too long (max 2000 characters).' };
  }
  return { valid: true };
}

export function validateMessageLength(text: unknown, maxLength = 5000): ValidationResult {
  if (text === null || text === undefined) {
    return { valid: false, error: 'Message is required.' };
  }
  const s = String(text).trim();
  if (s.length === 0) {
    return { valid: false, error: 'Message cannot be empty.' };
  }
  if (s.length > maxLength) {
    return { valid: false, error: `Message is too long (max ${maxLength} characters).` };
  }
  return { valid: true };
}

// ── UUID Validation ──────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validateUUID(value: unknown, label = 'ID'): ValidationResult {
  if (!value || typeof value !== 'string') {
    return { valid: false, error: `${label} is required.` };
  }
  if (!UUID_RE.test(value)) {
    return { valid: false, error: `${label} format is invalid.` };
  }
  return { valid: true };
}

// ── Email Validation ─────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: unknown): ValidationResult {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required.' };
  }
  const s = email.trim();
  if (!EMAIL_RE.test(s)) {
    return { valid: false, error: 'Please enter a valid email address.' };
  }
  if (s.length > 254) {
    return { valid: false, error: 'Email address is too long.' };
  }
  return { valid: true };
}

// ── Sanitization Helpers ─────────────────────────────────────────────

/** Trim and collapse whitespace; strip angle-bracket tags. */
export function sanitizeText(input: string): string {
  return input
    .trim()
    .replace(/<[^>]*>/g, '') // strip HTML tags
    .replace(/\s+/g, ' ');   // collapse whitespace
}
