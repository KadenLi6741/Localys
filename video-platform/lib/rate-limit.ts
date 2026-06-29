/**
 * rate-limit.ts — simple in-memory request rate limiter for API routes.
 * Purpose: Throttles abusive/automated requests (e.g. login-code, checkout) by counting hits per key
 *   within a time window. Note: the store is per server instance, so on serverless it's per-instance,
 *   not global — swap the Map for Redis for global enforcement.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */

import { NextRequest, NextResponse } from 'next/server';

interface RateLimitConfig {
  windowMs: number;
  max: number;
}

interface Entry {
  count: number;
  resetAt: number;
}

// In-memory store — persists for the lifetime of one server process/instance.
// On serverless platforms (Vercel/Netlify), each cold-start instance has its
// own store so this is per-instance, not globally shared. For global enforcement
// swap the Map for an Upstash Redis call.
const store = new Map<string, Entry>();

// Prune expired entries every 5 minutes to prevent unbounded memory growth.
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now > entry.resetAt) store.delete(key);
    }
  }, 5 * 60 * 1000);
}

// All rate limits in one place — change values here only.
export const RATE_LIMITS = {
  checkout:        { windowMs: 60_000, max: 5  }, // 5 checkout sessions/min/IP
  verifyPurchase:  { windowMs: 60_000, max: 10 }, // 10 verify calls/min/IP
  verifyTurnstile: { windowMs: 60_000, max: 20 }, // 20 CAPTCHA checks/min/IP
} as const;

export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (entry.count >= config.max) {
    return { allowed: false, retryAfterMs: entry.resetAt - now };
  }

  entry.count++;
  return { allowed: true, retryAfterMs: 0 };
}

export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  );
}

export function rateLimitResponse(retryAfterMs: number): NextResponse {
  return NextResponse.json(
    { error: 'Too many requests. Please try again in a moment.' },
    {
      status: 429,
      headers: { 'Retry-After': String(Math.ceil(retryAfterMs / 1000)) },
    }
  );
}
