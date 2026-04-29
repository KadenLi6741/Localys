import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

interface CheckoutItem {
  itemId: string;
  itemName: string;
  itemPrice: number;
  itemImage?: string;
  sellerId: string;
  buyerId: string;
  quantity: number;
  specialRequests?: string;
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('STRIPE_SECRET_KEY is not set in environment variables');
      return NextResponse.json(
        { error: 'Payment system not configured' },
        { status: 500 }
      );
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const body = await request.json();
    const { items, couponCode } = body as { items: CheckoutItem[]; couponCode?: string };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'No items provided' },
        { status: 400 }
      );
    }

    for (const item of items) {
      if (!item.itemId || !item.itemName || item.itemPrice === undefined || !item.sellerId || !item.buyerId) {
        console.error('Missing required fields in item:', item);
        return NextResponse.json(
          { error: 'Missing required fields' },
          { status: 400 }
        );
      }
    }

    let appliedCouponCode: string | null = null;
    let discountPercentage = 0;

    // Validate and apply coupon if provided
    if (couponCode) {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data: coupon, error: couponError } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', couponCode.toUpperCase())
        .eq('is_active', true)
        .single();

      if (couponError || !coupon) {
        return NextResponse.json(
          { error: 'Invalid or expired coupon' },
          { status: 400 }
        );
      }

      // Check expiry
      if (coupon.expiry_date && new Date(coupon.expiry_date) < new Date()) {
        return NextResponse.json(
          { error: 'Coupon has expired' },
          { status: 400 }
        );
      }

      // Check max uses
      if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
        return NextResponse.json(
          { error: 'Coupon has reached maximum uses' },
          { status: 400 }
        );
      }

      discountPercentage = coupon.discount_percentage;
      appliedCouponCode = couponCode.toUpperCase();

      // Mark coupon as used and increment count
      await supabase
        .from('coupons')
        .update({ used_count: coupon.used_count + 1 })
        .eq('id', coupon.id);
    }

    // Build Stripe line items
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map((item) => {
      let unitPrice = item.itemPrice;
      if (discountPercentage > 0) {
        unitPrice = Math.max(0, unitPrice - unitPrice * (discountPercentage / 100));
      }
      const priceInCents = Math.round(unitPrice * 100);

      const productName = appliedCouponCode
        ? `${item.itemName} (${discountPercentage}% off with ${appliedCouponCode})`
        : item.itemName;

      return {
        price_data: {
          currency: 'usd',
          product_data: {
            name: productName,
            description: `Purchase from local business`,
            images: item.itemImage ? [item.itemImage] : [],
          },
          unit_amount: priceInCents,
        },
        quantity: item.quantity || 1,
      };
    });

    // Store only item IDs and quantities in metadata to stay under Stripe's 500-char limit.
    // Full item details (name, price, seller) are looked up from Supabase in the webhook.
    const itemsMetadata = items.map((item) => ({
      id: item.itemId,
      qty: item.quantity || 1,
    }));

    const buyerId = items[0].buyerId;
    const firstSellerId = items[0].sellerId;

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
      },
    });

    if (!session || !session.url) {
      return NextResponse.json(
        { error: 'Failed to create checkout session' },
        { status: 500 }
      );
    }

    const itemNames = items.map(i => i.itemName).join(', ');
    console.log(`Checkout session created: ${session.id} for items: ${itemNames}${appliedCouponCode ? ` with coupon ${appliedCouponCode}` : ''}`);

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to create checkout session';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
