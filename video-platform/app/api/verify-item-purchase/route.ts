import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { generateToken } from '@/lib/verification';
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit';
import { VerifyItemPurchaseSchema, parseBody } from '@/lib/schemas';
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

export async function POST(request: NextRequest) {
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
    console.error('[verify-item-purchase] STRIPE_SECRET_KEY not set');
    return NextResponse.json({ error: 'Payment system unavailable' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = parseBody(VerifyItemPurchaseSchema, body);
  if (!parsed.success) return parsed.response;
  const { sessionId } = parsed.data;

  const stripe = new Stripe(stripeKey);

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch (error) {
    console.error('[verify-item-purchase] Stripe session retrieval failed:', error);
    return NextResponse.json({ error: 'Payment session not found' }, { status: 404 });
  }

  if (!session.metadata) {
    return NextResponse.json({ error: 'Payment session not found' }, { status: 404 });
  }

  // Verify this session belongs to the authenticated user
  if (session.metadata.buyerId !== userId) {
    console.warn(`[verify-item-purchase] User ${userId} attempted to claim session owned by ${session.metadata.buyerId}`);
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const confirmationNumber = generateConfirmationNumber();
  const metadata = session.metadata;
  const couponCode = metadata.couponCode || null;
  const discountPercentage = parseInt(metadata.discountPercentage || '0');

  try {
    // Multi-item format
    if (metadata.items && metadata.buyerId) {
      let items: { id: string; name: string; sid: string; price: number }[];
      try {
        items = JSON.parse(metadata.items);
      } catch {
        return NextResponse.json({ error: 'Invalid session data' }, { status: 400 });
      }

      const orders = [];
      for (const item of items) {
        const result = await processPurchase(
          item.id, item.sid, userId, item.name, item.price,
          sessionId, couponCode, discountPercentage
        );
        if (result) orders.push(result);
      }

      return NextResponse.json({ success: true, confirmationNumber, orders });
    }

    // Legacy single-item format
    const { itemId, sellerId, itemName, itemPrice } = metadata;
    if (itemId && sellerId && itemName && itemPrice) {
      const result = await processPurchase(
        itemId, sellerId, userId, itemName, parseFloat(itemPrice),
        sessionId, couponCode, discountPercentage
      );
      return NextResponse.json({
        success: true,
        confirmationNumber,
        orders: result ? [result] : [],
      });
    }

    return NextResponse.json({ success: true, confirmationNumber, orders: [] });
  } catch (error) {
    console.error('[verify-item-purchase] Processing error:', error);
    return NextResponse.json({ error: 'Failed to process purchase' }, { status: 500 });
  }
}

async function processPurchase(
  itemId: string,
  sellerId: string,
  buyerId: string,
  itemName: string,
  itemPrice: number,
  sessionId: string,
  couponCode: string | null,
  discountPercentage: number
): Promise<{ orderId: string; token: string; itemName: string; price: number } | null> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
  }

  // Idempotency check — webhook may have already processed this
  const { data: existing } = await supabase
    .from('item_purchases')
    .select('id, verification_token')
    .eq('stripe_session_id', sessionId)
    .eq('item_id', itemId)
    .limit(1);

  if (existing && existing.length > 0) {
    console.log(`[verify-item-purchase] Already recorded session ${sessionId} item ${itemId}`);
    return {
      orderId: existing[0].id,
      token: existing[0].verification_token || generateToken(existing[0].id),
      itemName,
      price: itemPrice,
    };
  }

  const originalPrice = itemPrice;
  const paidPrice = discountPercentage > 0
    ? Math.max(0, originalPrice - originalPrice * (discountPercentage / 100))
    : originalPrice;

  const { data: inserted, error } = await supabase
    .from('item_purchases')
    .insert({
      item_id: itemId,
      seller_id: sellerId,
      buyer_id: buyerId,
      item_name: itemName,
      price: paidPrice,
      ...(couponCode && {
        original_price: originalPrice,
        coupon_code: couponCode,
        discount_percentage: discountPercentage,
      }),
      stripe_session_id: sessionId,
      status: 'paid',
      purchased_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    console.error('[verify-item-purchase] Insert error:', error.message);
    throw error;
  }

  const token = generateToken(inserted.id);
  await supabase
    .from('item_purchases')
    .update({ verification_token: token })
    .eq('id', inserted.id);

  return { orderId: inserted.id, token, itemName, price: paidPrice };
}
