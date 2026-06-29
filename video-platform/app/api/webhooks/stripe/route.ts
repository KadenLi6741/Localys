/**
 * API route: POST /api/webhooks/stripe — Stripe webhook that fulfills paid orders.
 * Purpose: The trusted server-side completion step for payments. It verifies the Stripe signature, then
 *   on a completed checkout credits coins / records the item purchase (and generates the order's
 *   verification token for the pickup QR). Uses the Supabase service-role key since it acts as the system,
 *   not a logged-in user. Fulfilling here (not on the client) prevents users from faking payment.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { generateToken } from '@/lib/verification';

// Real DB items have UUID ids; demo/built-in items use slug ids (e.g. "jays-burger-0").
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Handles incoming Stripe events; only acts on verified, completed-checkout events.
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

      // --- LOCALY PREMIUM SUBSCRIPTION ---
      if (metadata.premium === 'true' && metadata.userId) {
        const premiumUntil = new Date();
        premiumUntil.setMonth(premiumUntil.getMonth() + 1);
        const { error: premiumError } = await supabase
          .from('profiles')
          .update({
            is_premium: true,
            premium_until: premiumUntil.toISOString(),
            stripe_customer_id: typeof session.customer === 'string' ? session.customer : null,
          })
          .eq('id', metadata.userId);
        if (premiumError) {
          console.error('Failed to mark user premium:', premiumError.message);
          return NextResponse.json({ error: 'Failed to activate premium' }, { status: 500 });
        }
        return NextResponse.json({ received: true });
      }

      // Determine if this is a coin purchase or item purchase
      if (metadata.coins && metadata.userId) {
        // --- COIN PURCHASE ---
        const userId = metadata.userId;
        const coins = parseInt(metadata.coins || '0');

        // Check if already processed (deduplication)
        const { data: existingCoin } = await supabase
          .from('coin_purchases')
          .select('id')
          .eq('stripe_session_id', session.id)
          .single();

        if (existingCoin) {
          console.log(`Coin purchase already processed for session ${session.id}`);
          return NextResponse.json({ received: true });
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
      } else if (metadata.buyerId) {
        // --- ITEM PURCHASE (multi-item) ---
        const buyerId = metadata.buyerId;
        const couponCode = metadata.couponCode || null;
        const discountPercentage = parseInt(metadata.discountPercentage || '0');
        const scheduledAt = metadata.scheduledAt || null;
        const groupOrderId = metadata.groupOrderId || null;
        const promoCodeId = metadata.promoCodeId || null;
        const promoUsedCount = metadata.promoUsedCount ? parseInt(metadata.promoUsedCount) : null;
        const sellerId = metadata.sellerId || '';

        // Check if already processed (deduplication)
        const { data: existingItem } = await supabase
          .from('item_purchases')
          .select('id')
          .eq('stripe_session_id', session.id)
          .limit(1);

        if (existingItem && existingItem.length > 0) {
          console.log(`Item purchase already processed for session ${session.id}`);
          return NextResponse.json({ received: true });
        }

        // Per-item details ride on each line item's product metadata (set by
        // checkout-item). The webhook's session has no line items, so fetch them with
        // the product expanded — this also carries the server-trusted price/name/seller,
        // so no menu_items lookup is needed (which would throw on demo slug ids).
        const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
          expand: ['data.price.product'],
        });
        const items = (lineItems.data ?? []).map((li) => {
          const product = li.price && typeof li.price.product !== 'string'
            ? (li.price.product as Stripe.Product)
            : null;
          const meta = (product?.metadata ?? {}) as Record<string, string>;
          const price = meta.price ? parseFloat(meta.price) : 0;
          return {
            id: meta.id || '',
            name: meta.name || li.description || 'Item',
            sid: meta.sid || sellerId,
            price: Number.isFinite(price) ? price : 0,
            qty: meta.qty ? parseInt(meta.qty, 10) : (li.quantity ?? 1),
            sr: meta.sr || null,
          };
        });

        // Only real (UUID) items become DB rows. Demo/built-in items use slug ids
        // (e.g. "jays-burger-0") that the uuid columns reject; they're shown
        // synthetically on the success page, so skipping them keeps the webhook from
        // 500-ing on a demo cart.
        const purchaseRecords = items
          .filter((item) => UUID_RE.test(item.id))
          .map((item) => {
            const originalPrice = item.price;
            const paidPrice = discountPercentage > 0
              ? Math.max(0, originalPrice - originalPrice * (discountPercentage / 100))
              : originalPrice;

            return {
              item_id: item.id,
              seller_id: UUID_RE.test(item.sid) ? item.sid : sellerId,
              buyer_id: buyerId,
              item_name: item.name,
              price: paidPrice,
              quantity: item.qty || 1,
              ...(couponCode && {
                original_price: originalPrice,
                coupon_code: couponCode,
                discount_percentage: discountPercentage,
              }),
              stripe_session_id: session.id,
              status: 'paid',
              purchased_at: new Date().toISOString(),
              ...(scheduledAt && { scheduled_at: scheduledAt }),
              ...(item.sr && { special_requests: item.sr }),
              ...(groupOrderId && { group_order_id: groupOrderId }),
            };
          });

        if (purchaseRecords.length === 0) {
          // Cart was entirely demo/built-in items — nothing to persist server-side.
          console.log(`Webhook: no real (UUID) items to record for session ${session.id}`);
          return NextResponse.json({ received: true });
        }

        const { data: inserted, error } = await supabase
          .from('item_purchases')
          .insert(purchaseRecords)
          .select('id');

        if (error) {
          console.error('Error recording item purchases:', error);
          return NextResponse.json(
            { error: 'Failed to record purchases' },
            { status: 500 }
          );
        }

        // Generate and store verification tokens
        if (inserted) {
          for (const row of inserted) {
            const token = generateToken(row.id);
            await supabase
              .from('item_purchases')
              .update({ verification_token: token })
              .eq('id', row.id);
          }
        }

        // Increment promo code use count after confirmed payment
        if (promoCodeId && promoUsedCount !== null) {
          await supabase
            .from('promo_codes')
            .update({ used_count: promoUsedCount + 1 })
            .eq('id', promoCodeId);
        }

        const itemNames = purchaseRecords.map(r => r.item_name).join(', ');
        console.log(`Item purchases recorded: ${itemNames} bought by ${buyerId}`);
        return NextResponse.json({ success: true });
      } else if (metadata.itemId && metadata.buyerId && metadata.sellerId) {
        // --- ITEM PURCHASE ---
        const { itemId, sellerId, buyerId, itemName, itemPrice, couponCode, discountPercentage, finalPrice } = metadata;

        // Check if already processed (deduplication)
        const { data: existingItem } = await supabase
          .from('item_purchases')
          .select('id')
          .eq('stripe_session_id', session.id)
          .single();

        if (existingItem) {
          console.log(`Item purchase already processed for session ${session.id}`);
          return NextResponse.json({ received: true });
        }

        const originalPrice = parseFloat(itemPrice || '0');
        const paidPrice = finalPrice ? parseFloat(finalPrice) : originalPrice;

        const { data: insertedRow, error } = await supabase.from('item_purchases').insert({
          item_id: itemId,
          seller_id: sellerId,
          buyer_id: buyerId,
          item_name: itemName || 'Unknown Item',
          price: paidPrice,
          ...(couponCode && {
            original_price: originalPrice,
            coupon_code: couponCode,
            discount_percentage: parseInt(discountPercentage || '0'),
          }),
          stripe_session_id: session.id,
          status: 'paid',
          purchased_at: new Date().toISOString(),
        }).select('id').single();

        if (error) {
          console.error('Error recording item purchase:', error);
          return NextResponse.json(
            { error: 'Failed to record purchase' },
            { status: 500 }
          );
        }

        // Generate and store verification token
        if (insertedRow) {
          const token = generateToken(insertedRow.id);
          await supabase
            .from('item_purchases')
            .update({ verification_token: token })
            .eq('id', insertedRow.id);
        }

        console.log(`Item purchase recorded: ${itemName} sold by ${sellerId} to ${buyerId}`);
        return NextResponse.json({ success: true });
      } else {
        console.error('Webhook: unrecognized session metadata', metadata);
        return NextResponse.json({ received: true });
      }
    } catch (error) {
      console.error('Error processing webhook:', error);
      return NextResponse.json(
        { error: 'Failed to process webhook' },
        { status: 500 }
      );
    }
  }

  // Premium subscription ended (cancelled / payment failed out) — revoke premium.
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription;
    const userId = subscription.metadata?.userId;
    if (userId) {
      const { error } = await supabase
        .from('profiles')
        .update({ is_premium: false, premium_until: null })
        .eq('id', userId);
      if (error) console.error('Failed to revoke premium:', error.message);
    }
    return NextResponse.json({ received: true });
  }

  return NextResponse.json({ received: true });
}
