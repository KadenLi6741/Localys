import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

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
    const { itemId, itemName, itemPrice, sellerId, buyerId, itemImage } = body;

    if (!itemId || !itemName || itemPrice === undefined || !sellerId || !buyerId) {
      console.error('Missing required fields:', { itemId, itemName, itemPrice, sellerId, buyerId });
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const priceInCents = Math.round(itemPrice * 100); // Convert to cents

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: itemName,
              description: `Purchase from local business`,
              images: itemImage ? [itemImage] : [],
            },
            unit_amount: priceInCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://localys.xyz'}/purchase-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://localys.xyz'}/profile/${sellerId}?canceled=true`,
      metadata: {
        itemId: itemId.toString(),
        itemName: itemName.toString(),
        sellerId: sellerId.toString(),
        buyerId: buyerId.toString(),
        itemPrice: itemPrice.toString(),
      },
    });

    if (!session || !session.url) {
      return NextResponse.json(
        { error: 'Failed to create checkout session' },
        { status: 500 }
      );
    }

    console.log(`Checkout session created: ${session.id} for item ${itemName}`);

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
