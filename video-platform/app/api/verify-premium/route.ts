/**
 * API route: POST /api/verify-premium — confirm a Premium subscription and activate it.
 * Purpose: Called after the Premium Stripe success redirect to verify the subscription is active, then
 *   flag the authenticated user's profile as Premium (idempotently). Safety net beside the webhook.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit';
import { getAuthenticatedUser } from '@/lib/server-auth';

// Admin (service-role) Supabase client for trusted writes; null if env vars are missing.
function getSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Confirms a Localy Premium checkout immediately after Stripe redirects to the
 * success page, so the user is marked premium without waiting on the webhook
 * (which may not be configured in demo). Verifies the session belongs to the
 * caller and is paid, then flips `profiles.is_premium`.
 */
export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = checkRateLimit(`verifyPremium:${ip}`, RATE_LIMITS.verifyPurchase);
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs);

  const auth = await getAuthenticatedUser(request);
  if (auth.error) return auth.error;
  const userId = auth.user.id;

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    console.error('[verify-premium] STRIPE_SECRET_KEY not set');
    return NextResponse.json({ error: 'Payment system unavailable' }, { status: 503 });
  }

  const sessionId = request.nextUrl.searchParams.get('session_id');
  if (!sessionId) {
    return NextResponse.json({ error: 'Missing session_id parameter' }, { status: 400 });
  }

  const stripe = new Stripe(stripeKey);

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch (error) {
    console.error('[verify-premium] Stripe session retrieval failed:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Payment session not found' }, { status: 404 });
  }

  if (session.metadata?.userId !== userId || session.metadata?.premium !== 'true') {
    console.warn(`[verify-premium] User ${userId} cannot claim session ${sessionId}`);
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Subscriptions are "paid" once the first invoice settles; accept paid status.
  if (session.payment_status !== 'paid' && session.status !== 'complete') {
    return NextResponse.json({ error: 'Payment not completed' }, { status: 402 });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    console.error('[verify-premium] Supabase service role key not configured');
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
  }

  const premiumUntil = new Date();
  premiumUntil.setMonth(premiumUntil.getMonth() + 1);

  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      is_premium: true,
      premium_until: premiumUntil.toISOString(),
      stripe_customer_id: typeof session.customer === 'string' ? session.customer : null,
    })
    .eq('id', userId);

  if (updateError) {
    console.error('[verify-premium] Failed to mark premium:', updateError.message);
    return NextResponse.json({ error: 'Failed to activate premium' }, { status: 500 });
  }

  return NextResponse.json({ success: true, premiumUntil: premiumUntil.toISOString() });
}
