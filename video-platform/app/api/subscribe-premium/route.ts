/**
 * API route: POST /api/subscribe-premium — start a Stripe subscription for Localy Premium ($5/mo).
 * Purpose: Creates a recurring Stripe Checkout session for the Premium subscription, attributed to the
 *   authenticated user via metadata. Rate-limited; uses inline recurring price_data so no pre-created
 *   Stripe Price object is needed. Activation is confirmed by the verify-premium route / webhook.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit';
import { getAuthenticatedUser } from '@/lib/server-auth';

/** Localy Premium price: $5.00 / month. */
const PREMIUM_PRICE_CENTS = 500;

/**
 * Creates a Stripe Checkout session for a $5/month Localy Premium subscription.
 * Uses inline recurring `price_data`, so no pre-created Stripe Price is required.
 * The subscription is attributed to the authenticated user via metadata; the
 * webhook + verify-premium route flip `profiles.is_premium` on success.
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = checkRateLimit(`subscribe-premium:${ip}`, RATE_LIMITS.checkout);
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs);

  const auth = await getAuthenticatedUser(request);
  if (auth.error) return auth.error;
  const userId = auth.user.id;

  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('[subscribe-premium] STRIPE_SECRET_KEY is not set');
    return NextResponse.json({ error: 'Payment system not configured' }, { status: 500 });
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://localys.xyz';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: PREMIUM_PRICE_CENTS,
            recurring: { interval: 'month' },
            product_data: {
              name: 'Localy Premium',
              description: '15% off all items, double coins, and enhanced discovery.',
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/premium/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/premium?canceled=true`,
      metadata: { userId, premium: 'true' },
      // Mirror userId onto the subscription too, for subscription webhook events.
      subscription_data: { metadata: { userId, premium: 'true' } },
    });

    if (!session?.url) {
      return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[subscribe-premium] Stripe checkout error:', message);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
