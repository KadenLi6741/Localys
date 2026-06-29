/**
 * API route: POST /api/checkout-item — start a Stripe Checkout session for buying menu item(s).
 * Purpose: Creates the payment session for an item order. Like the coin checkout, it's security-first:
 *   buyer id from the auth token, prices resolved authoritatively server-side (DB row for real items,
 *   the bundled manifest for demo-store items), rate-limited and schema-validated — so the client can
 *   never dictate what it pays. Fulfilment happens later via the Stripe webhook.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit';
import { ItemCheckoutSchema, parseBody } from '@/lib/schemas';
import { getAuthenticatedUser } from '@/lib/server-auth';
import storeMenus from '@/data/store-menus.json';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Authoritative prices for built-in demo-store items (ids like "jays-burger-0").
 * These items aren't in the `menu_items` table, so the server reads their trusted
 * price from the menu manifest — the client still never sets the price.
 */
const MANIFEST_PRICES: Map<string, { name: string; price: number }> = (() => {
  const map = new Map<string, { name: string; price: number }>();
  const stores = storeMenus as Record<string, { items?: { id: string; name: string; price: number }[] }>;
  for (const store of Object.values(stores)) {
    for (const it of store.items ?? []) {
      if (it?.id && typeof it.price === 'number') map.set(it.id, { name: it.name, price: it.price });
    }
  }
  return map;
})();

export async function POST(request: NextRequest) {
  // Rate limiting
  const ip = getClientIp(request);
  const rl = checkRateLimit(`checkout:${ip}`, RATE_LIMITS.checkout);
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs);

  // Auth — buyerId comes from verified session, never from client body
  const auth = await getAuthenticatedUser(request);
  if (auth.error) return auth.error;
  const buyerId = auth.user.id;

  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('STRIPE_SECRET_KEY is not set');
    return NextResponse.json({ error: 'Payment system not configured' }, { status: 500 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase environment variables missing');
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = parseBody(ItemCheckoutSchema, body);
  if (!parsed.success) return parsed.response;
  const { items, couponCode, promoCode, scheduledAt, groupOrderId } = parsed.data;

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Look up authoritative prices — never trust client-supplied prices. Real items
  // come from the DB; built-in demo-store items come from the menu manifest. We only
  // query the DB with UUID ids (the `id` column is a uuid — querying it with a demo
  // slug id would throw), then fall back to the manifest for the rest.
  const itemIds = items.map((i) => i.itemId);
  const uuidItemIds = itemIds.filter((id) => UUID_RE.test(id));

  const priceMap = new Map<string, { name: string; price: number }>();
  if (uuidItemIds.length > 0) {
    const { data: menuItems, error: menuError } = await supabase
      .from('menu_items')
      .select('id, item_name, price, user_id')
      .in('id', uuidItemIds);
    if (menuError) {
      console.error('Error fetching menu items:', menuError.message);
      return NextResponse.json({ error: 'Failed to retrieve item details' }, { status: 500 });
    }
    for (const m of menuItems ?? []) {
      priceMap.set(m.id, { name: m.item_name, price: m.price });
    }
  }

  // Resolve every item to a trusted price (DB first, then demo manifest).
  for (const item of items) {
    const resolved = priceMap.get(item.itemId) ?? MANIFEST_PRICES.get(item.itemId);
    if (!resolved) {
      console.error(`Checkout: no price source for item "${item.itemId}" (seller "${item.sellerId}")`);
      return NextResponse.json({ error: `Item not found: ${item.itemName || item.itemId}` }, { status: 400 });
    }
    if (typeof resolved.price !== 'number' || resolved.price <= 0) {
      return NextResponse.json({ error: `Item has no valid price: ${item.itemName || item.itemId}` }, { status: 400 });
    }
    priceMap.set(item.itemId, resolved);
  }
  const menuMap = priceMap;

  // Validate global coupon if provided
  let appliedCouponCode: string | null = null;
  let discountPercentage = 0;

  if (couponCode) {
    const { data: coupon, error: couponError } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', couponCode.toUpperCase())
      .eq('is_active', true)
      .single();

    if (couponError || !coupon) {
      return NextResponse.json({ error: 'Invalid or expired coupon' }, { status: 400 });
    }

    if (coupon.expiry_date && new Date(coupon.expiry_date) < new Date()) {
      return NextResponse.json({ error: 'Coupon has expired' }, { status: 400 });
    }

    if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
      return NextResponse.json({ error: 'Coupon has reached maximum uses' }, { status: 400 });
    }

    discountPercentage = coupon.discount_percentage;
    appliedCouponCode = couponCode.toUpperCase();
  }

  // Validate seller promo code if provided
  let appliedPromoCode: string | null = null;
  let promoDiscountPercent = 0;
  let promoDiscountFixed = 0;
  let promoCodeId: string | null = null;
  let promoUsedCount = 0;

  // Seller promo codes only exist for real (UUID) sellers. Demo-store slugs have no
  // promo rows — and querying the uuid column with a slug would throw — so skip.
  if (promoCode && UUID_RE.test(items[0].sellerId)) {
    const firstSellerId = items[0].sellerId;
    const { data: promo, error: promoError } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', promoCode.toUpperCase().trim())
      .eq('seller_id', firstSellerId)
      .eq('is_active', true)
      .single();

    if (promoError || !promo) {
      return NextResponse.json({ error: 'Promo code not valid for this store' }, { status: 400 });
    }

    if (promo.expiry_date && new Date(promo.expiry_date) < new Date()) {
      return NextResponse.json({ error: 'Promo code has expired' }, { status: 400 });
    }

    if (promo.max_uses != null && promo.used_count >= promo.max_uses) {
      return NextResponse.json({ error: 'Promo code has reached maximum uses' }, { status: 400 });
    }

    appliedPromoCode = promoCode.toUpperCase().trim();
    promoCodeId = promo.id;
    promoUsedCount = promo.used_count;

    if (promo.discount_type === 'percent') {
      promoDiscountPercent = promo.discount_value;
    } else {
      promoDiscountFixed = promo.discount_value;
    }
  }

  // Build Stripe line items using DB prices
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map((item) => {
    const mi = menuMap.get(item.itemId)!;
    let unitPrice = mi.price;

    // Apply global coupon (percentage)
    if (discountPercentage > 0) {
      unitPrice = Math.max(0, unitPrice - unitPrice * (discountPercentage / 100));
    }
    // Apply promo code
    if (promoDiscountPercent > 0) {
      unitPrice = Math.max(0, unitPrice - unitPrice * (promoDiscountPercent / 100));
    } else if (promoDiscountFixed > 0 && items.length === 1) {
      unitPrice = Math.max(0, unitPrice - promoDiscountFixed);
    }

    const discLabel = appliedCouponCode
      ? ` (${discountPercentage}% off)`
      : appliedPromoCode
      ? promoDiscountPercent > 0 ? ` (${promoDiscountPercent}% off)` : ` (-$${promoDiscountFixed.toFixed(2)})`
      : '';

    return {
      price_data: {
        currency: 'usd',
        product_data: { name: `${item.itemName}${discLabel}`, description: 'Purchase from local business' },
        unit_amount: Math.round(unitPrice * 100),
      },
      quantity: item.quantity,
    };
  });

  // Save resolved (server-trusted) name/price alongside id so verify-item-purchase
  // can reconstruct order details from the Stripe session without a second DB query.
  const itemsMetadata = items.map((item) => {
    const resolved = menuMap.get(item.itemId);
    return {
      id: item.itemId,
      name: resolved?.name ?? item.itemName,
      sid: item.sellerId,
      price: resolved?.price ?? 0,
      qty: item.quantity,
      // Carry the buyer's special concerns/notes so verify-item-purchase can save
      // them with the order (previously dropped here, so they never persisted).
      ...(item.specialRequests ? { sr: item.specialRequests } : {}),
    };
  });
  const firstSellerId = items[0].sellerId;

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const origin = process.env.NEXT_PUBLIC_BASE_URL ?? new URL(request.url).origin;
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${origin}/purchase-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/profile/${firstSellerId}?canceled=true`,
      metadata: {
        buyerId,
        sellerId: firstSellerId,
        items: JSON.stringify(itemsMetadata),
        ...(appliedCouponCode && {
          couponCode: appliedCouponCode,
          discountPercentage: discountPercentage.toString(),
        }),
        ...(appliedPromoCode && {
          promoCode: appliedPromoCode,
          promoCodeId: promoCodeId ?? '',
          promoUsedCount: promoUsedCount.toString(),
        }),
        ...(scheduledAt && { scheduledAt }),
        ...(groupOrderId && { groupOrderId }),
      },
    });

    if (!session?.url) {
      return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
    }

    console.log(`Checkout session created: ${session.id} for buyer ${buyerId}`);
    return NextResponse.json({ url: session.url });
  } catch (error) {
    // Surface the REAL Stripe error (e.g. bad key, invalid amount, bad URL) instead
    // of a generic message, so failures are diagnosable from the log and the client.
    const message = error instanceof Error ? error.message : String(error);
    console.error('Stripe checkout-item error:', message);
    return NextResponse.json(
      { error: message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
