import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json(
      { error: 'Missing stripe signature' },
      { status: 400 }
    );
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    try {
      const userId = session.metadata?.userId;
      const coins = parseInt(session.metadata?.coins || '0');

      if (!userId || !coins) {
        console.error('Missing userId or coins in metadata');
        return NextResponse.json(
          { error: 'Missing metadata' },
          { status: 400 }
        );
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('coin_balance')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        return NextResponse.json(
          { error: 'Failed to fetch profile' },
          { status: 500 }
        );
      }

      const newBalance = (profile?.coin_balance || 0) + coins;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ coin_balance: newBalance })
        .eq('id', userId);

      if (updateError) {
        console.error('Error updating coin balance:', updateError);
        return NextResponse.json(
          { error: 'Failed to update balance' },
          { status: 500 }
        );
      }

      console.log(`Added ${coins} coins to user ${userId}. New balance: ${newBalance}`);

      await supabase.from('coin_purchases').insert({
        user_id: userId,
        coins,
        amount_cents: session.amount_total,
        stripe_session_id: session.id,
        created_at: new Date().toISOString(),
      });

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error processing webhook:', error);
      return NextResponse.json(
        { error: 'Failed to process webhook' },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ received: true });
}
