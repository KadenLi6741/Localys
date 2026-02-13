import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

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
    // Check if Stripe key is available
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('STRIPE_SECRET_KEY is not set in environment variables');
      return NextResponse.json(
        { error: 'Payment system not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { packageId, userId } = body;

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

    // Check if we can connect to Stripe
    if (!stripe || !stripe.checkout) {
      return NextResponse.json(
        { error: 'Stripe not initialized properly' },
        { status: 500 }
      );
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: pkg.name,
              description: `Get ${pkg.coins.toLocaleString()} coins for your account`,
              images: ['https://img.icons8.com/color/96/000000/coin.png'],
            },
            unit_amount: pkg.price,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/buy-coins/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/buy-coins?canceled=true`,
      metadata: {
        userId,
        packageId,
        coins: pkg.coins.toString(),
      },
    });

    if (!session || !session.url) {
      return NextResponse.json(
        { error: 'Failed to create checkout session' },
        { status: 500 }
      );
    }

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
