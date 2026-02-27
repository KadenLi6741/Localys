import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

// Supabase client for validating coupons
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const COIN_PACKAGES: Record<
  string,
  { coins: number; price: number; name: string }
> = {
  starter: {
    coins: 1000,
    price: 1000, // $10 in cents
    name: '1000 Coins',
  },
  pro: {
    coins: 2500,
    price: 2000, // $20 in cents
    name: '2500 Coins',
  },
  premium: {
    coins: 6000,
    price: 5000, // $50 in cents
    name: '6000 Coins',
  },
};

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

    const { packageId, userId, couponCode } = body;

    if (!packageId || !userId) {
      return NextResponse.json(
        { error: 'Missing packageId or userId' },
        { status: 400 }
      );
    }

    const pkg = COIN_PACKAGES[packageId];
    if (!pkg) {
      return NextResponse.json(
        { error: 'Invalid package' },
        { status: 400 }
      );
    }

    let finalPrice = pkg.price;
    let discountText = '';
    const metadata: Record<string, string> = {
      userId,
      packageId,
      coins: pkg.coins.toString(),
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
          const discount = Math.round(pkg.price * (coupon.discount_percentage / 100));
          finalPrice = Math.max(0, pkg.price - discount);
          discountText = `${coupon.discount_percentage}% discount applied`;
          metadata.couponCode = couponCode;
          metadata.discountPercentage = coupon.discount_percentage.toString();
          metadata.discountAmount = discount.toString();
          
          console.log(`Coupon ${couponCode} applied: ${discount} cents discount, final price: ${finalPrice}`);
        }
      } catch (couponError) {
        console.warn(`Could not apply coupon ${couponCode}:`, couponError);
        // Continue without coupon if there's an error
      }
    }

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
                name: pkg.name,
                description: `Get ${pkg.coins.toLocaleString()} coins for your account${discountText ? ` - ${discountText}` : ''}`,
                images: ['https://img.icons8.com/color/96/000000/coin.png'],
              },
              unit_amount: finalPrice,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/buy-coins/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/buy-coins?canceled=true`,
        metadata,
      });

      if (!session || !session.url) {
        console.error('Stripe session created but no URL returned');
        return NextResponse.json(
          { error: 'Failed to create checkout session - no payment URL' },
          { status: 500 }
        );
      }

      console.log(`Checkout session created: ${session.id}`);
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
