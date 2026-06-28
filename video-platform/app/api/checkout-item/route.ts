import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit';
import { ItemCheckoutSchema, parseBody } from '@/lib/schemas';
import { getAuthenticatedUser } from '@/lib/server-auth';

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

  // Look up authoritative prices from the database — never trust client-supplied prices
  const itemIds = items.map((i) => i.itemId);
  const { data: menuItems, error: menuError } = await supabase
    .from('menu_items')
    .select('id, item_name, price, user_id')
    .in('id', itemIds);

  if (menuError || !menuItems) {
    console.error('Error fetching menu items:', menuError);
    return NextResponse.json({ error: 'Failed to retrieve item details' }, { status: 500 });
  }

  const menuMap = new Map(menuItems.map((m) => [m.id, m]));

  for (const item of items) {
    const mi = menuMap.get(item.itemId);
    if (!mi) {
      return NextResponse.json({ error: `Item not found: ${item.itemId}` }, { status: 400 });
    }
    if (typeof mi.price !== 'number' || mi.price <= 0) {
      return NextResponse.json({ error: 'Item has no valid price' }, { status: 400 });
    }
  }

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

  if (promoCode) {
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

  const itemsMetadata = items.map((item) => ({ id: item.itemId, qty: item.quantity }));
  const firstSellerId = items[0].sellerId;

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://localys.xyz'}/purchase-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://localys.xyz'}/profile/${firstSellerId}?canceled=true`,
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
    console.error('Stripe checkout-item error:', error);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
