import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit';
import { CoinCheckoutSchema, parseBody } from '@/lib/schemas';
import { getAuthenticatedUser } from '@/lib/server-auth';

const COIN_PACKAGES: Record<string, { coins: number; price: number; name: string }> = {
  starter: { coins: 1000, price: 1000, name: '1000 Coins' },
  pro:     { coins: 2500, price: 2000, name: '2500 Coins' },
  premium: { coins: 6000, price: 5000, name: '6000 Coins' },
};

export async function POST(request: NextRequest) {
  // Rate limiting
  const ip = getClientIp(request);
  const rl = checkRateLimit(`checkout:${ip}`, RATE_LIMITS.checkout);
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs);

  // Auth — userId comes from verified session, never from client body
  const auth = await getAuthenticatedUser(request);
  if (auth.error) return auth.error;
  const userId = auth.user.id;

  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('STRIPE_SECRET_KEY is not set');
    return NextResponse.json({ error: 'Payment system not configured' }, { status: 500 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = parseBody(CoinCheckoutSchema, body);
  if (!parsed.success) return parsed.response;
  const { packageId } = parsed.data;

  const pkg = COIN_PACKAGES[packageId];
  if (!pkg) {
    return NextResponse.json({ error: 'Invalid package' }, { status: 400 });
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://localys.xyz'}/buy-coins/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://localys.xyz'}/buy-coins?canceled=true`,
      metadata: {
        userId,
        packageId,
        coins: pkg.coins.toString(),
      },
    });

    if (!session?.url) {
      return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
