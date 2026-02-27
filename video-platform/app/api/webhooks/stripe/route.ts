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

      const metadata = session.metadata || {};
      const couponCode = metadata.couponCode;
      
      // Determine if this is a coin or item purchase
      const coins = parseInt(metadata.coins || '0');
      const itemId = metadata.itemId;
      const buyerId = metadata.buyerId;

      // Handle coin purchases
      if (coins > 0 && metadata.userId) {
        const userId = metadata.userId;

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
      }

      // Handle item purchases
      if (itemId && buyerId) {
        console.log(`Processing item purchase: itemId=${itemId}, buyerId=${buyerId}, session=${session.id}`);
        // Item purchase handling can be extended here if needed
        // For now, we just log it and process the coupon marking below
      }

      // Mark coupon as used if one was applied (works for both coin and item purchases)
      if (couponCode) {
        try {
          // Get the coupon
          const { data: coupon } = await supabase
            .from('coupons')
            .select('id')
            .eq('code', couponCode.toUpperCase())
            .single();

          if (coupon) {
            // Determine which user to mark the coupon for
            const couponUserId = metadata.userId || buyerId;

            if (couponUserId) {
              // Mark user's coupon as used
              await supabase
                .from('user_coupons')
                .update({
                  is_used: true,
                  used_at: new Date().toISOString(),
                })
                .eq('user_id', couponUserId)
                .eq('coupon_id', coupon.id);

              // Increment the coupon's used count
              const { data: couponData } = await supabase
                .from('coupons')
                .select('used_count')
                .eq('id', coupon.id)
                .single();

              if (couponData) {
                await supabase
                  .from('coupons')
                  .update({
                    used_count: (couponData.used_count || 0) + 1,
                  })
                  .eq('id', coupon.id);
              }

              console.log(`Marked coupon ${couponCode} as used for user ${couponUserId}`);
            }
          }
        } catch (couponError) {
          console.warn(`Failed to mark coupon ${couponCode} as used:`, couponError);
          // Don't fail the entire webhook if coupon marking fails
        }
      }

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
