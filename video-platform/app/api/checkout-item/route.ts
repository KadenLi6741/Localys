import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

// Supabase client for validating coupons
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(request: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('STRIPE_SECRET_KEY is not set in environment variables');
      return NextResponse.json(
        { error: 'Payment system not configured. Please contact support.' },
        { status: 500 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return NextResponse.json(
        { error: 'Invalid request format' },
        { status: 400 }
      );
    }

    const { itemId, itemName, itemPrice, sellerId, buyerId, itemImage, couponCode } = body;

    if (!itemId || !itemName || itemPrice === undefined || !sellerId || !buyerId) {
      console.error('Missing required fields:', { itemId, itemName, itemPrice, sellerId, buyerId });
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    let finalPrice = itemPrice;
    let discountText = '';
    const metadata: Record<string, string> = {
      itemId: itemId.toString(),
      itemName: itemName.toString(),
      sellerId: sellerId.toString(),
      buyerId: buyerId.toString(),
      itemPrice: itemPrice.toString(),
    };

    // Validate and apply coupon if provided
    if (couponCode) {
      try {
        // Get the coupon from database
        const { data: coupon } = await supabase
          .from('coupons')
          .select('*')
          .eq('code', couponCode.toUpperCase())
          .eq('is_active', true)
          .single();

        if (coupon && coupon.discount_percentage > 0) {
          const discount = itemPrice * (coupon.discount_percentage / 100);
          finalPrice = Math.max(0, itemPrice - discount);
          discountText = `${coupon.discount_percentage}% discount applied`;
          metadata.couponCode = couponCode;
          metadata.discountPercentage = coupon.discount_percentage.toString();
          metadata.discountAmount = discount.toString();
          
          console.log(`Coupon ${couponCode} applied: ${discount} discount, final price: ${finalPrice}`);
        }
      } catch (couponError) {
        console.warn(`Could not apply coupon ${couponCode}:`, couponError);
        // Continue without coupon if there's an error
      }
    }

    const priceInCents = Math.round(finalPrice * 100); // Convert to cents

    if (!stripe || !stripe.checkout) {
      console.error('Stripe not initialized properly');
      return NextResponse.json(
        { error: 'Payment system initialization failed' },
        { status: 500 }
      );
    }

    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: itemName,
                description: `Purchase from local business${discountText ? ` - ${discountText}` : ''}`,
                images: itemImage ? [itemImage] : [],
              },
              unit_amount: priceInCents,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/purchase-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/profile/${sellerId}?canceled=true`,
        metadata,
      });

      if (!session || !session.url) {
        console.error('Stripe session created but no URL returned');
        return NextResponse.json(
          { error: 'Failed to create checkout session - no payment URL' },
          { status: 500 }
        );
      }

      console.log(`Checkout session created: ${session.id} for item ${itemName}`);
      return NextResponse.json({ url: session.url });
    } catch (stripeError) {
      console.error('Stripe API error:', stripeError);
      const errorMessage = stripeError instanceof Error ? stripeError.message : 'Stripe error occurred';
      return NextResponse.json(
        { error: `Payment processing error: ${errorMessage}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Checkout route error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: `Checkout failed: ${errorMessage}` },
      { status: 500 }
    );
  }
}
