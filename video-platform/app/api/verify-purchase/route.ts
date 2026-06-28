import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit';
import { getAuthenticatedUser } from '@/lib/server-auth';

function getSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey);
}

function generateConfirmationNumber(): string {
  const random = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `${random}${new Date().getTime().toString(36).toUpperCase()}`;
}

export async function GET(request: NextRequest) {
  // Rate limiting
  const ip = getClientIp(request);
  const rl = checkRateLimit(`verifyPurchase:${ip}`, RATE_LIMITS.verifyPurchase);
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs);

  // Auth
  const auth = await getAuthenticatedUser(request);
  if (auth.error) return auth.error;
  const userId = auth.user.id;

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    console.error('[verify-purchase] STRIPE_SECRET_KEY not set');
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
    console.error('[verify-purchase] Stripe session retrieval failed:', error);
    return NextResponse.json({ error: 'Payment session not found' }, { status: 404 });
  }

  // Verify this session belongs to the authenticated user
  if (session.metadata?.userId !== userId) {
    console.warn(`[verify-purchase] User ${userId} attempted to claim session owned by ${session.metadata?.userId}`);
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const coins = parseInt(session.metadata?.coins || '0');
  const confirmationNumber = generateConfirmationNumber();

  try {
    if (userId && coins) {
      await processOrder(userId, coins, sessionId);
    }
  } catch (error) {
    console.error('[verify-purchase] processOrder failed:', error);
    return NextResponse.json({ error: 'Failed to process order' }, { status: 500 });
  }

  return NextResponse.json({ success: true, confirmationNumber, coinsAdded: coins });
}

async function processOrder(userId: string, coins: number, sessionId: string) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new Error('Supabase service role key is not configured');
  }

  // Idempotency check — webhook may have already processed this
  const { data: existing } = await supabase
    .from('coin_purchases')
    .select('id')
    .eq('stripe_session_id', sessionId)
    .single();

  if (existing) {
    console.log(`[verify-purchase] Already processed session ${sessionId}`);
    return;
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('coin_balance')
    .eq('id', userId)
    .single();

  if (profileError) {
    console.error('[verify-purchase] Error fetching profile:', profileError.message);
    throw profileError;
  }

  const newBalance = (profile?.coin_balance || 0) + coins;

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ coin_balance: newBalance })
    .eq('id', userId);

  if (updateError) {
    console.error('[verify-purchase] Error updating balance:', updateError.message);
    throw updateError;
  }

  await supabase.from('coin_purchases').insert({
    user_id: userId,
    coins,
    amount_cents: null,
    stripe_session_id: sessionId,
    created_at: new Date().toISOString(),
  });

  console.log(`[verify-purchase] +${coins} coins for user ${userId}`);
}
