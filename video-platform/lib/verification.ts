/**
 * verification.ts — signed order-verification tokens for the pickup QR-code flow.
 * Purpose: Generates and validates HMAC tokens that prove an order is genuine when a merchant scans the
 *   customer's QR code. Used consistently by the Stripe webhook, order completion, and the verify route.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */

import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Stable fallback secret used only when ORDER_VERIFICATION_SECRET is not set
 * (demo/local environments). Without this, generateToken() threw and made the
 * entire order-confirmation verify route return 500 on every purchase. The
 * fallback is constant per deployment, so QR tokens stay consistent across the
 * verify route, the Stripe webhook, and order completion. Set a real
 * ORDER_VERIFICATION_SECRET in production for secure tokens.
 */
const FALLBACK_SECRET = 'localy-demo-order-verification-secret-v1';
let warnedMissingSecret = false;

const getSecret = () => {
  const secret = process.env.ORDER_VERIFICATION_SECRET;
  if (secret) return secret;
  if (!warnedMissingSecret) {
    console.warn(
      '[verification] ORDER_VERIFICATION_SECRET is not set — using demo fallback secret. ' +
      'Set ORDER_VERIFICATION_SECRET in your environment for secure order QR tokens.',
    );
    warnedMissingSecret = true;
  }
  return FALLBACK_SECRET;
};

export function generateToken(orderId: string): string {
  return createHmac('sha256', getSecret()).update(orderId).digest('hex');
}

export function verifyToken(orderId: string, token: string): boolean {
  const expected = generateToken(orderId);
  if (expected.length !== token.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(token));
}
