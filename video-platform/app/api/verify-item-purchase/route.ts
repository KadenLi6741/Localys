import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { generateToken } from '@/lib/verification';

function getSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dbqkpcwnzteljwxjoudj.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_0KyfCBFYECxfh0NfQ15Flw_P_BMyk89';

  return createClient(supabaseUrl, supabaseKey);
}

function generateConfirmationNumber(): string {
  const random = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `${random}${new Date().getTime().toString(36).toUpperCase()}`;
}

export async function POST(request: NextRequest) {
  const confirmationNumber = generateConfirmationNumber();

  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return NextResponse.json({
        success: true,
        confirmationNumber,
        message: 'Order confirmed - will be processed',
        orders: [],
      });
    }

    const stripe = new Stripe(stripeKey);

    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({
        success: true,
        confirmationNumber,
        message: 'Order confirmed',
        orders: [],
      });
    }

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session || !session.metadata) {
      return NextResponse.json({
        success: true,
        confirmationNumber,
        message: 'Order confirmed',
        orders: [],
      });
    }

    const metadata = session.metadata;
    const couponCode = metadata.couponCode || null;
    const discountPercentage = parseInt(metadata.discountPercentage || '0');

    // Handle multi-item format (compact: { id, qty })
    if (metadata.items && metadata.buyerId) {
      const items = JSON.parse(metadata.items) as { id: string; qty?: number; name?: string; sid?: string; price?: number }[];
      const buyerId = metadata.buyerId;
      const sellerId = metadata.sellerId || '';

      // Look up item details from Supabase since compact format only has id/qty
      const supabase = getSupabaseAdminClient();
      let menuMap = new Map<string, { item_name: string; price: number; user_id: string }>();

      if (supabase) {
        const itemIds = items.map(i => i.id);
        const { data: menuItems } = await supabase
          .from('menu_items')
          .select('id, item_name, price, user_id')
          .in('id', itemIds);

        (menuItems || []).forEach((mi: any) => {
          menuMap.set(mi.id, mi);
        });
      }

      const orders = [];
      for (const item of items) {
        const menuItem = menuMap.get(item.id);
        const result = await processPurchase(
          item.id,
          item.sid || menuItem?.user_id || sellerId,
          buyerId,
          item.name || menuItem?.item_name || 'Unknown Item',
          item.price ?? menuItem?.price ?? 0,
          sessionId,
          couponCode,
          discountPercentage
        );
        if (result) orders.push(result);
      }

      return NextResponse.json({
        success: true,
        confirmationNumber,
        message: 'Purchase confirmed',
        orders,
      });
    }

    // Legacy single-item format
    const { itemId, sellerId, buyerId, itemName, itemPrice } = metadata;
    if (itemId && sellerId && buyerId && itemName && itemPrice) {
      const result = await processPurchase(
        itemId, sellerId, buyerId, itemName, parseFloat(itemPrice),
        sessionId, couponCode, discountPercentage
      );

      return NextResponse.json({
        success: true,
        confirmationNumber,
        message: 'Purchase confirmed',
        orders: result ? [result] : [],
      });
    }

    return NextResponse.json({
      success: true,
      confirmationNumber,
      message: 'Order confirmed',
      orders: [],
    });
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json({
      success: true,
      confirmationNumber,
      message: 'Order confirmed - will be processed',
      orders: [],
    });
  }
}

async function processPurchase(
  itemId: string,
  sellerId: string,
  buyerId: string,
  itemName: string,
  itemPrice: number,
  sessionId: string,
  couponCode: string | null,
  discountPercentage: number
): Promise<{ orderId: string; token: string; itemName: string; price: number } | null> {
  try {
    const supabase = getSupabaseAdminClient();

    // Check if already processed (may have been created by webhook)
    const { data: existing } = await supabase
      .from('item_purchases')
      .select('id, verification_token')
      .eq('stripe_session_id', sessionId)
      .eq('item_id', itemId)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log(`Purchase already recorded for session ${sessionId}, item ${itemId}`);
      return {
        orderId: existing[0].id,
        token: existing[0].verification_token || generateToken(existing[0].id),
        itemName,
        price: itemPrice,
      };
    }

    const originalPrice = itemPrice;
    const paidPrice = discountPercentage > 0
      ? Math.max(0, originalPrice - originalPrice * (discountPercentage / 100))
      : originalPrice;

    // Record the purchase
    const { data: inserted, error } = await supabase
      .from('item_purchases')
      .insert({
        item_id: itemId,
        seller_id: sellerId,
        buyer_id: buyerId,
        item_name: itemName,
        price: paidPrice,
        ...(couponCode && {
          original_price: originalPrice,
          coupon_code: couponCode,
          discount_percentage: discountPercentage,
        }),
        stripe_session_id: sessionId,
        status: 'paid',
        purchased_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error recording purchase:', error);
      return null;
    }

    // Generate and store verification token
    const token = generateToken(inserted.id);
    await supabase
      .from('item_purchases')
      .update({ verification_token: token })
      .eq('id', inserted.id);

    console.log(`Purchase recorded: ${itemName} sold by ${sellerId} to ${buyerId}`);
    return {
      orderId: inserted.id,
      token,
      itemName,
      price: paidPrice,
    };
  } catch (error) {
    console.error('Error in purchase processing:', error);
    return null;
  }
}
