import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!stripeKey || !webhookSecret || !supabaseUrl || !supabaseKey) {
    console.error('Missing required Stripe webhook environment variables');
    return NextResponse.json(
      { error: 'Webhook not configured' },
      { status: 500 }
    );
  }

  const stripe = new Stripe(stripeKey);
  const supabase = createClient(supabaseUrl, supabaseKey);

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
      webhookSecret
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
      // Only process if payment was successful
      if (session.payment_status !== 'paid') {
        console.log(`Checkout session ${session.id} not fully paid. Status: ${session.payment_status}`);
        return NextResponse.json({ received: true });
      }

      // Handle preorder payments
      const preorderId = session.metadata?.preorderId;
      if (preorderId && session.metadata?.type === 'preorder') {
        const { data: preorder, error: poError } = await supabase
          .from('preorders')
          .select('*')
          .eq('id', preorderId)
          .single();

        if (poError || !preorder) {
          console.error('Preorder not found for webhook:', preorderId);
          return NextResponse.json({ error: 'Preorder not found' }, { status: 400 });
        }

        if (preorder.status === 'pending_payment') {
          const chargeAmount = Math.round(preorder.subtotal * (preorder.upfront_pct / 100) * 100) / 100;

          await supabase
            .from('preorders')
            .update({
              status: 'confirmed',
              amount_paid: chargeAmount,
              amount_remaining: Math.round((preorder.subtotal - chargeAmount) * 100) / 100,
              stripe_session_id: session.id,
              confirmed_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', preorderId);

          if (preorder.table_id) {
            await supabase
              .from('restaurant_tables')
              .update({ status: 'reserved' })
              .eq('id', preorder.table_id);
          }

          console.log(`Preorder ${preorder.order_code} confirmed via webhook`);
        }

        return NextResponse.json({ success: true });
      }

      // Handle coin purchases
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
